/**
 * cloverItemSync.ts
 *
 * Admin-only tRPC procedures to pull items, modifier groups, and modifier options
 * from the Clover inventory API and upsert them into the local database.
 *
 * Clover API endpoints used:
 *   GET /v3/merchants/{mId}/items?expand=categories,modifierGroups,tags&limit=200
 *   GET /v3/merchants/{mId}/modifier_groups?expand=modifiers&limit=200
 *   GET /v3/merchants/{mId}/printers
 *
 * Sync logic:
 *   - Items matched by cloverItemId; new items inserted, existing ones updated.
 *   - Modifier groups matched by cloverGroupId; new groups inserted, existing updated.
 *   - Modifier options matched by cloverOptionId; new options inserted, existing updated.
 *   - itemModifierGroups join table rebuilt for each synced item.
 *   - printLabel is read directly from Clover's printerLabel assignment when available.
 *     If no Clover printer label is set, falls back to keyword-based auto-detection.
 *   - Existing printLabel overrides set by the admin are PRESERVED on item update
 *     unless overridePrintLabels=true is passed.
 *   - Items that exist locally but are NOT in Clover are left untouched.
 */

import axios from "axios";
import { eq } from "drizzle-orm";
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
import { getPrinterLabel, CLOVER_PRINTER_IDS } from "./cloverSync";

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

interface CloverPrinterLabel {
  id: string;
  name?: string;
}

interface CloverItem {
  id: string;
  name: string;
  price: number; // in cents
  price2?: number; // in cents (second price tier)
  available?: boolean;
  hidden?: boolean;
  imageUrl?: string;
  sku?: string;
  code?: string; // barcode
  priceType?: string; // FIXED | VARIABLE | PER_UNIT
  unitName?: string;
  cost?: number; // cost in cents
  isRevenue?: boolean;
  categories?: { elements: CloverCategory[] };
  modifierGroups?: { elements: CloverModifierGroup[] };
  printerLabels?: { elements: CloverPrinterLabel[] };
  tags?: { elements: Array<{ id: string; name: string }> };
}

// ── Map Clover printer ID to local printLabel ─────────────────────────────────

function cloverPrinterIdToLabel(printerId: string): "Food" | "Pizza" | "Pizzeria" | "Bar/Drinks" | null {
  switch (printerId) {
    case CLOVER_PRINTER_IDS.PIZZA:    return "Pizza";
    case CLOVER_PRINTER_IDS.FOOD:     return "Food";
    case CLOVER_PRINTER_IDS.PIZZERIA: return "Pizzeria";
    default:                           return null;
  }
}

// ── Map Clover tag name to local printLabel ───────────────────────────────────
// In Clover, printer labels assigned via Dashboard are stored as "tags" in the API.
// The tag names Pizza / Food / Pizzeria / Bar/Drinks map directly to our printLabel values.
const VALID_PRINT_LABELS = new Set(["Pizza", "Food", "Pizzeria", "Bar/Drinks"]);

function cloverTagToLabel(tagName: string): "Food" | "Pizza" | "Pizzeria" | "Bar/Drinks" | null {
  if (VALID_PRINT_LABELS.has(tagName)) return tagName as "Food" | "Pizza" | "Pizzeria" | "Bar/Drinks";
  return null;
}

