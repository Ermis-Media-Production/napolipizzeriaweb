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
 *
 * Employee / Tender:
 *   - All web orders are assigned to the employee named "Online"
 *     (looked up by name; created automatically if not found).
 *   - The order tender is set to "Table" (looked up by name in the merchant's
 *     tender list).
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

  if (PIZZA_KEYWORDS.some((kw) => lower.includes(kw))) {
    return CLOVER_PRINTER_LABELS.PIZZA;
  }
  if (BAR_DRINKS_KEYWORDS.some((kw) => lower.includes(kw))) {
    return CLOVER_PRINTER_LABELS.BAR_DRINKS;
  }
  if (PIZZERIA_KEYWORDS.some((kw) => lower.includes(kw))) {
    return CLOVER_PRINTER_LABELS.PIZZERIA;
  }
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

// ── Employee lookup / creation ─────────────────────────────────────────────────

/**
 * Find the Clover employee ID for the "Online" employee.
 * If not found, create it automatically.
 * Returns the employee ID string, or null on failure.
 */
async function getOnlineEmployeeId(): Promise<string | null> {
  try {
    const res = await axios.get(
      cloverUrl("/employees?limit=200"),
      { headers: cloverHeaders() }
    );

    const employees: Array<{ id: string; name: string }> =
      res.data?.elements ?? [];

    const online = employees.find(
      (e) => e.name?.toLowerCase() === "online"
    );

    if (online) {
      return online.id;
    }

    // Not found — create it
    console.log("[Clover] 'Online' employee not found, creating...");
    const createRes = await axios.post(
      cloverUrl("/employees"),
      {
        name: "Online",
        nickname: "Online",
        role: "EMPLOYEE",
        isOwner: false,
      },
      { headers: cloverHeaders() }
    );

    const newId: string = createRes.data?.id;
    console.log(`[Clover] Created 'Online' employee with ID: ${newId}`);
    return newId ?? null;
  } catch (err) {
    console.error("[Clover] Failed to get/create Online employee:", err);
    return null;
  }
}

// ── Tender lookup ──────────────────────────────────────────────────────────────

/**
 * Find the Clover tender ID for the "Table" tender.
 * Returns the tender ID string, or null if not found.
 */
async function getTableTenderId(): Promise<string | null> {
  try {
    const res = await axios.get(
      cloverUrl("/tenders?limit=100"),
      { headers: cloverHeaders() }
    );

    const tenders: Array<{ id: string; label: string; labelKey?: string }> =
      res.data?.elements ?? [];

    // Try exact match first, then partial match
    // Try multiple name variations: "Table", "Tables", "Tab", "Dine In", "Dine-In"
    const TABLE_PATTERNS = ["table", "tab", "dine in", "dine-in", "dinein"];
    const table =
      tenders.find((t) => t.label?.toLowerCase() === "table") ??
      tenders.find((t) => TABLE_PATTERNS.some((p) => t.label?.toLowerCase() === p)) ??
      tenders.find((t) => TABLE_PATTERNS.some((p) => t.label?.toLowerCase().includes(p))) ??
      tenders.find((t) => TABLE_PATTERNS.some((p) => t.labelKey?.toLowerCase().includes(p)));

    if (table) {
      console.log(`[Clover] Found 'Table' tender: ${table.id} ("${table.label}")`);
      return table.id;
    }

    console.warn("[Clover] No 'Table' tender found. Available tenders:", tenders.map((t) => `"${t.label}" (${t.labelKey ?? "no key"})`).join(", "));
    console.warn("[Clover] Orders will be created without a tender assignment. Check Clover Dashboard → Setup → Tenders.");
    return null;
  } catch (err) {
    console.error("[Clover] Failed to fetch tenders:", err);
    return null;
  }
}

// ── Push order to Clover POS ───────────────────────────────────────────────────

/**
 * Push a confirmed order to Clover POS.
 * - Assigns the "Online" employee to the order
 * - Sets the tender to "Table"
 * - Routes each line item to the correct kitchen printer via label
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

  // Fetch employee and tender IDs in parallel (non-blocking — failures are handled gracefully)
  const [onlineEmployeeId, tableTenderId] = await Promise.all([
    getOnlineEmployeeId(),
    getTableTenderId(),
  ]);

  // Step 1: Create the order shell, assigning the "Online" employee
  const orderPayload: Record<string, unknown> = {
    state: "open",
    currency: "USD",
    total: input.totalCents,
    title: `${orderTypeLabel} — Napoli Pizzeria`,
    note: noteLines.length ? noteLines.join(" | ") : undefined,
    manualTransaction: false,
    testMode: false,
  };

  if (onlineEmployeeId) {
    orderPayload.employee = { id: onlineEmployeeId };
  }

  const orderRes = await axios.post(
    cloverUrl("/orders"),
    orderPayload,
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
      printerLabel: { name: printerLabel },
    };
  });

  await axios.post(
    cloverUrl(`/orders/${orderId}/bulk_line_items`),
    { items: lineItems },
    { headers: cloverHeaders() }
  );

  // Step 3: Add a "Table" tender payment to the order so it appears under Table
  if (tableTenderId) {
    try {
      await axios.post(
        cloverUrl(`/orders/${orderId}/payments`),
        {
          tender: { id: tableTenderId },
          amount: input.totalCents,
          tipAmount: 0,
          offline: false,
          employee: onlineEmployeeId ? { id: onlineEmployeeId } : undefined,
          externalPaymentId: input.externalId ?? input.orderRef ?? orderId,
        },
        { headers: cloverHeaders() }
      );
      console.log(`[Clover] Applied 'Table' tender to order ${orderId}`);
    } catch (err) {
      // Non-fatal — order is still created, just without the tender assignment
      console.warn(`[Clover] Failed to apply Table tender to order ${orderId}:`, err);
    }
  }

  console.log(
    `[Clover] Order ${orderId} created for ${input.customerName ?? "unknown"} (${orderTypeLabel}). ` +
    `Employee: ${onlineEmployeeId ?? "none"} | Tender: ${tableTenderId ?? "none"} | ` +
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
