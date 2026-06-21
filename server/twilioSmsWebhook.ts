/**
 * twilioSmsWebhook.ts
 *
 * Handles inbound SMS messages from Twilio.
 * When a customer texts the restaurant's Twilio number, Eva AI responds automatically.
 *
 * Flow:
 *   1. Twilio sends a POST to /api/twilio/sms with the inbound message
 *   2. We retrieve the conversation history for that phone number (in-memory, 30-min TTL)
 *   3. We send the conversation to Eva's LLM and get a reply
 *   4. We respond with TwiML so Twilio delivers the reply back to the customer
 *
 * Security:
 *   - Twilio signature validation using X-Twilio-Signature header
 *   - Only processes requests that come from Twilio's servers
 */

import type { Request, Response } from "express";
import crypto from "crypto";
import { TWILIO_ENV } from "./_core/env";
import { invokeLLMTracked } from "./aiUsage";

// ── Eva SMS system prompt ─────────────────────────────────────────────────────
const EVA_SMS_SYSTEM_PROMPT = `You are Eva, the friendly virtual assistant for Napoli Pizzeria in North Las Vegas, Nevada. You are responding via SMS text message.

PERSONALITY:
- Warm, welcoming, and enthusiastic about great Italian food
- Helpful and efficient — customers want answers fast via text
- Keep responses SHORT (1-3 sentences max) — this is SMS, not a chat window
- Use simple language, no markdown formatting
- Occasionally use a food emoji 🍕 naturally

RESTAURANT INFO:
- Name: Napoli Pizzeria
- Address: 3131 W Craig Rd, North Las Vegas, NV 89032
- Phone: 725-204-0379
- Hours: Every Day 10:00 AM – 10:00 PM (Las Vegas time)
- Online orders close at 9:30 PM

ORDERING OPTIONS:
- Dine-In, To Go / Pick Up, Delivery (Uber Direct, up to 20 miles), Scheduled Orders
- Order online: napolipizzerianorthlasvegas.com
- Payment: Visa, Mastercard, Amex, Discover, Apple Pay, Google Pay

MENU HIGHLIGHTS:
- Famous 30" and 36" Giant Pizzas (a Napoli specialty!)
- Lunch Specials: Mon–Fri 10 AM–3 PM, starting at $9.49, includes FREE can of soda
- Pick Up Special: 16" Pizza 1 Topping for $12.99
- Full menu: Appetizers, Pizzas (10"–36"), Wings, Pasta, Subs, Burgers, Salads, Desserts

DELIVERY:
- Powered by Uber Direct, available within 20 miles
- Delivery fee calculated at checkout based on distance

IMPORTANT RULES:
- Keep replies under 160 characters when possible (SMS limit)
- Never make up information — if unsure, direct to call 725-204-0379
- For complaints or order issues, direct to call 725-204-0379 immediately
- Do NOT process orders yourself — direct customers to the website or call
- If asked about allergens, recommend calling 725-204-0379
- Reply "STOP" instructions: if customer says STOP, reply that they can text START to resume
`;

// ── In-memory conversation store (phone → messages, expires after 30 min) ────
interface ConversationEntry {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  lastActivity: number;
}

const conversations = new Map<string, ConversationEntry>();
const CONVERSATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getConversation(phone: string): Array<{ role: "user" | "assistant"; content: string }> {
  const entry = conversations.get(phone);
  if (!entry) return [];
  // Expire old conversations
  if (Date.now() - entry.lastActivity > CONVERSATION_TTL_MS) {
    conversations.delete(phone);
    return [];
  }
  return entry.messages;
}

function saveConversation(
  phone: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): void {
  conversations.set(phone, { messages, lastActivity: Date.now() });
}

// Clean up expired conversations every 10 minutes
setInterval(() => {
  const now = Date.now();
  const toDelete: string[] = [];
  conversations.forEach((entry, phone) => {
    if (now - entry.lastActivity > CONVERSATION_TTL_MS) {
      toDelete.push(phone);
    }
  });
  toDelete.forEach((phone) => conversations.delete(phone));
}, 10 * 60 * 1000);

