/**
 * Admin Orders Panel — /admin/orders
 *
 * Two tabs:
 *   1. Clover POS — live feed from Clover API (existing)
 *   2. Scheduled Orders — orders placed via the website with capacity view
 *
 * Accessible only to users with role=admin.
 */
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Link } from "wouter";
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

// ── Constants ────────────────────────────────────────────────────────────────

// (Clover removed — using Stripe only)
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
  cloverOrderId?: string | null;
  refundedAmount: string;
  specialInstructions?: string | null;
};

function ScheduledOrderCard({ order, onStatusChange }: { order: ScheduledOrder; onStatusChange: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { bg, text } = getStatusColor(order.status);
  const refunded = parseFloat(order.refundedAmount);
  const total = parseFloat(order.total);

  const markReadyMutation = trpc.orders.markOrderReady.useMutation({
    onSuccess: () => {
      toast.success(`Order ${order.orderRef} marked as Ready — SMS sent to customer`);
      onStatusChange();
    },
    onError: (err) => {
      toast.error(`Failed to mark ready: ${err.message}`);
    },
  });

  const handleMarkReady = (e: React.MouseEvent) => {
    e.stopPropagation();
    markReadyMutation.mutate({
      orderRef: order.orderRef,
      readyType: order.orderType as "pickup" | "delivery" | "dine-in",
    });
  };

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

            {/* Actions row */}
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-1">
              {/* Mark Ready button — only for confirmed/preparing orders */}
              {(order.status === "confirmed" || order.status === "preparing") && (
                <button
                  onClick={handleMarkReady}
                  disabled={markReadyMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95 disabled:opacity-60"
                  style={{
                    background: "oklch(0.38 0.12 145)",
                    color: "white",
                    fontFamily: "'Oswald', sans-serif",
                  }}
                >
                  <CheckCircle2 size={13} />
                  {markReadyMutation.isPending ? "Sending…" : order.orderType === "delivery" ? "Mark Out for Delivery" : "Mark Ready for Pickup"}
                </button>
              )}

              {/* Link to customer order page */}
              <a
                href={`/my-order/${order.orderRef}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs hover:underline"
                style={{ color: "oklch(0.45 0.12 250)" }}
              >
                <ExternalLink size={12} />
                Customer order page
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
                <ScheduledOrderCard key={order.id} order={order as ScheduledOrder} onStatusChange={refetch} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOrders() {
  // Stripe-only orders panel — Clover removed
  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">Track and manage all incoming orders paid via Stripe.</p>
          </div>
        </div>

        {/* Orders content */}
        <ScheduledOrdersTab />
      </div>
    </AdminLayout>
  );
}
