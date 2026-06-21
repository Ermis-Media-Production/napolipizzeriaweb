/**
 * AdminLiveOrders — /admin/live
 *
 * Real-time Manager Portal synced with Clover POS.
 * Auto-refreshes every 15 seconds to show:
 *   - Today's stats (revenue, orders, avg ticket)
 *   - Live order board (open + paid orders)
 *   - Delivery tracking panel
 */

import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Truck,
  Package,
  UtensilsCrossed,
  ShoppingBag,
  DollarSign,
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  ExternalLink,
  MapPin,
  Phone,
  Car,
  XCircle,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function getStateColor(state: string): { bg: string; text: string; dot: string } {
  switch (state) {
    case "open":
      return { bg: "oklch(0.96 0.05 250)", text: "oklch(0.35 0.12 250)", dot: "oklch(0.45 0.15 250)" };
    case "paid":
      return { bg: "oklch(0.96 0.06 145)", text: "oklch(0.35 0.12 145)", dot: "oklch(0.38 0.12 145)" };
    case "locked":
      return { bg: "oklch(0.97 0.05 80)", text: "oklch(0.45 0.12 80)", dot: "oklch(0.55 0.15 80)" };
    default:
      return { bg: "oklch(0.95 0.02 30)", text: "oklch(0.50 0.04 30)", dot: "oklch(0.60 0.03 30)" };
  }
}

