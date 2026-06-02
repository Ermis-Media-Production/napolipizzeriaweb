/**
 * cloverSync.ts
 *
 * Shared helper used by both the Clover Hosted Checkout webhook and any other
 * payment confirmation path to push a confirmed order to Clover POS.
 *
 * Kitchen Printer label mapping (3 printers):
 *
 *   Pizza     (Star TSP100, 192.168.192.11)
 *     → All pizzas (regular, specialty, gluten-free, stuffed dough, sicilian,
 *       calzone, stromboli, half & half, 4-topp combo, etc.)
 *
 *   Food      (Star TSP100, 192.168.192.12)
 *     → Hot food: wings, appetizers, burgers, sandwiches, wraps,
 *       salads, pasta, sides, children's menu, lunch specials, anytime specials
 *
 *   Pizzeria  (TM-U220, 192.168.192.8)
 *     → Desserts and beverages (sodas, water, milkshakes, beer, wine, etc.)
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
  items: Array<{ name: string; price: number; quantity: number; description?: string }>;
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
 * Clover printer IDs (from /v3/merchants/{id}/printers):
 *   Pizza     → 65QB994H6Z44W  (Star TSP100, 192.168.192.11)
 *   Food      → MCWCF8204E7QM  (Star TSP100, 192.168.192.12)
 *   Pizzeria  → WBSHK4762NS76  (TM-U220, 192.168.192.8)
 *
 * Clover requires printerLabel to be set as { id: "<printerId>" } on each
 * line item — using { name: "..." } is silently ignored by the API.
 */
export const CLOVER_PRINTER_IDS = {
  PIZZA: "65QB994H6Z44W",
  FOOD: "MCWCF8204E7QM",
  PIZZERIA: "WBSHK4762NS76",
} as const;

// Keep name constants for logging/display purposes
export const CLOVER_PRINTER_LABELS = {
  PIZZA: "Pizza",
  FOOD: "Food",
  PIZZERIA: "Pizzeria",
} as const;

type PrinterLabel = (typeof CLOVER_PRINTER_LABELS)[keyof typeof CLOVER_PRINTER_LABELS];

/**
 * Keywords that identify pizza-station items (case-insensitive).
 */
const PIZZA_KEYWORDS = [
  "pizza",
  "calzone",
  "stromboli",
  "chicago deep dish",
  "sicilian",
  "stuffed chicago",
  "nutella pizza",
  "half & half",
  "4 topp combo",
  "stuffed dough",
  "gluten free pizza",
  "gluten-free pizza",
];

/**
 * Keywords that identify dessert items → Pizzeria printer (TM-U220).
 */
const DESSERT_KEYWORDS = [
  "zeppoli",
  "red velvet cake",
  "eclair",
  "brownie",
  "cannoli",
  "baklava",
  "cheesecake",
  "tiramisu",
  "chocolate cake",
  "carrot cake",
  "dessert",
];

/**
 * Keywords that identify beverage items → Pizzeria printer (TM-U220).
 */
const BEVERAGE_KEYWORDS = [
  "soda can",
  "glass bottle soda",
  "perrier",
  "bottled water",
  "2 liter",
  "iced tea",
  "root beer float",
  "milkshake",
  "frozen custard",
  "wine",
  "beer",
  "juice",
  "lemonade",
  "water",
  "beverage",
  "drink",
  "coffee",
  "espresso",
  "cappuccino",
];

/**
 * Determine which Clover printer label an item should be routed to.
 *
 * Rules (evaluated in order):
 *   1. PIZZA_KEYWORDS match  → "Pizza"    (Star TSP100, pizza station)
 *   2. DESSERT_KEYWORDS match → "Pizzeria" (TM-U220, desserts/beverages)
 *   3. BEVERAGE_KEYWORDS match → "Pizzeria" (TM-U220, desserts/beverages)
 *   4. Everything else        → "Food"     (Star TSP100, hot food station)
 */
