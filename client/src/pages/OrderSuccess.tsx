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

  // Payment session IDs
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);
  const [cloverSessionId, setCloverSessionId] = useState<string | null>(null);

  // Legacy Authorize.net support (kept for historical orders)
  const [authNetInfo, setAuthNetInfo] = useState<{
    transactionId: string;
    customerName?: string;
    amountTotal?: number;
    orderType?: string;
    deliveryId?: string;
    trackingUrl?: string;
    orderRef?: string;
  } | null>(null);

  const [orderRef, setOrderRef] = useState<string | null>(null);

  // Delivery dispatch state (for Clover delivery orders)
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const dispatchedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    const payment = params.get("payment");
    const txn = params.get("txn");
    const method = params.get("method");

    if (sid && payment === "stripe") {
      // Stripe Checkout return
      setStripeSessionId(sid);
      clearCart();
    } else if (sid && payment === "clover") {
      // Clover Hosted Checkout return
      setCloverSessionId(sid);
      clearCart();
    } else if (txn && method === "authorizenet") {
      // Legacy Authorize.net
      clearCart();
      const ref = params.get("ref");
      if (ref) setOrderRef(ref);
      setAuthNetInfo({
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

  // Poll for order ref after Stripe payment
  const { data: stripeOrderData, isLoading: stripeLoading } = trpc.stripe.getOrderRefBySession.useQuery(
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

  // Stripe session details (for display)
  const { data: stripeSession } = trpc.stripe.getSession.useQuery(
    { sessionId: stripeSessionId! },
    { enabled: !!stripeSessionId }
  );

  // Poll for order ref after Clover payment (webhook creates it asynchronously)
  const { data: cloverOrderData, isLoading: cloverLoading } = trpc.cloverCheckout.getOrderRefBySession.useQuery(
    { sessionId: cloverSessionId! },
    {
      enabled: !!cloverSessionId,
      refetchInterval: (query) => {
        const d = query.state.data;
        if (d?.orderRef && d?.paymentStatus === "paid") return false;
        return 3000;
      },
      refetchIntervalInBackground: false,
    }
  );

  // Set orderRef when Stripe webhook has confirmed the order
  useEffect(() => {
    if (stripeOrderData?.orderRef && !orderRef) {
      setOrderRef(stripeOrderData.orderRef);
    }
  }, [stripeOrderData, orderRef]);

  // Set orderRef when Clover webhook has confirmed the order
  useEffect(() => {
    if (cloverOrderData?.orderRef && !orderRef) {
      setOrderRef(cloverOrderData.orderRef);
    }
  }, [cloverOrderData, orderRef]);

  const createUberDelivery = trpc.uber.createDelivery.useMutation();

  // Auto-dispatch Uber delivery when Stripe order is confirmed
  useEffect(() => {
    if (
      !stripeSession ||
      stripeSession.status !== "paid" ||
      stripeSession.orderType !== "delivery" ||
      !stripeSession.dropoffAddress ||
      !stripeSession.uberQuoteId ||
      dispatchedRef.current
    ) return;

    const storageKey = `delivery_dispatched_stripe_${stripeSessionId}`;
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
        quoteId: stripeSession.uberQuoteId,
        dropoffAddress: stripeSession.dropoffAddress,
        dropoffCity: stripeSession.dropoffCity ?? "North Las Vegas",
        dropoffState: stripeSession.dropoffState ?? "NV",
        dropoffZip: stripeSession.dropoffZip ?? "89032",
        dropoffName: stripeSession.customerName ?? "Customer",
        dropoffPhone: stripeSession.customerPhone ?? "+17025550000",
        orderItems: (stripeSession.cartItems ?? []).map((i: { name: string; quantity: number }) => ({ name: i.name, quantity: i.quantity })),
        externalId: stripeSessionId ?? undefined,
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
          console.error("[Uber Direct] Stripe dispatch failed:", err);
          toast.warning("Payment confirmed! We'll arrange your delivery shortly.");
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripeSession]);

  // Auto-dispatch Uber delivery when Clover order is confirmed
  useEffect(() => {
    if (
      !cloverOrderData ||
      cloverOrderData.paymentStatus !== "paid" ||
      !cloverOrderData.orderType ||
      cloverOrderData.orderType !== "delivery" ||
      !cloverOrderData.deliveryAddress ||
      dispatchedRef.current
    ) return;

    const storageKey = `delivery_dispatched_clover_${cloverSessionId}`;
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

    if (!cloverOrderData.uberQuoteId) {
      dispatchedRef.current = true;
      return;
    }

    dispatchedRef.current = true;
    setIsDispatching(true);

    createUberDelivery.mutate(
      {
        quoteId: cloverOrderData.uberQuoteId,
        dropoffAddress: cloverOrderData.deliveryAddress,
        dropoffCity: "North Las Vegas",
        dropoffState: "NV",
        dropoffZip: "89032",
        dropoffName: cloverOrderData.customerName ?? "Customer",
        dropoffPhone: cloverOrderData.customerPhone ?? "+17025550000",
        orderItems: (Array.isArray(cloverOrderData.items) ? cloverOrderData.items : []).map((i: { name: string; quantity: number }) => ({ name: i.name, quantity: i.quantity })),
        externalId: cloverSessionId ?? undefined,
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
          console.error("[Uber Direct] Dispatch failed:", err);
          toast.warning("Payment confirmed! We'll arrange your delivery shortly.");
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloverOrderData]);

  // Resolve display data
  const isStripe = !!stripeSessionId;
  const isClover = !!cloverSessionId;
  const isLoading =
    (isStripe && stripeLoading && !stripeOrderData) ||
    (isClover && cloverLoading && !cloverOrderData);
  // paymentStatus enum: "pending" | "paid" | "refunded" | "failed"
  const isPending =
    (isStripe && stripeOrderData && !stripeOrderData.orderRef) ||
    (isClover && cloverOrderData && cloverOrderData.paymentStatus === "pending");

  const displayName = isStripe
    ? stripeSession?.customerName
    : isClover
    ? cloverOrderData?.customerName
    : authNetInfo?.customerName;
  const displayTotal = isStripe
    ? stripeSession?.amountTotal
    : isClover
    ? cloverOrderData?.total
    : authNetInfo?.amountTotal;
  const displayOrderType = isStripe
    ? stripeSession?.orderType
    : isClover
    ? cloverOrderData?.orderType
    : authNetInfo?.orderType;
  const displayTxnId = isStripe ? stripeSessionId : isClover ? cloverSessionId : authNetInfo?.transactionId;
  const displayDeliveryId = deliveryId ?? (isClover ? undefined : authNetInfo?.deliveryId);
  const displayTrackingUrl = trackingUrl ?? authNetInfo?.trackingUrl;
  const hasDelivery = !!displayTrackingUrl;
  const isDelivery = displayOrderType === "delivery";

  const hasData = isStripe
    ? !!stripeSession
    : isClover
    ? !!cloverOrderData
    : !!authNetInfo;

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
                ? "We're waiting for payment confirmation from Clover. This usually takes a few seconds."
                : "Thank you for ordering from The Original Napoli Pizzeria"}
            </p>
            {hasData && !isPending && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "oklch(0.25 0.08 145)", color: "oklch(0.85 0.08 145)" }}>
                <Shield size={11} />
                {isStripe ? "Paid via Stripe" : isClover ? "Paid via Clover" : "Paid via Authorize.net"}
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
                    Clover is processing your payment. This page will update automatically.
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
                  {displayName && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Name
                      </p>
                      <p style={{ color: "oklch(0.22 0.04 30)" }}>{displayName}</p>
                    </div>
                  )}
                  {displayTxnId && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Payment ID
                      </p>
                      <p className="text-xs truncate" style={{ color: "oklch(0.42 0.03 30)" }}>
                        {displayTxnId}
                      </p>
                    </div>
                  )}
                  {displayOrderType && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Order Type
                      </p>
                      <p className="capitalize" style={{ color: "oklch(0.22 0.04 30)" }}>{displayOrderType}</p>
                    </div>
                  )}
                  {displayTotal != null && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Total Paid
                      </p>
                      <p className="font-bold" style={{ color: "var(--napoli-red)" }}>
                        ${Number(displayTotal).toFixed(2)}
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
            {hasDelivery && displayTrackingUrl && (
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

                {displayDeliveryId && (
                  <p className="text-xs mb-3" style={{ color: "oklch(0.50 0.08 220)" }}>
                    Delivery ID: <span className="font-mono font-semibold">{displayDeliveryId}</span>
                  </p>
                )}

                <a
                  href={displayTrackingUrl}
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
