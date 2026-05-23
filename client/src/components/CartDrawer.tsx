import { useCart } from "@/contexts/CartContext";
import { X, Plus, Minus, Trash2, ShoppingCart, ChevronRight, Loader2, CreditCard, Lock, Truck, MapPin } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

type PaymentMethod = "stripe" | "authorizenet";

declare global {
  interface Window {
    Accept?: {
      dispatchData: (
        secureData: {
          authData: { clientKey: string; apiLoginID: string };
          cardData: { cardNumber: string; month: string; year: string; cardCode: string };
        },
        callback: (response: {
          opaqueData?: { dataDescriptor: string; dataValue: string };
          messages?: { resultCode: string; message: Array<{ text: string }> };
        }) => void
      ) => void;
    };
  }
}

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
  const [, navigate] = useLocation();

  const [orderType, setOrderType] = useState<"delivery" | "pickup" | "dine-in">("pickup");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");

  // Delivery address fields
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("North Las Vegas");
  const [deliveryState, setDeliveryState] = useState("NV");
  const [deliveryZip, setDeliveryZip] = useState("89032");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Uber Direct quote state
  const [uberQuoteId, setUberQuoteId] = useState<string | null>(null);
  const [uberFee, setUberFee] = useState<number | null>(null);
  const [uberEta, setUberEta] = useState<string | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);

  // Authorize.net card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [isProcessingAuthNet, setIsProcessingAuthNet] = useState(false);

  // Load Accept.js script when Authorize.net is selected
  const acceptJsLoaded = useRef(false);
  const { data: authnetConfig } = trpc.authorizenet.getClientKey.useQuery();

  useEffect(() => {
    if (paymentMethod !== "authorizenet" || acceptJsLoaded.current) return;
    const isSandbox = authnetConfig?.isSandbox ?? true;
    const src = isSandbox
      ? "https://jstest.authorize.net/v1/Accept.js"
      : "https://js.authorize.net/v1/Accept.js";
    const existing = document.querySelector(`script[src="${src}"]`);
    if (!existing) {
      const script = document.createElement("script");
      script.src = src;
      script.charset = "utf-8";
      document.body.appendChild(script);
    }
    acceptJsLoaded.current = true;
  }, [paymentMethod, authnetConfig]);

  // Reset quote when order type changes away from delivery
  useEffect(() => {
    if (orderType !== "delivery") {
      setUberQuoteId(null);
      setUberFee(null);
      setUberEta(null);
    }
  }, [orderType]);

  // tRPC mutations
  const getQuote = trpc.uber.getQuote.useMutation({
    onSuccess: (data) => {
      setUberQuoteId(data.quoteId);
      setUberFee(data.fee);
      setUberEta(data.dropoffEta);
      setIsFetchingQuote(false);
      toast.success(`Delivery available! Fee: $${(data.fee / 100).toFixed(2)} · ETA: ~${data.duration} min`);
    },
    onError: (err) => {
      setIsFetchingQuote(false);
      toast.error("Could not get delivery quote: " + err.message);
    },
  });

  const createDelivery = trpc.uber.createDelivery.useMutation();

  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error("Could not start checkout: " + err.message),
  });

  const chargeCard = trpc.authorizenet.chargeCard.useMutation({
    onSuccess: async (data) => {
      // If delivery order, dispatch Uber Direct after payment
      if (orderType === "delivery" && uberQuoteId) {
        try {
          const delivery = await createDelivery.mutateAsync({
            quoteId: uberQuoteId,
            dropoffAddress: deliveryAddress,
            dropoffCity: deliveryCity,
            dropoffState: deliveryState,
            dropoffZip: deliveryZip,
            dropoffName: customerName,
            dropoffPhone: customerPhone || "+17025550000",
            dropoffNotes: deliveryNotes || undefined,
            orderItems: items.map((i) => ({ name: i.name, quantity: i.quantity })),
            externalId: data.transactionId,
          });
          clearCart();
          closeCart();
          navigate(
            `/order-success?txn=${data.transactionId}&method=authorizenet&name=${encodeURIComponent(data.customerName)}&total=${data.amount.toFixed(2)}&type=${data.orderType}&delivery_id=${delivery.deliveryId}&tracking_url=${encodeURIComponent(delivery.trackingUrl)}`
          );
        } catch {
          // Payment succeeded but delivery dispatch failed — still show success
          clearCart();
          closeCart();
          navigate(
            `/order-success?txn=${data.transactionId}&method=authorizenet&name=${encodeURIComponent(data.customerName)}&total=${data.amount.toFixed(2)}&type=${data.orderType}`
          );
          toast.warning("Payment successful, but delivery dispatch failed. We'll contact you shortly.");
        }
      } else {
        clearCart();
        closeCart();
        navigate(
          `/order-success?txn=${data.transactionId}&method=authorizenet&name=${encodeURIComponent(data.customerName)}&total=${data.amount.toFixed(2)}&type=${data.orderType}`
        );
      }
    },
    onError: (err) => {
      toast.error("Payment failed: " + err.message);
      setIsProcessingAuthNet(false);
    },
  });

  const handleGetQuote = () => {
    if (!deliveryAddress.trim()) {
      toast.error("Please enter your delivery address.");
      return;
    }
    setIsFetchingQuote(true);
    getQuote.mutate({
      dropoffAddress: deliveryAddress,
      dropoffCity: deliveryCity,
      dropoffState: deliveryState,
      dropoffZip: deliveryZip,
    });
  };

  const handleStripeCheckout = () => {
    if (items.length === 0) return;
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Please enter your delivery address.");
      return;
    }
    createCheckout.mutate({
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: i.category })),
      successUrl: `${window.location.origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/menu`,
      orderType,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
    });
  };

  const handleAuthorizeNetCheckout = () => {
    if (!authnetConfig?.configured) {
      toast.error("Authorize.net is not configured. Please add API credentials in Settings.");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Please enter your delivery address.");
      return;
    }
    if (orderType === "delivery" && !uberQuoteId) {
      toast.error("Please get a delivery quote first.");
      return;
    }
    if (!cardNumber || !cardExpiry || !cardCvc) {
      toast.error("Please fill in all card fields.");
      return;
    }

    const [expMonth, expYear] = cardExpiry.split("/").map((s) => s.trim());
    if (!expMonth || !expYear) {
      toast.error("Please enter expiry as MM/YY.");
      return;
    }

    if (!window.Accept) {
      toast.error("Payment library not loaded. Please try again.");
      return;
    }

    setIsProcessingAuthNet(true);

    const secureData = {
      authData: {
        clientKey: authnetConfig.apiLoginId,
        apiLoginID: authnetConfig.apiLoginId,
      },
      cardData: {
        cardNumber: cardNumber.replace(/\s/g, ""),
        month: expMonth.padStart(2, "0"),
        year: expYear.length === 2 ? `20${expYear}` : expYear,
        cardCode: cardCvc,
      },
    };

    window.Accept.dispatchData(secureData, (response) => {
      if (response.messages?.resultCode === "Error") {
        const errText = response.messages.message?.[0]?.text ?? "Tokenization failed";
        toast.error(errText);
        setIsProcessingAuthNet(false);
        return;
      }

      if (!response.opaqueData) {
        toast.error("Could not tokenize card. Please try again.");
        setIsProcessingAuthNet(false);
        return;
      }

      chargeCard.mutate({
        opaqueDataDescriptor: response.opaqueData.dataDescriptor,
        opaqueDataValue: response.opaqueData.dataValue,
        items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: i.category })),
        orderType,
        customerName,
        customerPhone: customerPhone || undefined,
      });
    });
  };

  const handleCheckout = () => {
    if (paymentMethod === "stripe") handleStripeCheckout();
    else handleAuthorizeNetCheckout();
  };

  const isLoading =
    createCheckout.isPending ||
    isProcessingAuthNet ||
    chargeCard.isPending ||
    createDelivery.isPending;

  const formatCardNumber = (val: string) =>
    val.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={closeCart}
          style={{ transition: "opacity 200ms ease-out" }}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl overflow-hidden"
        style={{
          width: "min(460px, 100vw)",
          background: "var(--napoli-cream, #faf8f3)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 280ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ background: "var(--napoli-red, #c0392b)", borderColor: "oklch(0.35 0.18 27)" }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-white" />
            <h2 className="text-white font-bold text-lg" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Your Order
            </h2>
            {totalItems > 0 && (
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "var(--napoli-gold, #f5a623)", color: "#1a0a00" }}
              >
                {totalItems}
              </span>
            )}
          </div>
          <button onClick={closeCart} className="text-white/80 hover:text-white transition-colors p-1 rounded">
            <X size={22} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <ShoppingCart size={48} style={{ color: "oklch(0.70 0.03 30)" }} />
              <div>
                <p className="font-semibold text-base" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                  Your cart is empty
                </p>
                <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.03 30)" }}>
                  Add items from the menu to get started
                </p>
              </div>
              <button
                onClick={closeCart}
                className="text-sm font-semibold px-5 py-2 rounded"
                style={{ background: "var(--napoli-red, #c0392b)", color: "white", fontFamily: "'Oswald', sans-serif" }}
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                  style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight" style={{ color: "oklch(0.22 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "oklch(0.55 0.03 30)" }}>
                        {item.description}
                      </p>
                    )}
                    <p className="text-sm font-bold mt-1" style={{ color: "var(--napoli-red, #c0392b)" }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center border transition-colors hover:bg-red-50"
                      style={{ borderColor: "oklch(0.82 0.015 80)" }}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold" style={{ color: "oklch(0.22 0.04 30)" }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center border transition-colors hover:bg-red-50"
                      style={{ borderColor: "oklch(0.82 0.015 80)" }}
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center ml-1 transition-colors hover:bg-red-100"
                      style={{ color: "var(--napoli-red, #c0392b)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={clearCart}
                className="text-xs w-full text-center py-1.5 transition-colors"
                style={{ color: "oklch(0.55 0.03 30)" }}
              >
                Clear all items
              </button>
            </div>
          )}
        </div>

        {/* Checkout panel */}
        {items.length > 0 && (
          <div
            className="border-t px-4 py-4 space-y-3 shrink-0 overflow-y-auto"
            style={{ borderColor: "oklch(0.88 0.015 80)", background: "white", maxHeight: "70vh" }}
          >
            {/* Order type */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
                ORDER TYPE
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["pickup", "delivery", "dine-in"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className="py-2 rounded text-xs font-semibold capitalize border transition-all"
                    style={{
                      background: orderType === type ? "var(--napoli-red, #c0392b)" : "transparent",
                      color: orderType === type ? "white" : "oklch(0.42 0.03 30)",
                      borderColor: orderType === type ? "var(--napoli-red, #c0392b)" : "oklch(0.82 0.015 80)",
                      fontFamily: "'Oswald', sans-serif",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Uber Direct Delivery Address — shown only when delivery is selected */}
            {orderType === "delivery" && (
              <div
                className="space-y-2 p-3 rounded-lg border"
                style={{ borderColor: "oklch(0.75 0.12 220)", background: "oklch(0.97 0.01 220)" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Truck size={13} style={{ color: "oklch(0.40 0.15 220)" }} />
                  <span className="text-xs font-semibold" style={{ color: "oklch(0.40 0.15 220)", fontFamily: "'Oswald', sans-serif" }}>
                    Uber Direct Delivery
                  </span>
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "oklch(0.40 0.15 220)", color: "white" }}
                  >
                    Powered by Uber
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Street address *"
                  value={deliveryAddress}
                  onChange={(e) => { setDeliveryAddress(e.target.value); setUberQuoteId(null); setUberFee(null); }}
                  className="w-full text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                  style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={deliveryCity}
                    onChange={(e) => { setDeliveryCity(e.target.value); setUberQuoteId(null); }}
                    className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                    style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={deliveryState}
                    onChange={(e) => { setDeliveryState(e.target.value); setUberQuoteId(null); }}
                    className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                    style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                  />
                  <input
                    type="text"
                    placeholder="ZIP"
                    value={deliveryZip}
                    onChange={(e) => { setDeliveryZip(e.target.value); setUberQuoteId(null); }}
                    className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                    style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Delivery notes (apt #, gate code...)"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                  style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                />

                {/* Quote result or button */}
                {uberQuoteId && uberFee !== null ? (
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded"
                    style={{ background: "oklch(0.93 0.06 145)", border: "1px solid oklch(0.75 0.10 145)" }}
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} style={{ color: "oklch(0.35 0.12 145)" }} />
                      <span className="text-xs font-semibold" style={{ color: "oklch(0.30 0.10 145)", fontFamily: "'Oswald', sans-serif" }}>
                        Delivery fee: ${(uberFee / 100).toFixed(2)}
                      </span>
                    </div>
                    {uberEta && (
                      <span className="text-xs" style={{ color: "oklch(0.40 0.08 145)" }}>
                        ETA: {new Date(uberEta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleGetQuote}
                    disabled={isFetchingQuote || !deliveryAddress.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-semibold border transition-all"
                    style={{
                      background: isFetchingQuote ? "transparent" : "oklch(0.40 0.15 220)",
                      color: isFetchingQuote ? "oklch(0.40 0.15 220)" : "white",
                      borderColor: "oklch(0.40 0.15 220)",
                      fontFamily: "'Oswald', sans-serif",
                    }}
                  >
                    {isFetchingQuote ? (
                      <><Loader2 size={12} className="animate-spin" /> Getting quote...</>
                    ) : (
                      <><Truck size={12} /> Get Delivery Quote</>
                    )}
                  </button>
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

            {/* Payment method selector */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
                PAYMENT METHOD
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod("stripe")}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded border text-xs font-semibold transition-all"
                  style={{
                    background: paymentMethod === "stripe" ? "oklch(0.46 0.18 264)" : "transparent",
                    color: paymentMethod === "stripe" ? "white" : "oklch(0.42 0.03 30)",
                    borderColor: paymentMethod === "stripe" ? "oklch(0.46 0.18 264)" : "oklch(0.82 0.015 80)",
                    fontFamily: "'Oswald', sans-serif",
                  }}
                >
                  <CreditCard size={14} />
                  Stripe
                </button>
                <button
                  onClick={() => setPaymentMethod("authorizenet")}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded border text-xs font-semibold transition-all"
                  style={{
                    background: paymentMethod === "authorizenet" ? "oklch(0.38 0.12 145)" : "transparent",
                    color: paymentMethod === "authorizenet" ? "white" : "oklch(0.42 0.03 30)",
                    borderColor: paymentMethod === "authorizenet" ? "oklch(0.38 0.12 145)" : "oklch(0.82 0.015 80)",
                    fontFamily: "'Oswald', sans-serif",
                  }}
                >
                  <Lock size={14} />
                  Authorize.net
                </button>
              </div>
            </div>

            {/* Authorize.net card fields */}
            {paymentMethod === "authorizenet" && (
              <div className="space-y-2 p-3 rounded-lg border" style={{ borderColor: "oklch(0.82 0.015 80)", background: "oklch(0.98 0.005 80)" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lock size={12} style={{ color: "oklch(0.38 0.12 145)" }} />
                  <span className="text-xs font-semibold" style={{ color: "oklch(0.38 0.12 145)", fontFamily: "'Oswald', sans-serif" }}>
                    Secure Card Entry (Authorize.net)
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Card number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  className="w-full text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                  style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                  autoComplete="cc-number"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                    className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                    style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                    autoComplete="cc-exp"
                  />
                  <input
                    type="text"
                    placeholder="CVV"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                    style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                    autoComplete="cc-csc"
                  />
                </div>
                {!authnetConfig?.configured && (
                  <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1.5 rounded border border-amber-200">
                    Authorize.net credentials not configured. Add API Login ID and Transaction Key in Secrets.
                  </p>
                )}
              </div>
            )}

            {/* Total */}
            <div
              className="flex items-center justify-between py-2 border-t"
              style={{ borderColor: "oklch(0.88 0.015 80)" }}
            >
              <div>
                <span className="text-sm font-semibold" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                  Total ({totalItems} items)
                </span>
                {orderType === "delivery" && uberFee !== null && (
                  <p className="text-xs" style={{ color: "oklch(0.50 0.03 30)" }}>
                    + ${(uberFee / 100).toFixed(2)} delivery fee
                  </p>
                )}
              </div>
              <span className="text-xl font-bold" style={{ color: "var(--napoli-red, #c0392b)", fontFamily: "'Oswald', sans-serif" }}>
                ${orderType === "delivery" && uberFee !== null
                  ? (totalPrice + uberFee / 100).toFixed(2)
                  : totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Checkout button */}
            <button
              onClick={handleCheckout}
              disabled={isLoading || (orderType === "delivery" && !uberQuoteId && paymentMethod === "authorizenet")}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded font-bold text-sm transition-all active:scale-[0.98]"
              style={{
                background: isLoading
                  ? "oklch(0.55 0.03 30)"
                  : paymentMethod === "authorizenet"
                  ? "oklch(0.38 0.12 145)"
                  : "var(--napoli-red, #c0392b)",
                color: "white",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.05em",
                opacity: orderType === "delivery" && !uberQuoteId && paymentMethod === "authorizenet" ? 0.6 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {createDelivery.isPending ? "Dispatching Uber..." : paymentMethod === "authorizenet" ? "Processing Payment..." : "Redirecting to Payment..."}
                </>
              ) : (
                <>
                  {paymentMethod === "authorizenet" ? <Lock size={15} /> : <CreditCard size={15} />}
                  {paymentMethod === "authorizenet" ? "Pay Securely" : "Pay with Stripe"}
                  <ChevronRight size={16} />
                </>
              )}
            </button>

            <p className="text-center text-xs" style={{ color: "oklch(0.60 0.03 30)" }}>
              {orderType === "delivery"
                ? "Delivery powered by Uber Direct · " + (paymentMethod === "authorizenet" ? "Secured by Authorize.net" : "Secured by Stripe")
                : paymentMethod === "authorizenet"
                ? "Secured by Authorize.net · PCI Compliant · Taxes not included"
                : "Secured by Stripe · Taxes not included"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
