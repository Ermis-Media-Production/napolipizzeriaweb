/**
 * My Order page — /my-order/:orderRef
 * Lets customers view their scheduled order, cancel individual items,
 * or cancel the entire order (subject to 1-hour cutoff policy).
 */

import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Package,
  AlertCircle,
  Loader2,
  XCircle,
  ArrowLeft,
  RefreshCw,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case "confirmed": return "bg-blue-100 text-blue-800 border-blue-200";
    case "preparing": return "bg-amber-100 text-amber-800 border-amber-200";
    case "ready":     return "bg-green-100 text-green-800 border-green-200";
    case "completed": return "bg-gray-100 text-gray-800 border-gray-200";
    case "cancelled": return "bg-red-100 text-red-800 border-red-200";
    default:          return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "confirmed": return "Confirmed";
    case "preparing": return "Preparing";
    case "ready":     return "Ready for Pickup";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default:          return status;
  }
}

function canCancelOrder(scheduledAt: number, isAsap: boolean, status: string): boolean {
  if (status === "cancelled" || status === "completed") return false;
  if (isAsap) return true; // ASAP orders can always be cancelled
  const timeUntil = scheduledAt - Date.now();
  return timeUntil > 60 * 60 * 1000; // more than 1 hour away
}

function minutesUntilCutoff(scheduledAt: number): number {
  const timeUntil = scheduledAt - Date.now();
  const cutoff = 60 * 60 * 1000;
  return Math.floor((timeUntil - cutoff) / 60_000);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MyOrder() {
  const { orderRef } = useParams<{ orderRef: string }>();
  const [, navigate] = useLocation();
  const [cancellingItemId, setCancellingItemId] = useState<number | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [confirmCancelOrder, setConfirmCancelOrder] = useState(false);

  const { data: order, isLoading, error, refetch } = trpc.orders.getOrder.useQuery(
    { orderRef: orderRef ?? "" },
    { enabled: !!orderRef, refetchInterval: 30_000 }
  );

  const cancelItemMutation = trpc.orderRefunds.cancelItem.useMutation({
    onSuccess: (data) => {
      toast.success(`Item cancelled. $${data.refundAmount.toFixed(2)} will be refunded within 3–5 business days.`);
      setCancellingItemId(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setCancellingItemId(null);
    },
  });

  const cancelOrderMutation = trpc.orderRefunds.cancelOrder.useMutation({
    onSuccess: (data) => {
      toast.success(`Order cancelled. $${data.refundAmount.toFixed(2)} will be refunded within 3–5 business days.`);
      setCancellingOrder(false);
      setConfirmCancelOrder(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setCancellingOrder(false);
      setConfirmCancelOrder(false);
    },
  });

  const handleCancelItem = (itemId: number) => {
    if (!orderRef) return;
    setCancellingItemId(itemId);
    cancelItemMutation.mutate({ orderRef, itemId });
  };

  const handleCancelOrder = () => {
    if (!orderRef) return;
    setCancellingOrder(true);
    cancelOrderMutation.mutate({ orderRef });
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--napoli-cream, #fdf6ec)" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#c41e3a]" />
          <p className="text-sm text-gray-600">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--napoli-cream, #fdf6ec)" }}>
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-800" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Order Not Found
          </h1>
          <p className="text-sm text-gray-600">
            We couldn't find an order with reference <strong>{orderRef}</strong>.
            Please check the link in your confirmation email or call us at{" "}
            <a href="tel:7025448930" className="text-[#c41e3a] underline font-medium">(702) 544-8930</a>.
          </p>
          <Button onClick={() => navigate("/")} variant="outline" className="border-[#c41e3a] text-[#c41e3a]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const canCancel = canCancelOrder(order.scheduledAt, order.isAsap, order.status);
  const minsLeft = !order.isAsap && order.status !== "cancelled" && order.status !== "completed"
    ? minutesUntilCutoff(order.scheduledAt)
    : null;
  const activeItems = order.lineItems.filter((i) => i.status === "active");
  const cancelledItems = order.lineItems.filter((i) => i.status === "cancelled");

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: "var(--napoli-cream, #fdf6ec)" }}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Menu
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Utensils className="w-5 h-5 text-[#c41e3a]" />
                <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  Order {order.orderRef}
                </h1>
              </div>
              <p className="text-sm text-gray-500">
                Placed for {order.customerName}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
              <button
                onClick={() => refetch()}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
          </div>

          {/* Order details */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500">Scheduled for</p>
                <p className="text-sm text-gray-800">
                  {order.isAsap ? "ASAP" : formatDateTime(order.scheduledAt)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500">Order type</p>
                <p className="text-sm text-gray-800 capitalize">{order.orderType}</p>
              </div>
            </div>
            {order.deliveryAddress && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Delivery address</p>
                  <p className="text-sm text-gray-800">{order.deliveryAddress}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500">Contact</p>
                <p className="text-sm text-gray-800">{order.customerPhone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation policy notice */}
        {order.status !== "cancelled" && order.status !== "completed" && (
          <div className={`rounded-lg border p-4 ${canCancel ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start gap-2">
              {canCancel ? (
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              )}
              <div>
                {canCancel ? (
                  <>
                    <p className="text-sm font-semibold text-blue-800">Cancellations accepted</p>
                    {minsLeft !== null && minsLeft > 0 && (
                      <p className="text-xs text-blue-700 mt-0.5">
                        You have <strong>{minsLeft} minutes</strong> left to cancel before the 1-hour cutoff.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-amber-800">Cancellation window has passed</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Your order is within 1 hour of the scheduled time. To make changes, please call us at{" "}
                      <a href="tel:7025448930" className="underline font-medium">(702) 544-8930</a>.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active items */}
        {activeItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
                ORDER ITEMS
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {activeItems.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.quantity}x @ ${parseFloat(String(item.unitPrice)).toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-gray-800">
                      ${parseFloat(String(item.lineTotal)).toFixed(2)}
                    </span>
                    {canCancel && (
                      <button
                        onClick={() => handleCancelItem(item.id)}
                        disabled={cancellingItemId === item.id}
                        className="text-xs px-2.5 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {cancellingItemId === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancelled items */}
        {cancelledItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden opacity-60">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-500" style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
                CANCELLED ITEMS
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {cancelledItems.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-500 line-through">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.quantity}x @ ${parseFloat(String(item.unitPrice)).toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-gray-400 line-through">
                      ${parseFloat(String(item.lineTotal)).toFixed(2)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-500 border border-red-100">
                      Refunded
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order totals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4" style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
            PAYMENT SUMMARY
          </h2>
          <div className="space-y-2">
            {parseFloat(String(order.subtotal)) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-800">${parseFloat(String(order.subtotal)).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(String(order.discountAmount)) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                <span className="text-green-600">−${parseFloat(String(order.discountAmount)).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(String(order.convenienceFee)) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Convenience Fee</span>
                <span className="text-gray-800">+${parseFloat(String(order.convenienceFee)).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(String(order.salesTax)) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sales Tax</span>
                <span className="text-gray-800">+${parseFloat(String(order.salesTax)).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
              <span className="text-gray-800">Total Charged</span>
              <span style={{ color: "var(--napoli-red, #c0392b)" }}>${parseFloat(String(order.total)).toFixed(2)}</span>
            </div>
            {parseFloat(String(order.refundedAmount)) > 0 && (
              <div className="flex justify-between text-sm font-semibold text-green-700 pt-1">
                <span>Total Refunded</span>
                <span>−${parseFloat(String(order.refundedAmount)).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cancel entire order */}
        {canCancel && order.status !== "cancelled" && activeItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
            <h2 className="text-sm font-bold text-gray-800 mb-2" style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
              CANCEL ENTIRE ORDER
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              This will cancel all remaining items and issue a full refund of{" "}
              <strong>
                ${(parseFloat(String(order.total)) - parseFloat(String(order.refundedAmount))).toFixed(2)}
              </strong>{" "}
              to your original payment method within 3–5 business days.
            </p>
            {!confirmCancelOrder ? (
              <button
                onClick={() => setConfirmCancelOrder(true)}
                className="text-sm px-4 py-2 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors font-medium"
              >
                Cancel My Order
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-red-700">Are you sure?</p>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancellingOrder}
                  className="text-sm px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {cancellingOrder && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Yes, Cancel Order
                </button>
                <button
                  onClick={() => setConfirmCancelOrder(false)}
                  className="text-sm px-4 py-2 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Keep Order
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer help */}
        <div className="text-center text-sm text-gray-500 pb-8">
          Questions? Call us at{" "}
          <a href="tel:7025448930" className="text-[#c41e3a] underline font-medium">
            (702) 544-8930
          </a>
        </div>
      </div>
    </div>
  );
}
