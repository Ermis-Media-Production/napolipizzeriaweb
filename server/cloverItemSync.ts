/**
 * cloverItemSync.ts
 *
 * Admin-only tRPC procedures to pull items, modifier groups, and modifier options
 * from the Clover inventory API and upsert them into the local database.
 *
 * Clover API endpoints used:
 *   GET /v3/merchants/{mId}/items?expand=categories,modifierGroups&limit=200
 *   GET /v3/merchants/{mId}/modifier_groups?expand=modifiers&limit=200
 *
 * Sync logic:
 *   - Items matched by cloverItemId; new items inserted, existing ones updated.
 *   - Modifier groups matched by cloverGroupId; new groups inserted, existing updated.
 *   - Modifier options matched by cloverOptionId; new options inserted, existing updated.
 *   - itemModifierGroups join table rebuilt for each synced item.
 *   - Existing printLabel overrides set by the admin are PRESERVED on item update.
 *   - Items that exist locally but are NOT in Clover are left untouched.
 */

import axios from "axios";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { CLOVER_ENV } from "./_core/env";
import { adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  menuItems,
  modifierGroups,
  modifierOptions,
  itemModifierGroups,
} from "../drizzle/schema";
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

interface CloverModifier {
  id: string;
  name: string;
  price?: number; // in cents
}

interface CloverModifierGroup {
  id: string;
  name: string;
  minRequired?: number;
  maxAllowed?: number;
  modifiers?: { elements: CloverModifier[] };
}

interface CloverItem {
  id: string;
  name: string;
  price: number; // in cents
  available?: boolean;
  hidden?: boolean;
  imageUrl?: string;
  categories?: { elements: CloverCategory[] };
  modifierGroups?: { elements: CloverModifierGroup[] };
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
   * Pull all items + modifier groups from Clover and upsert into local DB.
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
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // ── Step 1: Fetch all modifier groups from Clover ─────────────────────
      let allCloverGroups: CloverModifierGroup[] = [];
      {
        let offset = 0;
        const limit = 200;
        while (true) {
          const res = await axios.get(
            cloverUrl(`/modifier_groups?expand=modifiers&limit=${limit}&offset=${offset}`),
            { headers: cloverHeaders() }
          );
          const elements: CloverModifierGroup[] = res.data?.elements ?? [];
          allCloverGroups = allCloverGroups.concat(elements);
          if (elements.length < limit) break;
          offset += limit;
        }
      }

      // ── Step 2: Upsert modifier groups and their options ──────────────────
      // Build map: cloverGroupId → local modifierGroups.id
      const existingGroupRows = await database.select({
        id: modifierGroups.id,
        cloverGroupId: modifierGroups.cloverGroupId,
      }).from(modifierGroups);

      const groupIdMap = new Map<string, number>(); // cloverGroupId → local id
      for (const row of existingGroupRows) {
        if (row.cloverGroupId) groupIdMap.set(row.cloverGroupId, row.id);
      }

      for (const cg of allCloverGroups) {
        const isRequired = (cg.minRequired ?? 0) > 0;
        const maxSelect = cg.maxAllowed ?? 1;
        const minSelect = cg.minRequired ?? 0;

        let localGroupId: number;

        if (groupIdMap.has(cg.id)) {
          // Update existing group
          localGroupId = groupIdMap.get(cg.id)!;
          await database.update(modifierGroups)
            .set({ name: cg.name, required: isRequired, minSelect, maxSelect })
            .where(eq(modifierGroups.id, localGroupId));
        } else {
          // Insert new group
          const [result] = await database.insert(modifierGroups).values({
            name: cg.name,
            required: isRequired,
            minSelect,
            maxSelect,
            sortOrder: 0,
            cloverGroupId: cg.id,
          });
          localGroupId = (result as unknown as { insertId: number }).insertId;
          groupIdMap.set(cg.id, localGroupId);
        }

        // Upsert options for this group
        const cloverOptions = cg.modifiers?.elements ?? [];
        const existingOptionRows = await database.select({
          id: modifierOptions.id,
          cloverOptionId: modifierOptions.cloverOptionId,
        }).from(modifierOptions).where(eq(modifierOptions.groupId, localGroupId));

        const optionIdMap = new Map<string, number>();
        for (const row of existingOptionRows) {
          if (row.cloverOptionId) optionIdMap.set(row.cloverOptionId, row.id);
        }

        for (let i = 0; i < cloverOptions.length; i++) {
          const co = cloverOptions[i];
          const priceAdj = ((co.price ?? 0) / 100).toFixed(2);

          if (optionIdMap.has(co.id)) {
            await database.update(modifierOptions)
              .set({ name: co.name, priceAdjustment: priceAdj, sortOrder: i })
              .where(eq(modifierOptions.id, optionIdMap.get(co.id)!));
          } else {
            await database.insert(modifierOptions).values({
              groupId: localGroupId,
              name: co.name,
              priceAdjustment: priceAdj,
              isDefault: false,
              sortOrder: i,
              cloverOptionId: co.id,
            });
          }
        }
      }

