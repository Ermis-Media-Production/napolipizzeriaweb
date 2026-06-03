/**
 * testPrint.mjs
 *
 * Sends test orders to Clover POS to verify how modifiers appear on kitchen printer tickets.
 * Modifiers are sent as separate $0 line items (not in the note field).
 *
 * Run from cloud VM: node testPrint.mjs
 */

import "dotenv/config";
import axios from "axios";

const CLOVER_TOKEN = process.env.CLOVER_API_TOKEN;
const MERCHANT_ID  = process.env.CLOVER_MERCHANT_ID;
const BASE_URL     = "https://api.clover.com";

if (!CLOVER_TOKEN || !MERCHANT_ID) {
  console.error("❌  Missing CLOVER_API_TOKEN or CLOVER_MERCHANT_ID in env");
  process.exit(1);
}

const HEADERS = {
  Authorization: `Bearer ${CLOVER_TOKEN}`,
  "Content-Type": "application/json",
};

function url(path) {
  return `${BASE_URL}/v3/merchants/${MERCHANT_ID}${path}`;
}

// ── Fixed IDs ──────────────────────────────────────────────────────────────────
const EMPLOYEE_ID       = "DW4J35FH3R9B0";
const TENDER_ID         = "T416DFP49C7BJ";
const ORDER_TYPE_PICKUP = "CYNNEQA3ABD8Y";
const DEVICE_ID         = "1CCA370BF6A270FF2E4035A38A246183";
const PRINTER_PIZZA     = "65QB994H6Z44W";
const PRINTER_FOOD      = "MCWCF8204E7QM";
const PRINTER_PIZZERIA  = "WBSHK4762NS76";

