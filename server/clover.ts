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
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
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
   *
   * Only two kitchen printers are used:
   *   "Pizza" → pizza items
   *   "Food"  → everything else (wings, burgers, pasta, drinks, desserts, etc.)
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

      // Group by printer for a summary view (only Pizza and Food kitchen printers)
      const summary: Record<string, string[]> = {
        [CLOVER_PRINTER_LABELS.PIZZA]: [],
        [CLOVER_PRINTER_LABELS.FOOD]: [],
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

  /**
   * Live orders for the Manager Portal.
   * Returns today's Clover orders with full line items, customer note, and state.
   * Designed for 15-second polling from the admin live board.
   */
  liveOrders: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(200).default(100),
        /** Filter by state: open | paid | all */
        filter: z.enum(["open", "paid", "all"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      if (!CLOVER_ENV.apiToken || !CLOVER_ENV.merchantId) {
        throw new Error("Clover credentials are not configured");
      }

      // Fetch today's orders — Clover returns UTC ms timestamps
      // We filter client-side to today in store timezone (America/Los_Angeles)
      const res = await axios.get(
        cloverUrl(
          `/orders?limit=${input.limit}&orderBy=createdTime+DESC&expand=lineItems,customers`
        ),
        { headers: cloverHeaders() }
      );

      type CloverLineItem = {
        id: string;
        name: string;
        price: number;
        note?: string;
        unitQty?: number;
        modifications?: { elements: Array<{ name: string; amount: number }> };
      };

      type CloverOrder = {
        id: string;
        state: string;
        total: number;
        currency: string;
        note?: string;
        createdTime: number;
        lineItems?: { elements: CloverLineItem[] };
        customers?: { elements: Array<{ id: string; firstName?: string; lastName?: string; phoneNumber?: string; email?: string }> };
      };

      const allOrders = (res.data.elements ?? []) as CloverOrder[];

      // Filter to today in store timezone
      const storeNow = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
      const storeToday = new Date(storeNow);
      const todayStart = new Date(storeToday);
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();

      const todayOrders = allOrders.filter((o) => o.createdTime >= todayStartMs);

      const filtered =
        input.filter === "all"
          ? todayOrders
          : todayOrders.filter((o) =>
              input.filter === "open" ? o.state !== "paid" : o.state === "paid"
            );

      return filtered.map((o) => {
        const customer = o.customers?.elements?.[0];
        const customerName = customer
          ? [customer.firstName, customer.lastName].filter(Boolean).join(" ")
          : null;

        // Parse order type from note field
        const note = o.note ?? "";
        const lower = note.toLowerCase();
        const orderType = lower.includes("delivery")
          ? "delivery"
          : lower.includes("dine-in") || lower.includes("dine in")
          ? "dine-in"
          : lower.includes("pick-up") || lower.includes("pickup")
          ? "pickup"
          : "unknown";

        return {
          cloverOrderId: o.id,
          state: o.state,
          total: o.total,
          currency: o.currency ?? "USD",
          note: o.note,
          createdTime: o.createdTime,
          orderType,
          customerName: customerName ?? parseCustomerNameFromNote(note),
          customerPhone: customer?.phoneNumber ?? null,
          lineItems: (o.lineItems?.elements ?? []).map((li) => ({
            id: li.id,
            name: li.name,
            price: li.price,
            note: li.note,
            modifications: (li.modifications?.elements ?? []).map((m) => ({
              name: m.name,
              amount: m.amount,
            })),
          })),
          itemCount: o.lineItems?.elements?.length ?? 0,
        };
      });
    }),

  /**
   * Today's stats for the Manager Portal dashboard.
   * Returns total revenue, order count, and average ticket from Clover.
   */
  todayStats: adminProcedure.query(async () => {
    if (!CLOVER_ENV.apiToken || !CLOVER_ENV.merchantId) {
      throw new Error("Clover credentials are not configured");
    }

    // Fetch up to 200 orders to compute today's stats
    const res = await axios.get(
      cloverUrl(`/orders?limit=200&orderBy=createdTime+DESC`),
      { headers: cloverHeaders() }
    );

    type CloverOrderBasic = { id: string; state: string; total: number; createdTime: number };
    const allOrders = (res.data.elements ?? []) as CloverOrderBasic[];

    // Filter to today in store timezone
    const storeNow = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
    const storeToday = new Date(storeNow);
    const todayStart = new Date(storeToday);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const todayOrders = allOrders.filter((o) => o.createdTime >= todayStartMs);
    const paidOrders = todayOrders.filter((o) => o.state === "paid");

    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = todayOrders.length;
    const paidCount = paidOrders.length;
    const avgTicket = paidCount > 0 ? totalRevenue / paidCount : 0;

    return {
      totalRevenueCents: totalRevenue,
      totalRevenueDollars: (totalRevenue / 100).toFixed(2),
      orderCount,
      paidCount,
      openCount: orderCount - paidCount,
      avgTicketCents: Math.round(avgTicket),
      avgTicketDollars: (avgTicket / 100).toFixed(2),
    };
  }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse customer name from Clover order note (e.g. "Customer: John Doe | ...") */
function parseCustomerNameFromNote(note: string): string | null {
  const match = note.match(/Customer:\s*([^|\n]+)/);
  return match ? match[1].trim() : null;
}
