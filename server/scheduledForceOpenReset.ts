/**
 * scheduledForceOpenReset.ts
 *
 * Express handler for the nightly Force Open reset cron job.
 * Mounted at POST /api/scheduled/force-open-reset in server/_core/index.ts
 *
 * The Manus heartbeat platform POSTs to this endpoint every day at midnight
 * Las Vegas time (07:00 UTC). The handler authenticates the cron token,
 * sets store_force_open = 'false' in the storeSettings table, and returns
 * a JSON summary.
 *
 * This prevents the Force Open mode from accidentally staying on overnight
 * after testing sessions.
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { storeSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export async function handleForceOpenReset(req: Request, res: Response) {
  const startedAt = new Date().toISOString();

  try {
    // 1. Authenticate — only cron tokens are allowed
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const database = await getDb();
    if (!database) {
      return res.status(500).json({
        error: "Database not available",
        timestamp: startedAt,
      });
    }

    // 2. Read current value
    const rows = await database
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.key, "store_force_open"))
      .limit(1);

    const wasForceOpen = rows[0]?.value === "true";

    // 3. Set force_open = false (idempotent — safe to run even if already false)
    if (rows.length > 0) {
      await database
        .update(storeSettings)
        .set({ value: "false" })
        .where(eq(storeSettings.key, "store_force_open"));
    } else {
      // Row doesn't exist yet — insert it as false (default state)
      await database.insert(storeSettings).values({
        key: "store_force_open",
        value: "false",
      });
    }

    const summary = {
      ok: true,
      wasForceOpen,
      forceOpenNow: false,
      message: wasForceOpen
        ? "Force Open was active — reset to false. Store now follows normal hours (10 AM–10 PM)."
        : "Force Open was already off. No change needed.",
      resetAt: new Date().toISOString(),
    };

    console.log("[ForceOpenReset]", summary.message);
    return res.json(summary);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ForceOpenReset] Error:", message);
    return res.status(500).json({
      error: message,
      timestamp: startedAt,
    });
  }
}
