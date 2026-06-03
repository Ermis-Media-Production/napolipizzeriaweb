/**
 * scheduledCloverSync.ts
 *
 * Express handler for the nightly Clover item sync cron job.
 * Mounted at POST /api/scheduled/clover-sync in server/_core/index.ts
 *
 * The Manus heartbeat platform POSTs to this endpoint every day at 02:00 AM
 * Las Vegas time (09:00 UTC). The handler authenticates the cron token,
 * runs the full Clover item + modifier sync, and returns a JSON summary.
 *
 * Auth: sdk.authenticateRequest validates the cron JWT and sets user.isCron=true.
 * The handler rejects any request that is NOT from the cron system.
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { CLOVER_ENV } from "./_core/env";
import { getDb } from "./db";
import { menuItems, modifierGroups, modifierOptions, itemModifierGroups } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getPrinterLabel } from "./cloverSync";
import axios from "axios";

// ── Helpers (duplicated from cloverItemSync.ts to avoid circular imports) ─────

function cloverHeaders() {
  return {
    Authorization: `Bearer ${CLOVER_ENV.apiToken}`,
    "Content-Type": "application/json",
  };
}

function cloverUrl(path: string) {
  return `${CLOVER_ENV.baseUrl}/v3/merchants/${CLOVER_ENV.merchantId}${path}`;
}

function categoryToSlug(categoryName: string | undefined): string {
  if (!categoryName) return "special";
  const name = categoryName.toLowerCase().trim();

  // Exact matches first
  const EXACT: Record<string, string> = {
    "appetizers": "appetizer",
    "appetizer": "appetizer",
    "lunch specials": "lunch",
    "lunch special": "lunch",
    "lunch": "lunch",
    "pizza": "pizza",
    "pizzas": "pizza",
    "calzone": "pizza",
    "stromboli": "pizza",
    "wings": "wings",
    "wing": "wings",
    "pasta": "pasta",
    "pastas": "pasta",
    "subs": "sandwich",
    "sub": "sandwich",
    "sandwiches": "sandwich",
    "sandwich": "sandwich",
    "wraps": "sandwich",
    "wrap": "sandwich",
    "triple deckers": "sandwich",
    "triple decker": "sandwich",
    "burgers": "burger",
    "burger": "burger",
    "salads": "salad",
    "salad": "salad",
    "sides": "sides",
    "side": "sides",
    "desserts": "dessert",
    "dessert": "dessert",
    "children's menu": "kids",
    "kids menu": "kids",
    "kids": "kids",
    "beverages": "beverage",
    "beverage": "beverage",
    "drinks": "beverage",
    "drink": "beverage",
    "soups": "soup",
    "soup": "soup",
    "catering": "catering",
    "anytime specials": "special",
    "specials": "special",
    "special": "special",
  };
  if (EXACT[name]) return EXACT[name];

  // Fuzzy fallback
  if (name.includes("pizza") || name.includes("calzone") || name.includes("stromboli")) return "pizza";
  if (name.includes("wing")) return "wings";
  if (name.includes("appetizer") || name.includes("starter")) return "appetizer";
  if (name.includes("lunch")) return "lunch";
  if (name.includes("pasta") || name.includes("spaghetti") || name.includes("lasagna")) return "pasta";
  if (name.includes("sub") || name.includes("sandwich") || name.includes("wrap") || name.includes("triple decker")) return "sandwich";
  if (name.includes("burger")) return "burger";
  if (name.includes("salad")) return "salad";
  if (name.includes("side")) return "sides";
  if (name.includes("soup")) return "soup";
  if (name.includes("kids") || name.includes("children")) return "kids";
  if (name.includes("drink") || name.includes("beverage") || name.includes("soda") || name.includes("beer") || name.includes("wine")) return "beverage";
  if (name.includes("dessert") || name.includes("sweet") || name.includes("cake") || name.includes("ice cream")) return "dessert";
  if (name.includes("catering")) return "catering";
  if (name.includes("special")) return "special";
  return "special";
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CloverCategory { id: string; name: string; }
interface CloverModifier { id: string; name: string; price?: number; }
interface CloverModifierGroup {
  id: string; name: string;
  minRequired?: number; maxAllowed?: number;
  modifiers?: { elements: CloverModifier[] };
}
interface CloverItem {
  id: string; name: string; price: number;
  available?: boolean; hidden?: boolean; imageUrl?: string;
  categories?: { elements: CloverCategory[] };
  modifierGroups?: { elements: CloverModifierGroup[] };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function handleScheduledCloverSync(req: Request, res: Response) {
  const startedAt = new Date().toISOString();

  try {
    // 1. Authenticate — only cron tokens are allowed
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    // 2. Verify Clover credentials are configured
    if (!CLOVER_ENV.apiToken || !CLOVER_ENV.merchantId) {
      return res.status(500).json({
        error: "Clover credentials not configured",
        context: { taskUid: user.taskUid },
        timestamp: startedAt,
      });
    }

    const database = await getDb();
    if (!database) {
      return res.status(500).json({
        error: "Database not available",
        context: { taskUid: user.taskUid },
        timestamp: startedAt,
      });
    }

    // ── Step 1: Fetch all modifier groups from Clover ─────────────────────────
    let allCloverGroups: CloverModifierGroup[] = [];
    {
      let offset = 0;
      const limit = 200;
      while (true) {
        const r = await axios.get(
          cloverUrl(`/modifier_groups?expand=modifiers&limit=${limit}&offset=${offset}`),
          { headers: cloverHeaders(), timeout: 30_000 }
        );
        const elements: CloverModifierGroup[] = r.data?.elements ?? [];
        allCloverGroups = allCloverGroups.concat(elements);
        if (elements.length < limit) break;
        offset += limit;
      }
    }

    // ── Step 2: Upsert modifier groups + options ──────────────────────────────
    const existingGroupRows = await database.select({
      id: modifierGroups.id,
      cloverGroupId: modifierGroups.cloverGroupId,
    }).from(modifierGroups);

    const groupIdMap = new Map<string, number>();
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
          name: cg.name, required: isRequired, minSelect, maxSelect,
          sortOrder: 0, cloverGroupId: cg.id,
        });
        localGroupId = (result as unknown as { insertId: number }).insertId;
        groupIdMap.set(cg.id, localGroupId);
      }

      const cloverOpts = cg.modifiers?.elements ?? [];
      const existingOptRows = await database.select({
        id: modifierOptions.id,
        cloverOptionId: modifierOptions.cloverOptionId,
      }).from(modifierOptions).where(eq(modifierOptions.groupId, localGroupId));

      const optionIdMap = new Map<string, number>();
      for (const row of existingOptRows) {
        if (row.cloverOptionId) optionIdMap.set(row.cloverOptionId, row.id);
      }

      for (let i = 0; i < cloverOpts.length; i++) {
        const co = cloverOpts[i];
        const priceAdj = ((co.price ?? 0) / 100).toFixed(2);
        if (optionIdMap.has(co.id)) {
          await database.update(modifierOptions)
            .set({ name: co.name, priceAdjustment: priceAdj, sortOrder: i })
            .where(eq(modifierOptions.id, optionIdMap.get(co.id)!));
        } else {
          await database.insert(modifierOptions).values({
            groupId: localGroupId, name: co.name, priceAdjustment: priceAdj,
            isDefault: false, sortOrder: i, cloverOptionId: co.id,
          });
        }
      }
    }

    // ── Step 3: Fetch all items from Clover ───────────────────────────────────
    let allItems: CloverItem[] = [];
    {
      let offset = 0;
      const limit = 200;
      while (true) {
        const r = await axios.get(
          cloverUrl(`/items?expand=categories,modifierGroups&limit=${limit}&offset=${offset}`),
          { headers: cloverHeaders(), timeout: 30_000 }
        );
        const elements: CloverItem[] = r.data?.elements ?? [];
        allItems = allItems.concat(elements);
        if (elements.length < limit) break;
        offset += limit;
      }
    }

    const visibleItems = allItems.filter((item) => !item.hidden);

    // ── Step 4: Upsert items ──────────────────────────────────────────────────
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
        const updatePayload: Record<string, unknown> = {
          name: item.name,
          price: String(priceInDollars),
          category: categorySlug,
          isAvailable: item.available !== false,
          // Preserve existing printLabel — never override admin assignments
          printLabel: existing.printLabel,
        };
        if (item.imageUrl) updatePayload.imageUrl = item.imageUrl;
        await database.update(menuItems).set(updatePayload).where(eq(menuItems.id, localItemId));
        updated++;
      } else {
        const [result] = await database.insert(menuItems).values({
          name: item.name, price: String(priceInDollars), category: categorySlug,
          isAvailable: item.available !== false, printLabel: autoLabel,
          cloverItemId: item.id, imageUrl: item.imageUrl ?? null, sortOrder: 0,
        });
        localItemId = (result as unknown as { insertId: number }).insertId;
        itemIdMap.set(item.id, { id: localItemId, printLabel: autoLabel });
        created++;
      }

      // Rebuild itemModifierGroups for this item
      const cloverGroupsForItem = item.modifierGroups?.elements ?? [];
      if (cloverGroupsForItem.length > 0) {
        await database.delete(itemModifierGroups).where(eq(itemModifierGroups.itemId, localItemId));
        for (let i = 0; i < cloverGroupsForItem.length; i++) {
          const cg = cloverGroupsForItem[i];
          const localGroupId = groupIdMap.get(cg.id);
          if (localGroupId) {
            await database.insert(itemModifierGroups).values({
              itemId: localItemId, groupId: localGroupId, sortOrder: i,
            });
          }
        }
      }
    }

    const summary = {
      ok: true,
      total: allItems.length,
      visible: visibleItems.length,
      created,
      updated,
      skipped,
      modifierGroupsSynced: allCloverGroups.length,
      syncedAt: new Date().toISOString(),
    };

    console.log("[ScheduledCloverSync] Completed:", summary);
    return res.json(summary);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[ScheduledCloverSync] Error:", message);
    return res.status(500).json({
      error: message,
      stack,
      context: { url: req.url },
      timestamp: startedAt,
    });
  }
}
