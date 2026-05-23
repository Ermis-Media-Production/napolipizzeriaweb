import { useCart } from "@/contexts/CartContext";
import { X, Plus, Minus, Trash2, ShoppingCart, ChevronRight, Loader2, CreditCard, Lock } from "lucide-react";
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
        callback: (response: { opaqueData?: { dataDescriptor: string; dataValue: string }; messages?: { resultCode: string; message: Array<{ text: string }> } }) => void
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

  // Stripe checkout
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error("Could not start checkout: " + err.message),
  });

  // Authorize.net charge
  const chargeCard = trpc.authorizenet.chargeCard.useMutation({
    onSuccess: (data) => {
      clearCart();
      closeCart();
      navigate(`/order-success?txn=${data.transactionId}&method=authorizenet&name=${encodeURIComponent(data.customerName)}&total=${data.amount.toFixed(2)}&type=${data.orderType}`);
    },
    onError: (err) => {
      toast.error("Payment failed: " + err.message);
      setIsProcessingAuthNet(false);
    },
  });

  const handleStripeCheckout = () => {
    if (items.length === 0) return;
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
        clientKey: authnetConfig.apiLoginId, // Accept.js uses apiLoginId as client key
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

  const isLoading = createCheckout.isPending || isProcessingAuthNet || chargeCard.isPending;

  // Format card number with spaces
  const formatCardNumber = (val: string) =>
    val.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);

  // Format expiry MM/YY
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
          width: "min(440px, 100vw)",
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
            className="border-t px-4 py-4 space-y-3 shrink-0"
            style={{ borderColor: "oklch(0.88 0.015 80)", background: "white" }}
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
            <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
              <span className="text-sm font-semibold" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                Total ({totalItems} items)
              </span>
              <span className="text-xl font-bold" style={{ color: "var(--napoli-red, #c0392b)", fontFamily: "'Oswald', sans-serif" }}>
                ${totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Checkout button */}
            <button
              onClick={handleCheckout}
              disabled={isLoading}
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
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {paymentMethod === "authorizenet" ? "Processing Payment..." : "Redirecting to Payment..."}
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
              {paymentMethod === "authorizenet"
                ? "Secured by Authorize.net · PCI Compliant · Taxes not included"
                : "Secured by Stripe · Taxes not included"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
