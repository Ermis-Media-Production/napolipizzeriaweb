import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { CheckCircle, Phone, MapPin, Clock, ArrowRight, Loader2, Shield, Truck, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";
import { useCart } from "@/contexts/CartContext";
import { RESTAURANT_INFO } from "@/lib/napoliData";
import { toast } from "sonner";

export default function OrderSuccess() {
  const { clearCart } = useCart();

  // Payment provider detected from URL
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "elavon" | null>(null);

  // Stripe state
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string | null>(null);

  // Elavon state
  const [elavonSessionId, setElavonSessionId] = useState<string | null>(null);

  const [orderRef, setOrderRef] = useState<string | null>(null);

  // Delivery dispatch state
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const dispatchedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const sid = params.get("session_id");
    const pi = params.get("payment_intent");
    const eSession = params.get("session_id"); // Elavon may also use session_id

    if (payment === "stripe") {
      setPaymentProvider("stripe");
      if (sid) setStripeSessionId(sid);
      if (pi) setStripePaymentIntentId(pi);
      clearCart();
    } else if (payment === "elavon") {
      setPaymentProvider("elavon");
      // Elavon passes the session ID back in the return URL
      // We stored it as ?payment=elavon&session_id=<elavonSessionId>
      const esid = params.get("session_id") ?? params.get("elavon_session_id");
      if (esid) setElavonSessionId(esid);
      clearCart();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Stripe queries ────────────────────────────────────────────────────────

  // Poll for order ref after Stripe Checkout Session (legacy redirect flow)
  const { data: stripeOrderData, isLoading: stripeOrderLoading } = trpc.stripe.getOrderRefBySession.useQuery(
    { sessionId: stripeSessionId! },
    {
      enabled: !!stripeSessionId,
      refetchInterval: (query) => {
        const d = query.state.data;
        if (d?.orderRef) return false;
        return 3000;
      },
      refetchIntervalInBackground: false,
    }
  );

  // Poll for order ref after embedded PaymentIntent flow
  const { data: piOrderData } = trpc.stripe.getOrderRefByPaymentIntent.useQuery(
    { paymentIntentId: stripePaymentIntentId! },
    {
      enabled: !!stripePaymentIntentId,
      refetchInterval: (query) => {
        const d = query.state.data;
        if (d?.orderRef) return false;
        return 3000;
      },
      refetchIntervalInBackground: false,
    }
  );

  // Stripe session details for display (Checkout Session flow)
  const { data: stripeSession } = trpc.stripe.getSession.useQuery(
    { sessionId: stripeSessionId! },
    { enabled: !!stripeSessionId }
  );

  // Stripe PaymentIntent details for display (embedded flow)
  const { data: piSession } = trpc.stripe.getPaymentIntentDetails.useQuery(
    { paymentIntentId: stripePaymentIntentId! },
    { enabled: !!stripePaymentIntentId }
  );

  // Merge Stripe session data — prefer PaymentIntent details when available
  const stripeActiveSession = piSession ?? stripeSession;

  // ─── Elavon queries ────────────────────────────────────────────────────────

  // Poll for Elavon order ref (also confirms the order on first poll)
  const { data: elavonOrderData, isLoading: elavonOrderLoading } = trpc.elavon.getOrderRefBySession.useQuery(
    { sessionId: elavonSessionId! },
    {
      enabled: !!elavonSessionId,
      refetchInterval: (query) => {
        const d = query.state.data;
        if (d?.orderRef) return false;
        return 3000;
      },
      refetchIntervalInBackground: false,
    }
  );

  // Elavon order details for display
  const { data: elavonSession } = trpc.elavon.getOrderDetails.useQuery(
    { sessionId: elavonSessionId! },
    { enabled: !!elavonSessionId }
  );

  // ─── Unified active session ────────────────────────────────────────────────

  const activeSession = paymentProvider === "elavon"
    ? elavonSession
    : stripeActiveSession;

  // ─── Set orderRef ──────────────────────────────────────────────────────────

  useEffect(() => {
    let ref: string | null | undefined = null;
    if (paymentProvider === "stripe") {
      ref = piOrderData?.orderRef ?? stripeOrderData?.orderRef;
    } else if (paymentProvider === "elavon") {
      ref = elavonOrderData?.orderRef;
    }
    if (ref && !orderRef) setOrderRef(ref);
  }, [piOrderData, stripeOrderData, elavonOrderData, orderRef, paymentProvider]);

  const createUberDelivery = trpc.uber.createDelivery.useMutation();

  // Auto-dispatch Uber delivery when order is confirmed
  useEffect(() => {
    if (
      !activeSession ||
      activeSession.status !== "paid" ||
      activeSession.orderType !== "delivery" ||
      !activeSession.dropoffAddress ||
      !activeSession.uberQuoteId ||
      dispatchedRef.current
    ) return;

    const storageKey = `delivery_dispatched_${paymentProvider}_${stripeSessionId ?? stripePaymentIntentId ?? elavonSessionId}`;
    const alreadyDispatched = sessionStorage.getItem(storageKey);

    if (alreadyDispatched) {
      try {
        const saved = JSON.parse(alreadyDispatched) as { deliveryId: string; trackingUrl: string };
        setDeliveryId(saved.deliveryId);
        setTrackingUrl(saved.trackingUrl);
      } catch { /* ignore */ }
      dispatchedRef.current = true;
      return;
    }

    dispatchedRef.current = true;
    setIsDispatching(true);

    createUberDelivery.mutate(
      {
        quoteId: activeSession.uberQuoteId,
        dropoffAddress: activeSession.dropoffAddress,
        dropoffCity: (activeSession as { dropoffCity?: string | null }).dropoffCity ?? "North Las Vegas",
        dropoffState: (activeSession as { dropoffState?: string | null }).dropoffState ?? "NV",
        dropoffZip: (activeSession as { dropoffZip?: string | null }).dropoffZip ?? "89032",
        dropoffName: activeSession.customerName ?? "Customer",
        dropoffPhone: (activeSession as { customerPhone?: string | null }).customerPhone ?? "+17025550000",
        orderItems: ((activeSession as { cartItems?: Array<{ name: string; quantity: number }> }).cartItems ?? []).map((i) => ({ name: i.name, quantity: i.quantity })),
        externalId: stripeSessionId ?? stripePaymentIntentId ?? elavonSessionId ?? undefined,
      },
      {
        onSuccess: (data) => {
          setDeliveryId(data.deliveryId);
          setTrackingUrl(data.trackingUrl);
          setIsDispatching(false);
          sessionStorage.setItem(storageKey, JSON.stringify({ deliveryId: data.deliveryId, trackingUrl: data.trackingUrl }));
          toast.success("Delivery dispatched via Uber Direct! Track your order in real time.");
        },
        onError: (err) => {
          setIsDispatching(false);
          dispatchedRef.current = false;
          console.error("[Uber Direct] dispatch failed:", err);
          toast.warning("Payment confirmed! We'll arrange your delivery shortly.");
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);

  // ─── Derived display values ────────────────────────────────────────────────

  const isLoading =
    (paymentProvider === "stripe" && (
      (!!stripeSessionId && stripeOrderLoading && !stripeOrderData) ||
      (!!stripePaymentIntentId && !piOrderData && !piSession)
    )) ||
    (paymentProvider === "elavon" && !!elavonSessionId && elavonOrderLoading && !elavonOrderData);

  const isPending =
    (paymentProvider === "stripe" && (
      (!!stripeSessionId && !!stripeOrderData && !stripeOrderData.orderRef) ||
      (!!stripePaymentIntentId && !!piOrderData && !piOrderData.orderRef)
    )) ||
    (paymentProvider === "elavon" && !!elavonSessionId && !!elavonOrderData && !elavonOrderData.orderRef);

  const hasData = !!activeSession;
  const isDelivery = activeSession?.orderType === "delivery";
  const hasDelivery = !!trackingUrl;

  const paymentBadgeLabel = paymentProvider === "elavon" ? "Paid via Elavon" : "Paid via Stripe";
  const paymentBadgeColor = paymentProvider === "elavon"
    ? { bg: "oklch(0.22 0.10 220)", text: "oklch(0.85 0.10 220)" }
    : { bg: "oklch(0.25 0.08 145)", text: "oklch(0.85 0.08 145)" };

  const paymentIdDisplay = paymentProvider === "elavon"
    ? elavonSessionId
    : (stripePaymentIntentId ?? stripeSessionId);

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
              {isPending ? (
                <Loader2 size={64} className="text-white animate-spin" />
              ) : (
                <CheckCircle size={64} className="text-white" />
              )}
            </div>
            <h1
              className="text-3xl font-bold text-white mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {isPending ? "Confirming Payment…" : "Order Confirmed!"}
            </h1>
            <p className="text-white/80 text-sm" style={{ fontFamily: "'Lato', sans-serif" }}>
              {isPending
                ? "We're waiting for payment confirmation. This usually takes a few seconds."
                : "Thank you for ordering from The Original Napoli Pizzeria"}
            </p>
            {hasData && !isPending && (
              <div
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: paymentBadgeColor.bg, color: paymentBadgeColor.text }}
              >
                <Shield size={11} />
                {paymentBadgeLabel}
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

            {isPending && (
              <div className="rounded-lg p-4 border flex items-center gap-3"
                style={{ background: "oklch(0.97 0.04 80)", borderColor: "oklch(0.82 0.015 80)" }}>
                <Loader2 size={20} className="animate-spin shrink-0" style={{ color: "oklch(0.55 0.03 30)" }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: "oklch(0.30 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                    Waiting for Payment Confirmation
                  </p>
                  <p className="text-xs" style={{ color: "oklch(0.50 0.03 30)" }}>
                    {paymentProvider === "elavon" ? "Elavon" : "Stripe"} is processing your payment. This page will update automatically.
                  </p>
                </div>
              </div>
            )}

            {hasData && !isPending && (
              <div
                className="rounded-lg p-4 border"
                style={{ background: "oklch(0.97 0.012 80)", borderColor: "oklch(0.88 0.015 80)" }}
              >
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {activeSession?.customerName && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Name
                      </p>
                      <p style={{ color: "oklch(0.22 0.04 30)" }}>{activeSession.customerName}</p>
                    </div>
                  )}
                  {paymentIdDisplay && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Payment ID
                      </p>
                      <p className="text-xs truncate" style={{ color: "oklch(0.42 0.03 30)" }}>
                        {paymentIdDisplay}
                      </p>
                    </div>
                  )}
                  {activeSession?.orderType && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Order Type
                      </p>
                      <p className="capitalize" style={{ color: "oklch(0.22 0.04 30)" }}>{activeSession.orderType}</p>
                    </div>
                  )}
                  {activeSession?.amountTotal != null && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Total Paid
                      </p>
                      <p className="font-bold" style={{ color: "var(--napoli-red)" }}>
                        ${Number(activeSession.amountTotal).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Delivery dispatching spinner */}
            {isDelivery && isDispatching && (
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

            {/* Delivery Tracking Section */}
            {hasDelivery && trackingUrl && (
              <div
                className="rounded-lg p-4 border"
                style={{ background: "oklch(0.96 0.015 220)", borderColor: "oklch(0.75 0.12 220)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.40 0.15 220)" }}>
                    <Truck size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "oklch(0.28 0.12 220)", fontFamily: "'Oswald', sans-serif" }}>
                      Your Order is On Its Way!
                    </p>
                    <p className="text-xs" style={{ color: "oklch(0.45 0.10 220)" }}>
                      Powered by Uber Direct · Real-time tracking available
                    </p>
                  </div>
                </div>

                {deliveryId && (
                  <p className="text-xs mb-3" style={{ color: "oklch(0.50 0.08 220)" }}>
                    Delivery ID: <span className="font-mono font-semibold">{deliveryId}</span>
                  </p>
                )}

                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "oklch(0.40 0.15 220)", color: "white", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}
                >
                  <Truck size={15} />
                  Track Your Delivery (Uber Direct)
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            {/* Restaurant info */}
            <div className="space-y-2.5 text-sm">
              <a
                href="https://www.google.com/maps/search/3131+W+Craig+Rd+North+Las+Vegas+NV+89032"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:opacity-75 transition-opacity"
                style={{ color: "oklch(0.42 0.03 30)" }}
              >
                <MapPin size={16} style={{ color: "var(--napoli-red)", flexShrink: 0 }} />
                <span>{RESTAURANT_INFO.address}, {RESTAURANT_INFO.city}</span>
              </a>
              <div className="flex items-center gap-3" style={{ color: "oklch(0.42 0.03 30)" }}>
                <Phone size={16} style={{ color: "var(--napoli-red)", flexShrink: 0 }} />
                <a href={`tel:${RESTAURANT_INFO.phone}`} className="hover:underline font-medium">
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

            {/* Order tracking link */}
            {orderRef && !isPending && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-800 mb-1">Track &amp; Manage Your Order</p>
                <p className="text-xs text-blue-700 mb-3">
                  Use this link to view your order status, cancel items, or cancel the entire order (up to 1 hour before your scheduled time).
                </p>
                <Link href={`/my-order/${orderRef}`}>
                  <button
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded font-bold text-sm border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    View Order {orderRef}
                    <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            )}

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
