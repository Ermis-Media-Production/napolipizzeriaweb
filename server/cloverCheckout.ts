/**
 * cloverCheckout.ts
 *
 * Clover Hosted Checkout integration.
 *
 * Flow:
 *  1. Client calls trpc.cloverCheckout.createSession with cart + customer info
 *  2. Server creates a Clover HCO session → returns { href, checkoutSessionId }
 *  3. Client redirects to href (Clover-hosted payment page)
 *  4. After payment, Clover redirects to /order-success?payment=clover&session_id=<checkoutSessionId>
 *  5. Server webhook (POST /api/clover/webhook) receives payment event
 *     → confirms order + pushes to Clover POS printers
 *  6. Client polls trpc.cloverCheckout.getOrderRefBySession to show tracking link
 *
 * Docs: https://docs.clover.com/dev/docs/creating-a-hosted-checkout-session
 */

import axios from "axios";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, sql, and, gte, lt } from "drizzle-orm";
import { publicProcedure, router } from "./_core/trpc";
import { CLOVER_ENV } from "./_core/env";
import { pushOrderToClover } from "./cloverSync";
import { getDb } from "./db";
import { scheduledOrders, orderItems } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { sendOrderConfirmationSms } from "./_core/sms";

// ── Constants ─────────────────────────────────────────────────────────────────

const HCO_BASE = "https://checkout.clover.com";
const STORE_TIMEZONE = "America/Los_Angeles";
const STORE_OPEN_HOUR = 10;
const STORE_CLOSE_HOUR = 22;
const PIZZA_CAPACITY_PER_HOUR = 80;

// NV sales tax: 8.375% → rate integer = 8375000 (rate * 100000)
const NV_TAX_RATE = 8375000;
const NV_TAX_NAME = "NV Sales Tax (8.375%)";

// ── Helpers ───────────────────────────────────────────────────────────────────

function cloverEcomHeaders() {
  return {
    Authorization: `Bearer ${CLOVER_ENV.apiToken}`,
    "Content-Type": "application/json",
    "X-Clover-Merchant-Id": CLOVER_ENV.merchantId,
  };
}

function nowInStoreTimezone(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: STORE_TIMEZONE }));
}

function isStoreOpen(): boolean {
  const h = nowInStoreTimezone().getHours();
  return h >= STORE_OPEN_HOUR && h < STORE_CLOSE_HOUR;
}

function generateOrderRef(id: number): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `NPZ-${date}-${String(id).padStart(4, "0")}`;
}

function countPizzas(items: CartItemInput[]): number {
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

// ── Zod Schemas ───────────────────────────────────────────────────────────────

const CartItemInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  quantity: z.number().default(1),
  category: z.string().optional(),
});

type CartItemInput = z.infer<typeof CartItemInputSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

// ── tRPC Router ───────────────────────────────────────────────────────────────

