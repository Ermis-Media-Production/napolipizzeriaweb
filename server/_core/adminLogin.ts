/**
 * Admin local login — username/password authentication for the Napoli admin panel.
 * Issues the same JWT session cookie used by the rest of the app so all
 * protectedProcedure / adminProcedure calls work without Manus OAuth.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

// ── Local admin credentials ────────────────────────────────────────────────
// openId values are synthetic — they never touch Manus OAuth.
// The role is baked into the JWT payload via the DB upsert path in sdk.authenticateRequest,
// but since these users won't be in the DB we return a synthetic user directly from context.
const ADMIN_ACCOUNTS: Record<string, { password: string; openId: string; name: string; role: "admin" | "user" }> = {
  napoliadmin: {
    password: "NapoliLV2026.Admin",
    openId: "local_napoliadmin",
    name: "Administrador Principal",
    role: "admin",
  },
  napolilv_manager: {
    password: "NapoliLV2026.Manager",
    openId: "local_napolilv_manager",
    name: "Manager / Operaciones",
    role: "admin", // give manager admin role so they can access the panel
  },
};

export function registerAdminLoginRoutes(app: Express) {
  // POST /api/admin/login — validates credentials and sets session cookie
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const account = ADMIN_ACCOUNTS[username.trim().toLowerCase()];

    if (!account || account.password !== password) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    try {
      const sessionToken = await sdk.signSession(
        {
          openId: account.openId,
          appId: "napoli_local_admin",
          name: account.name,
        },
        { expiresInMs: ONE_YEAR_MS }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, name: account.name, role: account.role });
    } catch (error) {
      console.error("[AdminLogin] Failed to create session", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  // GET /api/admin/logout — clears session cookie
  app.post("/api/admin/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
