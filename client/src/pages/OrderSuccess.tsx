import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle, Phone, MapPin, Clock, ArrowRight, Loader2, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";
import { useCart } from "@/contexts/CartContext";
import { RESTAURANT_INFO } from "@/lib/napoliData";

type OrderInfo = {
  method: "stripe" | "authorizenet";
  transactionId?: string;
  customerName?: string;
  amountTotal?: number;
  orderType?: string;
};

export default function OrderSuccess() {
  const { clearCart } = useCart();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [authNetOrder, setAuthNetOrder] = useState<OrderInfo | null>(null);

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
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: stripeSession, isLoading } = trpc.stripe.getSession.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  // Resolve display data from either payment method
  const orderData = stripeSession
    ? {
        method: "stripe" as const,
        transactionId: sessionId ?? "N/A",
        customerName: stripeSession.customerName,
        amountTotal: stripeSession.amountTotal,
        orderType: stripeSession.orderType,
      }
    : authNetOrder;

  const isAuthNet = orderData?.method === "authorizenet";

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
