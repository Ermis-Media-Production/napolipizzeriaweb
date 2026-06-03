/**
 * clover-devices2.mjs
 * Query Clover devices and recent print events.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const token = process.env.CLOVER_API_TOKEN;
const mid   = process.env.CLOVER_MERCHANT_ID;

if (!token || !mid) {
  console.error("Missing CLOVER_API_TOKEN or CLOVER_MERCHANT_ID");
  process.exit(1);
}

async function cloverGet(path) {
  const url = `https://api.clover.com/v3/merchants/${mid}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: text };
}

(async () => {
  console.log(`Merchant: ${mid}`);
  console.log(`Token: ${token.substring(0,8)}…\n`);

  // Devices
  console.log("=== Devices ===");
  const devRes = await cloverGet("/devices?limit=100");
  console.log(`HTTP ${devRes.status}`);
  if (devRes.ok) {
    const data = JSON.parse(devRes.body);
    const devices = data?.elements ?? [];
    console.log(`Found ${devices.length} device(s):\n`);
    devices.forEach(d => {
      console.log(`  ID:     ${d.id}`);
      console.log(`  Name:   ${d.name ?? "(no name)"}`);
      console.log(`  Model:  ${d.model ?? "(unknown)"}`);
      console.log(`  Serial: ${d.serial ?? "(unknown)"}`);
      console.log(`  Online: ${d.online ?? "(unknown)"}`);
      console.log("");
    });
  } else {
    console.log("Error:", devRes.body.substring(0, 200));
  }

  // Recent print events
  console.log("=== Recent print_events ===");
  const printRes = await cloverGet("/print_event?limit=20");
  console.log(`HTTP ${printRes.status}`);
  if (printRes.ok) {
    const data = JSON.parse(printRes.body);
    const events = data?.elements ?? [];
    console.log(`Found ${events.length} recent print event(s):\n`);
    events.forEach(e => {
      const t = e.createdTime
        ? new Date(e.createdTime).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
        : "(unknown)";
      console.log(`  ID:     ${e.id}`);
      console.log(`  Order:  ${e.orderRef?.id ?? "(none)"}`);
      console.log(`  Device: ${e.deviceRef?.id ?? "(none)"}`);
      console.log(`  State:  ${e.state ?? "(unknown)"}`);
      console.log(`  Time:   ${t}`);
      console.log("");
    });
  } else {
    console.log("Error:", printRes.body.substring(0, 200));
  }
})();