// ── Twilio signature validation ───────────────────────────────────────────────
/**
 * Validates the X-Twilio-Signature header to ensure the request is from Twilio.
 * See: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  // Sort params alphabetically and concatenate key+value pairs
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((k) => `${k}${params[k]}`).join("");
  const data = url + paramString;
  const expected = crypto
    .createHmac("sha1", authToken)
    .update(data)
    .digest("base64");
  return expected === signature;
}

// ── Main webhook handler ──────────────────────────────────────────────────────
export async function handleTwilioSmsWebhook(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, string>;

    // Extract Twilio fields
    const fromPhone: string = body.From ?? "";
    const toPhone: string = body.To ?? "";
    const messageBody: string = (body.Body ?? "").trim();

    console.log(`[EvaSMS] Inbound SMS from ${fromPhone} to ${toPhone}: "${messageBody}"`);

    // Validate Twilio signature (skip in development/test)
    if (process.env.NODE_ENV === "production") {
      const signature = (req.headers["x-twilio-signature"] as string) ?? "";
      const { authToken } = TWILIO_ENV;
      if (authToken && signature) {
        // Build the full URL Twilio used to call this webhook
        const protocol = req.headers["x-forwarded-proto"] ?? req.protocol ?? "https";
        const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
        const webhookUrl = `${protocol}://${host}${req.originalUrl}`;
        const isValid = validateTwilioSignature(authToken, signature, webhookUrl, body);
        if (!isValid) {
          console.warn(`[EvaSMS] Invalid Twilio signature from ${fromPhone}`);
          res.status(403).send("Forbidden");
          return;
        }
      }
    }

    // Handle opt-out keywords (Twilio handles STOP/UNSTOP automatically, but be safe)
    const upperBody = messageBody.toUpperCase();
    if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(upperBody)) {
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have been unsubscribed from Napoli Pizzeria SMS. Reply START to re-subscribe. Questions? Call 725-204-0379.</Message>
</Response>`);
      return;
    }

    if (["START", "YES", "UNSTOP"].includes(upperBody)) {
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Welcome back to Napoli Pizzeria! 🍕 How can Eva help you today? Order online: napolipizzerianorthlasvegas.com</Message>
</Response>`);
      return;
    }

    // Get conversation history for this phone number
    const history = getConversation(fromPhone);

    // Add the new user message
    const updatedHistory: Array<{ role: "user" | "assistant"; content: string }> = [
      ...history,
      { role: "user", content: messageBody },
    ];

    // Keep only the last 10 messages to avoid token bloat
    const trimmedHistory = updatedHistory.slice(-10);

    // Call Eva's LLM
    const llmMessages = [
      { role: "system" as const, content: EVA_SMS_SYSTEM_PROMPT },
      ...trimmedHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const response = await invokeLLMTracked({ messages: llmMessages }, "eva_sms");
    const reply =
      response.choices?.[0]?.message?.content ??
      "Hi! I'm Eva from Napoli Pizzeria. For immediate help, please call us at 725-204-0379. 🍕";

    const replyText = typeof reply === "string" ? reply : String(reply);

    // Save updated conversation history (with Eva's reply)
    saveConversation(fromPhone, [
      ...trimmedHistory,
      { role: "assistant", content: replyText },
    ]);

    console.log(`[EvaSMS] Replying to ${fromPhone}: "${replyText.substring(0, 80)}..."`);

    // Respond with TwiML
    const escapedReply = replyText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapedReply}</Message>
</Response>`);
  } catch (err) {
    console.error("[EvaSMS] Error processing inbound SMS:", err);
    // Always return a valid TwiML response so Twilio doesn't retry
    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Hi! I'm Eva from Napoli Pizzeria. I'm having trouble right now. Please call us at 725-204-0379 for immediate help. 🍕</Message>
</Response>`);
  }
}
