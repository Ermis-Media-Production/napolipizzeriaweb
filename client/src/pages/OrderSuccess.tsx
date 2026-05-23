import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { CheckCircle, Phone, MapPin, Clock, ArrowRight, Loader2, Shield, Truck, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";
import { useCart } from "@/contexts/CartContext";
import { RESTAURANT_INFO } from "@/lib/napoliData";
import { toast } from "sonner";

type OrderInfo = {
  method: "stripe" | "authorizenet";
  transactionId?: string;
  customerName?: string;
  amountTotal?: number;
  orderType?: string;
  deliveryId?: string;
  trackingUrl?: string;
};

export default function OrderSuccess() {
  const { clearCart } = useCart();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [authNetOrder, setAuthNetOrder] = useState<OrderInfo | null>(null);

  // Uber Direct dispatch state (for Stripe delivery orders)
  const [uberDeliveryId, setUberDeliveryId] = useState<string | null>(null);
  const [uberTrackingUrl, setUberTrackingUrl] = useState<string | null>(null);
  const [isDispatchingUber, setIsDispatchingUber] = useState(false);
  const uberDispatchedRef = useRef(false); // prevent double-dispatch on re-render

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    const txn = params.get("txn");
    const method = params.get("method");

    if (sid) {
      setSessionId(sid);
      clearCart();
    } else if (txn && method === "authorizenet") {
      clearCart();
      setAuthNetOrder({
        method: "authorizenet",
        transactionId: txn,
        customerName: params.get("name") ?? undefined,
        amountTotal: params.get("total") ? parseFloat(params.get("total")!) : undefined,
        orderType: params.get("type") ?? undefined,
        deliveryId: params.get("delivery_id") ?? undefined,
        trackingUrl: params.get("tracking_url") ? decodeURIComponent(params.get("tracking_url")!) : undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: stripeSession, isLoading } = trpc.stripe.getSession.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const createDelivery = trpc.uber.createDelivery.useMutation();

  // Auto-dispatch Uber Direct when Stripe session loads with delivery data.
  // Uses sessionStorage to prevent re-dispatch on page reload/revisit.
  useEffect(() => {
    if (
      !stripeSession ||
      stripeSession.orderType !== "delivery" ||
      !stripeSession.uberQuoteId ||
      !stripeSession.dropoffAddress ||
      uberDispatchedRef.current
    ) return;

    // Check if we already dispatched for this session (survives re-renders, not reloads)
    const storageKey = `uber_dispatched_${sessionId}`;
    const alreadyDispatched = sessionStorage.getItem(storageKey);
    if (alreadyDispatched) {
      // Restore previously dispatched delivery info
      try {
        const saved = JSON.parse(alreadyDispatched) as { deliveryId: string; trackingUrl: string };
        setUberDeliveryId(saved.deliveryId);
        setUberTrackingUrl(saved.trackingUrl);
      } catch { /* ignore parse errors */ }
      uberDispatchedRef.current = true;
      return;
    }

    uberDispatchedRef.current = true;
    setIsDispatchingUber(true);

    createDelivery.mutate(
      {
        quoteId: stripeSession.uberQuoteId,
        dropoffAddress: stripeSession.dropoffAddress,
        dropoffCity: stripeSession.dropoffCity ?? "North Las Vegas",
        dropoffState: stripeSession.dropoffState ?? "NV",
        dropoffZip: stripeSession.dropoffZip ?? "89032",
        dropoffName: stripeSession.customerName ?? "Customer",
        dropoffPhone: stripeSession.customerPhone ?? "+17025550000",
        dropoffNotes: stripeSession.dropoffNotes ?? undefined,
        // Pass actual cart items from session metadata
        orderItems: (stripeSession.cartItems ?? []).map((i) => ({ name: i.name, quantity: i.quantity })),
        externalId: sessionId ?? undefined,
      },
      {
        onSuccess: (data) => {
          setUberDeliveryId(data.deliveryId);
          setUberTrackingUrl(data.trackingUrl);
          setIsDispatchingUber(false);
          // Persist dispatch result so page reload doesn't re-dispatch
          sessionStorage.setItem(storageKey, JSON.stringify({ deliveryId: data.deliveryId, trackingUrl: data.trackingUrl }));
          toast.success("Delivery dispatched! Track your order in real time.");
        },
        onError: (err) => {
          setIsDispatchingUber(false);
          uberDispatchedRef.current = false; // allow retry on error
          console.error("[Uber Direct] Dispatch failed:", err);
          toast.warning("Payment confirmed! We'll arrange your delivery shortly.");
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripeSession]);

  // Resolve display data from either payment method
  const orderData = stripeSession
    ? {
        method: "stripe" as const,
        transactionId: sessionId ?? "N/A",
        customerName: stripeSession.customerName,
        amountTotal: stripeSession.amountTotal,
        orderType: stripeSession.orderType,
        deliveryId: uberDeliveryId ?? undefined,
        trackingUrl: uberTrackingUrl ?? undefined,
      }
    : authNetOrder;

  const isAuthNet = orderData?.method === "authorizenet";
  const hasDelivery = !!orderData?.trackingUrl;
  const isStripeDelivery = stripeSession?.orderType === "delivery" && !!stripeSession?.uberQuoteId;

  return (
    <div className="min-h-screen flex flex-col bg-napoli-cream">
      <NapoliNavbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div
          className="max-w-lg w-full rounded-xl border shadow-xl overflow-hidden"
          style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
        >
          {/* Success header */}
          <div
            className="px-8 py-10 text-center"
            style={{ background: "var(--napoli-green, #1e6b3c)" }}
          >
            <div className="flex justify-center mb-4">
              <CheckCircle size={64} className="text-white" />
            </div>
            <h1
              className="text-3xl font-bold text-white mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Order Confirmed!
            </h1>
            <p className="text-white/80 text-sm" style={{ fontFamily: "'Lato', sans-serif" }}>
              Thank you for ordering from The Original Napoli Pizzeria
            </p>
            {/* Payment method badge */}
            {orderData && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "oklch(0.25 0.08 145)", color: "oklch(0.85 0.08 145)" }}>
                <Shield size={11} />
                {isAuthNet ? "Paid via Authorize.net" : "Paid via Stripe"}
              </div>
            )}
          </div>

          {/* Order details */}
          <div className="px-8 py-6 space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--napoli-red)" }} />
              </div>
            )}

            {orderData && (
              <div
                className="rounded-lg p-4 border"
                style={{ background: "oklch(0.97 0.012 80)", borderColor: "oklch(0.88 0.015 80)" }}
              >
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {orderData.customerName && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Name
                      </p>
                      <p style={{ color: "oklch(0.22 0.04 30)" }}>{orderData.customerName}</p>
                    </div>
                  )}
                  {orderData.transactionId && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        {isAuthNet ? "Transaction ID" : "Payment ID"}
                      </p>
                      <p className="text-xs truncate" style={{ color: "oklch(0.42 0.03 30)" }}>
                        {orderData.transactionId}
                      </p>
                    </div>
                  )}
                  {orderData.orderType && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Order Type
                      </p>
                      <p className="capitalize" style={{ color: "oklch(0.22 0.04 30)" }}>{orderData.orderType}</p>
                    </div>
                  )}
                  {orderData.amountTotal != null && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Total Paid
                      </p>
                      <p className="font-bold" style={{ color: "var(--napoli-red)" }}>
                        ${orderData.amountTotal.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Uber Direct: dispatching spinner (Stripe delivery orders) */}
            {isStripeDelivery && isDispatchingUber && (
              <div
                className="rounded-lg p-4 border flex items-center gap-3"
                style={{ background: "oklch(0.96 0.015 220)", borderColor: "oklch(0.75 0.12 220)" }}
              >
                <Loader2 size={20} className="animate-spin shrink-0" style={{ color: "oklch(0.40 0.15 220)" }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: "oklch(0.28 0.12 220)", fontFamily: "'Oswald', sans-serif" }}>
                    Dispatching Your Courier…
                  </p>
                  <p className="text-xs" style={{ color: "oklch(0.45 0.10 220)" }}>
                    Connecting with Uber Direct — this takes a few seconds
                  </p>
                </div>
              </div>
            )}

            {/* Uber Direct Tracking Section */}
            {hasDelivery && orderData?.trackingUrl && (
              <div
                className="rounded-lg p-4 border"
                style={{ background: "oklch(0.96 0.015 220)", borderColor: "oklch(0.75 0.12 220)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.40 0.15 220)" }}
                  >
                    <Truck size={16} className="text-white" />
                  </div>
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "oklch(0.28 0.12 220)", fontFamily: "'Oswald', sans-serif" }}
                    >
                      Your Order is On Its Way!
                    </p>
                    <p className="text-xs" style={{ color: "oklch(0.45 0.10 220)" }}>
                      Powered by Uber Direct · Real-time tracking available
                    </p>
                  </div>
                </div>

                {orderData.deliveryId && (
                  <p className="text-xs mb-3" style={{ color: "oklch(0.50 0.08 220)" }}>
                    Delivery ID: <span className="font-mono font-semibold">{orderData.deliveryId}</span>
                  </p>
                )}

                <a
                  href={orderData.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: "oklch(0.40 0.15 220)",
                    color: "white",
                    fontFamily: "'Oswald', sans-serif",
                    letterSpacing: "0.05em",
                  }}
                >
                  <Truck size={15} />
                  Track Your Delivery (Uber Direct)
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            {/* Restaurant info */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-3" style={{ color: "oklch(0.42 0.03 30)" }}>
                <MapPin size={16} style={{ color: "var(--napoli-red)", flexShrink: 0 }} />
                <span>{RESTAURANT_INFO.address}, {RESTAURANT_INFO.city}</span>
              </div>
              <div className="flex items-center gap-3" style={{ color: "oklch(0.42 0.03 30)" }}>
                <Phone size={16} style={{ color: "var(--napoli-red)", flexShrink: 0 }} />
                <a href={`tel:${RESTAURANT_INFO.phone}`} className="hover:underline font-semibold">
                  {RESTAURANT_INFO.phone}
                </a>
              </div>
              {RESTAURANT_INFO.hours.map((h) => (
                <div key={h.days} className="flex items-center gap-3" style={{ color: "oklch(0.42 0.03 30)" }}>
                  <Clock size={16} style={{ color: "var(--napoli-red)", flexShrink: 0 }} />
                  <span>{h.days}: <strong>{h.time}</strong></span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/menu">
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded font-bold text-sm"
                  style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                >
                  Order More <ArrowRight size={15} />
                </button>
              </Link>
              <Link href="/">
                <button
                  className="w-full py-2.5 rounded text-sm border font-semibold"
                  style={{ borderColor: "oklch(0.82 0.015 80)", color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}
                >
                  Back to Home
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <NapoliFooter />
    </div>
  );
}
