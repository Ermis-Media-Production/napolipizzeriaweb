import Stripe from "stripe";
import { z } from "zod";
import { STRIPE_ENV } from "./_core/env";
import { publicProcedure, router } from "./_core/trpc";
import { pushOrderToClover } from "./cloverSync";
import { markWebhookEventProcessed } from "./db";
import type { Request, Response } from "express";

// Initialize Stripe lazily so the server can start without keys in dev
function getStripe() {
  if (!STRIPE_ENV.secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(STRIPE_ENV.secretKey, { apiVersion: "2026-04-22.dahlia" });
}

// ─── Cart item schema ──────────────────────────────────────────────────────────
const CartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  category: z.string().optional(),
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
        orderType: z.enum(["delivery", "pickup", "dine-in"]).default("pickup"),
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
        // Delivery fee in cents to add as a separate Stripe line item
        deliveryFeeCents: z.number().int().min(0).optional(),
        // Convenience fee (3%) and Nevada sales tax (8.375%) in cents
        convenienceFeeCents: z.number().int().min(0).optional(),
        salesTaxCents: z.number().int().min(0).optional(),
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
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          orderType: input.orderType,
          customerName: input.customerName ?? "",
          customerPhone: input.customerPhone ?? "",
          restaurantName: "The Original Napoli Pizzeria",
          // Serialize cart items so the webhook can push them to Clover
          cartItems: JSON.stringify(
            input.items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity }))
          ),
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
          ? (JSON.parse(session.metadata.cartItems) as Array<{ name: string; price: number; quantity: number }>)
          : [],
      };
    }),
});

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
        console.log(`[Stripe] Webhook event ${event.id} already processed — skipping Clover sync`);
        break;
      }

      // Push order to Clover POS (fire-and-forget)
      try {
        const rawItems = session.metadata?.cartItems;
        const parsedItems: Array<{ name: string; price: number; quantity: number }> = rawItems
          ? JSON.parse(rawItems)
          : [];

        if (parsedItems.length > 0 && session.amount_total) {
          const orderType = (session.metadata?.orderType ?? "pickup") as "delivery" | "pickup" | "dine-in";
          const customerName =
            session.customer_details?.name ??
            session.metadata?.customerName ??
            undefined;
          const customerPhone =
            session.customer_details?.phone ??
            session.metadata?.customerPhone ??
            undefined;

          pushOrderToClover({
            items: parsedItems,
            orderType,
            customerName: customerName || undefined,
            customerPhone: customerPhone || undefined,
            externalId: session.id,
            totalCents: session.amount_total,
          }).catch((err) =>
            console.error("[Clover] Failed to push Stripe order:", err)
          );
        }
      } catch (err) {
        console.error("[Clover] Error parsing Stripe session metadata:", err);
      }
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
