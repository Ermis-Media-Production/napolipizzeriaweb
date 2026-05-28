/**
 * Stripe router + webhook handler
 *
 * Changes from original:
 * - createCheckoutSession now accepts scheduling fields (scheduledAt, isAsap, customerEmail,
 *   deliveryAddress, subtotal, discountAmount, convenienceFee, salesTax, specialInstructions)
 *   and stores them in Stripe session metadata.
 * - Webhook handler creates a scheduledOrders row after payment succeeds.
 * - New getOrderRefBySession query lets OrderSuccess recover the orderRef from a session_id.
 */
import Stripe from "stripe";
import { z } from "zod";
import { STRIPE_ENV } from "./_core/env";
import { publicProcedure, router } from "./_core/trpc";
import { markWebhookEventProcessed } from "./db";
import type { Request, Response } from "express";
import { getDb } from "./db";
import { scheduledOrders, orderItems } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { pushOrderToClover } from "./cloverSync";

// Initialize Stripe lazily so the server can start without keys in dev
function getStripe() {
  if (!STRIPE_ENV.secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(STRIPE_ENV.secretKey, { apiVersion: "2026-04-22.dahlia" });
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Cart item schema ──────────────────────────────────────────────────────────
const CartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  category: z.string().optional(),
  description: z.string().optional(),
});

