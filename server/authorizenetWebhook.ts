/**
 * Authorize.net Webhook Handler
 *
 * Authorize.net sends webhook notifications for transaction events.
 * We listen for net.authorize.payment.authcapture.created (approved)
 * and net.authorize.payment.void.created / fraud.declined (declined/voided).
 *
 * Authorize.net signs each notification with an HMAC-SHA512 signature
 * using the webhook signature key from the merchant dashboard.
 *
 * Docs: https://developer.authorize.net/api/reference/features/webhooks.html
 */

import type { Request, Response } from "express";
import crypto from "crypto";
import { notifyOwner } from "./_core/notification";
import { markWebhookEventProcessed } from "./db";
import { buildAdminReceiptHtml, sendReceiptEmail } from "./receiptTemplates";

// ── Signature verification ─────────────────────────────────────────────────────

/**
 * Verify the X-ANET-Signature header against the raw request body.
 * The signature is sha512= + HMAC-SHA512(webhookSignatureKey, rawBody).
 *
 * If AUTHNET_WEBHOOK_SIGNATURE_KEY is not set, we skip verification
 * (useful during initial setup) but log a warning.
 */
function verifyAuthorizeNetSignature(rawBody: Buffer, signatureHeader: string): boolean {
  const sigKey = process.env.AUTHNET_WEBHOOK_SIGNATURE_KEY;
  if (!sigKey) {
    console.warn("[AuthNet Webhook] AUTHNET_WEBHOOK_SIGNATURE_KEY not set — skipping signature verification");
    return true; // fail-open during initial setup
  }

  if (!signatureHeader?.startsWith("sha512=")) {
    console.warn("[AuthNet Webhook] Missing or malformed X-ANET-Signature header");
    return false;
  }

  const receivedSig = signatureHeader.slice("sha512=".length);
  const expectedSig = crypto
    .createHmac("sha512", sigKey)
    .update(rawBody)
    .digest("hex")
    .toUpperCase();

  return crypto.timingSafeEqual(
    Buffer.from(receivedSig.toUpperCase()),
    Buffer.from(expectedSig)
  );
}

// ── Webhook payload types ──────────────────────────────────────────────────────

interface AuthNetWebhookPayload {
  notificationId: string;
  eventType: string;
  eventDate: string;
  webhookId: string;
  payload: {
    responseCode?: number;
    authCode?: string;
    avsResponse?: string;
    authAmount?: number;
    entityName?: string;
    id?: string; // transaction ID
    merchantReferenceId?: string;
  };
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function handleAuthorizeNetWebhook(req: Request, res: Response): Promise<void> {
  const rawBody: Buffer = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from("");
  const signatureHeader = req.headers["x-anet-signature"] as string ?? "";

  // 1. Verify signature
  if (!verifyAuthorizeNetSignature(rawBody, signatureHeader)) {
    console.error("[AuthNet Webhook] Signature verification failed");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let event: AuthNetWebhookPayload;
  try {
    event = JSON.parse(rawBody.toString("utf8")) as AuthNetWebhookPayload;
  } catch (err) {
    console.error("[AuthNet Webhook] Failed to parse body:", err);
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  // 2. Idempotency — skip duplicate deliveries
  const notificationId = event.notificationId;
  if (notificationId) {
    const isNew = await markWebhookEventProcessed(`authnet-${notificationId}`);
    if (!isNew) {
      console.log(`[AuthNet Webhook] Duplicate notification ${notificationId} — skipping`);
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
  }

  const { eventType, payload } = event;
  const transactionId = payload?.id ?? "unknown";
  const amount = payload?.authAmount ?? 0;
  const authCode = payload?.authCode ?? "";

  console.log(`[AuthNet Webhook] Event: ${eventType} | TxnID: ${transactionId} | Amount: $${amount}`);

  // 3. Handle specific event types
  switch (eventType) {
    case "net.authorize.payment.authcapture.created":
    case "net.authorize.payment.capture.created": {
      // Payment approved — notify owner
      notifyOwner({
        title: `✅ Payment Confirmed — $${amount.toFixed(2)}`,
        content: [
          `Transaction ID: ${transactionId}`,
          `Auth Code: ${authCode}`,
          `Amount: $${amount.toFixed(2)}`,
          `Event: ${eventType}`,
          `Notification ID: ${notificationId}`,
        ].join("\n"),
      }).catch((err) => console.error("[AuthNet Webhook] Notification error:", err));

      // Fire-and-forget: HTML email receipt to restaurant owner (webhook confirmation)
      {
        const receiptData = {
          customerName: "Customer",
          orderType: "pickup",
          items: [],
          subtotal: amount,
          convenienceFee: 0,
          salesTax: 0,
          grandTotal: amount,
          transactionId,
          authCode,
          date: new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
        };
        sendReceiptEmail({
          to: "info@napolipizzeria.net",
          subject: `✅ Payment Confirmed — $${amount.toFixed(2)} — TxnID ${transactionId}`,
          html: buildAdminReceiptHtml(receiptData),
        }).catch((err) => console.error("[Email] Webhook receipt failed:", err));
      }
      break;
    }

    case "net.authorize.payment.void.created": {
      // Payment voided
      notifyOwner({
        title: `⚠️ Payment Voided — TxnID ${transactionId}`,
        content: [
          `Transaction ID: ${transactionId}`,
          `Event: ${eventType}`,
          `Notification ID: ${notificationId}`,
        ].join("\n"),
      }).catch((err) => console.error("[AuthNet Webhook] Notification error:", err));
      break;
    }

    case "net.authorize.payment.fraud.declined":
    case "net.authorize.payment.authcapture.declined": {
      // Payment declined / fraud
      console.warn(`[AuthNet Webhook] Payment declined: TxnID ${transactionId}`);
      notifyOwner({
        title: `❌ Payment Declined — TxnID ${transactionId}`,
        content: [
          `Transaction ID: ${transactionId}`,
          `Response Code: ${payload?.responseCode ?? "N/A"}`,
          `Event: ${eventType}`,
          `Notification ID: ${notificationId}`,
        ].join("\n"),
      }).catch((err) => console.error("[AuthNet Webhook] Notification error:", err));
      break;
    }

    default:
      console.log(`[AuthNet Webhook] Unhandled event type: ${eventType}`);
  }

  // Always respond 200 quickly so Authorize.net doesn't retry
  res.status(200).json({ received: true });
}