// ── Routing logic (mirrors cloverSync.ts) ─────────────────────────────────────
const PIZZA_KW = ["pizza","calzone","stromboli","chicago deep dish","sicilian","stuffed chicago","nutella pizza","4 topp combo","stuffed dough","gluten free pizza","gluten-free pizza"];
const PIZZA_SPECIAL_NAMES = new Set(["bbq chicken","buffalo chicken","3 cheese","chicken alfredo","deluxe","greek","italian","meat lover","mexican style","napoli's special","pesto chicken","ranch","southwestern chicken","supreme","taco","vegetarian","white pizza","hawaiian"]);
const DESSERT_KW = ["zeppoli","red velvet cake","eclair","brownie","cannoli","baklava","cheesecake","tiramisu","chocolate cake","carrot cake","dessert"];
const BEV_KW = ["soda can","glass bottle soda","perrier","bottled water","2 liter","iced tea","root beer float","milkshake","frozen custard","wine","beer","juice","lemonade","water","beverage","drink","coffee","espresso","cappuccino"];
const PIZZA_SIZE_SUFFIX = /\s*\(\d{1,2}["]\)\s*$/;

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
    .split(" · ")
    .map(s => s.trim())
    .filter(Boolean);
}

function buildLineItems(items) {
  const lineItems = [];
  for (const item of items) {
    const label = getPrinterLabel(item.name);
    const printerId = PRINTER_IDS[label];
    lineItems.push({
      name: item.name,
      price: Math.round(item.price * 100),
      unitQty: item.qty,
      printerLabel: { id: printerId },
    });
    if (item.description && item.description.trim()) {
      for (const mod of parseModifiers(item.description)) {
        // Modifiers inherit the parent item's printerId — do NOT re-calculate
        // from the modifier name (it won't contain the pizza name).
        lineItems.push({
          name: `  - ${mod}`,
          price: 0,
          unitQty: 1,
          printerLabel: { id: printerId }, // same as parent
        });
      }
    }
  }
  return lineItems;
}

// ── Helper: create order + add items + fire print ─────────────────────────────
async function sendTestOrder({ title, note, items, totalCents }) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📋  Creating order: "${title}"`);

  const lineItems = buildLineItems(items);

  // Preview what will print
  console.log(`\n   Kitchen ticket preview:`);
  lineItems.forEach(li => {
    const priceStr = li.price > 0 ? `  $${(li.price/100).toFixed(2)}` : "";
    const label = getPrinterLabel(li.name);
    console.log(`   [${label}] ${li.name}${priceStr}`);
  });
  console.log("");

  // 1. Create order shell
  const orderRes = await axios.post(
    url("/orders"),
    {
      state: "Open",
      currency: "USD",
      total: totalCents,
      title,
      note,
      manualTransaction: false,
      testMode: false,
      employee: { id: EMPLOYEE_ID },
      orderType: { id: ORDER_TYPE_PICKUP },
    },
    { headers: HEADERS }
  );
  const orderId = orderRes.data.id;
  console.log(`✅  Order created: ${orderId}`);

  // 2. Add line items (parent + modifier sub-items)
  await axios.post(
    url(`/orders/${orderId}/bulk_line_items`),
    { items: lineItems },
    { headers: HEADERS }
  );
  console.log(`✅  ${lineItems.length} line item(s) added`);

  // 3. Fire print event
  try {
    await axios.post(
      url(`/print_event`),
      { orderRef: { id: orderId }, deviceRef: { id: DEVICE_ID } },
      { headers: HEADERS }
    );
    console.log(`🖨️   Print event fired → Station Duo`);
  } catch (err) {
    console.warn(`⚠️   Print event failed: ${err.message}`);
  }

  // 4. Apply tender
  try {
    await axios.post(
      url(`/orders/${orderId}/payments`),
      {
        tender: { id: TENDER_ID },
        amount: totalCents,
        tipAmount: 0,
        offline: false,
        employee: { id: EMPLOYEE_ID },
        externalPaymentId: `TEST-${orderId}`,
      },
      { headers: HEADERS }
    );
    console.log(`💳  Tender applied`);
  } catch (err) {
    console.warn(`⚠️   Tender failed: ${err.message}`);
  }

  // 5. Verify print status after 6s
  await new Promise(r => setTimeout(r, 6000));
  try {
    const verifyRes = await axios.get(
      url(`/orders/${orderId}/line_items?expand=printerLabel`),
      { headers: HEADERS }
    );
    const elements = verifyRes.data?.elements ?? [];
    elements.forEach(el => {
      const status = el.printed ? "✅ printed=true" : "❌ printed=false";
      console.log(`   ${status}  →  "${el.name}"`);
    });
  } catch (err) {
    console.warn(`⚠️   Could not verify print status: ${err.message}`);
  }

  console.log(`🔗  View: https://www.clover.com/r/${MERCHANT_ID}/orders/${orderId}`);
  return orderId;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST ORDER 1 — WHOLE PIZZA: Napoli's Special 16" with extra toppings
// Description format: Size → Whole + included toppings → extras → Cut
// ─────────────────────────────────────────────────────────────────────────────
await sendTestOrder({
  title: "TEST — Whole Pizza (Napoli's Special 16\")",
  note: "⚠️ TEST ORDER — PLEASE DISCARD",
  totalCents: 2499,
  items: [
    {
      name: "Napoli's Special Pizza (16\")",
      price: 24.99,
      qty: 1,
      description: [
        "Size: 16\"",
        "Whole: Napoli's Special",
        "  Included: Pepperoni",
        "  Included: Bacon",
        "  Included: Black Olives",
        "  Included: Feta",
        "  Extra: Jalapeños",
        "  Extra: Mushrooms",
        "Cut: Square Cut",
      ].join(" · "),
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST ORDER 2 — HALF & HALF PIZZA: BBQ Chicken / Buffalo Chicken 16"
// Description format: Size → *** Half & Half *** → 1st Half + toppings → 2nd Half + toppings → Cut
// ─────────────────────────────────────────────────────────────────────────────
await sendTestOrder({
  title: "TEST — Half & Half Pizza (BBQ Chicken / Buffalo Chicken 16\")",
  note: "⚠️ TEST ORDER — PLEASE DISCARD",
  totalCents: 2799,
  items: [
    {
      name: "BBQ Chicken Pizza (16\")",
      price: 27.99,
      qty: 1,
      description: [
        "Size: 16\"",
        "*** Half & Half ***",
        "1st Half: BBQ Chicken",
        "  Included: Chicken",
        "  Included: Red Onions",
        "  Included: Spicy Honey BBQ Sauce",
        "  Extra: Jalapeños",
        "2nd Half: Buffalo Chicken",
        "  Included: Chicken",
        "  Included: Mozzarella",
        "  Included: Buffalo Sauce",
        "  Included: Ranch Sauce",
        "  Extra: Mushrooms",
        "Cut: Triangle Cut",
        "Note: Extra crispy please",
      ].join(" · "),
    },
  ],
});

console.log("\n\n✅  Both test pizza orders sent to Clover. Check the kitchen printers!");