// ─── tRPC router ──────────────────────────────────────────────────────────────
export const stripeRouter = router({
  /**
   * Create a Stripe Checkout Session for the given cart.
   * Returns a URL to redirect the customer to.
   */
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        items: z.array(CartItemSchema).min(1),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        customerEmail: z.string().optional(),
        orderType: z.enum(["delivery", "pickup", "dine-in"]).default("pickup"),
        // Scheduling fields
        scheduledAt: z.number().optional(),
        isAsap: z.boolean().optional(),
        specialInstructions: z.string().optional(),
        // Delivery provider fields (only for delivery orders)
        deliveryProvider: z.enum(["uber", "doordash"]).optional(),
        // Uber Direct fields
        uberQuoteId: z.string().optional(),
        // DoorDash Drive fields
        doordashExternalId: z.string().optional(),
        // Common dropoff fields
        dropoffAddress: z.string().optional(),
        dropoffCity: z.string().optional(),
        dropoffState: z.string().optional(),
        dropoffZip: z.string().optional(),
        dropoffNotes: z.string().optional(),
        // Coupon / discount fields
        couponCode: z.string().optional(),
        discountPercent: z.number().int().min(1).max(100).optional(),
        // Pricing breakdown (dollars)
        subtotal: z.number().optional(),
        discountAmount: z.number().optional(),
        // Delivery fee in cents to add as a separate Stripe line item
        deliveryFeeCents: z.number().int().min(0).optional(),
        // Convenience fee (3%) and Nevada sales tax (8.375%) in cents
        convenienceFeeCents: z.number().int().min(0).optional(),
        salesTaxCents: z.number().int().min(0).optional(),
        // Dollar amounts for order record
        convenienceFee: z.number().optional(),
        salesTax: z.number().optional(),
        total: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const stripe = getStripe();

      // Apply discount: if discountPercent is provided, reduce each item's unit_amount proportionally
      const discountMultiplier = input.discountPercent ? (100 - input.discountPercent) / 100 : 1;

      type StripeLineItem = { price_data: { currency: string; product_data: { name: string; metadata?: Record<string, string> }; unit_amount: number }; quantity: number };
      const lineItems: StripeLineItem[] = input.items.map((item: { id: string; name: string; price: number; quantity: number; category?: string }) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            metadata: { category: item.category ?? "food" },
          },
          unit_amount: Math.round(item.price * 100 * discountMultiplier), // cents, with discount applied
        },
        quantity: item.quantity,
      }));

      // Add Convenience Fee as a separate line item (non-taxable)
      if (input.convenienceFeeCents && input.convenienceFeeCents > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: "Convenience Fee" },
            unit_amount: input.convenienceFeeCents,
          },
          quantity: 1,
        });
      }

      // Add Nevada Sales Tax as a separate line item
      if (input.salesTaxCents && input.salesTaxCents > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: "Sales Tax (NV 8.375%)" },
            unit_amount: input.salesTaxCents,
          },
          quantity: 1,
        });
      }

      // Add delivery fee as a separate line item if provided
      if (input.deliveryFeeCents && input.deliveryFeeCents > 0) {
        const providerLabel = input.deliveryProvider === "doordash" ? "DoorDash Drive" : "Uber Direct";
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: `Delivery Fee (${providerLabel})` },
            unit_amount: input.deliveryFeeCents,
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        // Omitting payment_method_types lets Stripe Dashboard control which methods
        // are shown, including Apple Pay, Google Pay, Link, and card.
        // Apple Pay and Google Pay are automatically shown when available.
        payment_method_types: ["card", "link", "amazon_pay", "cashapp"],
        line_items: lineItems,
        mode: "payment",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          orderType: input.orderType,
          customerName: input.customerName ?? "",
          customerPhone: input.customerPhone ?? "",
          customerEmail: input.customerEmail ?? "",
          restaurantName: "The Original Napoli Pizzeria",
          // Serialize cart items so the webhook can push them to Clover and create the order
          cartItems: JSON.stringify(
            input.items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: i.category ?? "", description: i.description ?? "" }))
          ),
          // Scheduling fields
          scheduledAt: input.scheduledAt ? String(input.scheduledAt) : "",
          isAsap: input.isAsap ? "true" : "false",
          specialInstructions: input.specialInstructions ?? "",
          // Delivery provider fields stored for post-payment dispatch on OrderSuccess
          deliveryProvider: input.deliveryProvider ?? "uber",
          uberQuoteId: input.uberQuoteId ?? "",
          doordashExternalId: input.doordashExternalId ?? "",
          dropoffAddress: input.dropoffAddress ?? "",
          dropoffCity: input.dropoffCity ?? "",
          dropoffState: input.dropoffState ?? "",
          dropoffZip: input.dropoffZip ?? "",
          dropoffNotes: input.dropoffNotes ?? "",
          // Coupon tracking
          couponCode: input.couponCode ?? "",
          discountPercent: input.discountPercent ? String(input.discountPercent) : "",
          // Pricing breakdown (dollars as strings)
          subtotal: input.subtotal ? String(input.subtotal) : "",
          discountAmount: input.discountAmount ? String(input.discountAmount) : "0",
          convenienceFee: input.convenienceFee ? String(input.convenienceFee) : "0",
          salesTax: input.salesTax ? String(input.salesTax) : "0",
          total: input.total ? String(input.total) : "",
        },
        custom_text: {
          submit: {
            message: `Order type: ${input.orderType}. Thank you for ordering from Napoli Pizzeria!`,
          },
        },
        phone_number_collection: { enabled: true },
      });

      return { url: session.url, sessionId: session.id };
    }),

  /**
   * Create a PaymentIntent for embedded Stripe Elements checkout.
   * Returns a clientSecret for the frontend to confirm the payment.
   */
  createPaymentIntent: publicProcedure
    .input(
      z.object({
        items: z.array(CartItemSchema).min(1),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        customerEmail: z.string().optional(),
        orderType: z.enum(["delivery", "pickup", "dine-in"]).default("pickup"),
        scheduledAt: z.number().optional(),
        isAsap: z.boolean().optional(),
        specialInstructions: z.string().optional(),
        uberQuoteId: z.string().optional(),
        dropoffAddress: z.string().optional(),
        dropoffCity: z.string().optional(),
        dropoffState: z.string().optional(),
        dropoffZip: z.string().optional(),
        dropoffNotes: z.string().optional(),
        couponCode: z.string().optional(),
        discountPercent: z.number().int().min(1).max(100).optional(),
        subtotal: z.number().optional(),
        discountAmount: z.number().optional(),
        deliveryFeeCents: z.number().int().min(0).optional(),
        convenienceFeeCents: z.number().int().min(0).optional(),
        salesTaxCents: z.number().int().min(0).optional(),
        convenienceFee: z.number().optional(),
        salesTax: z.number().optional(),
        total: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const stripe = getStripe();

      // Compute total in cents
      const itemsCents = input.items.reduce((sum, item) => {
        const discountMultiplier = input.discountPercent ? (100 - input.discountPercent) / 100 : 1;
        return sum + Math.round(item.price * 100 * discountMultiplier) * item.quantity;
      }, 0);
      const totalCents =
        itemsCents +
        (input.convenienceFeeCents ?? 0) +
        (input.salesTaxCents ?? 0) +
        (input.deliveryFeeCents ?? 0);

      const intent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          orderType: input.orderType,
          customerName: input.customerName ?? "",
          customerPhone: input.customerPhone ?? "",
          customerEmail: input.customerEmail ?? "",
          restaurantName: "The Original Napoli Pizzeria",
          cartItems: JSON.stringify(
            input.items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: i.category ?? "", description: i.description ?? "" }))
          ),
          scheduledAt: input.scheduledAt ? String(input.scheduledAt) : "",
          isAsap: input.isAsap ? "true" : "false",
          specialInstructions: input.specialInstructions ?? "",
          uberQuoteId: input.uberQuoteId ?? "",
          dropoffAddress: input.dropoffAddress ?? "",
          dropoffCity: input.dropoffCity ?? "",
          dropoffState: input.dropoffState ?? "",
          dropoffZip: input.dropoffZip ?? "",
          dropoffNotes: input.dropoffNotes ?? "",
          couponCode: input.couponCode ?? "",
          discountPercent: input.discountPercent ? String(input.discountPercent) : "",
          subtotal: input.subtotal ? String(input.subtotal) : "",
          discountAmount: input.discountAmount ? String(input.discountAmount) : "0",
          convenienceFee: input.convenienceFee ? String(input.convenienceFee) : "0",
          salesTax: input.salesTax ? String(input.salesTax) : "0",
          total: input.total ? String(input.total) : String(totalCents / 100),
        },
      });

      return { clientSecret: intent.client_secret!, paymentIntentId: intent.id };
    }),

  /**
   * Look up the orderRef for a completed PaymentIntent.
   * Used by OrderSuccess after embedded checkout.
   */
  getOrderRefByPaymentIntent: publicProcedure
    .input(z.object({ paymentIntentId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { orderRef: null };
      const [order] = await db
        .select({ orderRef: scheduledOrders.orderRef })
        .from(scheduledOrders)
        .where(eq(scheduledOrders.transactionId, input.paymentIntentId))
        .limit(1);
      return { orderRef: order?.orderRef ?? null };
    }),

  /**
   * Retrieve a checkout session to verify payment status.
   */
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
        expand: ["line_items"],
      });
      return {
        status: session.payment_status,
        customerEmail: session.customer_details?.email ?? null,
        customerName: session.customer_details?.name ?? null,
        customerPhone: session.customer_details?.phone ?? null,
        amountTotal: session.amount_total ? session.amount_total / 100 : 0,
        orderType: session.metadata?.orderType ?? "pickup",
        // Delivery provider fields
        deliveryProvider: (session.metadata?.deliveryProvider as "uber" | "doordash" | null) || "uber",
        uberQuoteId: session.metadata?.uberQuoteId || null,
        doordashExternalId: session.metadata?.doordashExternalId || null,
        dropoffAddress: session.metadata?.dropoffAddress || null,
        dropoffCity: session.metadata?.dropoffCity || null,
        dropoffState: session.metadata?.dropoffState || null,
        dropoffZip: session.metadata?.dropoffZip || null,
        dropoffNotes: session.metadata?.dropoffNotes || null,
        // Cart items stored in metadata during checkout
        cartItems: session.metadata?.cartItems
          ? (JSON.parse(session.metadata.cartItems) as Array<{ id: string; name: string; price: number; quantity: number; category?: string; description?: string }>)
          : [],
      };
    }),

  /**
   * Look up the orderRef for a completed Stripe session.
   * Used by OrderSuccess to show the order tracking link.
   */
  getOrderRefBySession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { orderRef: null };

      // The transactionId for Stripe orders is stored as the session ID
      const [order] = await db
        .select({ orderRef: scheduledOrders.orderRef })
        .from(scheduledOrders)
        .where(eq(scheduledOrders.transactionId, input.sessionId))
        .limit(1);

      return { orderRef: order?.orderRef ?? null };
    }),

  /**
   * Retrieve PaymentIntent details for the embedded checkout flow.
   * Returns the same shape as getSession so OrderSuccess can use either.
   */
  getPaymentIntentDetails: publicProcedure
    .input(z.object({ paymentIntentId: z.string() }))
    .query(async ({ input }) => {
      const stripe = getStripe();
      const intent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
      const meta = intent.metadata ?? {};
      return {
        status: intent.status === "succeeded" ? "paid" : intent.status,
        customerName: meta.customerName || null,
        customerPhone: meta.customerPhone || null,
        customerEmail: meta.customerEmail || null,
        amountTotal: intent.amount ? intent.amount / 100 : 0,
        orderType: (meta.orderType ?? "pickup") as "delivery" | "pickup" | "dine-in",
        uberQuoteId: meta.uberQuoteId || null,
        dropoffAddress: meta.dropoffAddress || null,
        dropoffCity: meta.dropoffCity || null,
        dropoffState: meta.dropoffState || null,
        dropoffZip: meta.dropoffZip || null,
        dropoffNotes: meta.dropoffNotes || null,
        cartItems: meta.cartItems
          ? (JSON.parse(meta.cartItems) as Array<{ id: string; name: string; price: number; quantity: number; category?: string; description?: string }>)
          : [],
      };
    }),
});

