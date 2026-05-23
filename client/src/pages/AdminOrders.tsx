/**
 * Admin Orders Panel — /admin/orders
 *
 * Displays all recent Clover POS orders in real time.
 * Accessible only to users with role=admin.
 * Polls every 30 seconds for new orders.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
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
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

type OrderState = string;

function StateChip({ state }: { state: OrderState }) {
  const map: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
    open: {
      label: "Open",
      icon: <Clock size={12} />,
      bg: "oklch(0.97 0.05 80)",
      text: "oklch(0.55 0.12 80)",
    },
    paid: {
      label: "Paid",
      icon: <CheckCircle2 size={12} />,
      bg: "oklch(0.96 0.06 145)",
      text: "oklch(0.38 0.12 145)",
    },
    locked: {
      label: "Locked",
      icon: <AlertCircle size={12} />,
      bg: "oklch(0.96 0.05 250)",
      text: "oklch(0.45 0.12 250)",
    },
    voided: {
      label: "Voided",
      icon: <XCircle size={12} />,
      bg: "oklch(0.97 0.04 30)",
      text: "oklch(0.55 0.10 30)",
    },
    refunded: {
      label: "Refunded",
      icon: <XCircle size={12} />,
      bg: "oklch(0.97 0.04 30)",
      text: "oklch(0.55 0.10 30)",
    },
  };

  const cfg = map[state?.toLowerCase()] ?? {
    label: state ?? "Unknown",
    icon: <AlertCircle size={12} />,
    bg: "oklch(0.95 0.02 30)",
    text: "oklch(0.50 0.04 30)",
  };

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.text, fontFamily: "'Oswald', sans-serif" }}
    >
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
  const labels = {
    delivery: "Delivery",
    "dine-in": "Dine-In",
    pickup: "Pick-Up",
    unknown: "Online",
  };
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: "oklch(0.45 0.04 30)", fontFamily: "'Lato', sans-serif" }}>
      {icons[type]}
      {labels[type]}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOrders() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/");
      toast.error("Access denied — admin only.");
    }
  }, [user, authLoading, navigate]);

  const {
    data: orders,
    isLoading,
    error,
    refetch,
    isFetching,
  } = trpc.clover.listOrders.useQuery(
    { limit: 50 },
    {
      enabled: !!user && user.role === "admin",
      refetchInterval: 30_000, // poll every 30 s
    }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.97 0.012 80)" }}>
        <RefreshCw size={24} className="animate-spin" style={{ color: "var(--napoli-red, #c0392b)" }} />
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total ?? 0), 0) ?? 0;
  const openCount = orders?.filter((o) => o.state?.toLowerCase() === "open").length ?? 0;
  const paidCount = orders?.filter((o) => o.state?.toLowerCase() === "paid").length ?? 0;

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.97 0.012 80)" }}>
      {/* ── Header ── */}
      <div
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded flex items-center justify-center"
            style={{ background: "var(--napoli-red, #c0392b)" }}
          >
            <ShoppingBag size={18} color="white" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "oklch(0.22 0.04 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em" }}>
              ORDERS PANEL
            </h1>
            <p className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
              Napoli Pizzeria · Clover POS Live Feed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "oklch(0.60 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
            Auto-refreshes every 30s
          </span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95"
            style={{ background: "oklch(0.96 0.012 80)", color: "oklch(0.35 0.04 30)", border: "1px solid oklch(0.88 0.015 80)", fontFamily: "'Oswald', sans-serif" }}
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link href="/admin/settings">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95"
              style={{ background: "oklch(0.96 0.04 250)", color: "oklch(0.28 0.10 250)", border: "1px solid oklch(0.70 0.15 250)", fontFamily: "'Oswald', sans-serif" }}
            >
              <Settings size={13} />
              Settings
            </button>
          </Link>
          <Link href="/admin/doordash-test">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95"
              style={{ background: "oklch(0.96 0.04 145)", color: "oklch(0.28 0.10 145)", border: "1px solid oklch(0.70 0.15 145)", fontFamily: "'Oswald', sans-serif" }}
            >
              <Truck size={13} />
              DD Test Delivery
            </button>
          </Link>
          <a
            href={`https://www.clover.com/r/${496603379884}/orders`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95"
            style={{ background: "var(--napoli-red, #c0392b)", color: "white", fontFamily: "'Oswald', sans-serif" }}
          >
            <ExternalLink size={13} />
            Clover Dashboard
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Orders", value: orders?.length ?? 0, color: "oklch(0.45 0.12 250)" },
            { label: "Open Orders", value: openCount, color: "oklch(0.55 0.12 80)" },
            { label: "Revenue (shown)", value: formatCurrency(totalRevenue), color: "oklch(0.38 0.12 145)" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-4 border"
              style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
            >
              <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                {stat.label}
              </p>
              <p className="text-2xl font-bold" style={{ color: stat.color, fontFamily: "'Oswald', sans-serif" }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Orders Table ── */}
        <div className="rounded-lg border overflow-hidden" style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}>
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.98 0.008 80)" }}
          >
            <h2 className="text-sm font-bold" style={{ color: "oklch(0.30 0.04 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
              RECENT ORDERS
            </h2>
            <span className="text-xs" style={{ color: "oklch(0.60 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
              {paidCount} paid · {openCount} open
            </span>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={22} className="animate-spin" style={{ color: "var(--napoli-red, #c0392b)" }} />
              <span className="ml-2 text-sm" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                Loading orders from Clover…
              </span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <AlertCircle size={28} style={{ color: "var(--napoli-red, #c0392b)" }} />
              <p className="text-sm font-semibold" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                Could not load orders
              </p>
              <p className="text-xs text-center max-w-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                {error.message}
              </p>
            </div>
          )}

          {!isLoading && !error && orders?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <ShoppingBag size={28} style={{ color: "oklch(0.75 0.015 80)" }} />
              <p className="text-sm" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                No orders yet. They'll appear here as they come in.
              </p>
            </div>
          )}

          {!isLoading && !error && orders && orders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid oklch(0.92 0.012 80)" }}>
                    {["Order ID", "Customer", "Type", "Items", "Total", "Status", "Time", ""].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-bold"
                        style={{ color: "oklch(0.50 0.04 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => {
                    const customer = parseCustomerName(order.note);
                    const type = parseOrderType(order.note);
                    return (
                      <tr
                        key={order.cloverOrderId}
                        className="transition-colors hover:bg-[oklch(0.98_0.008_80)]"
                        style={{
                          borderBottom: idx < orders.length - 1 ? "1px solid oklch(0.94 0.010 80)" : "none",
                        }}
                      >
                        <td className="px-4 py-3">
                          <span
                            className="font-mono text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "oklch(0.95 0.012 80)", color: "oklch(0.40 0.04 30)" }}
                          >
                            {order.cloverOrderId.slice(0, 10)}…
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium" style={{ color: "oklch(0.30 0.04 30)", fontFamily: "'Lato', sans-serif" }}>
                            {customer}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <OrderTypeIcon type={type} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: "oklch(0.50 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                            {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold" style={{ color: "var(--napoli-red, #c0392b)", fontFamily: "'Oswald', sans-serif" }}>
                            {formatCurrency(order.total ?? 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StateChip state={order.state} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                            {formatTime(order.createdTime)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`https://www.clover.com/r/${496603379884}/orders/${order.cloverOrderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
                            style={{ color: "oklch(0.45 0.12 250)", fontFamily: "'Lato', sans-serif" }}
                          >
                            <ExternalLink size={12} />
                            View
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "oklch(0.65 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
          Showing up to 50 most recent orders · Data sourced from Clover POS API
        </p>
      </div>
    </div>
  );
}
