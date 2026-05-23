/**
 * cloverSync.ts
 *
 * Shared helper used by both the Authorize.net router and the Stripe webhook
 * to push a confirmed order to Clover POS in a fire-and-forget manner.
 *
 * This keeps the sync logic in one place and avoids circular imports.
 */

import axios from "axios";
import { CLOVER_ENV } from "./_core/env";

export interface CloverOrderInput {
  items: Array<{ name: string; price: number; quantity: number }>;
  orderType: "delivery" | "pickup" | "dine-in";
  customerName?: string;
  customerPhone?: string;
  externalId?: string; // Stripe session ID or Authorize.net txn ID
  totalCents: number;  // total in cents
}

export interface CloverOrderResult {
  cloverOrderId: string;
  dashboardUrl: string;
}

function cloverHeaders() {
  return {
    Authorization: `Bearer ${CLOVER_ENV.apiToken}`,
    "Content-Type": "application/json",
  };
}

function cloverUrl(path: string) {
  return `${CLOVER_ENV.baseUrl}/v3/merchants/${CLOVER_ENV.merchantId}${path}`;
}

/**
 * Push a confirmed order to Clover POS.
 * Creates the order shell, then adds all line items in a single bulk request.
 * Throws on failure — callers should handle errors (e.g., .catch() for fire-and-forget).
 */
export async function pushOrderToClover(input: CloverOrderInput): Promise<CloverOrderResult> {
  if (!CLOVER_ENV.apiToken || !CLOVER_ENV.merchantId) {
    throw new Error("Clover credentials are not configured");
  }

  const orderTypeLabel =
    input.orderType === "delivery"
      ? "Online Delivery"
      : input.orderType === "dine-in"
      ? "Dine-In"
      : "Online Pick-Up";

  const noteLines: string[] = [];
  if (input.customerName) noteLines.push(`Customer: ${input.customerName}`);
  if (input.customerPhone) noteLines.push(`Phone: ${input.customerPhone}`);
  if (input.externalId) noteLines.push(`Ref: ${input.externalId}`);

  // Step 1: Create the order shell
  const orderRes = await axios.post(
    cloverUrl("/orders"),
    {
      state: "open",
      currency: "USD",
      total: input.totalCents,
      title: `${orderTypeLabel} — Napoli Pizzeria`,
      note: noteLines.length ? noteLines.join(" | ") : undefined,
      manualTransaction: false,
      testMode: false,
    },
    { headers: cloverHeaders() }
  );

  const orderId: string = orderRes.data.id;

  // Step 2: Add all line items in bulk
  const lineItems = input.items.map((item) => ({
    name: item.name,
    price: Math.round(item.price * 100), // cents
    unitQty: item.quantity,
  }));

  await axios.post(
    cloverUrl(`/orders/${orderId}/bulk_line_items`),
    { items: lineItems },
    { headers: cloverHeaders() }
  );

  console.log(`[Clover] Order ${orderId} created for ${input.customerName ?? "unknown"} (${orderTypeLabel})`);

  return {
    cloverOrderId: orderId,
    dashboardUrl: `https://www.clover.com/r/${CLOVER_ENV.merchantId}/orders/${orderId}`,
  };
}
