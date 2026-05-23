/**
 * Coupon / Discount Router
 *
 * Procedures:
 *  - validate   (public)   — check if a coupon code is valid and return its discount %
 *  - apply      (public)   — increment usageCount after a successful payment
 *  - create     (admin)    — create a new coupon
 *  - list       (admin)    — list all coupons
 *  - toggle     (admin)    — activate / deactivate a coupon
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { coupons } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

// ── Admin guard ────────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return next({ ctx });
});

export const couponRouter = router({
  /**
   * Validate a coupon code.
   * Returns the discount percentage and description if valid.
   * Throws NOT_FOUND if the code doesn't exist or is inactive/exhausted.
   */
  validate: publicProcedure
    .input(z.object({ code: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      const code = input.code.trim().toUpperCase();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const [coupon] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, code))
        .limit(1);

      if (!coupon) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Coupon not found." });
      }
      if (!coupon.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This coupon is no longer active." });
      }
      if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This coupon has reached its usage limit." });
      }

      return {
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        description: coupon.description ?? `${coupon.discountPercent}% off your order`,
      };
    }),

  /**
   * Redeem a coupon after a successful payment — increments usageCount.
   * Called client-side after payment confirmation.
   */
  redeem: publicProcedure
    .input(z.object({ code: z.string().min(1).max(64) }))
    .mutation(async ({ input }) => {
      const code = input.code.trim().toUpperCase();
      const db = await getDb();
      if (!db) return { success: false };

      const [coupon] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, code))
        .limit(1);

      if (!coupon || !coupon.isActive) return { success: false };

      await db
        .update(coupons)
        .set({ usageCount: sql`${coupons.usageCount} + 1` })
        .where(eq(coupons.code, code));

      return { success: true };
    }),

  /**
   * Create a new coupon (admin only).
   */
  create: adminProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        discountPercent: z.number().int().min(1).max(100),
        description: z.string().optional(),
        usageLimit: z.number().int().min(1).optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const code = input.code.trim().toUpperCase();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const existing = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: `Coupon "${code}" already exists.` });
      }
      await db.insert(coupons).values({
        code,
        discountPercent: input.discountPercent,
        description: input.description ?? `${input.discountPercent}% off your order`,
        isActive: input.isActive,
        usageLimit: input.usageLimit ?? null,
        usageCount: 0,
      });
      return { code, discountPercent: input.discountPercent };
    }),

  /**
   * List all coupons (admin only).
   */
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(coupons).orderBy(coupons.createdAt);
  }),

  /**
   * Toggle a coupon's active state (admin only).
   */
  toggle: adminProcedure
    .input(z.object({ code: z.string().min(1).max(64), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const code = input.code.trim().toUpperCase();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      await db.update(coupons).set({ isActive: input.isActive }).where(eq(coupons.code, code));
      return { code, isActive: input.isActive };
    }),
});
