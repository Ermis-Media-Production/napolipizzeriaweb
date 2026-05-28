/**
 * Authorize.net PRODUCTION connectivity test
 *
 * Verifies production API credentials by calling authenticateTestRequest —
 * a zero-cost API call that validates credentials without processing any payment.
 */
import { describe, it, expect } from "vitest";
import * as dotenv from "dotenv";
dotenv.config();

const API_LOGIN_ID = process.env.AUTHNET_API_LOGIN_ID;
const TRANSACTION_KEY = process.env.AUTHNET_TRANSACTION_KEY;
const IS_SANDBOX = process.env.AUTHNET_IS_SANDBOX === "true";

describe("Authorize.net production credentials", () => {
  it(
    "should authenticate successfully against the production API",
    async () => {
      expect(API_LOGIN_ID).toBeTruthy();
      expect(TRANSACTION_KEY).toBeTruthy();
      expect(IS_SANDBOX).toBe(false);

      const endpoint = IS_SANDBOX
        ? "https://apitest.authorize.net/xml/v1/request.api"
        : "https://api.authorize.net/xml/v1/request.api";

      const payload = {
        authenticateTestRequest: {
          merchantAuthentication: {
            name: API_LOGIN_ID,
            transactionKey: TRANSACTION_KEY,
          },
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(response.ok).toBe(true);

      // Authorize.net returns the messages directly at the root level
      // (not wrapped in authenticateTestResponse)
      const data = (await response.json()) as {
        messages?: {
          resultCode?: string;
          message?: Array<{ code?: string; text?: string }>;
        };
        authenticateTestResponse?: {
          messages?: {
            resultCode?: string;
            message?: Array<{ code?: string; text?: string }>;
          };
        };
      };

      // Handle both response shapes
      const resultCode =
        data?.messages?.resultCode ??
        data?.authenticateTestResponse?.messages?.resultCode;
      const msgText =
        data?.messages?.message?.[0]?.text ??
        data?.authenticateTestResponse?.messages?.message?.[0]?.text ??
        "Unknown";

      console.log(`[AuthNet] Result: ${resultCode} — ${msgText}`);
      console.log(`[AuthNet] Mode: ${IS_SANDBOX ? "SANDBOX" : "PRODUCTION"}`);

      expect(resultCode).toBe("Ok");
    },
    30_000 // 30 second timeout for real network call
  );
});
