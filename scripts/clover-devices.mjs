/**
 * clover-devices.mjs
 * Query all devices registered to this merchant to verify the correct device ID.
 */
import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const token = process.env.CLOVER_API_TOKEN;
const mid   = process.env.CLOVER_MERCHANT_ID;
const BASE  = `https://api.clover.com/v3/merchants/${mid}`;
const HEADS = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function get(path) {
  try {
    const res = await axios.get(BASE + path, { headers: HEADS });
    return { ok: true, data: res.data };
  } catch (e) {
    return { ok: false, status: e.response?.status, data: e.response?.data, msg: e.message };
  }
}

(async () => {
  console.log("=== Clover Devices ===");
  const devRes = await get("/devices?limit=100");
  if (!devRes.ok) {
    console.error("❌ Failed to fetch devices:", devRes.data ?? devRes.msg);
  } else {
    const devices = devRes.data?.elements ?? [];
    console.log(`Found ${devices.length} device(s):\n`);
    devices.forEach(d => {
      console.log(`  ID:     ${d.id}`);
      console.log(`  Name:   ${d.name ?? "(no name)"}`);
      console.log(`  Model:  ${d.model ?? "(unknown)"}`);
      console.log(`  Serial: ${d.serial ?? "(unknown)"}`);
      console.log(`  Online: ${d.online ?? "(unknown)"}`);
      console.log(`  Active: ${d.active ?? "(unknown)"}`);
      console.log("");
    });
  }

  console.log("=== Recent print_events ===");
  const printRes = await get("/print_event?limit=10&orderBy=modifiedTime+DESC");
  if (!printRes.ok) {
    console.error("❌ Failed to fetch print events:", printRes.data ?? printRes.msg);
  } else {
    const events = printRes.data?.elements ?? [];
    console.log(`Found ${events.length} recent print event(s):\n`);
    events.forEach(e => {
      console.log(`  ID:     ${e.id}`);
      console.log(`  Order:  ${e.orderRef?.id ?? "(none)"}`);
      console.log(`  Device: ${e.deviceRef?.id ?? "(none)"}`);
      console.log(`  State:  ${e.state ?? "(unknown)"}`);
      console.log(`  Time:   ${e.createdTime ? new Date(e.createdTime).toLocaleString("en-US", {timeZone:"America/Los_Angeles"}) : "(unknown)"}`);
      console.log("");
    });
  }
})();
