/**
 * run-clover-sync.mjs
 *
 * Standalone script to execute the Clover item sync directly from the server
 * environment (bypasses tRPC auth, runs with server-side credentials).
 *
 * Usage: pnpm tsx scripts/run-clover-sync.mjs
 */

import "dotenv/config";
import axios from "axios";
import mysql from "mysql2/promise";

const CLOVER_API_TOKEN = process.env.CLOVER_API_TOKEN;
const CLOVER_MERCHANT_ID = process.env.CLOVER_MERCHANT_ID;
const CLOVER_BASE_URL = process.env.CLOVER_IS_SANDBOX === "true"
  ? "https://sandbox.dev.clover.com"
  : "https://api.clover.com";
const DATABASE_URL = process.env.DATABASE_URL;

if (!CLOVER_API_TOKEN || !CLOVER_MERCHANT_ID) {
  console.error("❌ Missing CLOVER_API_TOKEN or CLOVER_MERCHANT_ID");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("❌ Missing DATABASE_URL");
  process.exit(1);
}

function cloverHeaders() {
  return { Authorization: `Bearer ${CLOVER_API_TOKEN}`, "Content-Type": "application/json" };
}
function cloverUrl(path) {
  return `${CLOVER_BASE_URL}/v3/merchants/${CLOVER_MERCHANT_ID}${path}`;
}

// Printer ID → label mapping
const PRINTER_MAP = {
  "65QB994H6Z44W": "Pizza",
  "MCWCF8204E7QM": "Food",
  "WBSHK4762NS76": "Pizzeria",
};

const PIZZA_KEYWORDS = ["pizza","calzone","stromboli","chicago deep dish","sicilian","stuffed chicago","nutella pizza","half & half","4 topp combo","stuffed dough","gluten free pizza","gluten-free pizza"];
const DESSERT_KEYWORDS = ["zeppoli","red velvet cake","eclair","brownie","cannoli","baklava","cheesecake","tiramisu","chocolate cake","carrot cake","dessert"];
const BEVERAGE_KEYWORDS = ["soda can","glass bottle soda","perrier","bottled water","2 liter","iced tea","root beer float","milkshake","frozen custard","wine","beer","juice","lemonade","water","beverage","drink","coffee","espresso","cappuccino"];

function getPrinterLabel(name) {
  const lower = name.toLowerCase();
  if (PIZZA_KEYWORDS.some(kw => lower.includes(kw))) return "Pizza";
  if (DESSERT_KEYWORDS.some(kw => lower.includes(kw)) || BEVERAGE_KEYWORDS.some(kw => lower.includes(kw))) return "Pizzeria";
  return "Food";
}

function categoryToSlug(name) {
  if (!name) return "special";
  const n = name.toLowerCase().trim();
  if (n.includes("pizza") || n.includes("calzone") || n.includes("stromboli")) return "pizza";
  if (n.includes("burger") || n.includes("sandwich") || n.includes("wrap")) return "burger";
  if (n.includes("pasta") || n.includes("spaghetti") || n.includes("lasagna")) return "pasta";
  if (n.includes("wing") || n.includes("appetizer") || n.includes("starter")) return "wings";
  if (n.includes("salad")) return "salad";
  if (n.includes("soup")) return "soup";
  if (n.includes("kids") || n.includes("children")) return "kids";
  if (n.includes("drink") || n.includes("beverage") || n.includes("soda") || n.includes("beer") || n.includes("wine")) return "beverage";
  if (n.includes("dessert") || n.includes("sweet") || n.includes("cake") || n.includes("ice cream")) return "dessert";
  if (n.includes("lunch") || n.includes("special")) return "special";
  if (n.includes("catering")) return "catering";
  return "special";
}

async function fetchAll(url) {
  let results = [];
  let offset = 0;
  const limit = 200;
  while (true) {
    const sep = url.includes("?") ? "&" : "?";
    const res = await axios.get(`${url}${sep}limit=${limit}&offset=${offset}`, { headers: cloverHeaders() });
    const elements = res.data?.elements ?? [];
    results = results.concat(elements);
    if (elements.length < limit) break;
    offset += limit;
  }
  return results;
}

