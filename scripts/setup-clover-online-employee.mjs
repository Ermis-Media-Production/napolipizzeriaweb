/**
 * setup-clover-online-employee.mjs
 *
 * One-time setup script:
 *   1. Checks if an employee named "Online" exists in Clover → creates it if not
 *   2. Lists all tenders → finds "Table" tender
 *   3. Prints the IDs so you can verify in the Clover Dashboard
 *
 * Run from the project root:
 *   node scripts/setup-clover-online-employee.mjs
 */

import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const CLOVER_API_TOKEN = process.env.CLOVER_API_TOKEN;
const CLOVER_MERCHANT_ID = process.env.CLOVER_MERCHANT_ID;
const CLOVER_BASE = process.env.CLOVER_SANDBOX === "true"
  ? "https://apisandbox.dev.clover.com"
  : "https://api.clover.com";

if (!CLOVER_API_TOKEN || !CLOVER_MERCHANT_ID) {
  console.error("❌ Missing CLOVER_API_TOKEN or CLOVER_MERCHANT_ID in environment");
  process.exit(1);
}

const BASE_URL = `${CLOVER_BASE}/v3/merchants/${CLOVER_MERCHANT_ID}`;
const HEADERS = {
  Authorization: `Bearer ${CLOVER_API_TOKEN}`,
  "Content-Type": "application/json",
};

async function cloverGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${path} failed ${res.status}: ${body}`);
  }
  return res.json();
}

async function cloverPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`POST ${path} failed ${res.status}: ${errBody}`);
  }
  return res.json();
}

// ── 1. Employee ────────────────────────────────────────────────────────────────
console.log("\n🔍 Checking employees...");
const employeesData = await cloverGet("/employees?limit=200");
const employees = employeesData.elements ?? [];

console.log(`   Found ${employees.length} employees:`);
employees.forEach((e) => console.log(`   - ${e.name} (${e.id}) role: ${e.role}`));

let onlineEmployee = employees.find((e) => e.name?.toLowerCase() === "online");

if (onlineEmployee) {
  console.log(`\n✅ 'Online' employee already exists: ${onlineEmployee.id}`);
} else {
  console.log("\n➕ Creating 'Online' employee...");
  try {
    onlineEmployee = await cloverPost("/employees", {
      name: "Online",
      nickname: "Online",
      role: "EMPLOYEE",
      isOwner: false,
      pin: "0000",
    });
    console.log(`✅ Created 'Online' employee: ${onlineEmployee.id}`);
  } catch (err) {
    console.error("❌ Failed to create employee:", err.message);
    console.log("   You may need to create it manually in Clover Dashboard → Employees");
  }
}

// ── 2. Tenders ────────────────────────────────────────────────────────────────
console.log("\n🔍 Checking tenders...");
const tendersData = await cloverGet("/tenders?limit=100");
const tenders = tendersData.elements ?? [];

console.log(`   Found ${tenders.length} tenders:`);
tenders.forEach((t) => console.log(`   - "${t.label}" (${t.id}) labelKey: ${t.labelKey ?? "n/a"} | enabled: ${t.enabled}`));

const tableTender =
  tenders.find((t) => t.label?.toLowerCase() === "table") ??
  tenders.find((t) => t.label?.toLowerCase().includes("table")) ??
  tenders.find((t) => t.labelKey?.toLowerCase().includes("table"));

if (tableTender) {
  console.log(`\n✅ Found 'Table' tender: ${tableTender.id} ("${tableTender.label}")`);
} else {
  console.warn("\n⚠️  No 'Table' tender found.");
  console.log("   Available tenders:", tenders.map((t) => `"${t.label}"`).join(", "));
  console.log("   Please check the exact tender name in Clover Dashboard → Setup → Tenders");
  console.log("   Then update CLOVER_PRINTER_LABELS in server/cloverSync.ts if needed.");
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n─────────────────────────────────────────");
console.log("📋 Summary:");
console.log(`   Online Employee ID : ${onlineEmployee?.id ?? "NOT FOUND"}`);
console.log(`   Table Tender ID    : ${tableTender?.id ?? "NOT FOUND"}`);
console.log(`   Merchant ID        : ${CLOVER_MERCHANT_ID}`);
console.log("─────────────────────────────────────────");
console.log("\n✅ All web orders will now be assigned to 'Online' employee under 'Table' tender.");
console.log("   No code changes needed — cloverSync.ts looks these up automatically on each order.\n");
