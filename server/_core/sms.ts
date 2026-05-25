/**
 * sms.ts
 *
 * Lightweight Twilio SMS helper using the REST API directly (no SDK required).
 * Credentials are injected from environment variables.
 */

import { TWILIO_ENV } from "./env";

/**
 * Send an SMS message via Twilio REST API.
 * Returns true on success, false if credentials are missing or the request fails.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const { accountSid, authToken, phoneNumber } = TWILIO_ENV;

  if (!accountSid || !authToken || !phoneNumber) {
    console.warn("[SMS] Twilio credentials not configured, skipping SMS");
    return false;
  }

  // Normalize phone number — ensure it starts with +
  const toNormalized = to.startsWith("+") ? to : `+1${to.replace(/\D/g, "")}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const params = new URLSearchParams({
    To: toNormalized,
    From: phoneNumber,
    Body: body,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[SMS] Twilio error ${res.status}: ${errorBody}`);
      return false;
    }

    const data = (await res.json()) as { sid?: string; status?: string };
    console.log(`[SMS] Sent to ${toNormalized} — SID: ${data.sid}, status: ${data.status}`);
    return true;
  } catch (err) {
    console.error("[SMS] Failed to send:", err);
    return false;
  }
}

/**
 * Send an order confirmation SMS to the customer.
 * Includes the order tracking link and key order details.
 */
export async function sendOrderConfirmationSms(params: {
  customerPhone: string;
  customerName: string;
  orderRef: string;
  orderType: "pickup" | "delivery" | "dine-in";
  total: string | number;
  isAsap: boolean;
  scheduledAt?: number;
  origin: string; // e.g. https://napolipizzerianorthlasvegas.com
}): Promise<boolean> {
  const {
    customerPhone,
    customerName,
    orderRef,
    orderType,
    total,
    isAsap,
    scheduledAt,
    origin,
  } = params;

  const trackingUrl = `${origin}/my-order/${orderRef}`;
  const firstName = customerName.trim().split(/\s+/)[0] ?? customerName;
  const totalFormatted = `$${Number(total).toFixed(2)}`;

  const orderTypeLabel =
    orderType === "pickup"
      ? "Pickup"
      : orderType === "delivery"
      ? "Delivery"
      : "Dine-In";

  let timeLine: string;
  if (isAsap) {
    timeLine = "ASAP";
  } else if (scheduledAt) {
    const d = new Date(scheduledAt);
    timeLine = d.toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } else {
    timeLine = "Scheduled";
  }

  const message = [
    `Hi ${firstName}! 🍕 Your Napoli Pizzeria order is confirmed.`,
    `Order: ${orderRef}`,
    `Type: ${orderTypeLabel} | Time: ${timeLine}`,
    `Total: ${totalFormatted}`,
    `Track your order: ${trackingUrl}`,
    `Questions? Call us: (702) 544-8930`,
  ].join("\n");

  return sendSms(customerPhone, message);
}