// ─── Scheduled order creation helper (called from webhook) ────────────────────

async function createScheduledOrderFromStripe(session: Stripe.Checkout.Session): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const meta = session.metadata ?? {};

  // Parse cart items
  let items: Array<{ id: string; name: string; price: number; quantity: number; category?: string; description?: string }> = [];
  try {
    items = meta.cartItems ? JSON.parse(meta.cartItems) : [];
  } catch {
    console.error("[Stripe] Failed to parse cartItems from metadata");
    return null;
  }

  if (!items.length) return null;

  const customerName = session.customer_details?.name ?? meta.customerName ?? "Customer";
  const customerPhone = session.customer_details?.phone ?? meta.customerPhone ?? "N/A";
  const customerEmail = session.customer_details?.email ?? meta.customerEmail ?? null;
  const orderType = (meta.orderType ?? "pickup") as "delivery" | "pickup" | "dine-in";
  const isAsap = meta.isAsap === "true";
  const scheduledAt = meta.scheduledAt ? parseInt(meta.scheduledAt) : Date.now();
  const deliveryAddress = meta.dropoffAddress
    ? `${meta.dropoffAddress}, ${meta.dropoffCity ?? ""}, ${meta.dropoffState ?? ""} ${meta.dropoffZip ?? ""}`.trim()
    : null;

  // Pricing
  const subtotal = meta.subtotal ? parseFloat(meta.subtotal) : (session.amount_total ?? 0) / 100;
  const discountAmount = meta.discountAmount ? parseFloat(meta.discountAmount) : 0;
  const convenienceFee = meta.convenienceFee ? parseFloat(meta.convenienceFee) : 0;
  const salesTax = meta.salesTax ? parseFloat(meta.salesTax) : 0;
  const total = meta.total ? parseFloat(meta.total) : (session.amount_total ?? 0) / 100;

  const pizzaCount = countPizzas(items);

  // Clamp scheduledAt to business hours (10 AM – 10 PM LA time)
  // If the stored scheduledAt is outside hours (shouldn't happen via UI, but guard anyway)
  const STORE_TZ = "America/Los_Angeles";
  const slotLocal = new Date(new Date(scheduledAt).toLocaleString("en-US", { timeZone: STORE_TZ }));
  const slotHour = slotLocal.getHours();
  const OPEN_HOUR = 10;
  const CLOSE_HOUR = 22;
  let safeScheduledAt = scheduledAt;
  if (!isAsap && (slotHour < OPEN_HOUR || slotHour >= CLOSE_HOUR)) {
    // Clamp to next 10 AM opening
    const nextOpen = new Date(slotLocal);
    if (slotHour >= CLOSE_HOUR) nextOpen.setDate(nextOpen.getDate() + 1);
    nextOpen.setHours(OPEN_HOUR, 0, 0, 0);
    safeScheduledAt = nextOpen.getTime();
    console.warn(`[Stripe] scheduledAt ${scheduledAt} was outside business hours; clamped to ${safeScheduledAt}`);
  }

  try {
    const [insertResult] = await db.insert(scheduledOrders).values({
      orderRef: `NPZ-TEMP-${Date.now()}`,
      status: "confirmed",
      orderType,
      scheduledAt: safeScheduledAt,
      isAsap,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      items,
      pizzaCount,
      subtotal: String(subtotal),
      discountAmount: String(discountAmount),
      convenienceFee: String(convenienceFee),
      salesTax: String(salesTax),
      total: String(total),
      couponCode: meta.couponCode || null,
      transactionId: session.id, // Store Stripe session ID as transactionId for lookup
      authCode: null,
      refundedAmount: "0",
      specialInstructions: meta.specialInstructions || null,
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
        status: "active",
        refundedAmount: "0",
      });
    }

    // Notify owner
    const scheduledDate = new Date(scheduledAt).toLocaleString("en-US", {
      timeZone: STORE_TIMEZONE,
      dateStyle: "medium",
      timeStyle: "short",
    });

    await notifyOwner({
      title: `🛒 New Stripe Order ${orderRef} — $${total.toFixed(2)} (${orderType})`,
      content: `Customer: ${customerName} | Phone: ${customerPhone}
Scheduled: ${isAsap ? "ASAP" : scheduledDate}
Items: ${items.map((i) => `${i.quantity ?? 1}x ${i.name}`).join(", ")}
Total: $${total.toFixed(2)}${meta.couponCode ? ` (coupon: ${meta.couponCode})` : ""}
Stripe Session: ${session.id}`,
    }).catch(() => {});

    // Push order to Clover POS for kitchen printing and centralized reporting
    pushOrderToClover({
      items: items.map((i) => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity ?? 1,
        description: i.description ?? undefined,
      })),
      orderType: orderType as "delivery" | "pickup" | "dine-in",
      customerName,
      customerPhone,
      externalId: session.id,
      totalCents: Math.round(total * 100),
      scheduledAt: isAsap ? undefined : scheduledAt,
      orderRef,
    }).then(async (result) => {
      try {
        const dbInner = await getDb();
        if (dbInner && result.cloverOrderId) {
          await dbInner
            .update(scheduledOrders)
            .set({ cloverOrderId: result.cloverOrderId })
            .where(eq(scheduledOrders.orderRef, orderRef));
          console.log(`[Stripe] Saved cloverOrderId ${result.cloverOrderId} for order ${orderRef}`);
        }
      } catch (e) {
        console.warn("[Stripe] Failed to save cloverOrderId:", e);
      }
    }).catch((err) => {
      console.error(`[Stripe] Failed to push order ${orderRef} to Clover POS:`, err);
    });

    return orderRef;
  } catch (err) {
    console.error("[Stripe] Failed to create scheduled order:", err);
    return null;
  }
}