export const cloverCheckoutRouter = router({
  /**
   * Create a Clover Hosted Checkout session.
   * Stores a pending order in DB and returns the Clover redirect URL.
   */
  createSession: publicProcedure
    .input(
      z.object({
        items: z.array(CartItemInputSchema).min(1),
        orderType: z.enum(["pickup", "delivery", "dine-in"]),
        customerName: z.string().min(1),
        customerPhone: z.string().min(1),
        customerEmail: z.string().email().optional(),
        deliveryAddress: z.string().optional(),
        isAsap: z.boolean(),
        scheduledAt: z.number(), // UTC ms
        scheduledLabel: z.string().optional(),
        subtotal: z.number(),
        discountAmount: z.number().default(0),
        convenienceFee: z.number().default(0),
        salesTax: z.number(),
        total: z.number(),
        couponCode: z.string().optional(),
        specialInstructions: z.string().optional(),
        uberQuoteId: z.string().optional(),
        origin: z.string(), // window.location.origin
      })
    )
    .mutation(async ({ input }) => {
      if (!CLOVER_ENV.apiToken || !CLOVER_ENV.merchantId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Clover payment is not configured. Please contact the restaurant.",
        });
      }

      // Validate business hours
      const slotDate = new Date(input.scheduledAt);
      const slotLocal = new Date(slotDate.toLocaleString("en-US", { timeZone: STORE_TIMEZONE }));
      const slotHour = slotLocal.getHours();

      if (!input.isAsap) {
        if (slotHour < STORE_OPEN_HOUR || slotHour >= STORE_CLOSE_HOUR) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Scheduled orders are only accepted between 10:00 AM and 10:00 PM.",
          });
        }
        const storeNow = nowInStoreTimezone();
        const minLeadMs = input.orderType === "delivery" ? 45 * 60 * 1000 : 15 * 60 * 1000;
        const minLeadLabel = input.orderType === "delivery" ? "45 minutes" : "15 minutes";
        if (input.scheduledAt < storeNow.getTime() + minLeadMs) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Please schedule your ${input.orderType} order at least ${minLeadLabel} in advance.`,
          });
        }
      } else {
        if (!isStoreOpen()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "We're currently closed (10:00 AM – 10:00 PM). Please schedule your order for when we open.",
          });
        }
      }

      // Check pizza capacity
      const pizzaCount = countPizzas(input.items);
      if (pizzaCount > 0) {
        const db = await requireDb();
        const hourStart = new Date(slotLocal);
        hourStart.setMinutes(0, 0, 0);
        const hourEnd = new Date(slotLocal);
        hourEnd.setMinutes(59, 59, 999);

        const [capacityRow] = await db
          .select({ total: sql<number>`COALESCE(SUM(${scheduledOrders.pizzaCount}), 0)` })
          .from(scheduledOrders)
          .where(
            and(
              gte(scheduledOrders.scheduledAt, hourStart.getTime()),
              lt(scheduledOrders.scheduledAt, hourEnd.getTime() + 1),
              sql`${scheduledOrders.status} NOT IN ('cancelled', 'pending_payment')`
            )
          );

        const currentPizzas = Number(capacityRow?.total ?? 0);
        if (currentPizzas + pizzaCount > PIZZA_CAPACITY_PER_HOUR) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `This time slot is at capacity (${currentPizzas}/${PIZZA_CAPACITY_PER_HOUR} pizzas). Please choose a different time.`,
          });
        }
      }

      // Build Clover HCO line items (prices in cents)
      const lineItems: Array<{
        name: string;
        price: number;
        unitQty: number;
        taxRates?: Array<{ name: string; rate: number }>;
      }> = input.items.map((item) => ({
        name: item.name,
        price: Math.round(item.price * 100),
        unitQty: item.quantity ?? 1,
        taxRates: [{ name: NV_TAX_NAME, rate: NV_TAX_RATE }],
      }));

      if (input.convenienceFee > 0) {
        lineItems.push({
          name: "Convenience Fee (3%)",
          price: Math.round(input.convenienceFee * 100),
          unitQty: 1,
        });
      }

      if (input.discountAmount > 0) {
        lineItems.push({
          name: `Discount${input.couponCode ? ` (${input.couponCode})` : ""}`,
          price: -Math.round(input.discountAmount * 100),
          unitQty: 1,
        });
      }

      // Build order note
      const noteLines = [
        `Type: ${input.orderType.toUpperCase()}`,
        input.isAsap
          ? "When: ASAP"
          : `Scheduled: ${input.scheduledLabel ?? new Date(input.scheduledAt).toLocaleString("en-US", { timeZone: STORE_TIMEZONE })}`,
        input.deliveryAddress ? `Deliver to: ${input.deliveryAddress}` : null,
        input.customerPhone ? `Phone: ${input.customerPhone}` : null,
        input.specialInstructions ? `Note: ${input.specialInstructions}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const nameParts = input.customerName.trim().split(/\s+/);
      const firstName = nameParts[0] ?? input.customerName;
      const lastName = nameParts.slice(1).join(" ") || "-";

      const successUrl = `${input.origin}/order-success?payment=clover&session_id={checkoutSessionId}`;

      const payload = {
        customer: {
          firstName,
          lastName,
          ...(input.customerEmail ? { email: input.customerEmail } : {}),
          ...(input.customerPhone ? { phoneNumber: input.customerPhone } : {}),
        },
        shoppingCart: {
          lineItems,
          note: noteLines,
        },
        redirectUrls: {
          success: successUrl,
          failure: `${input.origin}/?checkout=failed`,
          cancel: `${input.origin}/?checkout=cancelled`,
        },
      };

      let href: string;
      let checkoutSessionId: string;

      try {
        const res = await axios.post(
          `${HCO_BASE}/invoicingcheckoutservice/v1/checkouts`,
          payload,
          { headers: cloverEcomHeaders() }
        );
        href = res.data.href;
        checkoutSessionId = res.data.checkoutSessionId;
      } catch (err: unknown) {
        const msg = axios.isAxiosError(err)
          ? `Clover error ${err.response?.status}: ${JSON.stringify(err.response?.data)}`
          : String(err);
        console.error("[CloverCheckout]", msg);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payment service unavailable. Please try again or call us." });
      }

      // Store pending order in DB
      const db = await requireDb();
      const [insertResult] = await db.insert(scheduledOrders).values({
        orderRef: `NPZ-PENDING-${Date.now()}`,
        status: "pending_payment",
        orderType: input.orderType,
        scheduledAt: input.scheduledAt,
        isAsap: input.isAsap,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        deliveryAddress: input.deliveryAddress ?? null,
        items: input.items,
        pizzaCount,
        subtotal: String(input.subtotal),
        discountAmount: String(input.discountAmount),
        convenienceFee: String(input.convenienceFee),
        salesTax: String(input.salesTax),
        total: String(input.total),
        couponCode: input.couponCode ?? null,
        paymentMethod: "clover",
        paymentStatus: "pending",
        cloverSessionId: checkoutSessionId,
        refundedAmount: "0",
        specialInstructions: input.uberQuoteId
          ? JSON.stringify({ uberQuoteId: input.uberQuoteId, note: input.specialInstructions ?? "" })
          : (input.specialInstructions ?? null),
      });

      const orderId = (insertResult as { insertId: number }).insertId;
      const orderRef = generateOrderRef(orderId);
      await db
        .update(scheduledOrders)
        .set({ orderRef })
        .where(eq(scheduledOrders.id, orderId));

      // Insert line items
      for (const item of input.items) {
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
          description: item.description ?? null,
          unitPrice: String(item.price),
          quantity: item.quantity ?? 1,
          lineTotal: String(item.price * (item.quantity ?? 1)),
          isPizza,
          status: "active",
          refundedAmount: "0",
        });
      }

      return { href, checkoutSessionId, orderRef };
    }),

  /**
   * Get the internal orderRef for a Clover checkout session.
   * Called by OrderSuccess page to show the tracking link.
   */
  getOrderRefBySession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select({
          orderRef: scheduledOrders.orderRef,
          status: scheduledOrders.status,
          paymentStatus: scheduledOrders.paymentStatus,
          customerName: scheduledOrders.customerName,
          customerPhone: scheduledOrders.customerPhone,
          orderType: scheduledOrders.orderType,
          total: scheduledOrders.total,
          deliveryAddress: scheduledOrders.deliveryAddress,
          items: scheduledOrders.items,
          scheduledAt: scheduledOrders.scheduledAt,
          isAsap: scheduledOrders.isAsap,
          specialInstructions: scheduledOrders.specialInstructions,
        })
        .from(scheduledOrders)
        .where(eq(scheduledOrders.cloverSessionId, input.sessionId))
        .limit(1);

      if (!rows.length) return null;
      const row = rows[0]!;
      // Extract uberQuoteId stored as JSON in specialInstructions
      let uberQuoteId: string | null = null;
      if (row.specialInstructions) {
        try {
          const meta = JSON.parse(row.specialInstructions) as { uberQuoteId?: string };
          uberQuoteId = meta.uberQuoteId ?? null;
        } catch { /* plain text note, no uberQuoteId */ }
      }
      return { ...row, uberQuoteId };
    }),
});

