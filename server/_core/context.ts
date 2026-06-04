import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { parse as parseCookie } from "cookie";
import { jwtVerify } from "jose";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // DEV BYPASS: When OAUTH_SERVER_URL is not configured, auto-authenticate
  // any request with a valid JWT cookie as a dev admin user.
  if (!process.env.OAUTH_SERVER_URL) {
    const cookies = parseCookie(opts.req.headers.cookie || "");
    const sessionCookie = cookies["app_session_id"];
    if (sessionCookie) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "napoli-dev-secret-2026");
        const { payload } = await jwtVerify(sessionCookie, secret, { algorithms: ["HS256"] });
        if (payload.openId) {
          // Look up the real user from DB to get the correct role
          const dbUser = await db.getUserByOpenId(payload.openId as string);
          if (dbUser) {
            user = dbUser;
          } else {
            user = {
              id: 0,
              openId: payload.openId as string,
              name: (payload.name as string) || "Dev Admin",
              email: "admin@dev.local",
              loginMethod: "dev-bypass",
              role: "admin",
              lastSignedIn: new Date(),
              createdAt: new Date(),
            } as User;
          }
        }
      } catch {
        // Invalid token — fall through to null user
      }
    }
    return { req: opts.req, res: opts.res, user };
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