async function main() {
  console.log("🔄 Connecting to database...");
  const conn = await mysql.createConnection(DATABASE_URL.replace(/\?.*$/, "") + "?ssl={\"rejectUnauthorized\":true}");

  try {
    console.log("📦 Fetching modifier groups from Clover...");
    const cloverGroups = await fetchAll(cloverUrl(`/modifier_groups?expand=modifiers`));
    console.log(`   Found ${cloverGroups.length} modifier groups`);

    // Get existing groups
    const [existingGroups] = await conn.execute("SELECT id, cloverGroupId FROM modifierGroups WHERE cloverGroupId IS NOT NULL");
    const groupIdMap = new Map(existingGroups.map(r => [r.cloverGroupId, r.id]));

    for (const cg of cloverGroups) {
      const isRequired = (cg.minRequired ?? 0) > 0 ? 1 : 0;
      const maxSelect = cg.maxAllowed ?? 1;
      const minSelect = cg.minRequired ?? 0;

      if (groupIdMap.has(cg.id)) {
        const localId = groupIdMap.get(cg.id);
        await conn.execute(
          "UPDATE modifierGroups SET name=?, required=?, minSelect=?, maxSelect=? WHERE id=?",
          [cg.name, isRequired, minSelect, maxSelect, localId]
        );
      } else {
        const [result] = await conn.execute(
          "INSERT INTO modifierGroups (name, required, minSelect, maxSelect, sortOrder, cloverGroupId) VALUES (?,?,?,?,0,?)",
          [cg.name, isRequired, minSelect, maxSelect, cg.id]
        );
        groupIdMap.set(cg.id, result.insertId);
      }

      // Upsert options
      const localGroupId = groupIdMap.get(cg.id);
      const options = cg.modifiers?.elements ?? [];
      const [existingOpts] = await conn.execute(
        "SELECT id, cloverOptionId FROM modifierOptions WHERE groupId=? AND cloverOptionId IS NOT NULL",
        [localGroupId]
      );
      const optMap = new Map(existingOpts.map(r => [r.cloverOptionId, r.id]));

      for (let i = 0; i < options.length; i++) {
        const co = options[i];
        const priceAdj = ((co.price ?? 0) / 100).toFixed(2);
        if (optMap.has(co.id)) {
          await conn.execute(
            "UPDATE modifierOptions SET name=?, priceAdjustment=?, sortOrder=? WHERE id=?",
            [co.name, priceAdj, i, optMap.get(co.id)]
          );
        } else {
          await conn.execute(
            "INSERT INTO modifierOptions (groupId, name, priceAdjustment, isDefault, sortOrder, cloverOptionId) VALUES (?,?,?,0,?,?)",
            [localGroupId, co.name, priceAdj, i, co.id]
          );
        }
      }
    }
    console.log(`   ✅ Modifier groups synced`);

    console.log("🍕 Fetching items from Clover...");
    const allItems = await fetchAll(cloverUrl(`/items?expand=categories,modifierGroups,printerLabels,tags`));
    const visibleItems = allItems.filter(item => !item.hidden);
    console.log(`   Found ${allItems.length} items (${visibleItems.length} visible, ${allItems.length - visibleItems.length} hidden)`);

    // Get existing items
    const [existingItems] = await conn.execute("SELECT id, cloverItemId, printLabel FROM menuItems WHERE cloverItemId IS NOT NULL");
    const itemIdMap = new Map(existingItems.map(r => [r.cloverItemId, { id: r.id, printLabel: r.printLabel }]));

    let created = 0, updated = 0;
    const labelBreakdown = {};
    let fromClover = 0, fromAuto = 0;

    for (const item of visibleItems) {
      const price = ((item.price ?? 0) / 100).toFixed(2);
      const firstCat = item.categories?.elements?.[0];
      const catSlug = categoryToSlug(firstCat?.name);

      // Determine printer label
      const cloverPrinterEls = item.printerLabels?.elements ?? [];
      let cloverLabel = null;
      for (const pl of cloverPrinterEls) {
        if (PRINTER_MAP[pl.id]) { cloverLabel = PRINTER_MAP[pl.id]; break; }
      }
      const autoLabel = getPrinterLabel(item.name);
      const detectedLabel = cloverLabel ?? autoLabel;
      const labelSource = cloverLabel ? "clover" : "auto";

      labelBreakdown[detectedLabel] = (labelBreakdown[detectedLabel] ?? 0) + 1;
      if (labelSource === "clover") fromClover++; else fromAuto++;

      const existing = itemIdMap.get(item.id);
      let localItemId;

      if (existing) {
        localItemId = existing.id;
        // Use Clover's label if available, else preserve existing
        const labelToUse = cloverLabel ?? existing.printLabel;
        const updateFields = [item.name, price, catSlug, item.available !== false ? 1 : 0, labelToUse, item.id, localItemId];
        await conn.execute(
          "UPDATE menuItems SET name=?, price=?, category=?, isAvailable=?, printLabel=?, cloverItemId=? WHERE id=?",
          updateFields
        );
        if (item.imageUrl) {
          await conn.execute("UPDATE menuItems SET imageUrl=? WHERE id=?", [item.imageUrl, localItemId]);
        }
        updated++;
      } else {
        const [result] = await conn.execute(
          "INSERT INTO menuItems (name, price, category, isAvailable, printLabel, cloverItemId, imageUrl, sortOrder) VALUES (?,?,?,?,?,?,?,0)",
          [item.name, price, catSlug, item.available !== false ? 1 : 0, detectedLabel, item.id, item.imageUrl ?? null]
        );
        localItemId = result.insertId;
        itemIdMap.set(item.id, { id: localItemId, printLabel: detectedLabel });
        created++;
      }

      // Rebuild modifier group assignments
      const itemGroups = item.modifierGroups?.elements ?? [];
      if (itemGroups.length > 0) {
        await conn.execute("DELETE FROM itemModifierGroups WHERE itemId=?", [localItemId]);
        for (let i = 0; i < itemGroups.length; i++) {
          const cg = itemGroups[i];
          const localGroupId = groupIdMap.get(cg.id);
          if (localGroupId) {
            await conn.execute(
              "INSERT INTO itemModifierGroups (itemId, groupId, sortOrder) VALUES (?,?,?)",
              [localItemId, localGroupId, i]
            );
          }
        }
      }
    }

    console.log("\n✅ SYNC COMPLETE");
    console.log(`   Items: ${created} created, ${updated} updated, ${allItems.length - visibleItems.length} skipped (hidden)`);
    console.log(`   Modifier groups: ${cloverGroups.length} synced`);
    console.log(`   Printer labels: ${fromClover} from Clover, ${fromAuto} auto-detected`);
    console.log(`   Label breakdown:`, labelBreakdown);

    // Verify: show a sample of items with their labels
    const [sample] = await conn.execute(
      "SELECT name, printLabel, cloverItemId FROM menuItems WHERE cloverItemId IS NOT NULL ORDER BY name LIMIT 20"
    );
    console.log("\n📋 Sample items (first 20):");
    for (const row of sample) {
      console.log(`   [${row.printLabel.padEnd(10)}] ${row.name}`);
    }

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("❌ Sync failed:", err.message);
  process.exit(1);
});