// ─── Order creation from PaymentIntent (embedded Elements flow) ──────────────
async function createScheduledOrderFromPaymentIntent(intent: Stripe.PaymentIntent): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const meta = intent.metadata ?? {};

  let items: Array<{ id: string; name: string; price: number; quantity: number; category?: string; description?: string }> = [];
  try {
    items = meta.cartItems ? JSON.parse(meta.cartItems) : [];
  } catch {
    console.error("[Stripe PI] Failed to parse cartItems from metadata");
    return null;
  }

  if (!items.length) return null;

  const customerName = meta.customerName || "Customer";
  const customerPhone = meta.customerPhone || "N/A";
  const customerEmail = meta.customerEmail || null;
  const orderType = (meta.orderType ?? "pickup") as "delivery" | "pickup" | "dine-in";
  const isAsap = meta.isAsap === "true";
  const scheduledAt = meta.scheduledAt ? parseInt(meta.scheduledAt) : Date.now();
  const deliveryAddress = meta.dropoffAddress
    ? `${meta.dropoffAddress}, ${meta.dropoffCity ?? ""}, ${meta.dropoffState ?? ""} ${meta.dropoffZip ?? ""}`.trim()
    : null;

  const subtotal = meta.subtotal ? parseFloat(meta.subtotal) : (intent.amount ?? 0) / 100;
  const discountAmount = meta.discountAmount ? parseFloat(meta.discountAmount) : 0;
  const convenienceFee = meta.convenienceFee ? parseFloat(meta.convenienceFee) : 0;
  const salesTax = meta.salesTax ? parseFloat(meta.salesTax) : 0;
  const total = meta.total ? parseFloat(meta.total) : (intent.amount ?? 0) / 100;
  const pizzaCount = countPizzas(items);

  try {
    const [insertResult] = await db.insert(scheduledOrders).values({
      orderRef: `NPZ-TEMP-${Date.now()}`,
      status: "confirmed",
      orderType,
      scheduledAt,
      isAsap,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      items,
      pizzaCount,
      subtotal: String(subtotal),
      discountAmount: String(discountAmount),
      convenienceFee: String(convenienceFee),
      salesTax: String(salesTax),
      total: String(total),
      couponCode: meta.couponCode || null,
      transactionId: intent.id,
      authCode: null,
      refundedAmount: "0",
      specialInstructions: meta.specialInstructions || null,
    });

    const orderId = (insertResult as { insertId: number }).insertId;
    const orderRef = generateOrderRef(orderId);

    await db.update(scheduledOrders).set({ orderRef }).where(eq(scheduledOrders.id, orderId));

    for (const item of items) {
      const isPizza =
        item.category === "pizza" || item.category === "specialty" || item.category === "calzone" ||
        item.name?.toLowerCase().includes("pizza") || item.name?.toLowerCase().includes("calzone");
      await db.insert(orderItems).values({
        orderId,
        name: item.name,
        description: item.description || null,
        unitPrice: String(item.price),
        quantity: item.quantity ?? 1,
        lineTotal: String(item.price * (item.quantity ?? 1)),
        isPizza,
        status: "active",
        refundedAmount: "0",
      });
    }

    await notifyOwner({
      title: `🛒 New Order ${orderRef} — $${total.toFixed(2)} (${orderType})`,
      content: `Customer: ${customerName} | Phone: ${customerPhone}\nScheduled: ${isAsap ? "ASAP" : new Date(scheduledAt).toLocaleString("en-US", { timeZone: STORE_TIMEZONE })}\nItems: ${items.map((i) => `${i.quantity ?? 1}x ${i.name}`).join(", ")}\nTotal: $${total.toFixed(2)}\nPaymentIntent: ${intent.id}`,
    }).catch(() => {});

    // Push order to Clover POS for kitchen printing and centralized reporting
    pushOrderToClover({
      items: items.map((i) => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity ?? 1,
        description: i.description ?? undefined,
      })),
      orderType: orderType as "delivery" | "pickup" | "dine-in",
      customerName,
      customerPhone,
      externalId: intent.id,
      totalCents: Math.round(total * 100),
      scheduledAt: isAsap ? undefined : scheduledAt,
      orderRef,
    }).then(async (result) => {
      try {
        const dbInner = await getDb();
        if (dbInner && result.cloverOrderId) {
          await dbInner
            .update(scheduledOrders)
            .set({ cloverOrderId: result.cloverOrderId })
            .where(eq(scheduledOrders.orderRef, orderRef));
          console.log(`[Stripe PI] Saved cloverOrderId ${result.cloverOrderId} for order ${orderRef}`);
        }
      } catch (e) {
        console.warn("[Stripe PI] Failed to save cloverOrderId:", e);
      }
    }).catch((err) => {
      console.error(`[Stripe PI] Failed to push order ${orderRef} to Clover POS:`, err);
    });

    return orderRef;
  } catch (err) {
    console.error("[Stripe PI] Failed to create scheduled order:", err);
    return null;
  }
}

