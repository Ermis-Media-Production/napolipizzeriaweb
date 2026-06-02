/**
 * uber.credentials.test.ts
 *
 * Validates that the Uber Direct production credentials are correct by
 * requesting an OAuth2 access token from the Uber production API.
 *
 * This test is intentionally lightweight — it only checks that the
 * credentials are accepted by Uber's auth server, not that a delivery
 * can be created.
 */

import { describe, it, expect } from "vitest";

const UBER_CLIENT_ID = process.env.UBER_CLIENT_ID ?? "";
const UBER_CLIENT_SECRET = process.env.UBER_CLIENT_SECRET ?? "";
const UBER_IS_SANDBOX = process.env.UBER_IS_SANDBOX;

describe("Uber Direct credentials", () => {
  it("should have production mode enabled (UBER_IS_SANDBOX=false)", () => {
    expect(UBER_IS_SANDBOX).toBe("false");
  });

  it("should have non-empty client ID and secret", () => {
    expect(UBER_CLIENT_ID.length).toBeGreaterThan(10);
    expect(UBER_CLIENT_SECRET.length).toBeGreaterThan(10);
  });

  it("should successfully obtain an OAuth token from Uber production API", async () => {
    const tokenUrl = "https://login.uber.com/oauth/v2/token";
    const body = new URLSearchParams({
      client_id: UBER_CLIENT_ID,
      client_secret: UBER_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    });

    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await resp.json() as Record<string, unknown>;

    // A successful response has access_token; a failure has error + error_description
    expect(resp.status, `Uber auth failed: ${JSON.stringify(data)}`).toBe(200);
    expect(typeof data.access_token).toBe("string");
    expect((data.access_token as string).length).toBeGreaterThan(10);
  }, 15000);
});
