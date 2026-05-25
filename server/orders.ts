/**
 * Scheduled Orders Router
 * Handles order creation, capacity tracking, slot availability, and order retrieval.
 *
 * Business rules:
 * - Store hours: 10 AM – 10 PM daily (America/Los_Angeles)
 * - Pizza capacity: 80 pizzas per hour slot
 * - Scheduling window: same day (if open) up to 30 days ahead
 * - Slots are 30-minute intervals
 */

import { and, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db";
import { orderItems, scheduledOrders } from "../drizzle/schema";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";

// ── Constants ────────────────────────────────────────────────────────────────

const STORE_TIMEZONE = "America/Los_Angeles";
const STORE_OPEN_HOUR = 10; // 10 AM
const STORE_CLOSE_HOUR = 22; // 10 PM
const PIZZA_CAPACITY_PER_HOUR = 80;
const SLOT_INTERVAL_MINUTES = 30;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get current time in store's local timezone */
function nowInStoreTimezone(): Date {
  const now = new Date();
  const storeTime = new Date(now.toLocaleString("en-US", { timeZone: STORE_TIMEZONE }));
  return storeTime;
}

/** Check if the store is currently open */
function isStoreOpen(): boolean {
  const storeNow = nowInStoreTimezone();
  const hour = storeNow.getHours();
  return hour >= STORE_OPEN_HOUR && hour < STORE_CLOSE_HOUR;
}

/** Get the next opening time as UTC ms timestamp */
function getNextOpeningTime(): number {
  const storeNow = nowInStoreTimezone();
  const hour = storeNow.getHours();

  // If before opening today, open at 10 AM today
  if (hour < STORE_OPEN_HOUR) {
    const openToday = new Date(storeNow);
    openToday.setHours(STORE_OPEN_HOUR, 0, 0, 0);
    return openToday.getTime();
  }

  // Otherwise, open at 10 AM tomorrow
  const openTomorrow = new Date(storeNow);
  openTomorrow.setDate(openTomorrow.getDate() + 1);
  openTomorrow.setHours(STORE_OPEN_HOUR, 0, 0, 0);
  return openTomorrow.getTime();
}

/** Generate a unique order reference like NPZ-20260525-0042 */
function generateOrderRef(id: number): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `NPZ-${date}-${String(id).padStart(4, "0")}`;
}

/** Count pizzas in a cart items array */
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

/** Require DB or throw */
async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const CartItemInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  quantity: z.number().default(1),
  category: z.string().optional(),
});

type CartItemInput = z.infer<typeof CartItemInputSchema>;

const CreateOrderInputSchema = z.object({
  orderType: z.enum(["pickup", "delivery", "dine-in"]),
  /** UTC ms timestamp for scheduled time */
  scheduledAt: z.number(),
  isAsap: z.boolean().default(false),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional(),
  deliveryAddress: z.string().optional(),
  items: z.array(CartItemInputSchema).min(1),
  subtotal: z.number(),
  discountAmount: z.number().default(0),
  convenienceFee: z.number().default(0),
  salesTax: z.number(),
  total: z.number(),
  couponCode: z.string().optional(),
  transactionId: z.string().optional(),
  authCode: z.string().optional(),
  specialInstructions: z.string().optional(),
});

// ── Router ───────────────────────────────────────────────────────────────────

