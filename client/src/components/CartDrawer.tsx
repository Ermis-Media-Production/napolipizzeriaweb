import { X, Plus, Minus, Trash2, ShoppingCart, ChevronRight, Loader2, Lock, MapPin, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { NV_SALES_TAX_RATE } from "@shared/const";
import { OrderScheduler, OrderPoliciesNote, type ScheduleSelection } from "./OrderScheduler";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCart } from "@/contexts/CartContext";

// ─── Stripe publishable key ────────────────────────────────────────────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "");

// ─── Restaurant center (3131 W Craig Rd, North Las Vegas, NV) ─────────────────
const RESTAURANT_LAT = 36.2481;
const RESTAURANT_LNG = -115.2087;
const MAX_DELIVERY_MILES = 20;

/** Haversine distance in miles between two lat/lng points */
function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Embedded payment form (rendered inside <Elements>) ───────────────────────
interface PaymentFormProps {
  clientSecret: string;
  paymentIntentId: string;
  grandTotal: number;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

function PaymentForm({ clientSecret, paymentIntentId, grandTotal, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    setErrorMsg(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-success?payment=stripe&payment_intent=${paymentIntentId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message ?? "Payment failed. Please try again.");
      setIsProcessing(false);
    } else {
      // Payment succeeded without redirect
      onSuccess(paymentIntentId);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-3">
      <div
        className="p-3 rounded-lg border"
        style={{ borderColor: "oklch(0.82 0.015 80)", background: "white" }}
      >
        <PaymentElement
          options={{
            layout: "tabs",
            fields: { billingDetails: { address: { country: "never" } } },
          }}
        />
      </div>

      {errorMsg && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded border text-xs"
          style={{ borderColor: "oklch(0.70 0.18 25)", background: "oklch(0.97 0.04 25)", color: "oklch(0.40 0.18 25)" }}
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded font-bold text-sm transition-all active:scale-[0.98]"
        style={{
          background: isProcessing ? "oklch(0.55 0.03 30)" : "oklch(0.38 0.18 265)",
          color: "white",
          fontFamily: "'Oswald', sans-serif",
          letterSpacing: "0.05em",
        }}
      >
        {isProcessing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Processing payment...
          </>
        ) : (
          <>
            <Lock size={15} />
            Pay ${grandTotal.toFixed(2)} Now
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-xs py-2 rounded border transition-colors"
        style={{ borderColor: "oklch(0.82 0.015 80)", color: "oklch(0.50 0.03 30)" }}
      >
        ← Back to order details
      </button>
    </form>
  );
}

// ─── Main CartDrawer ──────────────────────────────────────────────────────────
export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, clearCart, totalItems, totalPrice, pendingOrderType, clearPendingOrderType } = useCart();
  const [, navigate] = useLocation();
  const [orderType, setOrderType] = useState<"delivery" | "pickup" | "dine-in" | "scheduled">("pickup");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Delivery address fields
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("North Las Vegas");
  const [deliveryState, setDeliveryState] = useState("NV");
  const [deliveryZip, setDeliveryZip] = useState("89032");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Geo-validation state
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isGeoChecking, setIsGeoChecking] = useState(false);
  const geoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule selection
  const [schedule, setSchedule] = useState<ScheduleSelection | null>(null);

  // Uber Direct quote state
  const [uberQuoteId, setUberQuoteId] = useState<string | null>(null);
  const [uberFee, setUberFee] = useState<number | null>(null);
  const [uberEta, setUberEta] = useState<string | null>(null);
  const [isFetchingUberQuote, setIsFetchingUberQuote] = useState(false);

  // Coupon / discount state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number; description: string } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Stripe embedded payment state
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "payment">("cart");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  // Live convenience fee config from DB
  const { data: feeConfig, isLoading: feeConfigLoading } = trpc.settings.getConvenienceFee.useQuery();
  const liveFeeRate = feeConfigLoading ? 0.03 : feeConfig?.enabled ? feeConfig.percent / 100 : 0;

  // Reset quotes when order type changes away from delivery
  useEffect(() => {
    if (orderType !== "delivery") {
      setUberQuoteId(null); setUberFee(null); setUberEta(null);
      setGeoError(null);
    }
  }, [orderType]);

  // When cart opens with a pre-selected order type, apply it
  useEffect(() => {
    if (isOpen && pendingOrderType) {
      setOrderType(pendingOrderType);
      clearPendingOrderType();
    }
  }, [isOpen, pendingOrderType, clearPendingOrderType]);

  // Reset to cart step when cart closes
  useEffect(() => {
    if (!isOpen) {
      setCheckoutStep("cart");
      setClientSecret(null);
      setPaymentIntentId(null);
    }
  }, [isOpen]);

  // tRPC mutations
  const getUberQuote = trpc.uber.getQuote.useMutation({
    onSuccess: (data) => {
      setUberQuoteId(data.quoteId);
      setUberFee(data.fee);
      setUberEta(data.dropoffEta);
      setIsFetchingUberQuote(false);
    },
    onError: (err) => {
      setIsFetchingUberQuote(false);
      toast.error("Could not get delivery quote: " + err.message);
    },
  });

  const createPaymentIntent = trpc.stripe.createPaymentIntent.useMutation({
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setCheckoutStep("payment");
    },
    onError: (err) => {
      toast.error("Could not start checkout: " + err.message);
    },
  });

