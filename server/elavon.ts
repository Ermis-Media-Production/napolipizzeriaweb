/**
 * Elavon Payment Gateway (EPG) router
 *
 * Integration approach: Hosted Payments Page (HPP) Redirect
 * - Server creates an Elavon order + payment session
 * - Returns the Elavon-hosted payment URL for the customer to complete payment
 * - On return, OrderSuccess polls getOrderRefBySession to confirm the order
 *
 * Sandbox endpoint: https://api.sandbox.elavonpayments.com
 * Production endpoint: https://api.elavonpayments.com
 *
 * Auth: Basic Auth with base64(merchantAlias:secretKey)
 */
import { z } from "zod";
import { ELAVON_ENV } from "./_core/env";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { scheduledOrders, orderItems } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { pushOrderToClover } from "./cloverSync";

const STORE_TIMEZONE = "America/Los_Angeles";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOrderRef(id: number): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `NPZ-${date}-${String(id).padStart(4, "0")}`;
}

function countPizzas(items: Array<{ name: string; quantity: number; category?: string }>): number {
  return items.reduce((sum, item) => {
    const isPizza =
      item.category === "pizza" ||
      item.category === "specialty" ||
      item.category === "calzone" ||
      item.name?.toLowerCase().includes("pizza") ||
      item.name?.toLowerCase().includes("calzone") ||
      item.name?.toLowerCase().includes("stromboli") ||
      item.name?.toLowerCase().includes("sicilian") ||
      item.name?.toLowerCase().includes("deep dish");
    return sum + (isPizza ? (item.quantity ?? 1) : 0);
  }, 0);
}

