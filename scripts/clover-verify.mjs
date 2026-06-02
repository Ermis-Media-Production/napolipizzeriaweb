import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const token = process.env.CLOVER_API_TOKEN;
const mid = process.env.CLOVER_MERCHANT_ID;

if (!token || !mid) {
  console.error("Missing CLOVER_API_TOKEN or CLOVER_MERCHANT_ID");
  process.exit(1);
}

const base = `https://api.clover.com/v3/merchants/${mid}`;
const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function get(path) {
  const { data } = await axios.get(base + path, { headers: h });
  return data;
}

try {
  // 1. Printers
  const printers = await get("/printers");
  console.log("=== PRINTERS ===");
  (printers?.elements ?? []).forEach(p =>
    console.log(`  ${p.id}  name="${p.name}"  type=${p.type}`)
  );

  // 2. Labels (for printerLabel routing)
  try {
    const labels = await get("/labels");
    console.log("\n=== LABELS ===");
    (labels?.elements ?? []).forEach(l =>
      console.log(`  ${l.id}  name="${l.name}"`)
    );
  } catch (e) {
    console.log("\n=== LABELS ===  (endpoint returned:", e.response?.status, e.response?.data?.message ?? e.message, ")");
  }

  // 3. Order types
  const ots = await get("/order_types");
  console.log("\n=== ORDER TYPES ===");
  (ots?.elements ?? []).forEach(o =>
    console.log(`  ${o.id}  label="${o.label}"  isDefault=${o.isDefault}  isHidden=${o.isHidden}`)
  );

  // 4. Employees — verify "online" employee
  const emps = await get("/employees?filter=name%3Donline");
  console.log("\n=== EMPLOYEES (name=online) ===");
  (emps?.elements ?? []).forEach(e =>
    console.log(`  ${e.id}  name="${e.name}"  role=${e.role}`)
  );

  // 5. Tenders — verify "Online" tender
  const tenders = await get("/tenders");
  console.log("\n=== TENDERS ===");
  (tenders?.elements ?? []).forEach(t =>
    console.log(`  ${t.id}  label="${t.label}"  enabled=${t.enabled}`)
  );

} catch (err) {
  console.error("ERROR:", err.response?.data ?? err.message);
}
