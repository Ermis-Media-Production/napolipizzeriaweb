/**
 * cloverItemSync.ts
 *
 * Admin-only tRPC procedures to pull items from the Clover inventory API
 * and upsert them into the local menuItems table.
 *
 * Clover API endpoint used:
 *   GET /v3/merchants/{mId}/items?expand=categories,modifierGroups&limit=200
 *
 * Sync logic:
 *   - Items are matched by cloverItemId (stored on the local row).
 *   - If a local row already has that cloverItemId, it is updated (name, price, availability).
 *   - If no local row has that cloverItemId, a new row is inserted.
 *   - Existing printLabel overrides set by the admin are PRESERVED on update.
 *   - Items that exist locally but are NOT in Clover are left untouched.
 */

import axios from "axios";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { CLOVER_ENV } from "./_core/env";
import { adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { menuItems } from "../drizzle/schema";
import { getPrinterLabel } from "./cloverSync";

// ── Helpers ──────────────────────────────────────────────────────────────────

function cloverHeaders() {
  return {
    Authorization: `Bearer ${CLOVER_ENV.apiToken}`,
    "Content-Type": "application/json",
  };
}

function cloverUrl(path: string) {
  return `${CLOVER_ENV.baseUrl}/v3/merchants/${CLOVER_ENV.merchantId}${path}`;
}

// ── Types from Clover API ─────────────────────────────────────────────────────

interface CloverCategory {
  id: string;
  name: string;
}

interface CloverItem {
  id: string;
  name: string;
  price: number; // in cents
  available?: boolean;
  hidden?: boolean;
  categories?: { elements: CloverCategory[] };
  modifierGroups?: { elements: Array<{ id: string; name: string }> };
}

// ── Map Clover category name to local slug ────────────────────────────────────

function categoryToSlug(categoryName: string | undefined): string {
  if (!categoryName) return "special";
  const name = categoryName.toLowerCase().trim();
  if (name.includes("pizza") || name.includes("calzone") || name.includes("stromboli")) return "pizza";
  if (name.includes("burger") || name.includes("sandwich") || name.includes("wrap")) return "burger";
  if (name.includes("pasta") || name.includes("spaghetti") || name.includes("lasagna")) return "pasta";
  if (name.includes("wing") || name.includes("appetizer") || name.includes("starter")) return "wings";
  if (name.includes("salad")) return "salad";
  if (name.includes("soup")) return "soup";
  if (name.includes("kids") || name.includes("children")) return "kids";
  if (name.includes("drink") || name.includes("beverage") || name.includes("soda") || name.includes("beer") || name.includes("wine")) return "beverage";
  if (name.includes("dessert") || name.includes("sweet") || name.includes("cake") || name.includes("ice cream")) return "dessert";
  if (name.includes("lunch") || name.includes("special")) return "special";
  if (name.includes("catering")) return "catering";
  return "special";
}

// ── Router ───────────────────────────────────────────────────────────────────

export const cloverItemSyncRouter = router({
  /**
   * Pull all items from Clover and upsert into local menuItems table.
   * Admin-only. Returns a summary of created/updated/skipped counts.
   */
  syncFromClover: adminProcedure
    .input(z.object({
      /** If true, also update printLabel from auto-detection (default: preserve existing labels) */
      overridePrintLabels: z.boolean().default(false),
    }).optional())
    .mutation(async ({ input }) => {
      if (!CLOVER_ENV.apiToken || !CLOVER_ENV.merchantId) {
        throw new Error("Clover credentials are not configured. Check CLOVER_API_TOKEN and CLOVER_MERCHANT_ID.");
      }

      const overrideLabels = input?.overridePrintLabels ?? false;

      // Fetch all items from Clover (paginate if needed)
      let allItems: CloverItem[] = [];
      let offset = 0;
      const limit = 200;

      while (true) {
        const res = await axios.get(
          cloverUrl(`/items?expand=categories,modifierGroups&limit=${limit}&offset=${offset}`),
          { headers: cloverHeaders() }
        );
        const elements: CloverItem[] = res.data?.elements ?? [];
        allItems = allItems.concat(elements);
        if (elements.length < limit) break;
        offset += limit;
      }

      // Filter out hidden items
      const visibleItems = allItems.filter((item) => !item.hidden);

      // Load all existing local items
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const existingRows = await database.select({
        id: menuItems.id,
        cloverItemId: menuItems.cloverItemId,
        printLabel: menuItems.printLabel,
      }).from(menuItems);

      // Build a map of cloverItemId → local row
      const existingMap = new Map<string, { id: number; printLabel: string }>();
      for (const row of existingRows) {
        if (row.cloverItemId) {
          existingMap.set(row.cloverItemId, { id: row.id, printLabel: row.printLabel });
        }
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const item of visibleItems) {
        const priceInDollars = (item.price ?? 0) / 100;
        const firstCategory = item.categories?.elements?.[0];
        const categorySlug = categoryToSlug(firstCategory?.name);
        const autoLabel = getPrinterLabel(item.name) as "Food" | "Pizza" | "Pizzeria" | "Bar/Drinks";

        const existing = existingMap.get(item.id);

        if (existing) {
          // Update existing row — preserve printLabel unless override requested
          const labelToUse = overrideLabels
            ? autoLabel
            : (existing.printLabel as "Food" | "Pizza" | "Pizzeria" | "Bar/Drinks");
          await database.update(menuItems)
            .set({
              name: item.name,
              price: String(priceInDollars),
              category: categorySlug,
              isAvailable: item.available !== false,
              printLabel: labelToUse,
            })
            .where(eq(menuItems.id, existing.id));
          updated++;
        } else {
          // Insert new row
          await database.insert(menuItems).values({
            name: item.name,
            price: String(priceInDollars),
            category: categorySlug,
            isAvailable: item.available !== false,
            printLabel: autoLabel,
            cloverItemId: item.id,
            sortOrder: 0,
          });
          created++;
        }
      }

      skipped = allItems.length - visibleItems.length;

      return {
        total: allItems.length,
        visible: visibleItems.length,
        created,
        updated,
        skipped,
        syncedAt: new Date().toISOString(),
      };
    }),

  /**
   * Get sync status: how many items have a cloverItemId and when was the last update.
   */
  getLastSyncInfo: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) return { lastSyncAt: null, syncedItemCount: 0 };

    const allRows = await database.select({
      updatedAt: menuItems.updatedAt,
      cloverItemId: menuItems.cloverItemId,
    }).from(menuItems);

    const syncedRows = allRows.filter((r) => r.cloverItemId);
    const lastUpdated = syncedRows.sort((a, b) =>
      (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0)
    )[0];

    return {
      lastSyncAt: lastUpdated?.updatedAt?.toISOString() ?? null,
      syncedItemCount: syncedRows.length,
    };
  }),
});
