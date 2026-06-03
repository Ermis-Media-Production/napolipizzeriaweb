/**
 * clover-print-test.mjs
 *
 * End-to-end test of the Clover kitchen printer flow:
 *   1. Create an order shell (POST /orders)
 *   2. Add a test line item with printerLabel (POST /orders/{id}/bulk_line_items)
 *   3. Fire print_event (POST /print_event)
 *   4. Wait 6s, then check printed status on line items
 *   5. Try to delete the test order (cleanup)
 *
 * Run: node scripts/clover-print-test.mjs
 */

import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const token = process.env.CLOVER_API_TOKEN;
const mid   = process.env.CLOVER_MERCHANT_ID;

if (!token || !mid) {
  console.error("❌ Missing CLOVER_API_TOKEN or CLOVER_MERCHANT_ID");
  process.exit(1);
}

const BASE  = `https://api.clover.com/v3/merchants/${mid}`;
const HEADS = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

// IDs from live verification (2026-06-02)
const EMPLOYEE_ID  = "DW4J35FH3R9B0";  // "online"
const ORDER_TYPE   = "CYNNEQA3ABD8Y";  // "Pick up"
const PRINTER_PIZZA = "65QB994H6Z44W"; // "Pizza" Star TSP100
const PRINTER_FOOD  = "MCWCF8204E7QM"; // "Food"  Star TSP100
const DEVICE_ID    = "09615CDB78014261A70D3BF94816F51A"; // Station Duo

async function req(method, path, data) {
  try {
    const res = await axios({ method, url: BASE + path, data, headers: HEADS });
    return { ok: true, status: res.status, data: res.data };
  } catch (e) {
    return {
      ok: false,
      status: e.response?.status,
      data: e.response?.data,
      msg: e.message,
    };
  }
}

function log(label, result) {
  const icon = result.ok ? "✅" : "❌";
  console.log(`\n${icon} ${label}`);
  console.log(`   HTTP ${result.status}`);
  if (!result.ok) {
    console.log(`   ERROR:`, JSON.stringify(result.data ?? result.msg, null, 2));
  } else {
    const preview = JSON.stringify(result.data).substring(0, 300);
    console.log(`   RESPONSE: ${preview}${preview.length >= 300 ? "…" : ""}`);
  }
  return result;
}

(async () => {
  console.log("=== Clover Kitchen Printer Live Test ===");
  console.log(`Merchant: ${mid}`);
  console.log(`Token: ${token.substring(0, 8)}…`);

  // ── Step 1: Create order shell ────────────────────────────────────────────
  const orderRes = log("Step 1: Create order shell", await req("POST", "/orders", {
    state: "Open",
    currency: "USD",
    total: 1500,
    title: "TEST ORDER — Kitchen Printer Test (delete me)",
    note: "AUTOMATED TEST — PLEASE DELETE",
    manualTransaction: false,
    testMode: false,
    employee: { id: EMPLOYEE_ID },
    orderType: { id: ORDER_TYPE },
  }));

  if (!orderRes.ok) {
    console.error("\n🛑 Cannot continue — order creation failed.");
    process.exit(1);
  }

  const orderId = orderRes.data.id;
  console.log(`\n   Order ID: ${orderId}`);

  // ── Step 2: Add line items with printerLabel ──────────────────────────────
  const lineItems = [
    {
      name: "TEST Pizza Margherita",
      price: 1200,
      unitQty: 1,
      printerLabel: { id: PRINTER_PIZZA },
      note: "TEST ITEM — automated printer test",
    },
    {
      name: "TEST Chicken Wings",
      price: 300,
      unitQty: 1,
      printerLabel: { id: PRINTER_FOOD },
      note: "TEST ITEM — automated printer test",
    },
  ];

  const lineRes = log("Step 2: Add line items (bulk_line_items)", await req(
    "POST",
    `/orders/${orderId}/bulk_line_items`,
    { items: lineItems }
  ));

  if (!lineRes.ok) {
    console.warn("\n⚠️  Line items failed — will still try print_event");
  }

  // ── Step 3: Fire print_event ──────────────────────────────────────────────
  const printRes = log("Step 3: Fire print_event", await req(
    "POST",
    `/print_event`,
    {
      orderRef: { id: orderId },
      deviceRef: { id: DEVICE_ID },
    }
  ));

  // ── Step 3b: Try print_event WITHOUT deviceRef ────────────────────────────
  console.log("\n--- Also testing print_event WITHOUT deviceRef ---");
  const printRes2 = log("Step 3b: Fire print_event (no deviceRef)", await req(
    "POST",
    `/print_event`,
    { orderRef: { id: orderId } }
  ));

  // ── Step 4: Wait 6s then check printed status ─────────────────────────────
  console.log("\n⏳ Waiting 6 seconds for printers to acknowledge…");
  await new Promise(r => setTimeout(r, 6000));

  const verifyRes = log("Step 4: Verify printed status on line items", await req(
    "GET",
    `/orders/${orderId}/line_items?expand=printerLabel`
  ));

  if (verifyRes.ok) {
    const items = verifyRes.data?.elements ?? [];
    console.log(`\n   Line items (${items.length} total):`);
    items.forEach(i => {
      const icon = i.printed ? "🖨️ " : "⚠️ ";
      console.log(`   ${icon} "${i.name}"  printed=${i.printed ?? false}  printerLabel=${JSON.stringify(i.printerLabel)}`);
    });
  }

  // ── Step 5: Cleanup — delete test order ──────────────────────────────────
  console.log("\n🧹 Deleting test order…");
  const delRes = log("Step 5: Delete test order", await req(
    "DELETE",
    `/orders/${orderId}`
  ));

  if (!delRes.ok) {
    console.warn(`\n⚠️  Could not auto-delete test order ${orderId}.`);
    console.warn(`   Please delete it manually from the Clover Dashboard.`);
    console.warn(`   URL: https://www.clover.com/r/${mid}/orders/${orderId}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n=== SUMMARY ===");
  console.log(`Order creation:      ${orderRes.ok ? "✅ OK" : "❌ FAILED"}`);
  console.log(`Line items:          ${lineRes.ok ? "✅ OK" : "❌ FAILED"}`);
  console.log(`print_event (w/ dev):${printRes.ok ? "✅ OK" : "❌ FAILED (" + printRes.status + ")"}`);
  console.log(`print_event (no dev):${printRes2.ok ? "✅ OK" : "❌ FAILED (" + printRes2.status + ")"}`);
  console.log(`Cleanup:             ${delRes.ok ? "✅ Deleted" : "⚠️  Manual delete needed"}`);
})();