// ─── Raw Express webhook handler (bypasses tRPC body parsing) ─────────────────
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  if (!sig || !STRIPE_ENV.webhookSecret) {
    res.status(400).send("Missing stripe-signature header or webhook secret");
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      (req as Request & { rawBody?: Buffer }).rawBody ?? req.body,
      sig,
      STRIPE_ENV.webhookSecret
    );
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    res.status(400).send("Webhook signature verification failed");
    return;
  }

  // Handle events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(
        `[Stripe] Payment completed for session ${session.id}. Order type: ${session.metadata?.orderType}`
      );

      // Idempotency guard: skip if this event was already processed (Stripe retry/replay)
      const isNew = await markWebhookEventProcessed(event.id);
      if (!isNew) {
        console.log(`[Stripe] Webhook event ${event.id} already processed — skipping`);
        break;
      }

      // Create scheduled order record
      const orderRef = await createScheduledOrderFromStripe(session);
      if (orderRef) {
        console.log(`[Stripe] Created scheduled order ${orderRef} for session ${session.id}`);
      }

      break;
    }
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.log(`[Stripe] PaymentIntent succeeded: ${intent.id}`);

      // Idempotency guard
      const isNewPI = await markWebhookEventProcessed(event.id);
      if (!isNewPI) {
        console.log(`[Stripe] Webhook event ${event.id} already processed — skipping`);
        break;
      }

      await createScheduledOrderFromPaymentIntent(intent);
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.warn(`[Stripe] Payment failed for intent ${intent.id}`);
      break;
    }
    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
}
