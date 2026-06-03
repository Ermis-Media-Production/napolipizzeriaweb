/**
 * showPayload.mjs
 *
 * Shows exactly what payload is sent to Clover for each test order,
 * without actually making any API calls.
 *
 * Run: node server/showPayload.mjs
 */

// ── Reproduce the same logic as cloverSync.ts ─────────────────────────────────

const PRINTER_PIZZA    = "65QB994H6Z44W";
const PRINTER_FOOD     = "MCWCF8204E7QM";
const PRINTER_PIZZERIA = "WBSHK4762NS76";

const PIZZA_KW = ["pizza","calzone","stromboli","chicago deep dish","sicilian","stuffed chicago","nutella pizza","half & half","4 topp combo","stuffed dough","gluten free pizza","gluten-free pizza"];
const PIZZA_SPECIAL_NAMES = new Set(["bbq chicken","buffalo chicken","3 cheese","chicken alfredo","deluxe","greek","italian","meat lover","mexican style","napoli's special","pesto chicken","ranch","southwestern chicken","supreme","taco","vegetarian","white pizza"]);
const DESSERT_KW = ["zeppoli","red velvet cake","eclair","brownie","cannoli","baklava","cheesecake","tiramisu","chocolate cake","carrot cake","dessert"];
const BEV_KW = ["soda can","glass bottle soda","perrier","bottled water","2 liter","iced tea","root beer float","milkshake","frozen custard","wine","beer","juice","lemonade","water","beverage","drink","coffee","espresso","cappuccino"];
const PIZZA_SIZE_SUFFIX = /\s*\(\d{1,2}["\u201d]\)\s*$/;

function getPrinterLabel(name) {
  const lower = name.toLowerCase();
  if (PIZZA_KW.some(kw => lower.includes(kw))) return "Pizza";
  const baseName = lower.replace(PIZZA_SIZE_SUFFIX, "").trim();
  if (PIZZA_SPECIAL_NAMES.has(baseName)) return "Pizza";
  if (DESSERT_KW.some(kw => lower.includes(kw)) || BEV_KW.some(kw => lower.includes(kw))) return "Pizzeria";
  return "Food";
}

const PRINTER_IDS = { Pizza: PRINTER_PIZZA, Food: PRINTER_FOOD, Pizzeria: PRINTER_PIZZERIA };

function parseModifiers(description) {
  return description
    .trim()
    .split(/ · |\n|\|/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/(Half & Half)/gi, "*** $1 ***"));
}

function buildLineItems(items) {
  const lineItems = [];
  for (const item of items) {
    const label = getPrinterLabel(item.name);
    const printerId = PRINTER_IDS[label];

    // Parent item
    const parent = {
      name: item.name,
      price: Math.round(item.price * 100),
      unitQty: item.quantity,
      printerLabel: { id: printerId },
      _printer_label: label,   // display only
    };
    if (item.cloverItemId) parent.item = { id: item.cloverItemId };
    lineItems.push(parent);

    // Modifier sub-items ($0 each)
    if (item.description && item.description.trim()) {
      const mods = parseModifiers(item.description);
      for (const mod of mods) {
        lineItems.push({
          name: `  - ${mod}`,
          price: 0,
          unitQty: 1,
          printerLabel: { id: printerId },
          _printer_label: label,
        });
      }
    }
  }
  return lineItems;
}

function printOrder(title, items) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`ORDER: ${title}`);
  console.log(`${"═".repeat(60)}`);

  const lineItems = buildLineItems(items);

  console.log(`\nPOST /orders/{id}/bulk_line_items`);
  console.log(`{ "items": [`);
  lineItems.forEach((li, i) => {
    const price = li.price === 0 ? "$0.00 (modifier)" : `$${(li.price/100).toFixed(2)}`;
    const comma = i < lineItems.length - 1 ? "," : "";
    console.log(`  {`);
    console.log(`    "name":         "${li.name}",`);
    console.log(`    "price":        ${li.price},  // ${price}`);
    console.log(`    "unitQty":      ${li.unitQty},`);
    console.log(`    "printerLabel": { "id": "${li.printerLabel.id}" }  // → ${li._printer_label} printer`);
    if (li.item) console.log(`    "item":         { "id": "${li.item.id}" }  // Clover catalog ID`);
    console.log(`  }${comma}`);
  });
  console.log(`]}`);

  console.log(`\nKITCHEN TICKET PREVIEW (what prints):`);
  console.log(`${"─".repeat(40)}`);
  lineItems.forEach(li => {
    const priceStr = li.price > 0 ? `  $${(li.price/100).toFixed(2)}` : "";
    console.log(`${li.name}${priceStr}`);
  });
  console.log(`${"─".repeat(40)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 1 — BURGER with full modifiers
// ─────────────────────────────────────────────────────────────────────────────
printOrder("Burger — Napoli's 1000 Island", [
  {
    name: "Napoli's 1000 Island",
    price: 14.99,
    quantity: 1,
    description: "Size: Full lb · Bread: Regular Bun · Sauce: 1000 Island · Sauce: Mustard · Extra: Cheese +$1 · Extra: Bacon +$1 · Remove: No Onion · Remove: No Pickles · ⚠ Allergy: Nut allergy",
  },
  {
    name: "French Fries",
    price: 2.99,
    quantity: 1,
    description: "",
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 2 — PIZZA with Half & Half, toppings, crust, cut
// ─────────────────────────────────────────────────────────────────────────────
printOrder("Pizza — Napoli's Special 16\" Half & Half", [
  {
    name: "Napoli's Special (16\")",
    price: 24.99,
    quantity: 1,
    description: "Half & Half · LEFT: Napoli's Special (Pepperoni, Sausage, Mushrooms) · RIGHT: BBQ Chicken (Chicken, BBQ Sauce, Red Onion) · Extra: Jalapeños +$3 · Size: 16\" · Crust: Stuffed · Cut: Square Cut · Notes: Extra crispy",
  },
  {
    name: "Soda Can",
    price: 2.00,
    quantity: 2,
    description: "Flavor: Coke",
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 3 — WINGS with Half & Half sauces
// ─────────────────────────────────────────────────────────────────────────────
printOrder("Wings 20pc — Half & Half", [
  {
    name: "Wings (20pc)",
    price: 19.99,
    quantity: 1,
    description: "Half & Half · HALF 1 (10pc): Buffalo Hot · HALF 2 (10pc): Garlic Parmesan · Side: Blue Cheese · Side: Ranch · Notes: Extra sauce on side",
  },
]);