// ── Improved routing that handles "Name SIZE\" Name" pattern ──────────────────
// e.g. "Italian 16\" Italian" → baseName = "italian" → Pizza
const PIZZA_SIZE_IN_MIDDLE = /^(.+?)\s+\d{1,2}["\u201d]\s+/;

function getPrinterLabelImproved(itemName: string): "Food" | "Pizza" | "Pizzeria" | "Bar/Drinks" {
  // First try the standard routing
  const standard = getPrinterLabel(itemName) as "Food" | "Pizza" | "Pizzeria" | "Bar/Drinks";
  if (standard !== "Food") return standard; // If it matched Pizza/Pizzeria, trust it

  // Check for "Name SIZE\" Name" pattern (e.g. "Italian 16\" Italian")
  const lower = (itemName ?? "").toLowerCase();
  const match = lower.match(PIZZA_SIZE_IN_MIDDLE);
  if (match) {
    const beforeSize = match[1].trim();
    const PIZZA_SPECIAL_NAMES = new Set([
      "bbq chicken", "buffalo chicken", "3 cheese", "chicken alfredo",
      "deluxe", "greek", "italian", "meat lover", "mexican style",
      "napoli's special", "pesto chicken", "ranch", "southwestern chicken",
      "supreme", "taco", "vegetarian", "white pizza",
    ]);
    if (PIZZA_SPECIAL_NAMES.has(beforeSize)) return "Pizza";
  }
  return "Food";
}

// ── Map Clover category name to local slug ────────────────────────────────────
// Explicit lookup table first (exact Clover category names), then fuzzy fallback
const CATEGORY_SLUG_MAP: Record<string, string> = {
  // Pizza variants → pizza
  "pizza": "pizza",
  "hand tossed new york style": "pizza",
  "specialty pizza": "pizza",
  "special pizza & wings": "pizza",
  "gluten free pizza": "pizza",
  "sicilian 12x8": "pizza",
  "stuffed dough": "pizza",
  "calzone & stromboli": "pizza",
  "4 topp combo": "pizza",
  "bbq chicken pizza": "pizza",
  "buffalo chicken": "pizza",
  "chicken alfredo pizza": "pizza",
  "deluxe pizza": "pizza",
  "five cheese pizza": "pizza",
  "greek pizza": "pizza",
  "italian pizza": "pizza",
  "meat lover": "pizza",
  "mexican style": "pizza",
  "napoli's special": "pizza",
  "pesto chicken": "pizza",
  "ranch pizza": "pizza",
  "southwestern chicken pizza": "pizza",
  "supreme pizza": "pizza",
  "taco pizza": "pizza",
  "ultimate meat lover": "pizza",
  "ultimate vegetarian": "pizza",
  "vegetarian pizza": "pizza",
  "white pizza": "pizza",
  // Burgers → burger
  "burgers": "burger",
  "1/2 pound burger": "burger",
  "full pound burger": "burger",
  // Sandwiches/Wraps → sandwich
  "sandwiches": "sandwich",
  "wraps": "sandwich",
  // Wings → wings
  "wings": "wings",
  // Appetizers → appetizer
  "appetizers": "appetizer",
  // Pasta → pasta
  "pasta": "pasta",
  // Salads → salad
  "salads": "salad",
  // Sides → sides
  "sides": "sides",
  "dressings sides": "sides",
  // Desserts → dessert
  "desserts": "dessert",
  // Kids → kids
  "children's menu": "kids",
  // Beverages → beverage
  "drinks": "beverage",
  "glass bottle soda": "beverage",
  // Specials → special
  "anytime specials": "special",
  "lunch special": "lunch",
  "pick up special": "special",
  "mother's day offers": "special",
  // Delivery charge → fee (hidden from menu)
  "delivery charge": "fee",
};

function categoryToSlug(categoryName: string | undefined): string {
  if (!categoryName) return "special";
  const name = categoryName.toLowerCase().trim();
  if (CATEGORY_SLUG_MAP[name]) return CATEGORY_SLUG_MAP[name];
  // Fuzzy fallback
  if (name.includes("pizza") || name.includes("calzone") || name.includes("stromboli")) return "pizza";
  if (name.includes("burger")) return "burger";
  if (name.includes("sandwich") || name.includes("wrap") || name.includes("sub")) return "sandwich";
  if (name.includes("pasta") || name.includes("spaghetti") || name.includes("lasagna")) return "pasta";
  if (name.includes("wing")) return "wings";
  if (name.includes("appetizer") || name.includes("starter")) return "appetizer";
  if (name.includes("salad")) return "salad";
  if (name.includes("soup")) return "soup";
  if (name.includes("kids") || name.includes("children")) return "kids";
  if (name.includes("drink") || name.includes("beverage") || name.includes("soda") || name.includes("beer") || name.includes("wine")) return "beverage";
  if (name.includes("dessert") || name.includes("sweet") || name.includes("cake") || name.includes("ice cream")) return "dessert";
  if (name.includes("lunch")) return "lunch";
  if (name.includes("special")) return "special";
  if (name.includes("side") || name.includes("dressing")) return "sides";
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
      /** If true, also update printLabel from Clover/auto-detection (default: preserve existing labels) */
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
          localGroupId = groupIdMap.get(cg.id)!;
          await database.update(modifierGroups)
            .set({ name: cg.name, required: isRequired, minSelect, maxSelect })
            .where(eq(modifierGroups.id, localGroupId));
        } else {
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

      // ── Step 3: Fetch all items from Clover (with printerLabels expanded) ─
      let allItems: CloverItem[] = [];
      {
        let offset = 0;
        const limit = 200;
        while (true) {
          const res = await axios.get(
            cloverUrl(`/items?expand=categories,modifierGroups,printerLabels,tags&limit=${limit}&offset=${offset}`),
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
      const labelLog: Array<{ name: string; label: string; source: string }> = [];

      for (const item of visibleItems) {
        const priceInDollars = (item.price ?? 0) / 100;
        const firstCategory = item.categories?.elements?.[0];
        const categorySlug = categoryToSlug(firstCategory?.name);

        // Determine printer label:
        // Priority 1: Clover tag name (e.g. "Pizza", "Food", "Pizzeria") — set via Dashboard
        // Priority 2: Clover printerLabel ID (legacy printer-based assignment)
        // Priority 3: Improved keyword-based auto-detection (fallback)
        const cloverTagElements = item.tags?.elements ?? [];
        let cloverLabel: "Food" | "Pizza" | "Pizzeria" | "Bar/Drinks" | null = null;
        for (const tag of cloverTagElements) {
          const mapped = cloverTagToLabel(tag.name);
          if (mapped) { cloverLabel = mapped; break; }
        }
        // Fallback: check printerLabels (legacy printer ID-based)
        if (!cloverLabel) {
          const cloverPrinterElements = item.printerLabels?.elements ?? [];
          for (const pl of cloverPrinterElements) {
            const mapped = cloverPrinterIdToLabel(pl.id);
            if (mapped) { cloverLabel = mapped; break; }
          }
        }
        const autoLabel = getPrinterLabelImproved(item.name);
        const detectedLabel = cloverLabel ?? autoLabel;
        const labelSource = cloverLabel ? "clover" : "auto";

        const existing = itemIdMap.get(item.id);
        let localItemId: number;

        if (existing) {
          localItemId = existing.id;
          // Label: use Clover's label if available, else preserve existing unless overrideLabels
          const labelToUse = cloverLabel
            ? cloverLabel
            : overrideLabels
              ? autoLabel
              : (existing.printLabel as "Food" | "Pizza" | "Pizzeria" | "Bar/Drinks");

          const updatePayload: Record<string, unknown> = {
            name: item.name,
            price: String(priceInDollars),
            category: categorySlug,
            isAvailable: item.available !== false,
            printLabel: labelToUse,
            cloverItemId: item.id,
          };
          if (item.imageUrl) {
            updatePayload.imageUrl = item.imageUrl;
          }

          await database.update(menuItems).set(updatePayload).where(eq(menuItems.id, localItemId));
          updated++;
          labelLog.push({ name: item.name, label: labelToUse, source: labelSource });
        } else {
          const [result] = await database.insert(menuItems).values({
            name: item.name,
            price: String(priceInDollars),
            category: categorySlug,
            isAvailable: item.available !== false,
            printLabel: detectedLabel,
            cloverItemId: item.id,
            imageUrl: item.imageUrl ?? null,
            sortOrder: 0,
          });
          localItemId = (result as unknown as { insertId: number }).insertId;
          itemIdMap.set(item.id, { id: localItemId, printLabel: detectedLabel });
          created++;
          labelLog.push({ name: item.name, label: detectedLabel, source: labelSource });
        }

        // ── Step 5: Rebuild itemModifierGroups for this item ─────────────
        const cloverGroupsForItem = item.modifierGroups?.elements ?? [];
        if (cloverGroupsForItem.length > 0) {
          await database.delete(itemModifierGroups).where(eq(itemModifierGroups.itemId, localItemId));

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

      // Build printer label breakdown for the report
      const labelBreakdown: Record<string, number> = {};
      for (const entry of labelLog) {
        labelBreakdown[entry.label] = (labelBreakdown[entry.label] ?? 0) + 1;
      }
      const cloverLabelCount = labelLog.filter(e => e.source === "clover").length;
      const autoLabelCount = labelLog.filter(e => e.source === "auto").length;

      return {
        total: allItems.length,
        visible: visibleItems.length,
        created,
        updated,
        skipped,
        modifierGroupsSynced: allCloverGroups.length,
        printerLabels: {
          breakdown: labelBreakdown,
          fromClover: cloverLabelCount,
          fromAutoDetect: autoLabelCount,
        },
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