  const utils = trpc.useUtils();

  /** Geocode address and check 20-mile radius using Manus Maps proxy */
  const validateDeliveryRadius = useCallback(async (address: string, city: string, state: string, zip: string): Promise<boolean> => {
    if (!address.trim()) return false;
    setIsGeoChecking(true);
    setGeoError(null);
    try {
      const forgeBase = (import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.manus.space").replace(/\/+$/, "");
      const apiKey = import.meta.env.VITE_FRONTEND_FORGE_API_KEY ?? "";
      const query = encodeURIComponent(`${address}, ${city}, ${state} ${zip}, USA`);
      const url = `${forgeBase}/v1/maps/proxy/maps/api/geocode/json?address=${query}&key=${apiKey}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Geocoding failed");
      const data = await resp.json() as { status?: string; results?: Array<{ geometry: { location: { lat: number; lng: number } } }> };
      if (!data.results?.length || data.status === "ZERO_RESULTS") {
        setGeoError("Address not found. Please check the address and try again.");
        setIsGeoChecking(false);
        return false;
      }
      const { lat, lng } = data.results[0].geometry.location;
      const miles = haversineMiles(RESTAURANT_LAT, RESTAURANT_LNG, lat, lng);
      if (miles > MAX_DELIVERY_MILES) {
        setGeoError(`Sorry, we only deliver within ${MAX_DELIVERY_MILES} miles of our restaurant. Your address is approximately ${miles.toFixed(1)} miles away. Please call us at 725-204-0379 for catering or special arrangements.`);
        setIsGeoChecking(false);
        return false;
      }
      setGeoError(null);
      setIsGeoChecking(false);
      return true;
    } catch {
      // Fallback: allow checkout if geocoding fails (don't block customer)
      setIsGeoChecking(false);
      return true;
    }
  }, []);

  /** Trigger an Uber Direct quote — debounced 800ms */
  const triggerUberQuote = (address: string, city: string, state: string, zip: string) => {
    if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    setUberQuoteId(null); setUberFee(null); setUberEta(null);
    if (!address.trim()) return;
    quoteDebounceRef.current = setTimeout(() => {
      setIsFetchingUberQuote(true);
      getUberQuote.mutate({ dropoffAddress: address, dropoffCity: city, dropoffState: state, dropoffZip: zip });
    }, 800);
  };
  const quoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddressChange = (field: "address" | "city" | "state" | "zip", value: string) => {
    const newAddress = field === "address" ? value : deliveryAddress;
    const newCity    = field === "city"    ? value : deliveryCity;
    const newState   = field === "state"   ? value : deliveryState;
    const newZip     = field === "zip"     ? value : deliveryZip;
    if (field === "address") setDeliveryAddress(value);
    if (field === "city")    setDeliveryCity(value);
    if (field === "state")   setDeliveryState(value);
    if (field === "zip")     setDeliveryZip(value);
    triggerUberQuote(newAddress, newCity, newState, newZip);
    // Debounce geo check
    if (geoDebounceRef.current) clearTimeout(geoDebounceRef.current);
    geoDebounceRef.current = setTimeout(() => {
      validateDeliveryRadius(newAddress, newCity, newState, newZip);
    }, 1200);
  };

  const redeemCoupon = trpc.coupon.redeem.useMutation();

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setIsApplyingCoupon(true);
    try {
      const result = await utils.coupon.validate.fetch({ code });
      if (result?.discountPercent) {
        setAppliedCoupon({ code: result.code, discountPercent: result.discountPercent, description: result.description });
        toast.success(`Coupon applied: ${result.discountPercent}% off!`);
        setCouponCode("");
      } else {
        toast.error("Invalid or expired coupon code.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid or expired coupon code.";
      toast.error(message);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Pricing breakdown
  const subtotal = totalPrice;
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discountPercent) / 100 : 0;
  const discountedSubtotal = subtotal - discountAmount;
  const convenienceFee = Math.round(discountedSubtotal * liveFeeRate * 100) / 100;
  const salesTax = Math.round(discountedSubtotal * NV_SALES_TAX_RATE * 100) / 100;
  const selectedDeliveryFee = orderType === "delivery" && uberFee !== null ? uberFee : null;
  const deliveryFeeDollars = selectedDeliveryFee !== null ? selectedDeliveryFee / 100 : 0;
  const grandTotal = discountedSubtotal + convenienceFee + salesTax + deliveryFeeDollars;

  const validateForm = () => {
    if (items.length === 0) return false;
    if (!customerName.trim()) {
      toast.error("Please enter your name.");
      return false;
    }
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Please enter your delivery address.");
      return false;
    }
    if (orderType === "delivery" && geoError) {
      toast.error("Delivery address is outside our service area.");
      return false;
    }
    if (orderType === "delivery" && !uberQuoteId) {
      toast.error("Please wait for the delivery quote to load.");
      return false;
    }
    return true;
  };

  const handleProceedToPayment = async () => {
    if (!validateForm()) return;

    // Extra geo check on submit for delivery
    if (orderType === "delivery") {
      const ok = await validateDeliveryRadius(deliveryAddress, deliveryCity, deliveryState, deliveryZip);
      if (!ok) return;
    }

    const resolvedSchedule: ScheduleSelection = schedule ?? { type: "asap" };
    const scheduledAt = resolvedSchedule.type === "asap" ? Date.now() : resolvedSchedule.scheduledAt;
    const isAsap = resolvedSchedule.type === "asap";
    const apiOrderType = orderType === "scheduled" ? "pickup" : orderType as "delivery" | "pickup" | "dine-in";

    createPaymentIntent.mutate({
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: i.category, description: i.description })),
      customerName,
      customerPhone: customerPhone || undefined,
      customerEmail: customerEmail || undefined,
      orderType: apiOrderType,
      scheduledAt,
      isAsap,
      uberQuoteId: orderType === "delivery" && uberQuoteId ? uberQuoteId : undefined,
      dropoffAddress: orderType === "delivery" ? deliveryAddress : undefined,
      dropoffCity: orderType === "delivery" ? deliveryCity : undefined,
      dropoffState: orderType === "delivery" ? deliveryState : undefined,
      dropoffZip: orderType === "delivery" ? deliveryZip : undefined,
      dropoffNotes: orderType === "delivery" && deliveryNotes ? deliveryNotes : undefined,
      couponCode: appliedCoupon?.code || undefined,
      discountPercent: appliedCoupon?.discountPercent || undefined,
      subtotal,
      discountAmount,
      convenienceFee,
      salesTax,
      total: grandTotal,
      convenienceFeeCents: Math.round(convenienceFee * 100),
      salesTaxCents: Math.round(salesTax * 100),
      deliveryFeeCents: selectedDeliveryFee ?? 0,
    });
  };

  const handlePaymentSuccess = (piId: string) => {
    clearCart();
    navigate(`/order-success?payment=stripe&payment_intent=${piId}`);
    closeCart();
  };

  const isLoading = createPaymentIntent.isPending || feeConfigLoading;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={checkoutStep === "cart" ? closeCart : undefined}
          style={{ transition: "opacity 200ms ease-out" }}
        />
      )}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl overflow-hidden"
        style={{
          width: "min(480px, 100vw)",
          background: "var(--napoli-cream, #fdf6ec)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 280ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ background: "var(--napoli-red, #c0392b)", color: "white" }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} />
            <span className="font-bold text-sm" style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}>
              {checkoutStep === "payment" ? "SECURE PAYMENT" : "YOUR ORDER"}
            </span>
            {totalItems > 0 && checkoutStep === "cart" && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--napoli-gold, #d4a017)", color: "var(--napoli-dark, #1a0a00)" }}
              >
                {totalItems}
              </span>
            )}
          </div>
          <button onClick={closeCart} className="p-1 rounded hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingCart size={48} style={{ color: "oklch(0.75 0.015 80)" }} />
            <p className="font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
              Your cart is empty
            </p>
            <p className="text-sm" style={{ color: "oklch(0.60 0.03 30)" }}>
              Add items from the menu to get started
            </p>
          </div>
        )}

        {/* Cart items */}
        {items.length > 0 && checkoutStep === "cart" && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 py-2 border-b"
                style={{ borderColor: "oklch(0.88 0.015 80)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "oklch(0.22 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                    {item.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--napoli-red, #c0392b)" }}>
                    ${item.price.toFixed(2)} each
                  </p>
                  {item.description && (
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: "oklch(0.52 0.03 30)" }}>
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-6 h-6 rounded-full flex items-center justify-center border transition-colors hover:bg-red-50"
                    style={{ borderColor: "oklch(0.82 0.015 80)" }}
                  >
                    <Minus size={10} />
                  </button>
                  <span className="w-5 text-center text-sm font-bold" style={{ color: "oklch(0.22 0.04 30)" }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 rounded-full flex items-center justify-center border transition-colors hover:bg-red-50"
                    style={{ borderColor: "oklch(0.82 0.015 80)" }}
                  >
                    <Plus size={10} />
                  </button>
                </div>
                <p className="text-sm font-bold w-14 text-right" style={{ color: "oklch(0.22 0.04 30)" }}>
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 rounded hover:bg-red-50 transition-colors"
                  style={{ color: "oklch(0.55 0.03 30)" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {items.length > 1 && (
              <button
                onClick={clearCart}
                className="text-xs w-full text-center py-1.5 transition-colors"
                style={{ color: "oklch(0.55 0.03 30)" }}
              >
                Clear all items
              </button>
            )}
          </div>
        )}

        {/* Checkout panel — order details step */}
        {items.length > 0 && checkoutStep === "cart" && (
          <div
            className="border-t px-4 py-4 space-y-3 shrink-0 overflow-y-auto"
            style={{ borderColor: "oklch(0.88 0.015 80)", background: "white", maxHeight: "72vh" }}
          >
            {/* Order type */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
                ORDER TYPE
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { type: "pickup",    label: "To Go / Pick Up" },
                  { type: "delivery",  label: "Delivery" },
                  { type: "dine-in",   label: "Dine-In" },
                  { type: "scheduled", label: "Schedule" },
                ] as const).map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className="py-2 px-2 rounded text-xs font-semibold border transition-all"
                    style={{
                      background: orderType === type ? "var(--napoli-red, #c0392b)" : "transparent",
                      color: orderType === type ? "white" : "oklch(0.42 0.03 30)",
                      borderColor: orderType === type ? "var(--napoli-red, #c0392b)" : "oklch(0.82 0.015 80)",
                      fontFamily: "'Oswald', sans-serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule selector */}
            {orderType === "scheduled" ? (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
                  SCHEDULE DATE & TIME
                </p>
                <OrderScheduler
                  value={schedule}
                  onChange={setSchedule}
                  orderType="pickup"
                />
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded border"
                style={{ borderColor: "oklch(0.82 0.015 80)", background: "oklch(0.985 0.01 80)" }}
              >
                <span className="text-base">⏱</span>
                <p className="text-xs" style={{ color: "oklch(0.45 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                  <strong>Order ASAP</strong> — or select <em>Schedule</em> above to pick a future date &amp; time.
                </p>
              </div>
            )}

            {/* Delivery section */}
            {orderType === "delivery" && (
              <div
                className="space-y-2 p-3 rounded-lg border"
                style={{ borderColor: "oklch(0.82 0.015 80)", background: "oklch(0.98 0.005 80)" }}
              >
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} style={{ color: "var(--napoli-red, #c0392b)" }} />
                  <span className="text-xs font-semibold" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                    DELIVERY ADDRESS
                  </span>
                  <span className="text-xs ml-auto" style={{ color: "oklch(0.55 0.03 30)" }}>
                    Within 20 miles · Las Vegas area
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Street address *"
                  value={deliveryAddress}
                  onChange={(e) => handleAddressChange("address", e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                  style={{ borderColor: geoError ? "oklch(0.65 0.18 25)" : "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                />
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" placeholder="City" value={deliveryCity}
                    onChange={(e) => handleAddressChange("city", e.target.value)}
                    className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                    style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }} />
                  <input type="text" placeholder="State" value={deliveryState}
                    onChange={(e) => handleAddressChange("state", e.target.value)}
                    className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                    style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }} />
                  <input type="text" placeholder="ZIP" value={deliveryZip}
                    onChange={(e) => handleAddressChange("zip", e.target.value)}
                    className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                    style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }} />
                </div>
                <input
                  type="text"
                  placeholder="Delivery notes (apt #, gate code...)"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                  style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                />

                {/* Geo error */}
                {geoError && (
                  <div
                    className="flex items-start gap-2 px-3 py-2 rounded border text-xs"
                    style={{ borderColor: "oklch(0.65 0.18 25)", background: "oklch(0.97 0.04 25)", color: "oklch(0.40 0.18 25)" }}
                  >
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    {geoError}
                  </div>
                )}

                {isGeoChecking && (
                  <div className="flex items-center gap-2 py-1 text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Checking delivery area...</span>
                  </div>
                )}

                {isFetchingUberQuote && (
                  <div className="flex items-center gap-2 py-2 text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>
                    <Loader2 size={13} className="animate-spin" style={{ color: "oklch(0.40 0.15 220)" }} />
                    <span>Getting delivery quote...</span>
                  </div>
                )}

                {!isFetchingUberQuote && uberFee !== null && uberQuoteId && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg border"
                    style={{ borderColor: "oklch(0.70 0.15 220)", background: "oklch(0.95 0.04 220)" }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} style={{ color: "oklch(0.40 0.15 220)" }} />
                      <div>
                        <span className="text-xs font-bold" style={{ color: "oklch(0.25 0.10 220)", fontFamily: "'Oswald', sans-serif" }}>
                          Uber Direct
                        </span>
                        {uberEta && (
                          <span className="text-xs ml-2" style={{ color: "oklch(0.40 0.10 220)" }}>
                            · ETA {new Date(uberEta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: "oklch(0.30 0.15 220)" }}>
                        ${(uberFee / 100).toFixed(2)}
                      </span>
                      <button
                        onClick={() => triggerUberQuote(deliveryAddress, deliveryCity, deliveryState, deliveryZip)}
                        className="text-xs px-2 py-0.5 rounded border transition-colors"
                        style={{ borderColor: "oklch(0.65 0.12 220)", color: "oklch(0.40 0.12 220)" }}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                )}

                {!isFetchingUberQuote && !uberFee && deliveryAddress.trim() && !getUberQuote.isPending && getUberQuote.isError && (
                  <p className="text-xs px-2 py-1.5 rounded border" style={{ color: "oklch(0.45 0.18 25)", background: "oklch(0.97 0.04 25)", borderColor: "oklch(0.75 0.12 25)" }}>
                    Delivery not available for this address. Please check the address or call us at 725-204-0379.
                  </p>
                )}
              </div>
            )}

            {/* Customer info */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Your name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
              />
            </div>
            <input
              type="email"
              placeholder="Email (for order confirmation)"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded border outline-none focus:ring-1"
              style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
            />

            {/* Coupon code input */}
            <div className="space-y-1.5">
              {appliedCoupon ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg border"
                  style={{ borderColor: "oklch(0.70 0.15 145)", background: "oklch(0.96 0.04 145)" }}>
                  <div>
                    <span className="text-xs font-bold" style={{ color: "oklch(0.35 0.12 145)", fontFamily: "'Oswald', sans-serif" }}>
                      {appliedCoupon.discountPercent}% OFF
                    </span>
                    <span className="text-xs ml-2" style={{ color: "oklch(0.45 0.08 145)" }}>
                      {appliedCoupon.code} — {appliedCoupon.description}
                    </span>
                  </div>
                  <button
                    onClick={() => setAppliedCoupon(null)}
                    className="text-xs px-2 py-0.5 rounded border transition-colors"
                    style={{ borderColor: "oklch(0.65 0.12 145)", color: "oklch(0.40 0.12 145)" }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    className="flex-1 text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                    style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || isApplyingCoupon}
                    className="text-xs px-3 py-2 rounded font-semibold border transition-all"
                    style={{
                      background: couponCode.trim() ? "oklch(0.38 0.12 145)" : "transparent",
                      color: couponCode.trim() ? "white" : "oklch(0.60 0.03 30)",
                      borderColor: couponCode.trim() ? "oklch(0.38 0.12 145)" : "oklch(0.82 0.015 80)",
                      fontFamily: "'Oswald', sans-serif",
                    }}
                  >
                    {isApplyingCoupon ? "..." : "Apply"}
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="flex flex-col gap-1 py-2 border-t" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "oklch(0.50 0.03 30)" }}>Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
                <span className="text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>${subtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "oklch(0.35 0.12 145)" }}>Discount ({appliedCoupon.discountPercent}% off — {appliedCoupon.code})</span>
                  <span className="text-xs font-semibold" style={{ color: "oklch(0.35 0.12 145)" }}>−${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "oklch(0.50 0.03 30)" }}>
                  Convenience Fee ({feeConfigLoading ? "…" : feeConfig?.enabled ? (feeConfig.percent ?? 3) : 0}%)
                </span>
                <span className="text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>+${convenienceFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "oklch(0.50 0.03 30)" }}>Sales Tax (NV 8.375%)</span>
                <span className="text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>+${salesTax.toFixed(2)}</span>
              </div>
              {selectedDeliveryFee !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "oklch(0.50 0.03 30)" }}>Delivery (Uber Direct)</span>
                  <span className="text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>+${deliveryFeeDollars.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 mt-1 border-t" style={{ borderColor: "oklch(0.82 0.015 80)" }}>
                <span className="text-sm font-semibold" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>Total</span>
                <span className="text-xl font-bold" style={{ color: "var(--napoli-red, #c0392b)", fontFamily: "'Oswald', sans-serif" }}>
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Order Policies Note */}
            <OrderPoliciesNote />

            {/* Accepted cards */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>We accept:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center justify-center rounded px-1.5 py-0.5 border" style={{ background: "#1a1f71", borderColor: "#1a1f71", minWidth: 36, height: 22 }}>
                    <span className="text-white font-bold" style={{ fontSize: 9, fontFamily: "'Arial', sans-serif" }}>VISA</span>
                  </div>
                  <div className="flex items-center justify-center rounded px-1 border" style={{ background: "white", borderColor: "oklch(0.82 0.015 80)", minWidth: 36, height: 22 }}>
                    <div className="rounded-full" style={{ width: 13, height: 13, background: "#EB001B", marginRight: -4, zIndex: 1 }} />
                    <div className="rounded-full" style={{ width: 13, height: 13, background: "#F79E1B" }} />
                  </div>
                  <div className="flex items-center justify-center rounded px-1.5 py-0.5 border" style={{ background: "#2E77BC", borderColor: "#2E77BC", minWidth: 36, height: 22 }}>
                    <span className="text-white font-bold" style={{ fontSize: 7.5, fontFamily: "'Arial', sans-serif" }}>AMEX</span>
                  </div>
                  <div className="flex items-center justify-center rounded px-1.5 py-0.5 border" style={{ background: "white", borderColor: "oklch(0.82 0.015 80)", minWidth: 36, height: 22 }}>
                    <span className="font-bold" style={{ fontSize: 7, fontFamily: "'Arial', sans-serif", color: "#231F20" }}>DISC<span style={{ color: "#F76F20" }}>VR</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>Also:</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center justify-center rounded px-2 border" style={{ background: "#000", borderColor: "#000", height: 22, minWidth: 52 }}>
                    <svg viewBox="0 0 50 20" width="42" height="14" fill="white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9.5 4.2c.6-.8.9-1.7.9-2.7-.9.1-2 .6-2.6 1.4-.6.7-1 1.6-.9 2.6.9 0 1.9-.5 2.6-1.3z"/>
                      <path d="M10.4 5.6c-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.9-.7-1.5.1-2.8.9-3.6 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.8 2.1 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.1.5-.7.9-1.5 1.2-2.3-3.1-1.2-2.5-5.5.2-6.6-.8-1.2-2-2-4-2z"/>
                      <text x="18" y="15" fontSize="11" fontFamily="-apple-system, Arial" fontWeight="600" fill="white">Pay</text>
                    </svg>
                  </div>
                  <div className="flex items-center justify-center rounded px-2 border" style={{ background: "white", borderColor: "oklch(0.82 0.015 80)", height: 22, minWidth: 52 }}>
                    <svg viewBox="0 0 50 20" width="44" height="14" xmlns="http://www.w3.org/2000/svg">
                      <text x="0" y="15" fontSize="13" fontFamily="Arial" fontWeight="700">
                        <tspan fill="#4285F4">G</tspan><tspan fill="#EA4335">o</tspan><tspan fill="#FBBC05">o</tspan><tspan fill="#4285F4">g</tspan><tspan fill="#34A853">l</tspan><tspan fill="#EA4335">e</tspan>
                      </text>
                      <text x="28" y="15" fontSize="11" fontFamily="Arial" fontWeight="600" fill="#5F6368">Pay</text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Proceed to payment button */}
            <button
              onClick={handleProceedToPayment}
              disabled={isLoading || (orderType === "delivery" && (isFetchingUberQuote || isGeoChecking)) || !!geoError}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded font-bold text-sm transition-all active:scale-[0.98]"
              style={{
                background: isLoading || (orderType === "delivery" && isFetchingUberQuote) || !!geoError
                  ? "oklch(0.55 0.03 30)"
                  : "oklch(0.38 0.18 265)",
                color: "white",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Preparing checkout...
                </>
              ) : orderType === "delivery" && isFetchingUberQuote ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Getting delivery quote...
                </>
              ) : (
                <>
                  <Lock size={15} />
                  Enter Payment Details — ${grandTotal.toFixed(2)}
                  <ChevronRight size={16} />
                </>
              )}
            </button>
            <p className="text-center text-xs" style={{ color: "oklch(0.60 0.03 30)" }}>
              {orderType === "delivery"
                ? "Delivery by Uber Direct · Secured by Stripe"
                : "Secured by Stripe · PCI Compliant"}
            </p>
          </div>
        )}

        {/* Payment step — embedded Stripe Elements */}
        {items.length > 0 && checkoutStep === "payment" && clientSecret && (
          <div
            className="flex-1 overflow-y-auto px-4 py-4"
            style={{ background: "white" }}
          >
            {/* Order summary mini */}
            <div
              className="mb-4 p-3 rounded-lg border"
              style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.985 0.01 80)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                  ORDER SUMMARY
                </span>
                <span className="text-sm font-bold" style={{ color: "var(--napoli-red, #c0392b)", fontFamily: "'Oswald', sans-serif" }}>
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
              <p className="text-xs" style={{ color: "oklch(0.52 0.03 30)" }}>
                {items.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}
              </p>
              {customerName && (
                <p className="text-xs mt-1" style={{ color: "oklch(0.52 0.03 30)" }}>
                  For: {customerName}{customerPhone ? ` · ${customerPhone}` : ""}
                </p>
              )}
            </div>

            <p className="text-xs font-semibold mb-3" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
              PAYMENT DETAILS
            </p>

            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#c0392b",
                    colorBackground: "#ffffff",
                    colorText: "#1a0a00",
                    borderRadius: "6px",
                    fontFamily: "Lato, sans-serif",
                  },
                },
              }}
            >
              <PaymentForm
                clientSecret={clientSecret}
                paymentIntentId={paymentIntentId!}
                grandTotal={grandTotal}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setCheckoutStep("cart")}
              />
            </Elements>
          </div>
        )}
      </div>
    </>
  );
}
