/**
 * Clover POS Integration
 *
 * Automatically pushes confirmed online orders to the Napoli Pizzeria Clover POS
 * so kitchen staff see them in real time on their Clover devices.
 *
 * API docs: https://docs.clover.com/dev/docs/creating-custom-orders
 *
 * Flow:
 *  1. createOrder  — POST /v3/merchants/{mId}/orders  (create order shell)
 *  2. addLineItems — POST /v3/merchants/{mId}/orders/{orderId}/bulk_line_items
 *  3. Returns Clover order ID + dashboard URL to store / show on receipt
 */

import axios from "axios";
import { z } from "zod";
import { CLOVER_ENV } from "./_core/env";
import { publicProcedure, router } from "./_core/trpc";
import { pushOrderToClover, getPrinterLabel, CLOVER_PRINTER_LABELS } from "./cloverSync";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cloverHeaders() {
  return {
    Authorization: `Bearer ${CLOVER_ENV.apiToken}`,
    "Content-Type": "application/json",
  };
}

function cloverUrl(path: string) {
  return `${CLOVER_ENV.baseUrl}/v3/merchants/${CLOVER_ENV.merchantId}${path}`;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CartItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(), // in dollars
  quantity: z.number().int().positive(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const cloverRouter = router({
  /**
   * Push a completed online order to Clover POS.
   * Called server-side after payment confirmation.
   */
  createOrder: publicProcedure
    .input(
      z.object({
        items: z.array(CartItemSchema).min(1),
        orderType: z.enum(["delivery", "pickup", "dine-in"]).default("pickup"),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        note: z.string().optional(),
        externalId: z.string().optional(), // Stripe session ID or Authorize.net txn ID
        totalCents: z.number().int().positive(), // total in cents
      })
    )
    .mutation(async ({ input }) => {
      const result = await pushOrderToClover({
        items: input.items,
        orderType: input.orderType,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        externalId: input.externalId,
        totalCents: input.totalCents,
      });
      return {
        ...result,
        orderType: input.orderType,
        totalCents: input.totalCents,
      };
    }),

  /**
   * Retrieve a single Clover order by ID.
   */
  getOrder: publicProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .query(async ({ input }) => {
      if (!CLOVER_ENV.apiToken || !CLOVER_ENV.merchantId) {
        throw new Error("Clover credentials are not configured");
      }

      const res = await axios.get(
        cloverUrl(`/orders/${input.orderId}?expand=lineItems`),
        { headers: cloverHeaders() }
      );

      const order = res.data;
      return {
        cloverOrderId: order.id as string,
        state: order.state as string,
        total: order.total as number,
        currency: order.currency as string,
        note: order.note as string | undefined,
        createdTime: order.createdTime as number,
        lineItems: (order.lineItems?.elements ?? []) as Array<{
          id: string;
          name: string;
          price: number;
          unitQty: number;
        }>,
      };
    }),

  /**
   * Preview which Clover kitchen printer each item name would be routed to.
   * Useful for admins to verify routing before a real order is placed.
   */
  previewPrinterRouting: publicProcedure
    .input(
      z.object({
        items: z.array(z.object({ name: z.string().min(1) })).min(1),
      })
    )
    .query(({ input }) => {
      const routing = input.items.map((item) => ({
        name: item.name,
        printer: getPrinterLabel(item.name),
      }));

      // Group by printer for a summary view
      const summary: Record<string, string[]> = {
        [CLOVER_PRINTER_LABELS.PIZZA]: [],
        [CLOVER_PRINTER_LABELS.PIZZERIA]: [],
        [CLOVER_PRINTER_LABELS.FOOD]: [],
        [CLOVER_PRINTER_LABELS.BAR_DRINKS]: [],
      };
      for (const r of routing) {
        summary[r.printer].push(r.name);
      }

      return { routing, summary };
    }),

  /**
   * List recent Clover orders (most recent first, up to 20).
   */
  listOrders: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      if (!CLOVER_ENV.apiToken || !CLOVER_ENV.merchantId) {
        throw new Error("Clover credentials are not configured");
      }

      const res = await axios.get(
        cloverUrl(`/orders?limit=${input.limit}&orderBy=createdTime+DESC&expand=lineItems`),
        { headers: cloverHeaders() }
      );

      const orders = (res.data.elements ?? []) as Array<{
        id: string;
        state: string;
        total: number;
        currency: string;
        note?: string;
        createdTime: number;
        lineItems?: { elements: Array<{ id: string; name: string; price: number }> };
      }>;

      return orders.map((o) => ({
        cloverOrderId: o.id,
        state: o.state,
        total: o.total,
        currency: o.currency,
        note: o.note,
        createdTime: o.createdTime,
        itemCount: o.lineItems?.elements?.length ?? 0,
        lineItems: (o.lineItems?.elements ?? []).map((li) => ({
          id: li.id,
          name: li.name,
          price: li.price,
        })),
      }));
    }),
});
