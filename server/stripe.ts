import Stripe from "stripe";
import { z } from "zod";
import { STRIPE_ENV } from "./_core/env";
import { publicProcedure, router } from "./_core/trpc";
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
      })
    )
    .mutation(async ({ input }) => {
      const stripe = getStripe();

      const lineItems = input.items.map((item: { id: string; name: string; price: number; quantity: number; category?: string }) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            metadata: { category: item.category ?? "food" },
          },
          unit_amount: Math.round(item.price * 100), // cents
        },
        quantity: item.quantity,
      }));

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
