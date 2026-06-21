/**
 * Store Settings router for Napoli Pizzeria.
 * Manages runtime-configurable settings stored in the storeSettings table.
 *
 * Public procedures: read-only access (used by CartDrawer, checkout flows).
 * Admin procedures: write access (used by the admin Settings panel).
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import axios from "axios";
import { getDb } from "./db";
import { storeSettings, itemCategories, menuItems } from "../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { CLOVER_ENV } from "./_core/env";

function cloverHeaders() {
  return {
    Authorization: `Bearer ${CLOVER_ENV.apiToken}`,
    "Content-Type": "application/json",
  };
}
function cloverUrl(path: string) {
  return `${CLOVER_ENV.baseUrl}/v3/merchants/${CLOVER_ENV.merchantId}${path}`;
}

/**
 * Sync hidden state to Clover: PATCH all items in a category to hidden=true/false.
 * Clover items with hidden=true are not visible in the POS inventory.
 */
async function syncCategoryHiddenToClover(slug: string, hidden: boolean): Promise<void> {
  if (!CLOVER_ENV.apiToken || !CLOVER_ENV.merchantId) return;
  const db = await getDb();
  if (!db) return;
  // Get all Clover item IDs for this category
  const items = await db
    .select({ cloverItemId: menuItems.cloverItemId })
    .from(menuItems)
    .where(eq(menuItems.category, slug));
  const cloverIds = items.map((i) => i.cloverItemId).filter(Boolean) as string[];
  // PATCH each item in Clover
  await Promise.allSettled(
    cloverIds.map((itemId) =>
      axios.post(
        cloverUrl(`/items/${itemId}`),
        { hidden },
        { headers: cloverHeaders() }
      )
    )
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Read a single setting by key; returns null if not found. */
async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(storeSettings).where(eq(storeSettings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

/** Upsert a setting value. */
async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  // Try update first; insert if not exists
  const existing = await db.select({ id: storeSettings.id }).from(storeSettings).where(eq(storeSettings.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(storeSettings).set({ value }).where(eq(storeSettings.key, key));
  } else {
    await db.insert(storeSettings).values({ key, value });
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

export const settingsRouter = router({
  /**
   * Public: returns the current store hours override configuration.
   * Used by CartDrawer and storeStatus to determine if ordering is allowed.
   */
  getStoreHours: publicProcedure.query(async () => {
    const [forceOpenRaw, openHourRaw, closeHourRaw] = await Promise.all([
      getSetting("store_force_open"),
      getSetting("store_open_hour"),
      getSetting("store_close_hour"),
    ]);

    const forceOpen = forceOpenRaw === "true";
    const openHour = openHourRaw !== null ? parseInt(openHourRaw) : 10;
    const closeHour = closeHourRaw !== null ? parseInt(closeHourRaw) : 22;

    return {
      forceOpen,
      openHour: isNaN(openHour) ? 10 : openHour,
      closeHour: isNaN(closeHour) ? 22 : closeHour,
    };
  }),

  /**
   * Admin-only: override store hours or force-open the store.
   * forceOpen=true bypasses the hour check entirely (useful for testing).
   */
  updateStoreHours: protectedProcedure
    .input(
      z.object({
        forceOpen: z.boolean().optional(),
        openHour: z.number().min(0).max(23).optional(),
        closeHour: z.number().min(1).max(24).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update store hours.",
        });
      }

      if (input.forceOpen !== undefined) {
        await setSetting("store_force_open", String(input.forceOpen));
      }
      if (input.openHour !== undefined) {
        await setSetting("store_open_hour", String(input.openHour));
      }
      if (input.closeHour !== undefined) {
        await setSetting("store_close_hour", String(input.closeHour));
      }

      const [forceOpenRaw, openHourRaw, closeHourRaw] = await Promise.all([
        getSetting("store_force_open"),
        getSetting("store_open_hour"),
        getSetting("store_close_hour"),
      ]);
      return {
        forceOpen: forceOpenRaw === "true",
        openHour: parseInt(openHourRaw ?? "10"),
        closeHour: parseInt(closeHourRaw ?? "22"),
      };
    }),

  /**
   * Public: returns the current Convenience Fee configuration.
   * Used by CartDrawer and checkout flows to compute the fee in real-time.
   */
  getConvenienceFee: publicProcedure.query(async () => {
    const [enabledRaw, percentRaw] = await Promise.all([
      getSetting("convenience_fee_enabled"),
      getSetting("convenience_fee_percent"),
    ]);

    const enabled = enabledRaw !== null ? enabledRaw === "true" : true;
    const percent = percentRaw !== null ? parseFloat(percentRaw) : 3;

    return {
      enabled,
      percent: isNaN(percent) ? 3 : Math.max(0, Math.min(100, percent)),
    };
  }),

  /**
   * Public: returns all categories with their visibility (hidden) state.
   * Used by Menu.tsx to filter out hidden categories.
   */
  getCategoryVisibility: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const cats = await db
      .select({ id: itemCategories.id, name: itemCategories.name, slug: itemCategories.slug, hidden: itemCategories.hidden, sortOrder: itemCategories.sortOrder, color: itemCategories.color })
      .from(itemCategories)
      .orderBy(itemCategories.sortOrder);
    return cats;
  }),

  /**
   * Admin-only: toggle a category hidden/visible.
   * Also syncs the hidden state to all Clover items in that category.
   */
  setCategoryVisibility: protectedProcedure
    .input(z.object({ slug: z.string(), hidden: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update category visibility." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Update DB
      await db
        .update(itemCategories)
        .set({ hidden: input.hidden })
        .where(eq(itemCategories.slug, input.slug));
      // Sync to Clover (fire and forget — don't fail the request if Clover is slow)
      syncCategoryHiddenToClover(input.slug, input.hidden).catch(console.error);
      return { slug: input.slug, hidden: input.hidden };
    }),

  /**
   * Admin-only: update the Convenience Fee configuration.
   * Accepts enabled (boolean) and/or percent (0–100).
   */
  updateConvenienceFee: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        percent: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins may change store settings
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update store settings.",
        });
      }

      if (input.enabled !== undefined) {
        await setSetting("convenience_fee_enabled", String(input.enabled));
      }
      if (input.percent !== undefined) {
        await setSetting("convenience_fee_percent", String(input.percent));
      }

      // Return the updated config
      const [enabledRaw, percentRaw] = await Promise.all([
        getSetting("convenience_fee_enabled"),
        getSetting("convenience_fee_percent"),
      ]);
      return {
        enabled: enabledRaw === "true",
        percent: parseFloat(percentRaw ?? "3"),
      };
    }),
});
