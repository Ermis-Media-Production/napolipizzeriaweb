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
 * Merchant configuration (verified via Clover API + WordPress EMP plugin):
 *   - Employee "online"  → DW4J35FH3R9B0
 *   - Tender "Online"    → T416DFP49C7BJ
 *   - Order type Pick up → CYNNEQA3ABD8Y  (default)
 *   - Order type Delivery → KKKWXJB30FE6R
 *   - Order type Dine In → ATSAYYBGKK8B0
 *   - Print Device ID    → 09615cdb-7801-4261-a70d-3bf94816f51a
 *     (Station Duo 2nd Gen — same device configured in WordPress for Auto-Print)
 */

import axios from "axios";
import { CLOVER_ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";

export interface CloverOrderInput {
  items: Array<{ name: string; price: number; quantity: number; description?: string; cloverItemId?: string }>;
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

// ── Merchant-specific IDs (verified via API — do not change without re-verifying) ──

/**
 * Fixed employee ID for the "online" employee.
 * Verified: DW4J35FH3R9B0 → name: "online"
 * Using a fixed ID avoids an extra API call per order and eliminates
 * the risk of accidental employee creation.
 */
export const CLOVER_ONLINE_EMPLOYEE_ID = "DW4J35FH3R9B0";

/**
 * Fixed tender ID for the "Online" payment tender.
 * Verified: T416DFP49C7BJ → label: "Online"
 * This matches the tender configured in the WordPress EMP Clover plugin.
 */
export const CLOVER_ONLINE_TENDER_ID = "T416DFP49C7BJ";

/**
 * Order type IDs mapped to our internal orderType values.
 * Verified via GET /v3/merchants/{mId}/order_types
 */
export const CLOVER_ORDER_TYPE_IDS = {
  pickup:   "CYNNEQA3ABD8Y", // "Pick up"   — default order type
  delivery: "KKKWXJB30FE6R", // "Delivery"
  "dine-in": "ATSAYYBGKK8B0", // "Dine In"
} as const;

/**
 * Clover Device ID that receives print jobs.
 * This is the Station Duo (2nd Gen) configured in WordPress as the Auto-Print device.
 * Including deviceRef in the print_event ensures the ticket is routed to the
 * correct station, which then dispatches to the kitchen printers.
 * Verified: 09615CDB78014261A70D3BF94816F51A (API format without dashes)
 */
export const CLOVER_PRINT_DEVICE_ID = "09615CDB78014261A70D3BF94816F51A";

// ── Printer label mapping ──────────────────────────────────────────────────────

/**
 * Clover printer IDs (from GET /v3/merchants/{mId}/printers):
 *   Pizza     → 65QB994H6Z44W  (Star TSP100, 192.168.192.11)
 *   Food      → MCWCF8204E7QM  (Star TSP100, 192.168.192.12)
 *   Pizzeria  → WBSHK4762NS76  (TM-U220, 192.168.192.8)
 *
 * Clover requires printerLabel to be set as { id: "<printerId>" } on each
 * line item — using { name: "..." } is silently ignored by the API.
 */
export const CLOVER_PRINTER_IDS = {
  PIZZA:    "65QB994H6Z44W",
  FOOD:     "MCWCF8204E7QM",
  PIZZERIA: "WBSHK4762NS76",
} as const;

// Keep name constants for logging/display purposes
export const CLOVER_PRINTER_LABELS = {
  PIZZA:    "Pizza",
  FOOD:     "Food",
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
 *   1. PIZZA_KEYWORDS match   → "Pizza"    (Star TSP100, pizza station)
 *   2. DESSERT_KEYWORDS match → "Pizzeria" (TM-U220, desserts/beverages)
 *   3. BEVERAGE_KEYWORDS match → "Pizzeria" (TM-U220, desserts/beverages)
 *   4. Everything else         → "Food"    (Star TSP100, hot food station)
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

// ── Print status verification ──────────────────────────────────────────────────

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
 *
 * - Assigns the fixed "online" employee (DW4J35FH3R9B0)
 * - Sets the order type based on input.orderType (fixed IDs, no API lookup)
 * - Routes each line item to the correct kitchen printer via printerLabel ID
 * - Fires print_event with deviceRef pointing to the Station Duo configured
 *   in WordPress, ensuring the ticket reaches the kitchen printers
 * - Applies the "Online" tender (T416DFP49C7BJ) to match WordPress behavior
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
  // Build a descriptive title that shows up in Clover reports:
  // "Online Pick-Up — John Smith" or "Online Delivery — NPZ-20260528-0042"
  const reportTitle = input.customerName
    ? `${orderTypeLabel} — ${input.customerName}`
    : input.orderRef
    ? `${orderTypeLabel} — ${input.orderRef}`
    : `${orderTypeLabel} — Napoli Pizzeria`;

  const orderRes = await axios.post(
    cloverUrl("/orders"),
    {
      state: "open",
      currency: "USD",
      total: input.totalCents,
      title: reportTitle,
      note: noteLines.length ? noteLines.join(" | ") : undefined,
      manualTransaction: false,
      testMode: false,
      employee: { id: CLOVER_ONLINE_EMPLOYEE_ID },
      orderType: { id: CLOVER_ORDER_TYPE_IDS[input.orderType] },
    },
    { headers: cloverHeaders() }
  );

  const orderId: string = orderRes.data.id;

  // Step 2: Add all line items with printer label assignments
  // The description field carries modifier/customization details (toppings, crust, sauce, etc.)
  // We format each modifier as a separate line for easy reading by kitchen staff.
  const lineItems = input.items.map((item) => {
    const printerLabel = getPrinterLabel(item.name);
    const printerIdMap: Record<PrinterLabel, string> = {
      Pizza:    CLOVER_PRINTER_IDS.PIZZA,
      Food:     CLOVER_PRINTER_IDS.FOOD,
      Pizzeria: CLOVER_PRINTER_IDS.PIZZERIA,
    };
    const printerId = printerIdMap[printerLabel];
    const lineItem: Record<string, unknown> = {
      name: item.name,
      price: Math.round(item.price * 100), // cents
      unitQty: item.quantity,
      printerLabel: { id: printerId },
    };

    // If the item has a Clover catalog ID, include it so Clover can
    // resolve the catalog entry — this enables automatic printer routing
    // and ensures the item appears correctly on the kitchen ticket.
    if (item.cloverItemId) {
      lineItem.item = { id: item.cloverItemId };
    }

    if (item.description && item.description.trim()) {
      const raw = item.description.trim();
      let note = raw
        .replace(/ · /g, "\n")  // frontend separator
        .replace(/\|/g, "\n");  // pipe separators used in some modals
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

  // Step 3: Wait 2s for Clover to finish processing the order asynchronously.
  // Clover processes orders with modifications asynchronously — firing print_event
  // immediately can race against Clover's internal write: the device receives the
  // job before the ticket is fully renderable and silently drops it.
  // (Same guardrail used by the WordPress EMP Clover plugin — confirmed in production.)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 4: Fire the print event BEFORE applying the tender.
  // Clover treats a paid/closed order differently: print_event on a paid order
  // generates a payment receipt (shows only the first item) instead of a full
  // kitchen order ticket. Printing while the order is still open guarantees
  // all line items appear on the printed ticket. (Guardrail R1 — WordPress plugin)
  try {
    await axios.post(
      cloverUrl(`/print_event`),
      {
        orderRef: { id: orderId },
        deviceRef: { id: CLOVER_PRINT_DEVICE_ID },
      },
      { headers: cloverHeaders() }
    );
    console.log(`[Clover] Print event fired for order ${orderId} → device ${CLOVER_PRINT_DEVICE_ID}`);

    // Fire-and-forget verification: check printed status on line items after 6s.
    // Clover sets printed=true on each line item once the printer confirms receipt.
    // If any item remains unprinted, verifyPrintStatus notifies the owner.
    setTimeout(() => verifyPrintStatus(orderId, input.customerName), 6000);
  } catch (err: unknown) {
    // Non-fatal — order is still visible in Clover, just may not auto-print
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Clover] Failed to fire print event for order ${orderId}:`, msg);
  }

  // Step 5: Apply the "Online" tender AFTER printing.
  // Applying the tender closes/pays the order — Clover then treats any subsequent
  // print_event as a payment receipt instead of a kitchen ticket.
  try {
    await axios.post(
      cloverUrl(`/orders/${orderId}/payments`),
      {
        tender: { id: CLOVER_ONLINE_TENDER_ID },
        amount: input.totalCents,
        tipAmount: 0,
        offline: false,
        employee: { id: CLOVER_ONLINE_EMPLOYEE_ID },
        externalPaymentId: input.externalId ?? input.orderRef ?? orderId,
      },
      { headers: cloverHeaders() }
    );
    console.log(`[Clover] Applied 'Online' tender to order ${orderId}`);
  } catch (err) {
    // Non-fatal — order is still created, just without the tender assignment
    console.warn(`[Clover] Failed to apply Online tender to order ${orderId}:`, err);
  }

  // Log label routing for debugging
  const labelSummary = input.items
    .map((i) => `${i.name} → ${getPrinterLabel(i.name)}`)
    .join(", ");
  console.log(
    `[Clover] Order ${orderId} created for ${input.customerName ?? "unknown"} (${orderTypeLabel}). ` +
    `Employee: ${CLOVER_ONLINE_EMPLOYEE_ID} | Tender: ${CLOVER_ONLINE_TENDER_ID} | ` +
    `OrderType: ${CLOVER_ORDER_TYPE_IDS[input.orderType]} | Routing: ${labelSummary}`
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
