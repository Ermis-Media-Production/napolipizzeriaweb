/**
 * Admin Orders Panel — /admin/orders
 *
 * Two tabs:
 *   1. Clover POS — live feed from Clover API (existing)
 *   2. Scheduled Orders — orders placed via the website with capacity view
 *
 * Accessible only to users with role=admin.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import {
  RefreshCw,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  UtensilsCrossed,
  Package,
  ExternalLink,
  Settings,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pizza,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatMoney(val: string | number): string {
  return `$${parseFloat(String(val)).toFixed(2)}`;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScheduledTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatHourLabel(hour: number): string {
  const ampm = hour < 12 ? "AM" : "PM";
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h}:00 ${ampm}`;
}

function parseOrderType(note?: string): "delivery" | "pickup" | "dine-in" | "unknown" {
  if (!note) return "unknown";
  const lower = note.toLowerCase();
  if (lower.includes("delivery")) return "delivery";
  if (lower.includes("dine-in") || lower.includes("dine in")) return "dine-in";
  if (lower.includes("pick-up") || lower.includes("pick up") || lower.includes("pickup")) return "pickup";
  return "unknown";
}

function parseCustomerName(note?: string): string {
  if (!note) return "—";
  const match = note.match(/Customer:\s*([^|]+)/);
  return match ? match[1].trim() : "—";
}

function getCapacityColor(pct: number): string {
  if (pct >= 1) return "oklch(0.55 0.20 25)";
  if (pct >= 0.75) return "oklch(0.55 0.18 55)";
  return "oklch(0.38 0.12 145)";
}

function getCapacityBg(pct: number): string {
  if (pct >= 1) return "oklch(0.97 0.04 25)";
  if (pct >= 0.75) return "oklch(0.97 0.04 55)";
  return "oklch(0.97 0.02 145)";
}

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "confirmed": return { bg: "oklch(0.96 0.05 250)", text: "oklch(0.35 0.12 250)" };
    case "preparing": return { bg: "oklch(0.97 0.05 80)", text: "oklch(0.45 0.12 80)" };
    case "ready":     return { bg: "oklch(0.96 0.06 145)", text: "oklch(0.35 0.12 145)" };
    case "completed": return { bg: "oklch(0.95 0.02 30)", text: "oklch(0.50 0.04 30)" };
    case "cancelled": return { bg: "oklch(0.97 0.04 25)", text: "oklch(0.55 0.12 25)" };
    default:          return { bg: "oklch(0.95 0.02 30)", text: "oklch(0.50 0.04 30)" };
  }
}

// ── Clover POS Components ─────────────────────────────────────────────────────

type OrderState = string;

function StateChip({ state }: { state: OrderState }) {
  const map: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
    open: { label: "Open", icon: <Clock size={12} />, bg: "oklch(0.97 0.05 80)", text: "oklch(0.55 0.12 80)" },
    paid: { label: "Paid", icon: <CheckCircle2 size={12} />, bg: "oklch(0.96 0.06 145)", text: "oklch(0.38 0.12 145)" },
    locked: { label: "Locked", icon: <AlertCircle size={12} />, bg: "oklch(0.96 0.05 250)", text: "oklch(0.45 0.12 250)" },
    voided: { label: "Voided", icon: <XCircle size={12} />, bg: "oklch(0.97 0.04 30)", text: "oklch(0.55 0.10 30)" },
    refunded: { label: "Refunded", icon: <XCircle size={12} />, bg: "oklch(0.97 0.04 30)", text: "oklch(0.55 0.10 30)" },
  };
  const cfg = map[state?.toLowerCase()] ?? { label: state ?? "Unknown", icon: <AlertCircle size={12} />, bg: "oklch(0.95 0.02 30)", text: "oklch(0.50 0.04 30)" };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.text, fontFamily: "'Oswald', sans-serif" }}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function OrderTypeIcon({ type }: { type: ReturnType<typeof parseOrderType> }) {
  const icons = {
    delivery: <Truck size={14} style={{ color: "var(--napoli-red, #c0392b)" }} />,
    "dine-in": <UtensilsCrossed size={14} style={{ color: "oklch(0.38 0.12 145)" }} />,
    pickup: <Package size={14} style={{ color: "oklch(0.45 0.12 250)" }} />,
    unknown: <ShoppingBag size={14} style={{ color: "oklch(0.55 0.04 30)" }} />,
  };
  const labels = { delivery: "Delivery", "dine-in": "Dine-In", pickup: "Pick-Up", unknown: "Online" };
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: "oklch(0.45 0.04 30)", fontFamily: "'Lato', sans-serif" }}>
      {icons[type]}
      {labels[type]}
    </span>
  );
}

type CloverOrderData = {
  cloverOrderId: string;
  state: string;
  total: number;
  currency: string;
  note?: string;
  createdTime: number;
  itemCount: number;
  lineItems: Array<{ id: string; name: string; price: number }>;
};

function parseSpecialNotes(itemName: string): { baseName: string; notes: string[] } {
  const parts = itemName.split(" | ");
  return { baseName: parts[0], notes: parts.slice(1).filter(Boolean) };
}

function CloverOrderRows({ orders }: { orders: CloverOrderData[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <>
      {orders.map((order, idx) => {
        const customer = parseCustomerName(order.note);
        const type = parseOrderType(order.note);
        const isExpanded = expandedId === order.cloverOrderId;
        const hasItems = order.lineItems && order.lineItems.length > 0;
        const addressMatch = order.note?.match(/Address:\s*([^|]+)/);
        const address = addressMatch ? addressMatch[1].trim() : null;
        return (
          <>
            <tr
              key={order.cloverOrderId}
              className="transition-colors cursor-pointer"
              style={{
                borderBottom: isExpanded ? "none" : (idx < orders.length - 1 ? "1px solid oklch(0.94 0.010 80)" : "none"),
                background: isExpanded ? "oklch(0.98 0.015 80)" : undefined,
              }}
              onClick={() => setExpandedId(isExpanded ? null : order.cloverOrderId)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: "oklch(0.60 0.04 30)", transform: isExpanded ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 150ms" }}>▶</span>
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.95 0.012 80)", color: "oklch(0.40 0.04 30)" }}>
                    {order.cloverOrderId.slice(0, 10)}…
                  </span>
                </div>
              </td>
              <td className="px-4 py-3"><span className="text-xs font-medium" style={{ color: "oklch(0.30 0.04 30)", fontFamily: "'Lato', sans-serif" }}>{customer}</span></td>
              <td className="px-4 py-3"><OrderTypeIcon type={type} /></td>
              <td className="px-4 py-3"><span className="text-xs" style={{ color: "oklch(0.50 0.03 30)", fontFamily: "'Lato', sans-serif" }}>{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</span></td>
              <td className="px-4 py-3"><span className="text-sm font-bold" style={{ color: "var(--napoli-red, #c0392b)", fontFamily: "'Oswald', sans-serif" }}>{formatCurrency(order.total ?? 0)}</span></td>
              <td className="px-4 py-3"><StateChip state={order.state} /></td>
              <td className="px-4 py-3"><span className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>{formatTime(order.createdTime)}</span></td>
              <td className="px-4 py-3">
                <a href={`https://www.clover.com/r/${496603379884}/orders/${order.cloverOrderId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "oklch(0.45 0.12 250)", fontFamily: "'Lato', sans-serif" }}>
                  <ExternalLink size={12} />View
                </a>
              </td>
            </tr>
            {isExpanded && (
              <tr key={`${order.cloverOrderId}-details`} style={{ borderBottom: idx < orders.length - 1 ? "1px solid oklch(0.94 0.010 80)" : "none" }}>
                <td colSpan={8} className="px-6 pb-4 pt-0">
                  <div className="rounded-lg border p-4" style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}>
                    {address && (
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: "oklch(0.92 0.012 80)" }}>
                        <Truck size={13} style={{ color: "var(--napoli-red, #c0392b)", flexShrink: 0 }} />
                        <span className="text-xs font-semibold" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Lato', sans-serif" }}>Delivery to: {address}</span>
                      </div>
                    )}
                    {hasItems ? (
                      <div className="flex flex-col gap-2">
                        {order.lineItems.map((li) => {
                          const { baseName, notes } = parseSpecialNotes(li.name);
                          return (
                            <div key={li.id} className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <span className="text-sm font-semibold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Lato', sans-serif" }}>{baseName}</span>
                                {notes.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {notes.map((note, ni) => {
                                      const isHalf = note.toLowerCase().includes("half");
                                      const isFlav = note.toLowerCase().includes("flavor");
                                      const isSpecial = note.toLowerCase().includes("note") || note.toLowerCase().includes("instruction");
                                      const bg = isHalf ? "oklch(0.94 0.06 145)" : isFlav ? "oklch(0.94 0.06 27)" : isSpecial ? "oklch(0.94 0.06 80)" : "oklch(0.94 0.02 80)";
                                      const color = isHalf ? "oklch(0.35 0.12 145)" : isFlav ? "oklch(0.35 0.12 27)" : isSpecial ? "oklch(0.40 0.10 80)" : "oklch(0.45 0.04 30)";
                                      return <span key={ni} className="inline-flex items-center px-2 py-0.5 rounded text-xs" style={{ background: bg, color, fontFamily: "'Lato', sans-serif" }}>{note}</span>;
                                    })}
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-bold shrink-0" style={{ color: "var(--napoli-red, #c0392b)", fontFamily: "'Oswald', sans-serif" }}>{li.price > 0 ? formatCurrency(li.price) : "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs italic" style={{ color: "oklch(0.60 0.03 30)", fontFamily: "'Lato', sans-serif" }}>No item details available — view in Clover for full breakdown.</p>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </>
        );
      })}
    </>
  );
}

// ── Scheduled Orders Components ───────────────────────────────────────────────

type ScheduledOrder = {
  id: number;
  orderRef: string;
  status: string;
  orderType: string;
  scheduledAt: number;
  isAsap: boolean;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryAddress?: string | null;
  pizzaCount: number;
  subtotal: string;
  discountAmount: string;
  convenienceFee: string;
  salesTax: string;
  total: string;
  couponCode?: string | null;
  transactionId?: string | null;
  refundedAmount: string;
  specialInstructions?: string | null;
};

function ScheduledOrderCard({ order }: { order: ScheduledOrder }) {
  const [expanded, setExpanded] = useState(false);
  const { bg, text } = getStatusColor(order.status);
  const refunded = parseFloat(order.refundedAmount);
  const total = parseFloat(order.total);

  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
      {/* Header row */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-mono text-xs font-bold shrink-0" style={{ color: "oklch(0.35 0.04 30)" }}>
            {order.orderRef}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: bg, color: text, fontFamily: "'Oswald', sans-serif" }}>
            {order.status.toUpperCase()}
          </span>
          <div className="flex items-center gap-1 text-xs shrink-0" style={{ color: "oklch(0.50 0.04 30)" }}>
            {order.orderType === "delivery" ? <Truck size={12} /> : order.orderType === "dine-in" ? <UtensilsCrossed size={12} /> : <Package size={12} />}
            <span className="capitalize">{order.orderType}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs" style={{ color: "oklch(0.55 0.03 30)" }}>
              {order.isAsap ? "ASAP" : formatScheduledTime(order.scheduledAt)}
            </p>
            <p className="text-xs font-medium" style={{ color: "oklch(0.35 0.04 30)" }}>{order.customerName}</p>
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--napoli-red, #c0392b)", fontFamily: "'Oswald', sans-serif" }}>
            {formatMoney(order.total)}
          </span>
          {expanded ? <ChevronUp size={14} style={{ color: "oklch(0.55 0.03 30)" }} /> : <ChevronDown size={14} style={{ color: "oklch(0.55 0.03 30)" }} />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: "oklch(0.92 0.012 80)", background: "oklch(0.99 0.005 80)" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            {/* Customer info */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>Customer</p>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>
                <User size={12} style={{ color: "oklch(0.55 0.03 30)" }} />
                {order.customerName}
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>
                <Phone size={12} style={{ color: "oklch(0.55 0.03 30)" }} />
                <a href={`tel:${order.customerPhone}`} className="hover:underline">{order.customerPhone}</a>
              </div>
              {order.deliveryAddress && (
                <div className="flex items-start gap-1.5 text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>
                  <MapPin size={12} style={{ color: "oklch(0.55 0.03 30)", marginTop: 1 }} />
                  {order.deliveryAddress}
                </div>
              )}
            </div>

            {/* Payment summary */}
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>Payment</p>
              <div className="flex justify-between text-xs" style={{ color: "oklch(0.45 0.03 30)" }}>
                <span>Subtotal</span><span>{formatMoney(order.subtotal)}</span>
              </div>
              {parseFloat(order.discountAmount) > 0 && (
                <div className="flex justify-between text-xs text-green-700">
                  <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                  <span>−{formatMoney(order.discountAmount)}</span>
                </div>
              )}
              {parseFloat(order.convenienceFee) > 0 && (
                <div className="flex justify-between text-xs" style={{ color: "oklch(0.45 0.03 30)" }}>
                  <span>Convenience Fee</span><span>+{formatMoney(order.convenienceFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs" style={{ color: "oklch(0.45 0.03 30)" }}>
                <span>Tax</span><span>+{formatMoney(order.salesTax)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold pt-1 border-t" style={{ borderColor: "oklch(0.90 0.012 80)", color: "oklch(0.25 0.04 30)" }}>
                <span>Total</span><span style={{ color: "var(--napoli-red, #c0392b)" }}>{formatMoney(order.total)}</span>
              </div>
              {refunded > 0 && (
                <div className="flex justify-between text-xs font-semibold text-green-700">
                  <span>Refunded</span><span>−{formatMoney(order.refundedAmount)}</span>
                </div>
              )}
            </div>

            {/* Pizza count */}
            <div className="flex items-center gap-2">
              <Pizza size={14} style={{ color: "var(--napoli-red, #c0392b)" }} />
              <span className="text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>
                <strong>{order.pizzaCount}</strong> pizza{order.pizzaCount !== 1 ? "s" : ""} in this order
              </span>
            </div>

            {/* Transaction ID */}
            {order.transactionId && (
              <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)" }}>
                <span className="font-medium">Txn:</span>{" "}
                <span className="font-mono">{order.transactionId}</span>
              </div>
            )}

            {/* Special instructions */}
            {order.specialInstructions && (
              <div className="sm:col-span-2 text-xs p-2 rounded" style={{ background: "oklch(0.97 0.04 80)", color: "oklch(0.35 0.06 80)" }}>
                <span className="font-semibold">Special instructions: </span>
                {order.specialInstructions}
              </div>
            )}

            {/* Link to customer order page */}
            <div className="sm:col-span-2">
              <a
                href={`/my-order/${order.orderRef}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs hover:underline"
                style={{ color: "oklch(0.45 0.12 250)" }}
              >
                <ExternalLink size={12} />
                View customer order page
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Capacity View ─────────────────────────────────────────────────────────────

function CapacityBar({ pizzasBooked, capacity = 80 }: { pizzasBooked: number; capacity?: number }) {
  const pct = Math.min(1, pizzasBooked / capacity);
  const pctInt = Math.round(pct * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Progress
          value={pctInt}
          className="h-2"
          style={{ "--progress-color": getCapacityColor(pct) } as React.CSSProperties}
        />
      </div>
      <span className="text-xs font-semibold shrink-0 w-16 text-right" style={{ color: getCapacityColor(pct), fontFamily: "'Oswald', sans-serif" }}>
        {pizzasBooked}/{capacity}
      </span>
    </div>
  );
}

// ── Scheduled Orders Tab ──────────────────────────────────────────────────────

function ScheduledOrdersTab() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "capacity">("list");

  const dateMs = useMemo(() => selectedDate.getTime(), [selectedDate]);

  const { data: ordersData, isLoading, refetch, isFetching } = trpc.orders.listOrders.useQuery(
    { dateMs, status: statusFilter as "all" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled", limit: 100 },
    { refetchInterval: 30_000 }
  );

  const { data: slotsData } = trpc.orders.availableSlots.useQuery(
    { dateMs },
    { refetchInterval: 60_000 }
  );

  const orders = ordersData ?? [];

  // Aggregate pizza counts by hour for capacity view
  const capacityByHour = useMemo(() => {
    const map: Record<number, { pizzas: number; orders: number }> = {};
    for (const order of orders) {
      if (order.status === "cancelled") continue;
      const slotDate = new Date(order.scheduledAt);
      const hour = parseInt(slotDate.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }));
      if (!map[hour]) map[hour] = { pizzas: 0, orders: 0 };
      map[hour].pizzas += order.pizzaCount;
      map[hour].orders += 1;
    }
    return map;
  }, [orders]);

  const navigateDate = (delta: number) => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  const dateLabel = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const totalPizzas = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.pizzaCount, 0);
  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + parseFloat(o.total), 0);
  const confirmedCount = orders.filter((o) => o.status === "confirmed" || o.status === "preparing" || o.status === "ready").length;

  return (
    <div className="space-y-5">
      {/* Date navigator */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate(-1)}
            className="p-1.5 rounded border transition-colors hover:bg-gray-50"
            style={{ borderColor: "oklch(0.88 0.015 80)" }}
          >
            <ChevronLeft size={16} style={{ color: "oklch(0.45 0.04 30)" }} />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border" style={{ borderColor: "oklch(0.88 0.015 80)", background: "white" }}>
            <Calendar size={14} style={{ color: "var(--napoli-red, #c0392b)" }} />
            <span className="text-sm font-semibold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
              {dateLabel}
            </span>
          </div>
          <button
            onClick={() => navigateDate(1)}
            className="p-1.5 rounded border transition-colors hover:bg-gray-50"
            style={{ borderColor: "oklch(0.88 0.015 80)" }}
          >
            <ChevronRight size={16} style={{ color: "oklch(0.45 0.04 30)" }} />
          </button>
          <button
            onClick={() => { const d = new Date(); d.setHours(0,0,0,0); setSelectedDate(d); }}
            className="px-2.5 py-1.5 rounded border text-xs font-semibold transition-colors hover:bg-gray-50"
            style={{ borderColor: "oklch(0.88 0.015 80)", color: "oklch(0.45 0.04 30)", fontFamily: "'Oswald', sans-serif" }}
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded border overflow-hidden" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            {(["list", "capacity"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  background: viewMode === mode ? "var(--napoli-red, #c0392b)" : "white",
                  color: viewMode === mode ? "white" : "oklch(0.45 0.04 30)",
                  fontFamily: "'Oswald', sans-serif",
                }}
              >
                {mode === "list" ? "List" : "Capacity"}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border"
            style={{ borderColor: "oklch(0.88 0.015 80)", color: "oklch(0.35 0.04 30)", fontFamily: "'Lato', sans-serif" }}
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95 border"
            style={{ background: "oklch(0.96 0.012 80)", color: "oklch(0.35 0.04 30)", borderColor: "oklch(0.88 0.015 80)", fontFamily: "'Oswald', sans-serif" }}
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Day stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Orders", value: orders.length, color: "oklch(0.45 0.12 250)" },
          { label: "Active Orders", value: confirmedCount, color: "oklch(0.38 0.12 145)" },
          { label: "Total Pizzas", value: totalPizzas, color: "var(--napoli-red, #c0392b)" },
          { label: "Day Revenue", value: `$${totalRevenue.toFixed(2)}`, color: "oklch(0.38 0.12 145)" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg p-3 border" style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}>
            <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>{stat.label}</p>
            <p className="text-xl font-bold" style={{ color: stat.color, fontFamily: "'Oswald', sans-serif" }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={22} className="animate-spin" style={{ color: "var(--napoli-red, #c0392b)" }} />
          <span className="ml-2 text-sm" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>Loading orders…</span>
        </div>
      )}

      {/* Capacity view */}
      {!isLoading && viewMode === "capacity" && (
        <div className="rounded-lg border overflow-hidden" style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.98 0.008 80)" }}>
            <h3 className="text-sm font-bold" style={{ color: "oklch(0.30 0.04 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
              HOURLY CAPACITY — {dateLabel.toUpperCase()}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 30)" }}>Max 80 pizzas per hour</p>
          </div>
          <div className="divide-y" style={{ borderColor: "oklch(0.94 0.010 80)" }}>
            {Array.from({ length: 12 }, (_, i) => i + 10).map((hour) => {
              const data = capacityByHour[hour] ?? { pizzas: 0, orders: 0 };
              const slotData = slotsData?.slots.find((s) => {
                const slotDate = new Date(s.slotMs);
                const slotHour = parseInt(slotDate.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }));
                return slotHour === hour;
              });
              const pct = data.pizzas / 80;
              return (
                <div key={hour} className="px-4 py-3 flex items-center gap-4" style={{ background: pct >= 1 ? getCapacityBg(pct) : "white" }}>
                  <div className="w-20 shrink-0">
                    <span className="text-xs font-semibold" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                      {formatHourLabel(hour)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <CapacityBar pizzasBooked={data.pizzas} capacity={80} />
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <span className="text-xs" style={{ color: "oklch(0.50 0.04 30)" }}>
                      {data.orders} order{data.orders !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {pct >= 1 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.55 0.20 25)", color: "white", fontFamily: "'Oswald', sans-serif" }}>FULL</span>
                  )}
                  {pct >= 0.75 && pct < 1 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "oklch(0.55 0.18 55)", color: "white", fontFamily: "'Oswald', sans-serif" }}>ALMOST</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {!isLoading && viewMode === "list" && (
        <>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-lg border" style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}>
              <Calendar size={28} style={{ color: "oklch(0.75 0.015 80)" }} />
              <p className="text-sm" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                No scheduled orders for this day.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <ScheduledOrderCard key={order.id} order={order as ScheduledOrder} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Clover POS Tab ────────────────────────────────────────────────────────────

function CloverOrdersTab() {
  const { data: orders, isLoading, error, refetch, isFetching } = trpc.clover.listOrders.useQuery(
    { limit: 50 },
    { refetchInterval: 30_000 }
  );

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total ?? 0), 0) ?? 0;
  const openCount = orders?.filter((o) => o.state?.toLowerCase() === "open").length ?? 0;
  const paidCount = orders?.filter((o) => o.state?.toLowerCase() === "paid").length ?? 0;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Orders", value: orders?.length ?? 0, color: "oklch(0.45 0.12 250)" },
          { label: "Open Orders", value: openCount, color: "oklch(0.55 0.12 80)" },
          { label: "Revenue (shown)", value: formatCurrency(totalRevenue), color: "oklch(0.38 0.12 145)" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg p-4 border" style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}>
            <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color, fontFamily: "'Oswald', sans-serif" }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden" style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.98 0.008 80)" }}>
          <h2 className="text-sm font-bold" style={{ color: "oklch(0.30 0.04 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>RECENT ORDERS</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "oklch(0.60 0.03 30)", fontFamily: "'Lato', sans-serif" }}>{paidCount} paid · {openCount} open</span>
            <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-all" style={{ borderColor: "oklch(0.88 0.015 80)", color: "oklch(0.45 0.04 30)" }}>
              <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={22} className="animate-spin" style={{ color: "var(--napoli-red, #c0392b)" }} />
            <span className="ml-2 text-sm" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>Loading orders from Clover…</span>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <AlertCircle size={28} style={{ color: "var(--napoli-red, #c0392b)" }} />
            <p className="text-sm font-semibold" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>Could not load orders</p>
            <p className="text-xs text-center max-w-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>{error.message}</p>
          </div>
        )}
        {!isLoading && !error && orders?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <ShoppingBag size={28} style={{ color: "oklch(0.75 0.015 80)" }} />
            <p className="text-sm" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>No orders yet.</p>
          </div>
        )}
        {!isLoading && !error && orders && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(0.92 0.012 80)" }}>
                  {["Order ID", "Customer", "Type", "Items", "Total", "Status", "Time", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold" style={{ color: "oklch(0.50 0.04 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CloverOrderRows orders={orders} />
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-center text-xs" style={{ color: "oklch(0.65 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
        Showing up to 50 most recent orders · Data sourced from Clover POS API
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOrders() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"scheduled" | "clover">("scheduled");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/");
      toast.error("Access denied — admin only.");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.97 0.012 80)" }}>
        <RefreshCw size={24} className="animate-spin" style={{ color: "var(--napoli-red, #c0392b)" }} />
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.97 0.012 80)" }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between flex-wrap gap-3" style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: "var(--napoli-red, #c0392b)" }}>
            <ShoppingBag size={18} color="white" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "oklch(0.22 0.04 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em" }}>ORDERS PANEL</h1>
            <p className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>Napoli Pizzeria · Admin Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/settings">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95" style={{ background: "oklch(0.96 0.04 250)", color: "oklch(0.28 0.10 250)", border: "1px solid oklch(0.70 0.15 250)", fontFamily: "'Oswald', sans-serif" }}>
              <Settings size={13} />Settings
            </button>
          </Link>
          <Link href="/admin/doordash-test">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95" style={{ background: "oklch(0.96 0.04 145)", color: "oklch(0.28 0.10 145)", border: "1px solid oklch(0.70 0.15 145)", fontFamily: "'Oswald', sans-serif" }}>
              <Truck size={13} />DD Test
            </button>
          </Link>
          <a href={`https://www.clover.com/r/${496603379884}/orders`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95" style={{ background: "var(--napoli-red, #c0392b)", color: "white", fontFamily: "'Oswald', sans-serif" }}>
            <ExternalLink size={13} />Clover
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-6" style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}>
        <div className="flex gap-0">
          {([
            { key: "scheduled", label: "Scheduled Orders", icon: <Calendar size={14} /> },
            { key: "clover", label: "Clover POS", icon: <ShoppingBag size={14} /> },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors"
              style={{
                borderBottomColor: activeTab === tab.key ? "var(--napoli-red, #c0392b)" : "transparent",
                color: activeTab === tab.key ? "var(--napoli-red, #c0392b)" : "oklch(0.55 0.03 30)",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.03em",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "scheduled" ? <ScheduledOrdersTab /> : <CloverOrdersTab />}
      </div>
    </div>
  );
}
