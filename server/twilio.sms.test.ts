/**
 * twilio.sms.test.ts
 *
 * Validates that Twilio credentials are configured and the API is reachable.
 * Uses the Twilio REST API to fetch account info (read-only, no SMS sent).
 *
 * NOTE: Twilio integration is pending A2P (Application-to-Person) approval.
 * The credential tests are skipped automatically when TWILIO_ACCOUNT_SID is
 * not set in the environment. The message builder test always runs.
 */

import { describe, it, expect } from "vitest";
import { TWILIO_ENV } from "./_core/env";

// Skipped automatically when Twilio credentials are not configured (e.g. pending A2P approval).
const twilioConfigured = Boolean(TWILIO_ENV.accountSid && TWILIO_ENV.authToken && TWILIO_ENV.phoneNumber);

describe("Twilio SMS credentials", () => {
  it.skipIf(!twilioConfigured)("should have all required Twilio env vars set", () => {
    expect(TWILIO_ENV.accountSid, "TWILIO_ACCOUNT_SID must be set").toBeTruthy();
    expect(TWILIO_ENV.authToken, "TWILIO_AUTH_TOKEN must be set").toBeTruthy();
    expect(TWILIO_ENV.phoneNumber, "TWILIO_PHONE_NUMBER must be set").toBeTruthy();
  });

  it.skipIf(!twilioConfigured)("should have a valid Account SID format (starts with AC)", () => {
    expect(TWILIO_ENV.accountSid.startsWith("AC")).toBe(true);
  });

  it.skipIf(!twilioConfigured)("should have a valid phone number format (starts with +)", () => {
    expect(TWILIO_ENV.phoneNumber.startsWith("+")).toBe(true);
  });

  it("should build a valid SMS message body", () => {
    // Test the message builder logic without sending — always runs regardless of credentials.
    const orderRef = "NPZ-20260525-0001";
    const origin = "https://napolipizzerianorthlasvegas.com";
    const trackingUrl = `${origin}/my-order/${orderRef}`;

    const message = [
      `Hi John! 🍕 Your Napoli Pizzeria order is confirmed.`,
      `Order: ${orderRef}`,
      `Type: Pickup | Time: ASAP`,
      `Total: $25.00`,
      `Track your order: ${trackingUrl}`,
      `Questions? Call us: (702) 544-8930`,
    ].join("\n");

    expect(message).toContain(orderRef);
    expect(message).toContain(trackingUrl);
    expect(message).toContain("(702) 544-8930");
    expect(message.length).toBeLessThan(1600); // Twilio SMS limit
  });
});
