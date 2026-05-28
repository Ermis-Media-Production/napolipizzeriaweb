import { useState, useEffect } from "react";
import { Link } from "wouter";
import { CheckCircle, Phone, MapPin, Clock, ArrowRight, Shield } from "lucide-react";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";
import { useCart } from "@/contexts/CartContext";
import { RESTAURANT_INFO } from "@/lib/napoliData";

export default function OrderSuccess() {
  const { clearCart } = useCart();

  // Authorize.net params from URL
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTransactionId(params.get("transaction_id"));
    setAuthCode(params.get("auth_code"));
    setAmount(params.get("amount"));
    setOrderType(params.get("order_type"));
    setCustomerName(params.get("customer") ? decodeURIComponent(params.get("customer")!) : null);
    setItemCount(params.get("items"));
    clearCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasData = !!transactionId;

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
            {hasData && (
              <div
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "oklch(0.25 0.08 145)", color: "oklch(0.85 0.08 145)" }}
              >
                <Shield size={11} />
                Paid via Authorize.net
              </div>
            )}
          </div>

          {/* Order details */}
          <div className="px-8 py-6 space-y-4">
            {hasData && (
              <div
                className="rounded-lg p-4 border"
                style={{ background: "oklch(0.97 0.012 80)", borderColor: "oklch(0.88 0.015 80)" }}
              >
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {customerName && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Name
                      </p>
                      <p style={{ color: "oklch(0.22 0.04 30)" }}>{customerName}</p>
                    </div>
                  )}
                  {transactionId && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Transaction ID
                      </p>
                      <p className="text-xs truncate font-mono" style={{ color: "oklch(0.42 0.03 30)" }}>
                        {transactionId}
                      </p>
                    </div>
                  )}
                  {orderType && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Order Type
                      </p>
                      <p className="capitalize" style={{ color: "oklch(0.22 0.04 30)" }}>{orderType}</p>
                    </div>
                  )}
                  {amount && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Total Paid
                      </p>
                      <p className="font-bold" style={{ color: "var(--napoli-red)" }}>
                        ${Number(amount).toFixed(2)}
                      </p>
                    </div>
                  )}
                  {itemCount && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Items
                      </p>
                      <p style={{ color: "oklch(0.22 0.04 30)" }}>{itemCount} item{Number(itemCount) !== 1 ? "s" : ""}</p>
                    </div>
                  )}
                  {authCode && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Auth Code
                      </p>
                      <p className="text-xs font-mono" style={{ color: "oklch(0.42 0.03 30)" }}>{authCode}</p>
                    </div>
                  )}
                </div>
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