export const ordersRouter = router({
  /**
   * Returns store status and next opening time.
   */
  storeStatus: publicProcedure.query(() => {
    const open = isStoreOpen();
    const storeNow = nowInStoreTimezone();
    return {
      isOpen: open,
      currentTimeMs: storeNow.getTime(),
      nextOpeningMs: open ? null : getNextOpeningTime(),
      openHour: STORE_OPEN_HOUR,
      closeHour: STORE_CLOSE_HOUR,
      timezone: STORE_TIMEZONE,
    };
  }),

  /**
   * Returns available time slots for the next 30 days.
   * Each slot includes capacity info (pizzasBooked / pizzasCapacity).
   * Fully booked slots are included but marked as unavailable.
   */
  availableSlots: publicProcedure
    .input(
      z.object({
        /** UTC ms timestamp of the date to query (start of day) */
        dateMs: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const storeNow = nowInStoreTimezone();
      const queryDate = new Date(input.dateMs);
      const queryDateLocal = new Date(
        queryDate.toLocaleString("en-US", { timeZone: STORE_TIMEZONE })
      );

      const isToday =
        queryDateLocal.getFullYear() === storeNow.getFullYear() &&
        queryDateLocal.getMonth() === storeNow.getMonth() &&
        queryDateLocal.getDate() === storeNow.getDate();

      // Build slot list for the day (30-min intervals, 10 AM – 10 PM)
      const slots: {
        slotMs: number;
        label: string;
        pizzasBooked: number;
        pizzasCapacity: number;
        available: boolean;
      }[] = [];

      // Start of day in store timezone
      const dayStart = new Date(queryDateLocal);
      dayStart.setHours(STORE_OPEN_HOUR, 0, 0, 0);

      const dayEnd = new Date(queryDateLocal);
      dayEnd.setHours(STORE_CLOSE_HOUR, 0, 0, 0);

      // Query pizza bookings for this day
      const dayStartMs = dayStart.getTime();
      const dayEndMs = dayEnd.getTime();

      const bookings = await db
        .select({
          scheduledAt: scheduledOrders.scheduledAt,
          pizzaCount: scheduledOrders.pizzaCount,
        })
        .from(scheduledOrders)
        .where(
          and(
            gte(scheduledOrders.scheduledAt, dayStartMs),
            lt(scheduledOrders.scheduledAt, dayEndMs),
            sql`${scheduledOrders.status} NOT IN ('cancelled')`
          )
        );

      // Aggregate pizza counts per hour slot
      const pizzasByHour: Record<number, number> = {};
      for (const booking of bookings) {
        const slotDate = new Date(booking.scheduledAt);
        const slotDateLocal = new Date(
          slotDate.toLocaleString("en-US", { timeZone: STORE_TIMEZONE })
        );
        const hour = slotDateLocal.getHours();
        pizzasByHour[hour] = (pizzasByHour[hour] ?? 0) + booking.pizzaCount;
      }

      // Generate 30-min slots
      const current = new Date(dayStart);
      while (current < dayEnd) {
        const slotMs = current.getTime();
        const hour = current.getHours();
        const pizzasBooked = pizzasByHour[hour] ?? 0;

        // For today, skip slots that are in the past (need at least 15 min lead time)
        const minLeadMs = 15 * 60 * 1000;
        const isPast = isToday && slotMs < storeNow.getTime() + minLeadMs;

        const label = current.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: STORE_TIMEZONE,
        });

        slots.push({
          slotMs,
          label,
          pizzasBooked,
          pizzasCapacity: PIZZA_CAPACITY_PER_HOUR,
          available: !isPast && pizzasBooked < PIZZA_CAPACITY_PER_HOUR,
        });

        current.setMinutes(current.getMinutes() + SLOT_INTERVAL_MINUTES);
      }

      return { slots, isToday };
    }),

  /**
   * Creates a new scheduled order after payment is confirmed.
   */
  createOrder: publicProcedure
    .input(CreateOrderInputSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const pizzaCount = countPizzas(input.items);

      // Verify capacity for the chosen slot (hour-level check)
      const slotDate = new Date(input.scheduledAt);
      const slotDateLocal = new Date(
        slotDate.toLocaleString("en-US", { timeZone: STORE_TIMEZONE })
      );

      // Hour window: from start of that hour to end of that hour
      const hourStart = new Date(slotDateLocal);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(slotDateLocal);
      hourEnd.setMinutes(59, 59, 999);

      const [capacityRow] = await db
        .select({ total: sql<number>`COALESCE(SUM(${scheduledOrders.pizzaCount}), 0)` })
        .from(scheduledOrders)
        .where(
          and(
            gte(scheduledOrders.scheduledAt, hourStart.getTime()),
            lt(scheduledOrders.scheduledAt, hourEnd.getTime() + 1),
            sql`${scheduledOrders.status} NOT IN ('cancelled')`
          )
        );

      const currentPizzas = Number(capacityRow?.total ?? 0);
      if (pizzaCount > 0 && currentPizzas + pizzaCount > PIZZA_CAPACITY_PER_HOUR) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This time slot is at capacity. Please choose a different time. (${currentPizzas}/${PIZZA_CAPACITY_PER_HOUR} pizzas booked)`,
        });
      }

      // Insert order
      const [insertResult] = await db.insert(scheduledOrders).values({
        orderRef: `NPZ-TEMP-${Date.now()}`,
        status: "confirmed",
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
        transactionId: input.transactionId ?? null,
        authCode: input.authCode ?? null,
        refundedAmount: "0",
        specialInstructions: input.specialInstructions ?? null,
      });

      const orderId = (insertResult as { insertId: number }).insertId;

      // Update with proper order ref
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

      // Notify owner
      const scheduledDate = new Date(input.scheduledAt).toLocaleString("en-US", {
        timeZone: STORE_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short",
      });

      await notifyOwner({
        title: `🛒 New Order ${orderRef} — $${input.total.toFixed(2)} (${input.orderType})`,
        content: `Customer: ${input.customerName} | Phone: ${input.customerPhone}
Scheduled: ${input.isAsap ? "ASAP" : scheduledDate}
Items: ${input.items.map((i) => `${i.quantity ?? 1}x ${i.name}`).join(", ")}
Total: $${input.total.toFixed(2)}${input.couponCode ? ` (coupon: ${input.couponCode})` : ""}
Transaction ID: ${input.transactionId ?? "N/A"}`,
      }).catch(() => {});

      return { orderId, orderRef };
    }),

  /**
   * Get a single order by orderRef (for customer order tracking page).
   */
  getOrder: publicProcedure
    .input(z.object({ orderRef: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const [order] = await db
        .select()
        .from(scheduledOrders)
        .where(eq(scheduledOrders.orderRef, input.orderRef))
        .limit(1);

      if (!order) return null;

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      return { ...order, lineItems: items };
    }),

  /**
   * Get all orders for admin panel.
   */
  listOrders: publicProcedure
    .input(
      z.object({
        dateMs: z.number().optional(),
        status: z
          .enum(["pending", "confirmed", "preparing", "ready", "completed", "cancelled", "all"])
          .default("all"),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];

      if (input.dateMs) {
        const queryDate = new Date(input.dateMs);
        const queryDateLocal = new Date(
          queryDate.toLocaleString("en-US", { timeZone: STORE_TIMEZONE })
        );
        const dayStart = new Date(queryDateLocal);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(queryDateLocal);
        dayEnd.setHours(23, 59, 59, 999);
        conditions.push(gte(scheduledOrders.scheduledAt, dayStart.getTime()));
        conditions.push(lt(scheduledOrders.scheduledAt, dayEnd.getTime() + 1));
      }

      if (input.status !== "all") {
        conditions.push(eq(scheduledOrders.status, input.status));
      }

      const orders =
        conditions.length > 0
          ? await db
              .select()
              .from(scheduledOrders)
              .where(and(...conditions))
              .limit(input.limit)
              .offset(input.offset)
          : await db
              .select()
              .from(scheduledOrders)
              .limit(input.limit)
              .offset(input.offset);

      return orders;
    }),
});