// ── Webhook handler (called from Express route) ───────────────────────────────

/**
 * Handle Clover Hosted Checkout webhook events.
 * Called from the Express route POST /api/clover/webhook.
 */
export async function handleCloverWebhook(body: unknown): Promise<void> {
  const payload = body as {
    type?: string;
    data?: {
      object?: {
        checkoutSessionId?: string;
        amount?: number;
        status?: string;
        id?: string;
      };
    };
  };

  const eventType = payload?.type ?? "";
  const obj = payload?.data?.object;
  const sessionId = obj?.checkoutSessionId;

  console.log(`[CloverWebhook] Event: ${eventType}, session: ${sessionId ?? "none"}`);

  if (!sessionId) {
    console.warn("[CloverWebhook] No checkoutSessionId in payload, skipping");
    return;
  }

  const isSuccess =
    eventType === "payment.processed" ||
    eventType === "charge.succeeded" ||
    obj?.status === "succeeded" ||
    obj?.status === "paid";

  if (!isSuccess) {
    console.log(`[CloverWebhook] Ignoring non-success event: ${eventType}`);
    return;
  }

  let db: Awaited<ReturnType<typeof getDb>>;
  try {
    db = await getDb();
    if (!db) throw new Error("DB unavailable");
  } catch {
    console.error("[CloverWebhook] Database unavailable, cannot process event");
    return;
  }

  const rows = await db
    .select()
    .from(scheduledOrders)
    .where(eq(scheduledOrders.cloverSessionId, sessionId))
    .limit(1);

  if (!rows.length) {
    console.warn(`[CloverWebhook] No order found for session ${sessionId}`);
    return;
  }

  const order = rows[0];

  // Idempotency
  if (order.paymentStatus === "paid") {
    console.log(`[CloverWebhook] Order ${order.orderRef} already confirmed, skipping`);
    return;
  }

  // Confirm the order
  await db
    .update(scheduledOrders)
    .set({
      paymentStatus: "paid",
      status: "confirmed",
      cloverPaymentId: obj?.id ?? null,
    })
    .where(eq(scheduledOrders.cloverSessionId, sessionId));

  // Fetch line items
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  // Push to Clover POS printers and save the Clover order ID
  pushOrderToClover({
    items: items.map((i) => ({
      name: i.name,
      price: Number(i.unitPrice),
      quantity: i.quantity,
      description: i.description ?? undefined,
    })),
    orderType: order.orderType as "delivery" | "pickup" | "dine-in",
    customerName: order.customerName ?? undefined,
    customerPhone: order.customerPhone ?? undefined,
    externalId: sessionId,
    totalCents: Math.round(Number(order.total) * 100),
    scheduledAt: order.scheduledAt ?? undefined,
    orderRef: order.orderRef,
  }).then(async (result) => {
    // Save the Clover POS order ID so admin can link directly to Clover Dashboard
    try {
      const dbInner = await getDb();
      if (dbInner && result.cloverOrderId) {
        await dbInner
          .update(scheduledOrders)
          .set({ cloverOrderId: result.cloverOrderId })
          .where(eq(scheduledOrders.cloverSessionId, sessionId));
        console.log(`[CloverWebhook] Saved cloverOrderId ${result.cloverOrderId} for order ${order.orderRef}`);
      }
    } catch (e) {
      console.warn("[CloverWebhook] Failed to save cloverOrderId:", e);
    }
  }).catch((err) => {
    console.error(`[CloverWebhook] Failed to push order ${order.orderRef} to POS:`, err);
  });

  // Send SMS confirmation to customer (fire-and-forget)
  if (order.customerPhone) {
    const origin = process.env.NODE_ENV === "production"
      ? "https://napolipizzerianorthlasvegas.com"
      : "https://tradevault-brxvwswy.manus.space";
    sendOrderConfirmationSms({
      customerPhone: order.customerPhone,
      customerName: order.customerName ?? "Customer",
      orderRef: order.orderRef,
      orderType: order.orderType as "pickup" | "delivery" | "dine-in",
      total: order.total,
      isAsap: order.isAsap ?? false,
      scheduledAt: order.scheduledAt ?? undefined,
      origin,
    }).catch((err) => {
      console.error(`[CloverWebhook] SMS failed for ${order.orderRef}:`, err);
    });
  }

  // Notify owner
  const scheduledStr = order.scheduledAt
    ? new Date(order.scheduledAt).toLocaleString("en-US", {
        timeZone: STORE_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "ASAP";

  await notifyOwner({
    title: `🛒 New Order ${order.orderRef} — $${Number(order.total).toFixed(2)} (${order.orderType})`,
    content: `Customer: ${order.customerName} | Phone: ${order.customerPhone}
Scheduled: ${order.isAsap ? "ASAP" : scheduledStr}
Total: $${Number(order.total).toFixed(2)}
Payment: Clover (session: ${sessionId})`,
  }).catch(() => {});

  console.log(`[CloverWebhook] Order ${order.orderRef} confirmed and sent to POS printers`);
}
