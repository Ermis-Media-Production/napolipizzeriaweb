import { useCart } from "@/contexts/CartContext";
import { X, Plus, Minus, Trash2, ShoppingCart, ChevronRight, Loader2, CreditCard, Lock, Truck, MapPin, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { NV_SALES_TAX_RATE } from "@shared/const";
import { OrderScheduler, OrderPoliciesNote, type ScheduleSelection } from "./OrderScheduler";

// Payment method type
type PaymentMethod = "stripe" | "clover";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, clearCart, totalItems, totalPrice, pendingOrderType, clearPendingOrderType } = useCart();
  const [, navigate] = useLocation();
  const [orderType, setOrderType] = useState<"delivery" | "pickup" | "dine-in" | "scheduled">("pickup");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  // Delivery address fields
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("North Las Vegas");
  const [deliveryState, setDeliveryState] = useState("NV");
  const [deliveryZip, setDeliveryZip] = useState("89032");
  const [deliveryNotes, setDeliveryNotes] = useState("");

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

  // Live convenience fee config from DB
  const { data: feeConfig, isLoading: feeConfigLoading } = trpc.settings.getConvenienceFee.useQuery();
  const liveFeeRate = feeConfigLoading
    ? 0.03
    : feeConfig?.enabled
    ? feeConfig.percent / 100
    : 0;

  // Debounce timer ref for auto-quote
  const quoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset quotes when order type changes away from delivery
  useEffect(() => {
    if (orderType !== "delivery") {
      setUberQuoteId(null); setUberFee(null); setUberEta(null);
    }
  }, [orderType]);

  // When cart opens with a pre-selected order type (from the Order Now popup), apply it
  useEffect(() => {
    if (isOpen && pendingOrderType) {
      setOrderType(pendingOrderType);
      clearPendingOrderType();
    }
  }, [isOpen, pendingOrderType, clearPendingOrderType]);

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

  /** Trigger an Uber Direct quote — debounced so it fires 800ms after the user stops typing */
  const triggerUberQuote = (address: string, city: string, state: string, zip: string) => {
    if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    setUberQuoteId(null); setUberFee(null); setUberEta(null);
    if (!address.trim()) return;
    quoteDebounceRef.current = setTimeout(() => {
      setIsFetchingUberQuote(true);
      getUberQuote.mutate({ dropoffAddress: address, dropoffCity: city, dropoffState: state, dropoffZip: zip });
    }, 800);
  };

  // Handle address field changes — auto-trigger quote
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
  };

  const createUberDelivery = trpc.uber.createDelivery.useMutation();
  const redeemCoupon = trpc.coupon.redeem.useMutation();

  // Stripe checkout mutation
  const createStripeSession = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => {
      toast.error("Could not start Stripe checkout: " + err.message);
      setIsRedirecting(false);
    },
  });

  // Clover checkout mutation
  const createCloverSession = trpc.cloverCheckout.createSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.href;
    },
    onError: (err) => {
      toast.error("Could not start Clover checkout: " + err.message);
      setIsRedirecting(false);
    },
  });

  const utils = trpc.useUtils();
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

  // Shared validation
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
    if (orderType === "delivery" && !uberQuoteId) {
      toast.error("Please wait for the delivery quote to load.");
      return false;
    }
    return true;
  };

  const handleStripeCheckout = () => {
    if (!validateForm()) return;
    const resolvedSchedule: ScheduleSelection = schedule ?? { type: "asap" };
    const scheduledAt = resolvedSchedule.type === "asap" ? Date.now() : resolvedSchedule.scheduledAt;
    const isAsap = resolvedSchedule.type === "asap";
    const apiOrderType = orderType === "scheduled" ? "pickup" : orderType as "delivery" | "pickup" | "dine-in";
    const origin = window.location.origin;

    setIsRedirecting(true);
    createStripeSession.mutate({
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: i.category })),
      successUrl: `${origin}/order-success?payment=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/menu`,
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

  const handleCloverCheckout = () => {
    if (!validateForm()) return;
    const resolvedSchedule: ScheduleSelection = schedule ?? { type: "asap" };
    const scheduledAt = resolvedSchedule.type === "asap" ? Date.now() : resolvedSchedule.scheduledAt;
    const isAsap = resolvedSchedule.type === "asap";
    const apiOrderType = orderType === "scheduled" ? "pickup" : orderType;
    const scheduledLabel = resolvedSchedule.type === "scheduled" ? resolvedSchedule.label : undefined;
    setIsRedirecting(true);
    createCloverSession.mutate({
      items: items.map((i) => ({ id: i.id, name: i.name, description: i.description, price: i.price, quantity: i.quantity, category: i.category })),
      orderType: apiOrderType,
      customerName,
      customerPhone: customerPhone || "",
      customerEmail: customerEmail || undefined,
      deliveryAddress: orderType === "delivery" ? `${deliveryAddress}, ${deliveryCity}, ${deliveryState} ${deliveryZip}` : undefined,
      isAsap,
      scheduledAt,
      scheduledLabel,
      subtotal,
      discountAmount,
      convenienceFee,
      salesTax,
      total: grandTotal,
      couponCode: appliedCoupon?.code || undefined,
      uberQuoteId: orderType === "delivery" && uberQuoteId ? uberQuoteId : undefined,
      origin: window.location.origin,
    });
  };

  const handleCheckout = () => {
    if (paymentMethod === "stripe") {
      handleStripeCheckout();
    } else {
      handleCloverCheckout();
    }
  };

  const isLoading =
    isRedirecting ||
    createStripeSession.isPending ||
    createCloverSession.isPending ||
    feeConfigLoading;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={closeCart}
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
              YOUR ORDER
            </span>
            {totalItems > 0 && (
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
        {items.length > 0 && (
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

        {/* Checkout panel */}
        {items.length > 0 && (
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
                  orderType={orderType === "scheduled" ? "pickup" : (orderType as "pickup" | "delivery" | "dine-in")}
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
                </div>
                <input
                  type="text"
                  placeholder="Street address *"
                  value={deliveryAddress}
                  onChange={(e) => handleAddressChange("address", e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                  style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
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

            {/* Payment method selector */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
                PAYMENT METHOD
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod("stripe")}
                  className="flex flex-col items-center gap-1 py-2.5 px-3 rounded border transition-all"
                  style={{
                    background: paymentMethod === "stripe" ? "oklch(0.97 0.04 265)" : "transparent",
                    borderColor: paymentMethod === "stripe" ? "oklch(0.55 0.20 265)" : "oklch(0.82 0.015 80)",
                    color: paymentMethod === "stripe" ? "oklch(0.35 0.18 265)" : "oklch(0.42 0.03 30)",
                  }}
                >
                  <CreditCard size={16} />
                  <span className="text-xs font-semibold" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    Credit / Debit Card
                  </span>
                  <span className="text-xs opacity-70">via Stripe</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("clover")}
                  className="flex flex-col items-center gap-1 py-2.5 px-3 rounded border transition-all"
                  style={{
                    background: paymentMethod === "clover" ? "oklch(0.97 0.04 145)" : "transparent",
                    borderColor: paymentMethod === "clover" ? "oklch(0.55 0.15 145)" : "oklch(0.82 0.015 80)",
                    color: paymentMethod === "clover" ? "oklch(0.30 0.12 145)" : "oklch(0.42 0.03 30)",
                  }}
                >
                  <CreditCard size={16} />
                  <span className="text-xs font-semibold" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    Clover Checkout
                  </span>
                  <span className="text-xs opacity-70">via Clover POS</span>
                </button>
              </div>

              {/* Payment info note */}
              {paymentMethod === "stripe" ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded border mt-2"
                  style={{ borderColor: "oklch(0.70 0.20 265)", background: "oklch(0.97 0.04 265)" }}>
                  <Lock size={12} style={{ color: "oklch(0.38 0.18 265)", flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: "oklch(0.30 0.15 265)", fontFamily: "'Lato', sans-serif" }}>
                    Secure checkout powered by Stripe. Accepts cards, Apple Pay, Google Pay &amp; more.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded border mt-2"
                  style={{ borderColor: "oklch(0.70 0.15 145)", background: "oklch(0.97 0.03 145)" }}>
                  <CreditCard size={12} style={{ color: "oklch(0.38 0.12 145)", flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: "oklch(0.30 0.10 145)", fontFamily: "'Lato', sans-serif" }}>
                    You'll be redirected to Clover's secure checkout page to complete your payment.
                  </p>
                </div>
              )}
            </div>

            {/* Accepted cards row */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>We accept:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Visa */}
                  <div className="flex items-center justify-center rounded px-1.5 py-0.5 border" style={{ background: "#1a1f71", borderColor: "#1a1f71", minWidth: 36, height: 22 }}>
                    <span className="text-white font-bold" style={{ fontSize: 9, fontFamily: "'Arial', sans-serif", letterSpacing: "0.02em" }}>VISA</span>
                  </div>
                  {/* Mastercard */}
                  <div className="flex items-center justify-center rounded px-1 border" style={{ background: "white", borderColor: "oklch(0.82 0.015 80)", minWidth: 36, height: 22, gap: 0 }}>
                    <div className="rounded-full" style={{ width: 13, height: 13, background: "#EB001B", marginRight: -4, zIndex: 1 }} />
                    <div className="rounded-full" style={{ width: 13, height: 13, background: "#F79E1B" }} />
                  </div>
                  {/* Amex */}
                  <div className="flex items-center justify-center rounded px-1.5 py-0.5 border" style={{ background: "#2E77BC", borderColor: "#2E77BC", minWidth: 36, height: 22 }}>
                    <span className="text-white font-bold" style={{ fontSize: 7.5, fontFamily: "'Arial', sans-serif", letterSpacing: "0.02em" }}>AMEX</span>
                  </div>
                  {/* Discover */}
                  <div className="flex items-center justify-center rounded px-1.5 py-0.5 border" style={{ background: "white", borderColor: "oklch(0.82 0.015 80)", minWidth: 36, height: 22 }}>
                    <span className="font-bold" style={{ fontSize: 7, fontFamily: "'Arial', sans-serif", color: "#231F20", letterSpacing: "0.01em" }}>DISC<span style={{ color: "#F76F20" }}>VR</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>Also:</span>
                <div className="flex items-center gap-1.5">
                  {/* Apple Pay */}
                  <div className="flex items-center justify-center rounded px-2 border" style={{ background: "#000", borderColor: "#000", height: 22, minWidth: 52 }}>
                    <svg viewBox="0 0 50 20" width="42" height="14" fill="white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9.5 4.2c.6-.8.9-1.7.9-2.7-.9.1-2 .6-2.6 1.4-.6.7-1 1.6-.9 2.6.9 0 1.9-.5 2.6-1.3z"/>
                      <path d="M10.4 5.6c-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.9-.7-1.5.1-2.8.9-3.6 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.8 2.1 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.1.5-.7.9-1.5 1.2-2.3-3.1-1.2-2.5-5.5.2-6.6-.8-1.2-2-2-4-2z"/>
                      <text x="18" y="15" fontSize="11" fontFamily="-apple-system, Arial" fontWeight="600" fill="white">Pay</text>
                    </svg>
                  </div>
                  {/* Google Pay */}
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

            {/* Checkout button */}
            <button
              onClick={handleCheckout}
              disabled={isLoading || (orderType === "delivery" && isFetchingUberQuote)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded font-bold text-sm transition-all active:scale-[0.98]"
              style={{
                background: isLoading || (orderType === "delivery" && isFetchingUberQuote)
                  ? "oklch(0.55 0.03 30)"
                  : paymentMethod === "stripe"
                  ? "oklch(0.38 0.18 265)"
                  : "oklch(0.38 0.12 145)",
                color: "white",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {paymentMethod === "stripe" ? "Redirecting to Stripe..." : "Redirecting to Clover..."}
                </>
              ) : orderType === "delivery" && isFetchingUberQuote ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Getting delivery quote...
                </>
              ) : (
                <>
                  <Lock size={15} />
                  Pay Securely — ${grandTotal.toFixed(2)}
                  <ChevronRight size={16} />
                </>
              )}
            </button>
            <p className="text-center text-xs" style={{ color: "oklch(0.60 0.03 30)" }}>
              {paymentMethod === "stripe"
                ? orderType === "delivery"
                  ? "Delivery by Uber Direct · Secured by Stripe"
                  : "Secured by Stripe · PCI Compliant"
                : orderType === "delivery"
                ? "Delivery by Uber Direct · Secured by Clover"
                : "Secured by Clover · PCI Compliant"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