function getOrderTypeIcon(type: string) {
  switch (type) {
    case "delivery":
      return <Truck size={13} style={{ color: "var(--napoli-red, #c0392b)" }} />;
    case "dine-in":
      return <UtensilsCrossed size={13} style={{ color: "oklch(0.38 0.12 145)" }} />;
    case "pickup":
      return <Package size={13} style={{ color: "oklch(0.45 0.12 250)" }} />;
    default:
      return <ShoppingBag size={13} style={{ color: "oklch(0.55 0.04 30)" }} />;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type LiveOrder = {
  cloverOrderId: string;
  state: string;
  total: number;
  currency: string;
  note?: string | null;
  createdTime: number;
  orderType: string;
  customerName: string | null;
  customerPhone: string | null;
  itemCount: number;
  lineItems: Array<{
    id: string;
    name: string;
    price: number;
    note?: string | null;
    modifications: Array<{ name: string; amount: number }>;
  }>;
};

// ── Order Card ────────────────────────────────────────────────────────────────

function LiveOrderCard({ order }: { order: LiveOrder }) {
  const [expanded, setExpanded] = useState(false);
  const { bg, text, dot } = getStateColor(order.state);

  const isNew = Date.now() - order.createdTime < 5 * 60 * 1000; // < 5 min

  return (
    <div
      className="border rounded-lg overflow-hidden transition-all"
      style={{
        borderColor: isNew ? "oklch(0.65 0.15 25)" : "oklch(0.88 0.015 80)",
        boxShadow: isNew ? "0 0 0 2px oklch(0.65 0.15 25 / 0.2)" : "none",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ background: "white" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* State dot */}
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: dot }}
          />
          {/* Order ID */}
          <span
            className="font-mono text-xs font-bold shrink-0"
            style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Oswald', sans-serif" }}
          >
            #{order.cloverOrderId.slice(-6).toUpperCase()}
          </span>
          {/* State badge */}
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
            style={{ background: bg, color: text, fontFamily: "'Oswald', sans-serif" }}
          >
            {order.state.toUpperCase()}
          </span>
          {/* Order type */}
          <span className="inline-flex items-center gap-1 text-xs shrink-0" style={{ color: "oklch(0.50 0.04 30)" }}>
            {getOrderTypeIcon(order.orderType)}
            <span className="capitalize hidden sm:inline">{order.orderType}</span>
          </span>
          {/* NEW badge */}
          {isNew && (
            <span
              className="text-xs px-1.5 py-0.5 rounded font-bold animate-pulse shrink-0"
              style={{ background: "oklch(0.65 0.15 25)", color: "white", fontFamily: "'Oswald', sans-serif" }}
            >
              NEW
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs" style={{ color: "oklch(0.55 0.03 30)" }}>
              {formatTime(order.createdTime)}
            </p>
            <p className="text-xs font-medium" style={{ color: "oklch(0.35 0.04 30)" }}>
              {order.customerName ?? "—"}
            </p>
          </div>
          <span
            className="text-sm font-bold"
            style={{ color: "var(--napoli-red, #c0392b)", fontFamily: "'Oswald', sans-serif" }}
          >
            {formatMoney(order.total)}
          </span>
          <span className="text-xs" style={{ color: "oklch(0.65 0.03 30)" }}>
            {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
          </span>
          {expanded ? (
            <ChevronUp size={14} style={{ color: "oklch(0.55 0.03 30)" }} />
          ) : (
            <ChevronDown size={14} style={{ color: "oklch(0.55 0.03 30)" }} />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-0 border-t"
          style={{ borderColor: "oklch(0.92 0.012 80)", background: "oklch(0.99 0.005 80)" }}
        >
          <div className="pt-3 space-y-3">
            {/* Customer + time */}
            <div className="flex flex-wrap gap-4 text-xs" style={{ color: "oklch(0.45 0.03 30)" }}>
              <span>
                <strong>Customer:</strong> {order.customerName ?? "—"}
              </span>
              {order.customerPhone && (
                <a
                  href={`tel:${order.customerPhone}`}
                  className="hover:underline"
                  style={{ color: "oklch(0.45 0.12 250)" }}
                >
                  {order.customerPhone}
                </a>
              )}
              <span>
                <strong>Time:</strong> {formatTime(order.createdTime)} ({formatTimeAgo(order.createdTime)})
              </span>
              <span>
                <strong>Clover ID:</strong>{" "}
                <a
                  href={`https://www.clover.com/home/m/${import.meta.env.VITE_CLOVER_MERCHANT_ID ?? "MRWSQWMCDSHQ1"}/orders/${order.cloverOrderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono hover:underline inline-flex items-center gap-0.5"
                  style={{ color: "oklch(0.45 0.12 250)" }}
                >
                  {order.cloverOrderId}
                  <ExternalLink size={10} />
                </a>
              </span>
            </div>

            {/* Note */}
            {order.note && (
              <div
                className="text-xs p-2 rounded"
                style={{ background: "oklch(0.97 0.04 80)", color: "oklch(0.35 0.06 80)" }}
              >
                <strong>Note: </strong>
                {order.note}
              </div>
            )}

            {/* Line items */}
            <div className="space-y-1">
              <p
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}
              >
                Items
              </p>
              {order.lineItems.map((li) => (
                <div key={li.id} className="text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>
                  <div className="flex justify-between">
                    <span className="font-medium">{li.name}</span>
                    <span style={{ color: "oklch(0.50 0.04 30)" }}>
                      {li.price > 0 ? formatMoney(li.price) : "—"}
                    </span>
                  </div>
                  {li.note && (
                    <p className="ml-2 text-xs italic" style={{ color: "oklch(0.55 0.06 80)" }}>
                      {li.note}
                    </p>
                  )}
                  {li.modifications.map((m, i) => (
                    <p key={i} className="ml-2 text-xs" style={{ color: "oklch(0.55 0.04 30)" }}>
                      + {m.name}
                      {m.amount > 0 ? ` (${formatMoney(m.amount)})` : ""}
                    </p>
                  ))}
                </div>
              ))}
            </div>

            {/* Total */}
            <div
              className="flex justify-between text-sm font-bold pt-2 border-t"
              style={{ borderColor: "oklch(0.90 0.012 80)", color: "oklch(0.25 0.04 30)" }}
            >
              <span>Total</span>
              <span style={{ color: "var(--napoli-red, #c0392b)" }}>{formatMoney(order.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stats Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="rounded-lg p-4 border flex items-center gap-3"
      style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}20` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
          {label}
        </p>
        <p
          className="text-xl font-bold leading-tight"
          style={{ color, fontFamily: "'Oswald', sans-serif" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Delivery Status Badge ─────────────────────────────────────────────────────

function DeliveryStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let bg = "oklch(0.95 0.02 30)";
  let text = "oklch(0.50 0.04 30)";
  let label = status;

  if (s.includes("created") || s === "pending") { bg = "oklch(0.96 0.05 250)"; text = "oklch(0.35 0.12 250)"; label = "Pending"; }
  else if (s.includes("pickup") || s.includes("enroute_pickup")) { bg = "oklch(0.97 0.05 80)"; text = "oklch(0.45 0.12 80)"; label = "Heading to pickup"; }
  else if (s.includes("picked_up") || s.includes("enroute_dropoff")) { bg = "oklch(0.97 0.05 80)"; text = "oklch(0.45 0.12 80)"; label = "On the way"; }
  else if (s.includes("delivered") || s.includes("complete")) { bg = "oklch(0.96 0.06 145)"; text = "oklch(0.35 0.12 145)"; label = "Delivered"; }
  else if (s.includes("cancel")) { bg = "oklch(0.97 0.04 25)"; text = "oklch(0.45 0.12 25)"; label = "Cancelled"; }
  else if (s.includes("return")) { bg = "oklch(0.97 0.04 25)"; text = "oklch(0.45 0.12 25)"; label = "Returning"; }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: bg, color: text, fontFamily: "'Oswald', sans-serif" }}
    >
      {label}
    </span>
  );
}

// ── Delivery Tracking Panel ────────────────────────────────────────────────────

function DeliveryTrackingPanel() {
  const { data: deliveries, isLoading, refetch } = trpc.deliveryTracking.getActiveDeliveries.useQuery(
    undefined,
    { refetchInterval: 30_000 }
  );

  const refreshStatus = trpc.deliveryTracking.refreshDeliveryStatus.useMutation({
    onSuccess: (data, vars) => {
      toast.success(`Status updated: ${data.status}`);
      refetch();
    },
    onError: (err) => toast.error("Failed to refresh: " + err.message),
  });

  const cancelDelivery = trpc.deliveryTracking.cancelDelivery.useMutation({
    onSuccess: () => {
      toast.success("Delivery cancelled.");
      refetch();
    },
    onError: (err) => toast.error("Failed to cancel: " + err.message),
  });

  const activeDeliveries = (deliveries ?? []).filter(
    (d) => d.deliveryStatus && !d.deliveryStatus.toLowerCase().includes("cancel") && !d.deliveryStatus.toLowerCase().includes("delivered") && !d.deliveryStatus.toLowerCase().includes("complete")
  );
  const completedDeliveries = (deliveries ?? []).filter(
    (d) => d.deliveryStatus && (d.deliveryStatus.toLowerCase().includes("delivered") || d.deliveryStatus.toLowerCase().includes("complete") || d.deliveryStatus.toLowerCase().includes("cancel"))
  );

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.98 0.008 80)" }}
      >
        <div className="flex items-center gap-3">
          <Truck size={16} style={{ color: "var(--napoli-red, #c0392b)" }} />
          <div>
            <h2 className="text-sm font-bold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
              DELIVERY TRACKING
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
              Active DoorDash & Uber Direct deliveries — auto-refreshes every 30s
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95 disabled:opacity-60"
          style={{ background: "oklch(0.20 0.04 30)", color: "white", fontFamily: "'Oswald', sans-serif" }}
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex items-center gap-2 py-6">
            <RefreshCw size={16} className="animate-spin" style={{ color: "var(--napoli-red, #c0392b)" }} />
            <span className="text-sm" style={{ color: "oklch(0.55 0.03 30)" }}>Loading deliveries…</span>
          </div>
        ) : (deliveries ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Truck size={28} style={{ color: "oklch(0.75 0.015 80)" }} />
            <p className="text-sm" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
              No deliveries dispatched yet today.
            </p>
            <p className="text-xs" style={{ color: "oklch(0.65 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
              Deliveries appear here once a courier is dispatched from the order page.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active deliveries */}
            {activeDeliveries.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: "oklch(0.45 0.04 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em" }}>
                  ACTIVE ({activeDeliveries.length})
                </p>
                <div className="space-y-3">
                  {activeDeliveries.map((d) => (
                    <div
                      key={d.orderRef}
                      className="rounded-lg border p-4"
                      style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.99 0.005 80)" }}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                              {d.orderRef}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{
                                background: d.deliveryProvider === "doordash" ? "oklch(0.97 0.04 25)" : "oklch(0.97 0.05 250)",
                                color: d.deliveryProvider === "doordash" ? "oklch(0.45 0.12 25)" : "oklch(0.35 0.12 250)",
                                fontFamily: "'Oswald', sans-serif",
                              }}
                            >
                              {d.deliveryProvider === "doordash" ? "DoorDash" : "Uber"}
                            </span>
                            {d.deliveryStatus && <DeliveryStatusBadge status={d.deliveryStatus} />}
                          </div>
                          <p className="text-sm font-semibold" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Lato', sans-serif" }}>
                            {d.customerName}
                          </p>
                          {d.deliveryAddress && (
                            <div className="flex items-start gap-1.5">
                              <MapPin size={12} className="shrink-0 mt-0.5" style={{ color: "oklch(0.55 0.03 30)" }} />
                              <p className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                                {d.deliveryAddress}
                              </p>
                            </div>
                          )}
                          {d.customerPhone && (
                            <div className="flex items-center gap-1.5">
                              <Phone size={12} style={{ color: "oklch(0.55 0.03 30)" }} />
                              <a
                                href={`tel:${d.customerPhone}`}
                                className="text-xs underline"
                                style={{ color: "var(--napoli-red, #c0392b)", fontFamily: "'Lato', sans-serif" }}
                              >
                                {d.customerPhone}
                              </a>
                            </div>
                          )}
                          <p className="text-xs" style={{ color: "oklch(0.60 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                            Total: <strong>${d.total}</strong> · {new Date(d.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Los_Angeles" })}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 shrink-0">
                          {d.deliveryTrackingUrl && (
                            <a
                              href={d.deliveryTrackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all active:scale-95"
                              style={{ background: "oklch(0.96 0.06 145)", color: "oklch(0.30 0.12 145)", border: "1px solid oklch(0.70 0.15 145)", fontFamily: "'Oswald', sans-serif" }}
                            >
                              <Navigation size={12} /> Track
                            </a>
                          )}
                          <button
                            onClick={() => refreshStatus.mutate({
                              orderRef: d.orderRef,
                              provider: d.deliveryProvider as "doordash" | "uber",
                              externalId: d.deliveryExternalId!,
                            })}
                            disabled={refreshStatus.isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
                            style={{ background: "oklch(0.96 0.05 250)", color: "oklch(0.35 0.12 250)", border: "1px solid oklch(0.78 0.10 250)", fontFamily: "'Oswald', sans-serif" }}
                          >
                            <RefreshCw size={12} className={refreshStatus.isPending ? "animate-spin" : ""} /> Refresh
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm(`Cancel delivery for ${d.orderRef}?`)) return;
                              cancelDelivery.mutate({
                                provider: d.deliveryProvider as "doordash" | "uber",
                                externalId: d.deliveryExternalId!,
                                orderRef: d.orderRef,
                              });
                            }}
                            disabled={cancelDelivery.isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
                            style={{ background: "oklch(0.97 0.04 25)", color: "oklch(0.45 0.12 25)", border: "1px solid oklch(0.88 0.12 25)", fontFamily: "'Oswald', sans-serif" }}
                          >
                            <XCircle size={12} /> Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed deliveries */}
            {completedDeliveries.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em" }}>
                  COMPLETED / CANCELLED ({completedDeliveries.length})
                </p>
                <div className="space-y-2">
                  {completedDeliveries.map((d) => (
                    <div
                      key={d.orderRef}
                      className="rounded-lg border p-3 flex items-center justify-between gap-3"
                      style={{ borderColor: "oklch(0.90 0.012 80)", background: "oklch(0.98 0.005 80)", opacity: 0.75 }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold" style={{ color: "oklch(0.45 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>{d.orderRef}</span>
                        <span className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>{d.customerName}</span>
                        {d.deliveryStatus && <DeliveryStatusBadge status={d.deliveryStatus} />}
                      </div>
                      {d.deliveryTrackingUrl && (
                        <a
                          href={d.deliveryTrackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-xs flex items-center gap-1"
                          style={{ color: "oklch(0.45 0.12 250)", fontFamily: "'Lato', sans-serif" }}
                        >
                          <ExternalLink size={11} /> View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function LiveOrdersContent() {
  const [filter, setFilter] = useState<"all" | "open" | "paid">("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState(true);

  const {
    data: orders,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = trpc.clover.liveOrders.useQuery(
    { filter },
    {
      refetchInterval: 15_000, // 15 seconds
      retry: 2,
    }
  );

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = trpc.clover.todayStats.useQuery(undefined, {
    refetchInterval: 30_000, // 30 seconds
  });

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update last refresh time when data changes
  useEffect(() => {
    if (orders) setLastRefresh(new Date());
  }, [orders]);

  const handleManualRefresh = useCallback(async () => {
    await Promise.all([refetchOrders(), refetchStats()]);
    toast.success("Orders refreshed");
  }, [refetchOrders, refetchStats]);

  const openCount = orders?.filter((o) => o.state !== "paid").length ?? 0;
  const paidCount = orders?.filter((o) => o.state === "paid").length ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "oklch(0.20 0.04 30)", fontFamily: "'Oswald', sans-serif" }}
          >
            LIVE ORDERS
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
            Clover POS — synced every 15 seconds
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Online indicator */}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: isOnline ? "oklch(0.38 0.12 145)" : "oklch(0.55 0.12 25)" }}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline ? "Live" : "Offline"}</span>
          </div>
          {/* Last refresh */}
          <span className="text-xs" style={{ color: "oklch(0.65 0.03 30)" }}>
            Updated {formatTimeAgo(lastRefresh.getTime())}
          </span>
          {/* Manual refresh */}
          <button
            onClick={handleManualRefresh}
            disabled={ordersLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: "oklch(0.20 0.04 30)",
              color: "white",
              fontFamily: "'Oswald', sans-serif",
            }}
          >
            <RefreshCw size={13} className={ordersLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Today's Revenue"
          value={statsLoading ? "—" : `$${stats?.totalRevenueDollars ?? "0.00"}`}
          icon={<DollarSign size={18} />}
          color="oklch(0.38 0.12 145)"
        />
        <StatCard
          label="Total Orders"
          value={statsLoading ? "—" : stats?.orderCount ?? 0}
          icon={<ClipboardList size={18} />}
          color="oklch(0.45 0.12 250)"
        />
        <StatCard
          label="Open Orders"
          value={statsLoading ? "—" : stats?.openCount ?? 0}
          icon={<Clock size={18} />}
          color="oklch(0.55 0.15 25)"
        />
        <StatCard
          label="Avg Ticket"
          value={statsLoading ? "—" : `$${stats?.avgTicketDollars ?? "0.00"}`}
          icon={<TrendingUp size={18} />}
          color="oklch(0.45 0.12 80)"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["all", "open", "paid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
            style={{
              background: filter === f ? "oklch(0.20 0.04 30)" : "white",
              color: filter === f ? "white" : "oklch(0.45 0.04 30)",
              border: "1px solid",
              borderColor: filter === f ? "oklch(0.20 0.04 30)" : "oklch(0.88 0.015 80)",
              fontFamily: "'Oswald', sans-serif",
            }}
          >
            {f === "all" ? `ALL (${(orders?.length ?? 0)})` : f === "open" ? `OPEN (${openCount})` : `PAID (${paidCount})`}
          </button>
        ))}
      </div>

      {/* Error state */}
      {ordersError && (
        <div
          className="rounded-lg p-4 border text-sm"
          style={{ background: "oklch(0.97 0.04 25)", borderColor: "oklch(0.88 0.12 25)", color: "oklch(0.45 0.12 25)" }}
        >
          <strong>Error loading orders:</strong> {ordersError.message}. Check Clover API token.
        </div>
      )}

      {/* Loading */}
      {ordersLoading && !orders && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={22} className="animate-spin" style={{ color: "var(--napoli-red, #c0392b)" }} />
          <span className="ml-2 text-sm" style={{ color: "oklch(0.55 0.03 30)" }}>
            Loading live orders…
          </span>
        </div>
      )}

      {/* Delivery Tracking Panel */}
      <DeliveryTrackingPanel />

      {/* Orders board */}
      {!ordersLoading || orders ? (
        <>
          {orders && orders.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-2 rounded-lg border"
              style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
            >
              <CheckCircle2 size={28} style={{ color: "oklch(0.75 0.015 80)" }} />
              <p className="text-sm" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                No orders found for today.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {(orders ?? []).map((order) => (
                <LiveOrderCard key={order.cloverOrderId} order={order} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminLiveOrders() {
  return (
    <AdminLayout>
      <LiveOrdersContent />
    </AdminLayout>
  );
}
