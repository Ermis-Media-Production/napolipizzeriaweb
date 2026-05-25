/**
 * cloverSync.ts
 *
 * Shared helper used by both the Clover Hosted Checkout webhook and any other
 * payment confirmation path to push a confirmed order to Clover POS.
 *
 * Printer label mapping (by item name keywords):
 *   Pizza     → pizzas, calzones, stromboli, chicago deep dish, sicilian
 *   Pizzeria  → pasta, lasagna, ravioli, manicotti, stuffed shells, cannelloni,
 *               ziti, fettuccine, tortellini, spaghetti, eggplant parm, specials
 *   Food      → appetizers, wings, chicken fingers, burgers, subs, wraps,
 *               salads, soups, sides, triple deckers, kids menu, lunch specials
 *   Bar/Drinks → beverages, desserts, soda, water, beer, wine, milkshake
 */

import axios from "axios";
import { CLOVER_ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";

export interface CloverOrderInput {
  items: Array<{ name: string; price: number; quantity: number }>;
  orderType: "delivery" | "pickup" | "dine-in";
  customerName?: string;
  customerPhone?: string;
  externalId?: string; // Clover checkout session ID or other ref
  totalCents: number;  // total in cents
  scheduledAt?: number; // UTC ms — for scheduled orders
  orderRef?: string;   // internal order reference
}

export interface CloverOrderResult {
  cloverOrderId: string;
  dashboardUrl: string;
}

// ── Printer label mapping ──────────────────────────────────────────────────────

/**
 * Clover printer label names as configured in the Napoli Pizzeria Clover account.
 * These must match EXACTLY the label names in Clover Dashboard → Printers.
 */
export const CLOVER_PRINTER_LABELS = {
  PIZZA: "Pizza",
  PIZZERIA: "Pizzeria",
  FOOD: "Food",
  BAR_DRINKS: "Bar/Drinks",
} as const;

type PrinterLabel = (typeof CLOVER_PRINTER_LABELS)[keyof typeof CLOVER_PRINTER_LABELS];

// Keywords that map item names to printer labels (case-insensitive)
const PIZZA_KEYWORDS = [
  "pizza", "calzone", "stromboli", "chicago deep dish", "sicilian",
  "stuffed chicago", "nutella pizza",
];

const PIZZERIA_KEYWORDS = [
  "pasta", "lasagna", "ravioli", "manicotti", "stuffed shells", "cannelloni",
  "ziti", "fettuccine", "tortellini", "spaghetti", "eggplant parm",
  "chicken parmigiana", "baked ziti", "chicken alfredo", "shrimp",
  "garlic bread", "bread sticks", "garlic balls", "bruschetta",
  "meatball", "sausage", "marinara",
];

const BAR_DRINKS_KEYWORDS = [
  "soda", "water", "beer", "wine", "drink", "beverage", "juice",
  "milkshake", "iced tea", "root beer float", "perrier", "2 liter",
  "dessert", "zeppoli", "cannoli", "cheesecake", "tiramisu", "brownie",
  "eclair", "baklava", "red velvet", "chocolate cake", "carrot cake",
  "custard", "gold peak",
];

/**
 * Determine which Clover printer label an item should be routed to
 * based on its name.
 */
export function getPrinterLabel(itemName: string): PrinterLabel {
  const lower = itemName.toLowerCase();

  // Check Pizza first (most specific)
  if (PIZZA_KEYWORDS.some((kw) => lower.includes(kw))) {
    return CLOVER_PRINTER_LABELS.PIZZA;
  }

  // Check Bar/Drinks
  if (BAR_DRINKS_KEYWORDS.some((kw) => lower.includes(kw))) {
    return CLOVER_PRINTER_LABELS.BAR_DRINKS;
  }

  // Check Pizzeria (pasta, Italian dishes)
  if (PIZZERIA_KEYWORDS.some((kw) => lower.includes(kw))) {
    return CLOVER_PRINTER_LABELS.PIZZERIA;
  }

  // Default: Food (burgers, wings, subs, salads, appetizers, etc.)
  return CLOVER_PRINTER_LABELS.FOOD;
}

// ── Clover API helpers ─────────────────────────────────────────────────────────

function cloverHeaders() {
  return {
    Authorization: `Bearer ${CLOVER_ENV.apiToken}`,
    "Content-Type": "application/json",
  };
}

function cloverUrl(path: string) {
  return `${CLOVER_ENV.baseUrl}/v3/merchants/${CLOVER_ENV.merchantId}${path}`;
}

// ── Push order to Clover POS ───────────────────────────────────────────────────

/**
 * Push a confirmed order to Clover POS.
 * Creates the order shell, then adds all line items with printer label assignments.
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
  if (input.orderRef) noteLines.push(`Ref: ${input.orderRef}`);
  if (input.externalId) noteLines.push(`Payment: ${input.externalId}`);
  if (input.scheduledAt) {
    const scheduledStr = new Date(input.scheduledAt).toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    noteLines.push(`Scheduled: ${scheduledStr}`);
  }

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

  // Step 2: Add all line items with printer label assignments
  const lineItems = input.items.map((item) => {
    const printerLabel = getPrinterLabel(item.name);
    return {
      name: item.name,
      price: Math.round(item.price * 100), // cents
      unitQty: item.quantity,
      // Assign printer label so Clover routes to the correct kitchen printer
      printerLabel: { name: printerLabel },
    };
  });

  await axios.post(
    cloverUrl(`/orders/${orderId}/bulk_line_items`),
    { items: lineItems },
    { headers: cloverHeaders() }
  );

  console.log(
    `[Clover] Order ${orderId} created for ${input.customerName ?? "unknown"} (${orderTypeLabel}). ` +
    `Labels: ${Array.from(new Set(input.items.map((i) => getPrinterLabel(i.name)))).join(", ")}`
  );

  // Fire-and-forget owner notification
  const itemSummary = input.items
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(", ");
  const totalFormatted = `$${(input.totalCents / 100).toFixed(2)}`;
  notifyOwner({
    title: `New ${orderTypeLabel} Order — ${totalFormatted}`,
    content: [
      `Customer: ${input.customerName ?? "Unknown"}`,
      input.customerPhone ? `Phone: ${input.customerPhone}` : null,
      `Items: ${itemSummary}`,
      `Total: ${totalFormatted}`,
      input.orderRef ? `Ref: ${input.orderRef}` : null,
      input.scheduledAt
        ? `Scheduled: ${new Date(input.scheduledAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}`
        : null,
      `Clover Order: ${orderId}`,
      `View: https://www.clover.com/r/${CLOVER_ENV.merchantId}/orders/${orderId}`,
    ]
      .filter(Boolean)
      .join("\n"),
  }).catch((err) => {
    console.warn("[Notification] Failed to notify owner:", err);
  });

  return {
    cloverOrderId: orderId,
    dashboardUrl: `https://www.clover.com/r/${CLOVER_ENV.merchantId}/orders/${orderId}`,
  };
}