export function getPrinterLabel(itemName: string): PrinterLabel {
  const lower = itemName.toLowerCase();

  if (PIZZA_KEYWORDS.some((kw) => lower.includes(kw))) {
    return CLOVER_PRINTER_LABELS.PIZZA;
  }

  if (
    DESSERT_KEYWORDS.some((kw) => lower.includes(kw)) ||
    BEVERAGE_KEYWORDS.some((kw) => lower.includes(kw))
  ) {
    return CLOVER_PRINTER_LABELS.PIZZERIA;
  }

  // Everything else: wings, appetizers, burgers, sandwiches, wraps,
  // salads, pasta, sides, children's menu, lunch specials, anytime specials.
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

// ── Print status verification ────────────────────────────────────────────────

/**
 * Verify that all line items in a Clover order have been confirmed as printed
 * by their assigned kitchen printers.
 *
 * Called 6 seconds after firing the print_event, giving printers enough time
 * to acknowledge receipt. If any item remains unprinted, the owner is notified
 * immediately so kitchen staff can reprint or investigate offline printers.
 *
 * Exported for unit testing.
 */
export async function verifyPrintStatus(
  orderId: string,
  customerName?: string
): Promise<void> {
  try {
    const verifyRes = await axios.get(
      cloverUrl(`/orders/${orderId}/line_items?expand=printerLabel`),
      { headers: cloverHeaders() }
    );
    const items: Array<{ id: string; name: string; printed?: boolean }> =
      verifyRes.data?.elements ?? [];
    const printedCount = items.filter((i) => i.printed).length;
    const totalCount = items.length;

    // Nothing to verify if the order has no line items
    if (totalCount === 0) {
      console.log(`[Clover] No line items found for order ${orderId}, skipping print verification.`);
      return;
    }

    if (printedCount === totalCount) {
      console.log(
        `[Clover] ✅ Print confirmed for order ${orderId}: all ${totalCount} item(s) printed=true`
      );
      return;
    }

    // Some or all items did not print — log and notify owner
    const unprintedItems = items.filter((i) => !i.printed);
    console.warn(
      `[Clover] ⚠️  Print status for order ${orderId}: ${printedCount}/${totalCount} item(s) printed=true` +
      ` — printers may be offline or still processing`
    );
    items.forEach((item) => {
      console.log(`[Clover]   - "${item.name}" printed=${item.printed ?? false}`);
    });

    // Notify owner so kitchen staff can act immediately
    const unprintedList = unprintedItems
      .map((i) => `  • ${i.name}`)
      .join("\n");
    notifyOwner({
      title: `⚠️ Kitchen Printer Alert — Order ${orderId}`,
      content: [
        `${printedCount}/${totalCount} item(s) were NOT confirmed by their kitchen printer.`,
        customerName ? `Customer: ${customerName}` : null,
        ``,
        `Unprinted items:`,
        unprintedList,
        ``,
        `Possible causes:`,
        `  • Printer is powered off`,
        `  • Printer is out of paper`,
        `  • Network cable disconnected (192.168.192.x)`,
        `  • Clover device offline`,
        ``,
        `Action: Reprint from Clover Dashboard or check printers in kitchen.`,
        `View order: https://www.clover.com/r/${CLOVER_ENV.merchantId}/orders/${orderId}`,
      ]
        .filter((l) => l !== null)
        .join("\n"),
    }).catch((err) => {
      console.warn("[Clover] Failed to send printer alert notification:", err);
    });
  } catch (verifyErr: unknown) {
    const msg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
    console.warn(`[Clover] Could not verify print status for order ${orderId}:`, msg);
  }
}

// ── Push order to Clover POS ───────────────────────────────────────────────────

/**
 * Push a confirmed order to Clover POS.
 * - Assigns the "Online" employee to the order
 * - Sets the tender to "Table"
 * - Routes each line item to the correct kitchen printer via label:
 *     Pizza items  → "Pizza" printer (Star TSP100)
 *     All others   → "Food" printer (Star TSP100)
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
  // Build a descriptive title that shows up in Clover reports:
  // "Online Pick-Up — John Smith" or "Online Delivery — NPZ-20260528-0042"
  const reportTitle = input.customerName
    ? `${orderTypeLabel} — ${input.customerName}`
    : input.orderRef
    ? `${orderTypeLabel} — ${input.orderRef}`
    : `${orderTypeLabel} — Napoli Pizzeria`;

  const orderPayload: Record<string, unknown> = {
    state: "open",
    currency: "USD",
    total: input.totalCents,
    title: reportTitle,
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
  // Pizza items → "Pizza" printer | Everything else → "Food" printer
  // The description field carries modifier/customization details (toppings, crust, sauce, etc.)
  // We format each modifier as a separate line for easy reading by kitchen staff.
  const lineItems = input.items.map((item) => {
    const printerLabel = getPrinterLabel(item.name);
    // Map label name to Clover printer ID — Clover requires { id } not { name }
    const printerIdMap: Record<PrinterLabel, string> = {
      Pizza: CLOVER_PRINTER_IDS.PIZZA,
      Food: CLOVER_PRINTER_IDS.FOOD,
      Pizzeria: CLOVER_PRINTER_IDS.PIZZERIA,
    };
    const printerId = printerIdMap[printerLabel];
    const lineItem: Record<string, unknown> = {
      name: item.name,
      price: Math.round(item.price * 100), // cents
      unitQty: item.quantity,
      printerLabel: { id: printerId },
    };

    if (item.description && item.description.trim()) {
      // Normalize description into clean kitchen-ticket lines:
      //   " · " separators (frontend format) → newlines
      //   "\n" already present → keep as-is
      // Result: each modifier on its own line, easy to read at the pizza station.
      const raw = item.description.trim();

      // Build a structured note:
      // 1. Replace " · " with newline
      // 2. Ensure Half & Half sections are clearly labeled
      // 3. Add a separator line before the note for visual clarity on the ticket
      let note = raw
        .replace(/ · /g, "\n")  // frontend separator
        .replace(/\|/g, "\n");  // pipe separators used in some modals

      // Ensure "Half & Half" header is prominent
      note = note.replace(/(Half & Half)/gi, "*** $1 ***");

      lineItem.note = note;
    }
    return lineItem;
  });

  await axios.post(
    cloverUrl(`/orders/${orderId}/bulk_line_items`),
    { items: lineItems },
    { headers: cloverHeaders() }
  );

  // Step 3: Fire the print event so Clover routes items to kitchen printers
  // This is what sets printed=true on line items and triggers physical printing.
  try {
    await axios.post(
      cloverUrl(`/print_event`),
      { orderRef: { id: orderId } },
      { headers: cloverHeaders() }
    );
    console.log(`[Clover] Print event fired for order ${orderId}`);

    // Fire-and-forget verification: check printed status on line items after 6s.
    // Clover sets printed=true on each line item once the printer confirms receipt.
    // If any item remains unprinted, verifyPrintStatus notifies the owner.
    setTimeout(() => verifyPrintStatus(orderId, input.customerName), 6000);
  } catch (err: unknown) {
    // Non-fatal — order is still visible in Clover, just may not auto-print
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Clover] Failed to fire print event for order ${orderId}:`, msg);
  }

  // Step 4: Add a "Table" tender payment to the order so it appears under Table
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

  // Log label routing for debugging
  const labelSummary = input.items
    .map((i) => `${i.name} → ${getPrinterLabel(i.name)}`)
    .join(", ");
  console.log(
    `[Clover] Order ${orderId} created for ${input.customerName ?? "unknown"} (${orderTypeLabel}). ` +
    `Employee: ${onlineEmployeeId ?? "none"} | Tender: ${tableTenderId ?? "none"} | ` +
    `Routing: ${labelSummary}`
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
