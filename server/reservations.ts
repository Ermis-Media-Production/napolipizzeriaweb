/**
 * server/reservations.ts
 *
 * tRPC router for the Reservations system.
 * Handles both same-day scheduled orders and future reservations.
 *
 * Business rules:
 *  - Restaurant hours: 10:00 AM – 10:00 PM (America/Los_Angeles / Las Vegas time)
 *  - Same-day order cutoff: 9:30 PM Las Vegas time
 *  - Future reservations: up to 30 days in advance
 *  - Minimum advance booking for future reservations: 2 hours from now
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { reservations } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// ── Las Vegas timezone helpers ────────────────────────────────────────────────

const LV_TZ = "America/Los_Angeles";

/** Get the current date/time in Las Vegas timezone as a Date object */
function nowInLV(): Date {
  const now = new Date();
  const lvStr = now.toLocaleString("en-US", { timeZone: LV_TZ });
  return new Date(lvStr);
}

/** Format a Date to YYYY-MM-DD in Las Vegas timezone */
function toLVDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: LV_TZ }); // en-CA gives YYYY-MM-DD
}

/** Parse "HH:MM" to total minutes from midnight */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const OPEN_MINUTES = 10 * 60;       // 10:00 AM
const CLOSE_MINUTES = 22 * 60;      // 10:00 PM
const SAME_DAY_CUTOFF = 21 * 60 + 30; // 9:30 PM

// ── Input schemas ─────────────────────────────────────────────────────────────

const CreateReservationInput = z.object({
  type: z.enum(["order", "reservation"]),
  serviceType: z.enum(["dine-in", "pickup", "delivery"]),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  partySize: z.number().int().min(1).max(500).optional(),
  customerName: z.string().min(2).max(128),
  customerPhone: z.string().min(7).max(32),
  customerEmail: z.string().email().optional().or(z.literal("")),
  deliveryAddress: z.string().max(512).optional(),
  notes: z.string().max(1000).optional(),
});

// ── Router ────────────────────────────────────────────────────────────────────

export const reservationsRouter = router({
  /**
   * Create a new reservation or same-day order.
   * Validates Las Vegas business hours and cutoff times.
   */
  create: publicProcedure
    .input(CreateReservationInput)
    .mutation(async ({ input }) => {
      const lvNow = nowInLV();
      const todayStr = toLVDateStr(lvNow);
      const currentMinutes = lvNow.getHours() * 60 + lvNow.getMinutes();
      const requestedMinutes = timeToMinutes(input.scheduledTime);

      // Validate time is within business hours
      if (requestedMinutes < OPEN_MINUTES || requestedMinutes >= CLOSE_MINUTES) {
        throw new Error("Requested time is outside business hours (10:00 AM – 10:00 PM).");
      }

      if (input.type === "order") {
        // Same-day order: must be today and before 9:30 PM cutoff
        if (input.scheduledDate !== todayStr) {
          throw new Error("Same-day orders must be scheduled for today. For future dates, use the Reservation tab.");
        }
        if (currentMinutes >= SAME_DAY_CUTOFF) {
          throw new Error("Same-day orders are no longer accepted after 9:30 PM. Please call us or place a reservation for tomorrow.");
        }
        // Requested time must be at least 15 minutes from now
        if (requestedMinutes <= currentMinutes + 15) {
          throw new Error("Please select a time at least 15 minutes from now.");
        }
        if (requestedMinutes > SAME_DAY_CUTOFF) {
          throw new Error("Same-day orders must be picked up / delivered by 9:30 PM.");
        }
      } else {
        // Future reservation: must be a future date
        if (input.scheduledDate <= todayStr) {
          throw new Error("Future reservations must be for tomorrow or later. For today, use the Order Today tab.");
        }
        // Max 30 days in advance
        const maxDate = new Date(lvNow);
        maxDate.setDate(maxDate.getDate() + 30);
        const maxDateStr = toLVDateStr(maxDate);
        if (input.scheduledDate > maxDateStr) {
          throw new Error("Reservations can be made up to 30 days in advance. Please call us for events further out.");
        }
      }

      // Delivery requires address
      if (input.serviceType === "delivery" && !input.deliveryAddress?.trim()) {
        throw new Error("Delivery address is required for delivery orders.");
      }

      // Dine-in strongly recommends party size
      const partySize = input.partySize ?? (input.serviceType === "dine-in" ? 1 : undefined);

      // Insert into DB
      const db = await getDb();
      if (!db) throw new Error("Database unavailable. Please try again.");
      const [result] = await db.insert(reservations).values({
        type: input.type,
        serviceType: input.serviceType,
        scheduledDate: input.scheduledDate,
        scheduledTime: input.scheduledTime,
        partySize,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        customerEmail: input.customerEmail?.trim() || null,
        deliveryAddress: input.deliveryAddress?.trim() || null,
        notes: input.notes?.trim() || null,
        status: "pending",
      });

      const newId = (result as { insertId: number }).insertId;

      // Notify the owner
      const typeLabel = input.type === "order" ? "Same-Day Order" : "Future Reservation";
      const serviceLabel = { "dine-in": "Dine-In", pickup: "Pickup", delivery: "Delivery" }[input.serviceType];
      await notifyOwner({
        title: `New ${typeLabel} — ${serviceLabel}`,
        content: [
          `📅 ${input.scheduledDate} at ${input.scheduledTime} (Las Vegas time)`,
          `👤 ${input.customerName} · 📞 ${input.customerPhone}`,
          input.customerEmail ? `✉️ ${input.customerEmail}` : "",
          partySize ? `👥 Party of ${partySize}` : "",
          input.deliveryAddress ? `📍 ${input.deliveryAddress}` : "",
          input.notes ? `📝 Notes: ${input.notes}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      }).catch(() => {/* non-critical */});

      return { success: true, id: newId };
    }),

  /**
   * List all reservations (admin only).
   * Returns most recent first.
   */
  list: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Admin access required.");
      }
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(reservations)
        .orderBy(desc(reservations.createdAt))
        .limit(input.limit);
      return rows;
    }),

  /**
   * Update reservation status (admin only).
   */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Admin access required.");
      }
      const db = await getDb();
      if (!db) throw new Error("Database unavailable.");
      await db
        .update(reservations)
        .set({ status: input.status })
        .where(eq(reservations.id, input.id));
      return { success: true };
    }),

  /**
   * Get available time slots for a given date (Las Vegas time).
   * Returns 30-minute slots from 10:00 AM to 9:30 PM.
   */
  getAvailableSlots: publicProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(({ input }) => {
      const lvNow = nowInLV();
      const todayStr = toLVDateStr(lvNow);
      const isToday = input.date === todayStr;
      const currentMinutes = lvNow.getHours() * 60 + lvNow.getMinutes();

      const slots: { value: string; label: string; available: boolean }[] = [];

      // Generate 30-minute slots from 10:00 AM to 9:30 PM
      for (let m = OPEN_MINUTES; m <= SAME_DAY_CUTOFF; m += 30) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const value = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
        const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const ampm = h >= 12 ? "PM" : "AM";
        const label = `${hour12}:${String(min).padStart(2, "0")} ${ampm}`;

        // For today, only show slots at least 15 min from now
        const available = isToday ? m >= currentMinutes + 15 : true;

        slots.push({ value, label, available });
      }

      return slots;
    }),
});