      // ── Step 3: Fetch all items from Clover ───────────────────────────────
      let allItems: CloverItem[] = [];
      {
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
      }

      // Filter out hidden items
      const visibleItems = allItems.filter((item) => !item.hidden);

      // ── Step 4: Upsert items ──────────────────────────────────────────────
      const existingItemRows = await database.select({
        id: menuItems.id,
        cloverItemId: menuItems.cloverItemId,
        printLabel: menuItems.printLabel,
      }).from(menuItems);

      const itemIdMap = new Map<string, { id: number; printLabel: string }>();
      for (const row of existingItemRows) {
        if (row.cloverItemId) itemIdMap.set(row.cloverItemId, { id: row.id, printLabel: row.printLabel });
      }

      let created = 0;
      let updated = 0;
      const skipped = allItems.length - visibleItems.length;

      for (const item of visibleItems) {
        const priceInDollars = (item.price ?? 0) / 100;
        const firstCategory = item.categories?.elements?.[0];
        const categorySlug = categoryToSlug(firstCategory?.name);
        const autoLabel = getPrinterLabel(item.name) as "Food" | "Pizza" | "Pizzeria" | "Bar/Drinks";

        const existing = itemIdMap.get(item.id);
        let localItemId: number;

        if (existing) {
          localItemId = existing.id;
          const labelToUse = overrideLabels
            ? autoLabel
            : (existing.printLabel as "Food" | "Pizza" | "Pizzeria" | "Bar/Drinks");

          const updatePayload: Record<string, unknown> = {
            name: item.name,
            price: String(priceInDollars),
            category: categorySlug,
            isAvailable: item.available !== false,
            printLabel: labelToUse,
          };
          // Only update imageUrl from Clover if the item doesn't already have a local image
          if (item.imageUrl) {
            updatePayload.imageUrl = item.imageUrl;
          }

          await database.update(menuItems).set(updatePayload).where(eq(menuItems.id, localItemId));
          updated++;
        } else {
          const [result] = await database.insert(menuItems).values({
            name: item.name,
            price: String(priceInDollars),
            category: categorySlug,
            isAvailable: item.available !== false,
            printLabel: autoLabel,
            cloverItemId: item.id,
            imageUrl: item.imageUrl ?? null,
            sortOrder: 0,
          });
          localItemId = (result as unknown as { insertId: number }).insertId;
          itemIdMap.set(item.id, { id: localItemId, printLabel: autoLabel });
          created++;
        }

        // ── Step 5: Rebuild itemModifierGroups for this item ─────────────
        const cloverGroupsForItem = item.modifierGroups?.elements ?? [];
        if (cloverGroupsForItem.length > 0) {
          // Delete existing assignments for this item
          await database.delete(itemModifierGroups).where(eq(itemModifierGroups.itemId, localItemId));

          // Re-insert with correct local group IDs
          for (let i = 0; i < cloverGroupsForItem.length; i++) {
            const cg = cloverGroupsForItem[i];
            const localGroupId = groupIdMap.get(cg.id);
            if (localGroupId) {
              await database.insert(itemModifierGroups).values({
                itemId: localItemId,
                groupId: localGroupId,
                sortOrder: i,
              });
            }
          }
        }
      }

      return {
        total: allItems.length,
        visible: visibleItems.length,
        created,
        updated,
        skipped,
        modifierGroupsSynced: allCloverGroups.length,
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