/** Get Elavon Basic Auth header */
function getElavonAuth(): string {
  const credentials = `${ELAVON_ENV.merchantAlias}:${ELAVON_ENV.secretKey}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

/** Get Elavon API base URL */
function getElavonBaseUrl(): string {
  return ELAVON_ENV.baseUrl;
}

// ─── Cart item schema ──────────────────────────────────────────────────────────
const CartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  category: z.string().optional(),
  description: z.string().optional(),
  cloverItemId: z.string().optional(), // Clover catalog item ID — enables kitchen printer routing
});

// ─── tRPC router ──────────────────────────────────────────────────────────────
export const elavonRouter = router({
  /**
   * Create an Elavon payment session.
   * Steps:
   * 1. POST /orders — creates an order on Elavon
   * 2. POST /payment-sessions — creates a hosted payment session
   * Returns the redirect URL to Elavon's hosted payment page.
   */
  createPaymentSession: publicProcedure
    .input(
      z.object({
        items: z.array(CartItemSchema).min(1),
        customerName: z.string().min(1),
        customerPhone: z.string().optional(),
        customerEmail: z.string().optional(),
        orderType: z.enum(["delivery", "pickup", "dine-in"]).default("pickup"),
        scheduledAt: z.number().optional(),
        isAsap: z.boolean().optional(),
        // Delivery fields
        uberQuoteId: z.string().optional(),
        dropoffAddress: z.string().optional(),
        dropoffCity: z.string().optional(),
        dropoffState: z.string().optional(),
        dropoffZip: z.string().optional(),
        dropoffNotes: z.string().optional(),
        // Coupon / discount
        couponCode: z.string().optional(),
        discountPercent: z.number().int().min(1).max(100).optional(),
        // Pricing breakdown (dollars)
        subtotal: z.number(),
        discountAmount: z.number().optional(),
        convenienceFee: z.number().optional(),
        salesTax: z.number().optional(),
        total: z.number(),
        deliveryFeeCents: z.number().int().min(0).optional(),
        convenienceFeeCents: z.number().int().min(0).optional(),
        salesTaxCents: z.number().int().min(0).optional(),
        // Return URLs (passed from frontend)
        returnUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const baseUrl = getElavonBaseUrl();
      const auth = getElavonAuth();
      const headers = {
        "Content-Type": "application/json",
        Authorization: auth,
      };

      const totalAmount = input.total.toFixed(2);

      // Step 1: Create an order on Elavon
      const orderBody = {
        total: {
          amount: totalAmount,
          currencyCode: "USD",
        },
        items: input.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: {
            amount: item.price.toFixed(2),
            currencyCode: "USD",
          },
        })),
      };

      let elavonOrderId: string;
      try {
        const orderResp = await fetch(`${baseUrl}/orders`, {
          method: "POST",
          headers,
          body: JSON.stringify(orderBody),
        });

        if (!orderResp.ok) {
          const errText = await orderResp.text();
          console.error("[Elavon] Create order failed:", orderResp.status, errText);
          throw new Error(`Elavon order creation failed: ${orderResp.status}`);
        }

        const orderData = await orderResp.json() as { id: string };
        elavonOrderId = orderData.id;
      } catch (err) {
        console.error("[Elavon] Order creation error:", err);
        throw new Error("Failed to create Elavon order. Please try again.");
      }

      // Step 2: Create a payment session
      // Append the Elavon order ID to the return URL so OrderSuccess can look up the session
      const returnUrlWithSession = `${input.returnUrl}&session_id=${encodeURIComponent(elavonOrderId)}`;

      const sessionBody = {
        hppType: "fullPageRedirect",
        returnUrl: returnUrlWithSession,
        cancelUrl: input.cancelUrl,
        order: elavonOrderId,
        doCreateTransaction: "true",
        // Pass order metadata as custom fields for post-payment lookup
        customFields: {
          customerName: input.customerName,
          customerPhone: input.customerPhone ?? "",
          customerEmail: input.customerEmail ?? "",
          orderType: input.orderType,
          scheduledAt: input.scheduledAt ? String(input.scheduledAt) : String(Date.now()),
          isAsap: input.isAsap !== false ? "true" : "false",
          uberQuoteId: input.uberQuoteId ?? "",
          dropoffAddress: input.dropoffAddress ?? "",
          dropoffCity: input.dropoffCity ?? "",
          dropoffState: input.dropoffState ?? "",
          dropoffZip: input.dropoffZip ?? "",
          dropoffNotes: input.dropoffNotes ?? "",
          couponCode: input.couponCode ?? "",
          discountPercent: input.discountPercent ? String(input.discountPercent) : "",
          subtotal: String(input.subtotal),
          discountAmount: String(input.discountAmount ?? 0),
          convenienceFee: String(input.convenienceFee ?? 0),
          salesTax: String(input.salesTax ?? 0),
          total: totalAmount,
          cartItems: JSON.stringify(
            input.items.map((i) => ({
              id: i.id,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
              category: i.category ?? "",
              description: i.description ?? "",
            }))
          ),
        },
      };

      let paymentUrl: string;
      let elavonSessionId: string;
      try {
        const sessionResp = await fetch(`${baseUrl}/payment-sessions`, {
          method: "POST",
          headers,
          body: JSON.stringify(sessionBody),
        });

        if (!sessionResp.ok) {
          const errText = await sessionResp.text();
          console.error("[Elavon] Create payment session failed:", sessionResp.status, errText);
          throw new Error(`Elavon payment session creation failed: ${sessionResp.status}`);
        }

        const sessionData = await sessionResp.json() as { url: string; id?: string };
        paymentUrl = sessionData.url;
        // Use the order ID as the session identifier for DB lookup
        elavonSessionId = elavonOrderId;
      } catch (err) {
        console.error("[Elavon] Payment session error:", err);
        throw new Error("Failed to create Elavon payment session. Please try again.");
      }

      // Store a pending order in DB so we can look it up after redirect
      try {
        const db = await getDb();
        if (db) {
          const deliveryAddress = input.dropoffAddress
            ? `${input.dropoffAddress}, ${input.dropoffCity ?? ""}, ${input.dropoffState ?? ""} ${input.dropoffZip ?? ""}`.trim()
            : null;

          const items = input.items as Array<{ id: string; name: string; price: number; quantity: number; category?: string; description?: string; cloverItemId?: string }>;
          const pizzaCount = countPizzas(items);

          const [insertResult] = await db.insert(scheduledOrders).values({
            orderRef: `NPZ-TEMP-${Date.now()}`,
            status: "pending_payment",
            orderType: input.orderType,
            scheduledAt: input.scheduledAt ?? Date.now(),
            isAsap: input.isAsap !== false,
            customerName: input.customerName,
            customerPhone: input.customerPhone ?? "N/A",
            customerEmail: input.customerEmail ?? null,
            deliveryAddress,
            items,
            pizzaCount,
            subtotal: String(input.subtotal),
            discountAmount: String(input.discountAmount ?? 0),
            convenienceFee: String(input.convenienceFee ?? 0),
            salesTax: String(input.salesTax ?? 0),
            total: totalAmount,
            couponCode: input.couponCode ?? null,
            paymentMethod: "elavon",
            paymentStatus: "pending",
            elavonSessionId,
            refundedAmount: "0",
          });

          const orderId = (insertResult as { insertId: number }).insertId;
          const orderRef = generateOrderRef(orderId);

          await db
            .update(scheduledOrders)
            .set({ orderRef })
            .where(eq(scheduledOrders.id, orderId));

          // Insert line items
          for (const item of items) {
            const isPizza =
              item.category === "pizza" ||
              item.category === "specialty" ||
              item.category === "calzone" ||
              item.name?.toLowerCase().includes("pizza") ||
              item.name?.toLowerCase().includes("calzone") ||
              item.name?.toLowerCase().includes("stromboli") ||
              item.name?.toLowerCase().includes("sicilian") ||
              item.name?.toLowerCase().includes("deep dish");

            await db.insert(orderItems).values({
              orderId,
              name: item.name,
              description: item.description || null,
              unitPrice: String(item.price),
              quantity: item.quantity ?? 1,
              lineTotal: String(item.price * (item.quantity ?? 1)),
              isPizza,
              cloverItemId: item.cloverItemId ?? null,
              status: "active",
              refundedAmount: "0",
            });
          }

          console.log(`[Elavon] Pending order created: ${orderRef} | Session: ${elavonSessionId}`);
        }
      } catch (err) {
        // Don't block the redirect if DB insert fails — log and continue
        console.error("[Elavon] Failed to store pending order:", err);
      }

      return { paymentUrl, elavonSessionId };
    }),

  /**
   * Look up the orderRef for an Elavon session.
   * Called by OrderSuccess after the customer returns from Elavon's hosted page.
   * If the order is still pending_payment, we confirm it (Elavon HPP redirect means payment succeeded).
   */
  getOrderRefBySession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { orderRef: null, status: null };

      const [order] = await db
        .select()
        .from(scheduledOrders)
        .where(eq(scheduledOrders.elavonSessionId, input.sessionId))
        .limit(1);

      if (!order) return { orderRef: null, status: null };

      // If still pending_payment, confirm it — Elavon redirects only on success
      if (order.paymentStatus === "pending") {
        await db
          .update(scheduledOrders)
          .set({
            paymentStatus: "paid",
            status: "confirmed",
          })
          .where(eq(scheduledOrders.id, order.id));

        // Sync to Clover POS (fire-and-forget)
        const items = order.items as Array<{ id: string; name: string; price: number; quantity: number; category?: string; description?: string }>;
        pushOrderToClover({
          orderRef: order.orderRef,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          orderType: order.orderType,
          items,
          totalCents: Math.round(parseFloat(String(order.total)) * 100),
          scheduledAt: order.scheduledAt,
          externalId: input.sessionId,
        }).catch((err) => console.error("[Elavon] Clover sync failed:", err));

        // Notify owner
        const scheduledDate = new Date(order.scheduledAt).toLocaleString("en-US", {
          timeZone: STORE_TIMEZONE,
          dateStyle: "medium",
          timeStyle: "short",
        });

        notifyOwner({
          title: `💳 New Elavon Order ${order.orderRef} — $${parseFloat(String(order.total)).toFixed(2)} (${order.orderType})`,
          content: `Customer: ${order.customerName} | Phone: ${order.customerPhone}
Scheduled: ${order.isAsap ? "ASAP" : scheduledDate}
Items: ${(items).map((i) => `${i.quantity ?? 1}x ${i.name}`).join(", ")}
Total: $${parseFloat(String(order.total)).toFixed(2)}${order.couponCode ? ` (coupon: ${order.couponCode})` : ""}
Elavon Session: ${input.sessionId}`,
        }).catch(() => {});
      }

      return {
        orderRef: order.orderRef,
        status: "paid",
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        amountTotal: parseFloat(String(order.total)),
        orderType: order.orderType,
        uberQuoteId: null as string | null,
        dropoffAddress: order.deliveryAddress,
      };
    }),

  /**
   * Get order details for display on OrderSuccess page.
   * Returns the same shape as stripe.getPaymentIntentDetails.
   */
  getOrderDetails: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [order] = await db
        .select()
        .from(scheduledOrders)
        .where(eq(scheduledOrders.elavonSessionId, input.sessionId))
        .limit(1);

      if (!order) return null;

      return {
        status: order.paymentStatus === "paid" ? "paid" : "pending",
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail ?? null,
        amountTotal: parseFloat(String(order.total)),
        orderType: order.orderType as "delivery" | "pickup" | "dine-in",
        uberQuoteId: null as string | null,
        dropoffAddress: order.deliveryAddress ?? null,
        dropoffCity: null as string | null,
        dropoffState: null as string | null,
        dropoffZip: null as string | null,
        dropoffNotes: null as string | null,
        cartItems: (order.items as Array<{ id: string; name: string; price: number; quantity: number; category?: string; description?: string }>) ?? [],
      };
    }),
});
