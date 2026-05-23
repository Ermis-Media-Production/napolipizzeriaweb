import { useCart } from "@/contexts/CartContext";
import { X, Plus, Minus, Trash2, ShoppingCart, ChevronRight, Loader2, CreditCard, Lock, Truck, MapPin } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { CONVENIENCE_FEE_RATE, NV_SALES_TAX_RATE } from "@shared/const";

type PaymentMethod = "stripe" | "authorizenet";
type DeliveryProvider = "uber" | "doordash";

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

  // Delivery provider selection
  const [deliveryProvider, setDeliveryProvider] = useState<DeliveryProvider>("uber");

  // Uber Direct quote state
  const [uberQuoteId, setUberQuoteId] = useState<string | null>(null);
  const [uberFee, setUberFee] = useState<number | null>(null);
  const [uberEta, setUberEta] = useState<string | null>(null);
  const [isFetchingUberQuote, setIsFetchingUberQuote] = useState(false);

  // DoorDash quote state
  const [ddExternalId, setDdExternalId] = useState<string | null>(null);
  const [ddFee, setDdFee] = useState<number | null>(null);
  const [ddEta, setDdEta] = useState<string | null>(null);
  const [isFetchingDdQuote, setIsFetchingDdQuote] = useState(false);

  // Coupon / discount state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number; description: string } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

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

  // Reset quotes when order type changes away from delivery
  useEffect(() => {
    if (orderType !== "delivery") {
      setUberQuoteId(null); setUberFee(null); setUberEta(null);
      setDdExternalId(null); setDdFee(null); setDdEta(null);
    }
  }, [orderType]);

  // Reset quotes when address changes
  const handleAddressChange = (field: "address" | "city" | "state" | "zip", value: string) => {
    if (field === "address") setDeliveryAddress(value);
    if (field === "city") setDeliveryCity(value);
    if (field === "state") setDeliveryState(value);
    if (field === "zip") setDeliveryZip(value);
    setUberQuoteId(null); setUberFee(null); setUberEta(null);
    setDdExternalId(null); setDdFee(null); setDdEta(null);
  };

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
      toast.error("Uber Direct quote failed: " + err.message);
    },
  });

  const getDdQuote = trpc.doordash.getQuote.useMutation({
    onSuccess: (data) => {
      setDdExternalId(data.externalDeliveryId);
      setDdFee(data.fee);
      setDdEta(data.dropoffTimeEstimated);
      setIsFetchingDdQuote(false);
    },
    onError: (err) => {
      setIsFetchingDdQuote(false);
      toast.warning("DoorDash quote unavailable: " + err.message);
    },
  });

  const createUberDelivery = trpc.uber.createDelivery.useMutation();
  const createDdDelivery = trpc.doordash.createDelivery.useMutation();

  const redeemCoupon = trpc.coupon.redeem.useMutation();

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

  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error("Could not start checkout: " + err.message),
  });

  const chargeCard = trpc.authorizenet.chargeCard.useMutation({
    onSuccess: async (data) => {
      // Redeem coupon usage after successful payment
      if (data.couponCode) {
        redeemCoupon.mutate({ code: data.couponCode });
      }
      if (orderType === "delivery") {
        try {
          if (deliveryProvider === "uber" && uberQuoteId) {
            const delivery = await createUberDelivery.mutateAsync({
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
              `/order-success?txn=${data.transactionId}&method=authorizenet&name=${encodeURIComponent(data.customerName)}&total=${data.amount.toFixed(2)}&type=${data.orderType}&delivery_id=${encodeURIComponent(delivery.deliveryId)}&tracking_url=${encodeURIComponent(delivery.trackingUrl)}`
            );
          } else if (deliveryProvider === "doordash" && ddExternalId) {
            const [firstName, ...rest] = customerName.trim().split(" ");
            const delivery = await createDdDelivery.mutateAsync({
              externalDeliveryId: ddExternalId,
              dropoffAddress: `${deliveryAddress}, ${deliveryCity}, ${deliveryState} ${deliveryZip}`,
              dropoffContactGivenName: firstName || customerName,
              dropoffContactFamilyName: rest.join(" ") || undefined,
              dropoffPhone: customerPhone || "+17025550000",
              dropoffInstructions: deliveryNotes || undefined,
              orderValue: Math.round(totalPrice * 100),
              items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: Math.round(i.price * 100) })),
            });
            clearCart();
            closeCart();
            navigate(
              `/order-success?txn=${data.transactionId}&method=authorizenet&name=${encodeURIComponent(data.customerName)}&total=${data.amount.toFixed(2)}&type=${data.orderType}&provider=doordash&delivery_id=${encodeURIComponent(delivery.deliveryId)}&tracking_url=${encodeURIComponent(delivery.trackingUrl)}`
            );
          } else {
            clearCart();
            closeCart();
            navigate(
              `/order-success?txn=${data.transactionId}&method=authorizenet&name=${encodeURIComponent(data.customerName)}&total=${data.amount.toFixed(2)}&type=${data.orderType}`
            );
          }
        } catch {
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

  const handleGetQuotes = () => {
    if (!deliveryAddress.trim()) {
      toast.error("Please enter your delivery address.");
      return;
    }
    const fullAddress = `${deliveryAddress}, ${deliveryCity}, ${deliveryState} ${deliveryZip}`;
    const orderValueCents = Math.round(totalPrice * 100);
    const ddId = `napoli-${Date.now()}`;

    setIsFetchingUberQuote(true);
    getUberQuote.mutate({
      dropoffAddress: deliveryAddress,
      dropoffCity: deliveryCity,
      dropoffState: deliveryState,
      dropoffZip: deliveryZip,
    });

    setIsFetchingDdQuote(true);
    getDdQuote.mutate({
      externalDeliveryId: ddId,
      dropoffAddress: fullAddress,
      dropoffContactName: customerName || "Customer",
      dropoffPhone: customerPhone || "+17025550000",
      orderValue: orderValueCents,
      items: items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: Math.round(i.price * 100),
      })),
    });
  };

  const handleStripeCheckout = () => {
    if (items.length === 0) return;
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Please enter your delivery address.");
      return;
    }
    if (orderType === "delivery" && deliveryProvider === "uber" && !uberQuoteId) {
      toast.error("Please get a delivery quote first.");
      return;
    }
    if (orderType === "delivery" && deliveryProvider === "doordash" && !ddExternalId) {
      toast.error("Please get a delivery quote first.");
      return;
    }

    const deliveryMeta =
      orderType === "delivery" && deliveryProvider === "uber" && uberQuoteId
        ? {
            uberQuoteId,
            dropoffAddress: deliveryAddress,
            dropoffCity: deliveryCity,
            dropoffState: deliveryState,
            dropoffZip: deliveryZip,
            dropoffNotes: deliveryNotes || undefined,
          }
        : orderType === "delivery" && deliveryProvider === "doordash" && ddExternalId
        ? {
            doordashExternalId: ddExternalId,
            dropoffAddress: deliveryAddress,
            dropoffCity: deliveryCity,
            dropoffState: deliveryState,
            dropoffZip: deliveryZip,
            dropoffNotes: deliveryNotes || undefined,
            deliveryProvider: "doordash" as const,
          }
        : {};

    createCheckout.mutate({
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: i.category })),
      successUrl: `${window.location.origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/menu`,
      orderType,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      couponCode: appliedCoupon?.code || undefined,
      discountPercent: appliedCoupon?.discountPercent || undefined,
      // Delivery fee, convenience fee, and sales tax as separate Stripe line items
      deliveryFeeCents: selectedDeliveryFee !== null ? selectedDeliveryFee : undefined,
      convenienceFeeCents: Math.round(convenienceFee * 100),
      salesTaxCents: Math.round(salesTax * 100),
      ...deliveryMeta,
    });
  };

  const handleAuthorizeNetCheckout = () => {
    if (!authnetConfig?.configured) {
      toast.error("Authorize.net is not configured.");
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
    if (orderType === "delivery" && deliveryProvider === "uber" && !uberQuoteId) {
      toast.error("Please get a delivery quote first.");
      return;
    }
    if (orderType === "delivery" && deliveryProvider === "doordash" && !ddExternalId) {
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
        toast.error(response.messages.message?.[0]?.text ?? "Tokenization failed");
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
        couponCode: appliedCoupon?.code || undefined,
        discountPercent: appliedCoupon?.discountPercent || undefined,
        // Convenience fee and sales tax in cents
        convenienceFeeCents: Math.round(convenienceFee * 100),
        salesTaxCents: Math.round(salesTax * 100),
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
    createUberDelivery.isPending ||
    createDdDelivery.isPending;

  const isFetchingAnyQuote = isFetchingUberQuote || isFetchingDdQuote;
  const hasAnyQuote = orderType === "delivery" && (uberQuoteId !== null || ddExternalId !== null);
  const selectedDeliveryFee =
    orderType === "delivery"
      ? deliveryProvider === "uber" && uberFee !== null
        ? uberFee
        : deliveryProvider === "doordash" && ddFee !== null
        ? ddFee
        : null
      : null;

  // Pricing breakdown
  // 1. Food subtotal (from cart)
  const subtotal = totalPrice;
  // 2. Coupon discount applied to food subtotal
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discountPercent) / 100 : 0;
  const discountedSubtotal = subtotal - discountAmount;
  // 3. Convenience Fee: 3% of discounted food subtotal (non-taxable)
  const convenienceFee = Math.round(discountedSubtotal * CONVENIENCE_FEE_RATE * 100) / 100;
  // 4. Nevada Sales Tax: 8.375% of discounted food subtotal only (fee & delivery are not taxed)
  const salesTax = Math.round(discountedSubtotal * NV_SALES_TAX_RATE * 100) / 100;
  // 5. Delivery fee in dollars (quotes return cents)
  const deliveryFeeDollars = selectedDeliveryFee !== null ? selectedDeliveryFee / 100 : 0;
  // 6. Grand total
  const grandTotal = discountedSubtotal + convenienceFee + salesTax + deliveryFeeDollars;

  const formatCardNumber = (val: string) =>
    val.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

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
                className="flex items-center gap-3 p-3 rounded-lg border bg-white"
                style={{ borderColor: "oklch(0.88 0.015 80)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "oklch(0.22 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                    {item.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--napoli-red, #c0392b)" }}>
                    ${item.price.toFixed(2)} each
                  </p>
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
                  <input
                    type="text"
                    placeholder="City"
                    value={deliveryCity}
                    onChange={(e) => handleAddressChange("city", e.target.value)}
                    className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                    style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={deliveryState}
                    onChange={(e) => handleAddressChange("state", e.target.value)}
                    className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                    style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                  />
                  <input
                    type="text"
                    placeholder="ZIP"
                    value={deliveryZip}
                    onChange={(e) => handleAddressChange("zip", e.target.value)}
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

                {/* Get Quotes button — shown before quotes are fetched */}
                {!hasAnyQuote && !isFetchingAnyQuote && (
                  <button
                    onClick={handleGetQuotes}
                    disabled={!deliveryAddress.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-semibold border transition-all"
                    style={{
                      background: "var(--napoli-red, #c0392b)",
                      color: "white",
                      borderColor: "var(--napoli-red, #c0392b)",
                      fontFamily: "'Oswald', sans-serif",
                      opacity: !deliveryAddress.trim() ? 0.5 : 1,
                    }}
                  >
                    <Truck size={12} /> Get Delivery Quotes
                  </button>
                )}

                {/* Loading state */}
                {isFetchingAnyQuote && (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>
                    <Loader2 size={13} className="animate-spin" />
                    Getting quotes from both providers...
                  </div>
                )}

                {/* Provider cards — shown after at least one quote arrives */}
                {hasAnyQuote && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                      CHOOSE DELIVERY PROVIDER
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Uber Direct card */}
                      <button
                        onClick={() => uberQuoteId && setDeliveryProvider("uber")}
                        disabled={!uberQuoteId}
                        className="relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs transition-all"
                        style={{
                          borderColor: deliveryProvider === "uber" && uberQuoteId ? "oklch(0.40 0.15 220)" : "oklch(0.82 0.015 80)",
                          background: deliveryProvider === "uber" && uberQuoteId ? "oklch(0.95 0.04 220)" : !uberQuoteId ? "oklch(0.96 0.005 80)" : "white",
                          opacity: !uberQuoteId ? 0.55 : 1,
                        }}
                      >
                        <Truck size={16} style={{ color: uberQuoteId ? "oklch(0.40 0.15 220)" : "oklch(0.60 0.03 30)" }} />
                        <span className="font-bold" style={{ color: "oklch(0.22 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                          Uber Direct
                        </span>
                        {uberFee !== null ? (
                          <>
                            <span className="font-bold text-sm" style={{ color: "oklch(0.40 0.15 220)" }}>
                              ${(uberFee / 100).toFixed(2)}
                            </span>
                            {uberEta && (
                              <span style={{ color: "oklch(0.50 0.03 30)" }}>
                                ETA {new Date(uberEta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "oklch(0.60 0.03 30)" }}>Unavailable</span>
                        )}
                        {deliveryProvider === "uber" && uberQuoteId && (
                          <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full" style={{ background: "oklch(0.40 0.15 220)" }} />
                        )}
                      </button>

                      {/* DoorDash card */}
                      <button
                        onClick={() => ddExternalId && setDeliveryProvider("doordash")}
                        disabled={!ddExternalId}
                        className="relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs transition-all"
                        style={{
                          borderColor: deliveryProvider === "doordash" && ddExternalId ? "oklch(0.52 0.20 25)" : "oklch(0.82 0.015 80)",
                          background: deliveryProvider === "doordash" && ddExternalId ? "oklch(0.97 0.04 25)" : !ddExternalId ? "oklch(0.96 0.005 80)" : "white",
                          opacity: !ddExternalId ? 0.55 : 1,
                        }}
                      >
                        <Truck size={16} style={{ color: ddExternalId ? "oklch(0.52 0.20 25)" : "oklch(0.60 0.03 30)" }} />
                        <span className="font-bold" style={{ color: "oklch(0.22 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                          DoorDash
                        </span>
                        {ddFee !== null ? (
                          <>
                            <span className="font-bold text-sm" style={{ color: "oklch(0.52 0.20 25)" }}>
                              ${(ddFee / 100).toFixed(2)}
                            </span>
                            {ddEta && (
                              <span style={{ color: "oklch(0.50 0.03 30)" }}>
                                ETA {new Date(ddEta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "oklch(0.60 0.03 30)" }}>Unavailable</span>
                        )}
                        {deliveryProvider === "doordash" && ddExternalId && (
                          <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full" style={{ background: "oklch(0.52 0.20 25)" }} />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setUberQuoteId(null); setUberFee(null); setUberEta(null);
                        setDdExternalId(null); setDdFee(null); setDdEta(null);
                        setTimeout(handleGetQuotes, 0);
                      }}
                      className="w-full text-xs py-1 transition-colors"
                      style={{ color: "oklch(0.55 0.03 30)" }}
                    >
                      Refresh quotes
                    </button>
                  </div>
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
                <div className="flex items-center gap-1.5 mb-1">
                  <Lock size={12} style={{ color: "oklch(0.38 0.12 145)" }} />
                  <span className="text-xs font-semibold" style={{ color: "oklch(0.38 0.12 145)", fontFamily: "'Oswald', sans-serif" }}>
                    Card Details — Secured by Authorize.net
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

            {/* Coupon code input */}
            <div className="space-y-1.5">
              {appliedCoupon ? (
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-lg border"
                  style={{ borderColor: "oklch(0.70 0.15 145)", background: "oklch(0.96 0.04 145)" }}
                >
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

            {/* Order Summary — full receipt breakdown */}
            <div
              className="flex flex-col gap-1 py-2 border-t"
              style={{ borderColor: "oklch(0.88 0.015 80)" }}
            >
              {/* Food subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "oklch(0.50 0.03 30)" }}>Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
                <span className="text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>${subtotal.toFixed(2)}</span>
              </div>

              {/* Coupon discount */}
              {appliedCoupon && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "oklch(0.35 0.12 145)" }}>Discount ({appliedCoupon.discountPercent}% off — {appliedCoupon.code})</span>
                  <span className="text-xs font-semibold" style={{ color: "oklch(0.35 0.12 145)" }}>−${discountAmount.toFixed(2)}</span>
                </div>
              )}

              {/* Convenience Fee */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "oklch(0.50 0.03 30)" }}>
                  Convenience Fee (3%)
                </span>
                <span className="text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>+${convenienceFee.toFixed(2)}</span>
              </div>

              {/* Nevada Sales Tax */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "oklch(0.50 0.03 30)" }}>
                  Sales Tax (NV 8.375%)
                </span>
                <span className="text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>+${salesTax.toFixed(2)}</span>
              </div>

              {/* Delivery fee */}
              {selectedDeliveryFee !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "oklch(0.50 0.03 30)" }}>Delivery ({deliveryProvider === "uber" ? "Uber Direct" : "DoorDash Drive"})</span>
                  <span className="text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>+${deliveryFeeDollars.toFixed(2)}</span>
                </div>
              )}

              {/* Divider + Grand Total */}
              <div className="flex items-center justify-between pt-2 mt-1 border-t" style={{ borderColor: "oklch(0.82 0.015 80)" }}>
                <span className="text-sm font-semibold" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>Total</span>
                <span className="text-xl font-bold" style={{ color: "var(--napoli-red, #c0392b)", fontFamily: "'Oswald', sans-serif" }}>
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
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
                  {createUberDelivery.isPending
                    ? "Dispatching Uber..."
                    : createDdDelivery.isPending
                    ? "Dispatching DoorDash..."
                    : paymentMethod === "authorizenet"
                    ? "Processing Payment..."
                    : "Redirecting to Payment..."}
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
                ? `Delivery by ${deliveryProvider === "uber" ? "Uber Direct" : "DoorDash Drive"} · ${paymentMethod === "authorizenet" ? "Secured by Authorize.net" : "Secured by Stripe"}`
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
