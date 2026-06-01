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
import { orderItems, scheduledOrders, storeSettings } from "../drizzle/schema";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { sendSms } from "./_core/sms";
import { TRPCError } from "@trpc/server";

/** Read a single store setting from DB; returns null if not found or DB unavailable. */
async function getStoreSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(storeSettings).where(eq(storeSettings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

/** Returns true if the store is currently open, respecting the force_open override. */
async function isStoreOpenAsync(): Promise<boolean> {
  const forceOpen = await getStoreSetting("store_force_open");
  if (forceOpen === "true") return true;
  return isStoreOpen();
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORE_TIMEZONE = "America/Los_Angeles";
const STORE_OPEN_HOUR = 10;   // 10:00 AM
const STORE_CLOSE_HOUR = 22;  // 10:00 PM (last schedulable slot is 9:30 PM)
const STORE_LAST_SLOT_HOUR = 21;   // 9 PM
const STORE_LAST_SLOT_MINUTE = 30; // :30 → last slot is 9:30 PM
const PIZZA_CAPACITY_PER_HOUR = 80;
const SLOT_INTERVAL_MINUTES = 30;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get current time in store's local timezone */
function nowInStoreTimezone(): Date {
  const now = new Date();
  const storeTime = new Date(now.toLocaleString("en-US", { timeZone: STORE_TIMEZONE }));
  return storeTime;
}

/**
 * Build a UTC timestamp for a specific hour:minute in the store timezone on the given date.
 * This correctly handles PDT/PST transitions.
 */
function buildStoreTimestamp(dateMs: number, hour: number, minute = 0): number {
  const d = new Date(dateMs);
  // Get the current store-local date string
  const storeStr = d.toLocaleString("en-US", {
    timeZone: STORE_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  // storeStr format: "05/27/2026, 10:30:00"
  const [datePart] = storeStr.split(", ");
  const [m, day, year] = datePart.split("/");
  // Compute the UTC offset: difference between real UTC and the "fake local" date
  const fakeLocal = new Date(storeStr.replace(/(\d+)\/(\d+)\/(\d+), /, "$3-$1-$2T"));
  const offsetMs = d.getTime() - fakeLocal.getTime();
  // Build target store-local ISO string and shift by offset to get UTC
  const targetIso = `${year}-${m.padStart(2, "0")}-${day.padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  return new Date(targetIso).getTime() + offsetMs;
}

/** Check if the store is currently open */
function isStoreOpen(): boolean {
  const storeNow = nowInStoreTimezone();
  const hour = storeNow.getHours();
  return hour >= STORE_OPEN_HOUR && hour < STORE_CLOSE_HOUR;
}

/** Get the next opening time as UTC ms timestamp */
function getNextOpeningTime(): number {
  const nowMs = Date.now();
  const storeNow = nowInStoreTimezone();
  const hour = storeNow.getHours();

  // If before opening today, open at 10 AM today
  if (hour < STORE_OPEN_HOUR) {
    return buildStoreTimestamp(nowMs, STORE_OPEN_HOUR, 0);
  }

  // Otherwise, open at 10 AM tomorrow
  const tomorrowMs = nowMs + 24 * 60 * 60 * 1000;
  return buildStoreTimestamp(tomorrowMs, STORE_OPEN_HOUR, 0);
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
  storeStatus: publicProcedure.query(async () => {
    const forceOpen = await getStoreSetting("store_force_open");
    const open = forceOpen === "true" ? true : isStoreOpen();
    const storeNow = nowInStoreTimezone();
    return {
      isOpen: open,
      forceOpen: forceOpen === "true",
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
        /** Order type — affects minimum lead time */
        orderType: z.enum(["pickup", "delivery", "dine-in"]).optional().default("pickup"),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const storeNow = nowInStoreTimezone();

      // Build correct UTC timestamps for 10 AM and 10 PM in Las Vegas timezone
      const dayStartMs = buildStoreTimestamp(input.dateMs, STORE_OPEN_HOUR, 0);
      // Last slot is 9:30 PM; dayEnd is exclusive so use 10:00 PM
      const dayEndMs = buildStoreTimestamp(input.dateMs, STORE_CLOSE_HOUR, 0);

      // Determine if the queried date is today in store timezone
      const queryDateLA = new Date(input.dateMs).toLocaleDateString("en-US", { timeZone: STORE_TIMEZONE });
      const todayLA = new Date().toLocaleDateString("en-US", { timeZone: STORE_TIMEZONE });
      const isToday = queryDateLA === todayLA;

      // Build slot list for the day (30-min intervals, 10 AM – 9:30 PM)
      const slots: {
        slotMs: number;
        label: string;
        pizzasBooked: number;
        pizzasCapacity: number;
        available: boolean;
      }[] = [];

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

      // Aggregate pizza counts per slot (keyed by slot UTC ms)
      const pizzasBySlot: Record<number, number> = {};
      for (const booking of bookings) {
        // Round booking time down to the nearest 30-min slot
        const slotMs = Math.floor(booking.scheduledAt / (SLOT_INTERVAL_MINUTES * 60 * 1000)) * (SLOT_INTERVAL_MINUTES * 60 * 1000);
        pizzasBySlot[slotMs] = (pizzasBySlot[slotMs] ?? 0) + booking.pizzaCount;
      }

      // Generate 30-min slots from 10 AM to 9:30 PM (inclusive) in store timezone
      const SLOT_MS = SLOT_INTERVAL_MINUTES * 60 * 1000;
      const lastSlotMs = buildStoreTimestamp(input.dateMs, STORE_LAST_SLOT_HOUR, STORE_LAST_SLOT_MINUTE);
      const minLeadMs = input.orderType === "delivery" ? 45 * 60 * 1000 : 15 * 60 * 1000;
      const nowMs = Date.now();

      let currentMs = dayStartMs;
      while (currentMs <= lastSlotMs) {
        const pizzasBooked = pizzasBySlot[currentMs] ?? 0;
        const isPast = isToday && currentMs < nowMs + minLeadMs;

        const label = new Date(currentMs).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: STORE_TIMEZONE,
        });

        slots.push({
          slotMs: currentMs,
          label,
          pizzasBooked,
          pizzasCapacity: PIZZA_CAPACITY_PER_HOUR,
          available: !isPast && pizzasBooked < PIZZA_CAPACITY_PER_HOUR,
        });

        currentMs += SLOT_MS;
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

      // Validate that the scheduled time is within business hours (10 AM – 10 PM)
      // ASAP orders are only allowed when the store is currently open
      const slotDate = new Date(input.scheduledAt);
      const slotLocal = new Date(
        slotDate.toLocaleString("en-US", { timeZone: STORE_TIMEZONE })
      );
      const slotHour = slotLocal.getHours();

      if (!input.isAsap) {
        // Scheduled orders must fall within operating hours
        if (slotHour < STORE_OPEN_HOUR || slotHour >= STORE_CLOSE_HOUR) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Scheduled orders are only accepted between 10:00 AM and 10:00 PM. For events outside these hours, please contact us about catering.`,
          });
        }
        // Must be in the future with sufficient lead time
        // Delivery: 45 min minimum; Pickup & Dine-In: 15 min minimum
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
        // ASAP orders require the store to be currently open (respects force_open override)
        const storeCurrentlyOpen = await isStoreOpenAsync();
        if (!storeCurrentlyOpen) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `We're currently closed. Our hours are 10:00 AM – 10:00 PM. Please schedule your order for when we open, or contact us about catering.`,
          });
        }
      }

      // Verify capacity for the chosen slot (hour-level check)
      const slotDateLocal = slotLocal;

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

  /**
   * Admin stats: total revenue, today's orders, pending, completed.
   */
  adminStats: adminProcedure.query(async () => {
    const db = await requireDb();

    const storeNow = nowInStoreTimezone();
    const todayStart = new Date(storeNow);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(storeNow);
    todayEnd.setHours(23, 59, 59, 999);

    const [todayRows, pendingRows, completedRows, revenueRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(scheduledOrders)
        .where(
          and(
            gte(scheduledOrders.scheduledAt, todayStart.getTime()),
            lt(scheduledOrders.scheduledAt, todayEnd.getTime() + 1)
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(scheduledOrders)
        .where(eq(scheduledOrders.status, "pending")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(scheduledOrders)
        .where(eq(scheduledOrders.status, "completed")),
      db
        .select({ total: sql<string>`COALESCE(SUM(total), 0)` })
        .from(scheduledOrders)
        .where(eq(scheduledOrders.paymentStatus, "paid")),
    ]);

    return {
      todayOrders: Number(todayRows[0]?.count ?? 0),
      pendingOrders: Number(pendingRows[0]?.count ?? 0),
      completedOrders: Number(completedRows[0]?.count ?? 0),
      totalRevenue: parseFloat(revenueRows[0]?.total ?? "0"),
    };
  }),

  /**
   * List scheduled orders for admin panel with pagination.
   * Returns orders sorted by most recent first.
   */
  listScheduledOrders: adminProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        status: z
          .enum(["pending", "confirmed", "preparing", "ready", "completed", "cancelled", "all"])
          .default("all"),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];

      if (input.status !== "all") {
        conditions.push(eq(scheduledOrders.status, input.status));
      }

      const orders =
        conditions.length > 0
          ? await db
              .select()
              .from(scheduledOrders)
              .where(and(...conditions))
              .orderBy(sql`createdAt DESC`)
              .limit(input.limit)
              .offset(input.offset)
          : await db
              .select()
              .from(scheduledOrders)
              .orderBy(sql`createdAt DESC`)
              .limit(input.limit)
              .offset(input.offset);

      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(scheduledOrders);

      return { orders, total: Number(countRow?.count ?? 0) };
    }),

  /**
   * Mark an order as ready (pickup) or out for delivery.
   * Sends an SMS notification to the customer.
   * Admin-only action.
   */
  markOrderReady: adminProcedure
    .input(
      z.object({
        orderRef: z.string(),
        readyType: z.enum(["pickup", "delivery", "dine-in"]).default("pickup"),
        origin: z.string().optional(), // frontend origin for tracking URL
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [order] = await db
        .select()
        .from(scheduledOrders)
        .where(eq(scheduledOrders.orderRef, input.orderRef))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      await db
        .update(scheduledOrders)
        .set({ status: "ready" })
        .where(eq(scheduledOrders.orderRef, input.orderRef));

      // Send SMS to customer
      let smsSent = false;
      if (order.customerPhone) {
        const origin = input.origin ?? "https://napolipizzerianorthlasvegas.com";
        const trackingUrl = `${origin}/my-order/${order.orderRef}`;
        const firstName = (order.customerName ?? "Customer").trim().split(/\s+/)[0];

        let smsBody: string;
        if (input.readyType === "delivery") {
          smsBody = [
            `Hi ${firstName}! 🚚 Your Napoli Pizzeria order is on its way!`,
            `Order: ${order.orderRef}`,
            `Track your order: ${trackingUrl}`,
            `Questions? Call us: (702) 544-8930`,
          ].join("\n");
        } else if (order.orderType === "dine-in") {
          smsBody = [
            `Hi ${firstName}! 🍕 Your Napoli Pizzeria order is ready at your table!`,
            `Order: ${order.orderRef}`,
            `Enjoy your meal! Questions? (702) 544-8930`,
          ].join("\n");
        } else {
          smsBody = [
            `Hi ${firstName}! 🍕 Your Napoli Pizzeria order is ready for pickup!`,
            `Order: ${order.orderRef}`,
            `We're at 3131 W Craig Rd, North Las Vegas, NV 89032`,
            `Track your order: ${trackingUrl}`,
            `Questions? Call us: (702) 544-8930`,
          ].join("\n");
        }

        smsSent = await sendSms(order.customerPhone, smsBody).catch(() => false);
      }

      return { success: true, smsSent };
    }),
});
