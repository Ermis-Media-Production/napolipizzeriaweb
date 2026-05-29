// CartDrawer — Authorize.net Accept.js payment flow
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { NV_SALES_TAX_RATE } from "@shared/const";
import { OrderScheduler, OrderPoliciesNote, type ScheduleSelection } from "./OrderScheduler";
import { useCart } from "@/contexts/CartContext";
import AddressAutocomplete, { type AddressComponents } from "@/components/AddressAutocomplete";
import {
  ShoppingCart, X, Minus, Plus, Trash2, Lock, Loader2, MapPin,
  AlertTriangle, CheckCircle2, Clock, Calendar, Info, CreditCard, MessageSquare,
} from "lucide-react";

// ─── Restaurant center (3131 W Craig Rd, North Las Vegas, NV) ─────────────────
const RESTAURANT_LAT = 36.2481;
const RESTAURANT_LNG = -115.2087;
const MAX_DELIVERY_MILES = 20;

/** Haversine distance in miles between two lat/lng points */
function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Accept.js types ──────────────────────────────────────────────────────────
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
          messages: { resultCode: string; message: Array<{ code: string; text: string }> };
        }) => void
      ) => void;
    };
  }
}

// ─── Authorize.net card form ──────────────────────────────────────────────────
interface AuthNetFormProps {
  apiLoginId: string;
  clientKey: string;
  grandTotal: number;
  onTokenize: (descriptor: string, value: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  errorMsg: string | null;
}

function AuthNetCardForm({
  apiLoginId,
  clientKey,
  grandTotal,
  onTokenize,
  onCancel,
  isProcessing,
  errorMsg,
}: AuthNetFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [zip, setZip] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const formatCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const rawCard = cardNumber.replace(/\s/g, "");
    if (rawCard.length < 13) { setLocalError("Please enter a valid card number."); return; }
    if (!expMonth || !expYear) { setLocalError("Please enter expiration date."); return; }
    if (cvv.length < 3) { setLocalError("Please enter your security code."); return; }

    if (!window.Accept) {
      setLocalError("Payment system not loaded. Please refresh and try again.");
      return;
    }

    window.Accept.dispatchData(
      {
        authData: { clientKey, apiLoginID: apiLoginId },
        cardData: {
          cardNumber: rawCard,
          month: expMonth.padStart(2, "0"),
          year: expYear.length === 2 ? `20${expYear}` : expYear,
          cardCode: cvv,
        },
      },
      (response) => {
        if (response.messages.resultCode === "Error") {
          const msg = response.messages.message?.[0]?.text ?? "Card tokenization failed.";
          setLocalError(msg);
          return;
        }
        if (!response.opaqueData) {
          setLocalError("No token returned. Please try again.");
          return;
        }
        onTokenize(response.opaqueData.dataDescriptor, response.opaqueData.dataValue);
      }
    );
  };

  const inputStyle = {
    borderColor: "oklch(0.82 0.015 80)",
    fontFamily: "'Lato', sans-serif",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Card number */}
      <div>
        <label className="text-xs font-semibold mb-1 block" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
          CARD NUMBER
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCard(e.target.value))}
            className="w-full text-sm px-3 py-2.5 rounded border outline-none focus:ring-1 pr-10"
            style={inputStyle}
            autoComplete="cc-number"
          />
          <CreditCard size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.60 0.03 30)" }} />
        </div>
      </div>

      {/* Expiry + CVV */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
            MONTH
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="MM"
            maxLength={2}
            value={expMonth}
            onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
            className="w-full text-sm px-3 py-2.5 rounded border outline-none focus:ring-1 text-center"
            style={inputStyle}
            autoComplete="cc-exp-month"
          />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
            YEAR
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="YY"
            maxLength={4}
            value={expYear}
            onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="w-full text-sm px-3 py-2.5 rounded border outline-none focus:ring-1 text-center"
            style={inputStyle}
            autoComplete="cc-exp-year"
          />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
            CVV
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="123"
            maxLength={4}
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="w-full text-sm px-3 py-2.5 rounded border outline-none focus:ring-1 text-center"
            style={inputStyle}
            autoComplete="cc-csc"
          />
        </div>
      </div>

      {/* ZIP */}
      <div>
        <label className="text-xs font-semibold mb-1 block" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
          ZIP CODE
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="89115"
          maxLength={10}
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 10))}
          className="w-full text-sm px-3 py-2.5 rounded border outline-none focus:ring-1"
          style={inputStyle}
          autoComplete="postal-code"
        />
      </div>

      {/* Error */}
      {(localError || errorMsg) && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded border text-xs"
          style={{ borderColor: "oklch(0.70 0.18 25)", background: "oklch(0.97 0.04 25)", color: "oklch(0.40 0.18 25)" }}
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {localError ?? errorMsg}
        </div>
      )}

      {/* Pay button */}
      <button
        type="submit"
        disabled={isProcessing}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded font-bold text-sm transition-all active:scale-[0.98]"
        style={{
          background: isProcessing ? "oklch(0.55 0.03 30)" : "var(--napoli-red, #c0392b)",
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
        ← Edit order details
      </button>

      <p className="text-center text-xs pb-2" style={{ color: "oklch(0.60 0.03 30)" }}>
        🔒 Secured by Authorize.net · PCI Compliant
      </p>
    </form>
  );
}

// ─── Main CartDrawer ──────────────────────────────────────────────────────────
export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, clearCart, totalItems, totalPrice, pendingOrderType, clearPendingOrderType } = useCart();
  const [, navigate] = useLocation();
  const [orderType, setOrderType] = useState<"delivery" | "pickup" | "dine-in" | "scheduled">("pickup");
  const [customerName, setCustomerName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
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
  const [geoValidated, setGeoValidated] = useState(false);

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

  // Checkout step: "details" = order form, "payment" = card form
  const [checkoutStep, setCheckoutStep] = useState<"details" | "payment">("details");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Store open/closed status (Las Vegas time)
  const { data: storeStatus } = trpc.orders.storeStatus.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const storeIsOpen = storeStatus?.isOpen ?? true;
  const nextOpenTime = storeStatus?.nextOpeningMs
    ? new Date(storeStatus.nextOpeningMs).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "10:00 AM";

  // Live convenience fee config from DB
  const { data: feeConfig, isLoading: feeConfigLoading } = trpc.settings.getConvenienceFee.useQuery();
  const liveFeeRate = feeConfigLoading ? 0.03 : feeConfig?.enabled ? feeConfig.percent / 100 : 0;

  // Authorize.net client credentials
  const { data: authnetConfig } = trpc.authnet.getClientKey.useQuery();

  // Load Accept.js script once when payment step is entered
  useEffect(() => {
    if (checkoutStep !== "payment") return;
    if (document.getElementById("acceptjs-script")) return;
    const isSandbox = authnetConfig?.isSandbox ?? false;
    const src = isSandbox
      ? "https://jstest.authorize.net/v1/Accept.js"
      : "https://js.authorize.net/v1/Accept.js";
    const script = document.createElement("script");
    script.id = "acceptjs-script";
    script.src = src;
    script.charset = "utf-8";
    document.head.appendChild(script);
  }, [checkoutStep, authnetConfig?.isSandbox]);

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

  // Reset to details step when cart closes
  useEffect(() => {
    if (!isOpen) {
      setCheckoutStep("details");
      setPaymentError(null);
      setIsProcessingPayment(false);
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

  const chargeCard = trpc.authnet.chargeCard.useMutation({
    onSuccess: (data) => {
      clearCart();
      navigate(`/order-success?payment=authnet&transaction_id=${data.transactionId}&auth_code=${data.authCode}&amount=${data.amount.toFixed(2)}&order_type=${data.orderType}&customer=${encodeURIComponent(data.customerName)}&items=${data.itemCount}`);
      closeCart();
    },
    onError: (err) => {
      setPaymentError(err.message);
      setIsProcessingPayment(false);
    },
  });

  // Pay by Link mutation — generates Authorize.net hosted payment URL and sends via SMS
  const sendPayByLink = trpc.authnet.sendPayByLink.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.smsSent
          ? `✅ Payment link sent to ${customerPhone}!`
          : `Payment link generated but SMS failed. Share manually.`,
        { duration: 6000 }
      );
    },
    onError: (err) => {
      toast.error(`Pay by Link failed: ${err.message}`);
    },
  });

  const handleSendPayByLink = async () => {
    if (!validateForm()) return;
    if (!customerPhone || !isPhoneValid(customerPhone)) {
      toast.error(
        "📱 Please enter a valid 10-digit phone number to receive the pay link via SMS. / Por favor ingresa un número de teléfono válido de 10 dígitos para recibir el link de pago.",
        { duration: 5000 }
      );
      return;
    }
    if (orderType === "delivery" && !geoValidated) {
      const ok = await validateDeliveryRadius(deliveryAddress, deliveryCity, deliveryState, deliveryZip);
      if (!ok) return;
    }
    const { payload } = buildOrderPayload();
    sendPayByLink.mutate({
      items: payload.items,
      orderType: payload.orderType,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone!,
      customerEmail: payload.customerEmail,
      couponCode: payload.couponCode,
      discountPercent: payload.discountPercent,
      convenienceFeeCents: payload.convenienceFeeCents,
      salesTaxCents: payload.salesTaxCents,
      origin: window.location.origin,
    });
  };

  const utils = trpc.useUtils();

  /** Build the order payload */
  const buildOrderPayload = useCallback(() => {
    const resolvedSchedule: ScheduleSelection = schedule ?? { type: "asap" };
    const apiOrderType = orderType === "scheduled" ? "pickup" : orderType as "delivery" | "pickup" | "dine-in";
    const subtotalVal = totalPrice;
    const discountAmountVal = appliedCoupon ? (subtotalVal * appliedCoupon.discountPercent) / 100 : 0;
    const discountedSubtotalVal = subtotalVal - discountAmountVal;
    const convenienceFeeVal = Math.round(discountedSubtotalVal * liveFeeRate * 100) / 100;
    const salesTaxVal = Math.round(discountedSubtotalVal * NV_SALES_TAX_RATE * 100) / 100;
    const selectedDeliveryFeeVal = orderType === "delivery" && uberFee !== null ? uberFee : null;
    const deliveryFeeDollarsVal = selectedDeliveryFeeVal !== null ? selectedDeliveryFeeVal / 100 : 0;
    const grandTotalVal = discountedSubtotalVal + convenienceFeeVal + salesTaxVal + deliveryFeeDollarsVal;
    return {
      payload: {
        items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: i.category, description: i.description ?? "" })),
        customerName: customerLastName.trim() ? `${customerName} ${customerLastName}` : customerName,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        orderType: apiOrderType,
        couponCode: appliedCoupon?.code || undefined,
        discountPercent: appliedCoupon?.discountPercent || undefined,
        convenienceFeeCents: Math.round(convenienceFeeVal * 100),
        salesTaxCents: Math.round(salesTaxVal * 100),
        scheduledAt: resolvedSchedule.type === "asap" ? Date.now() : resolvedSchedule.scheduledAt,
        isAsap: resolvedSchedule.type === "asap",
        uberQuoteId: orderType === "delivery" && uberQuoteId ? uberQuoteId : undefined,
        dropoffAddress: orderType === "delivery" ? deliveryAddress : undefined,
        dropoffCity: orderType === "delivery" ? deliveryCity : undefined,
        dropoffState: orderType === "delivery" ? deliveryState : undefined,
        dropoffZip: orderType === "delivery" ? deliveryZip : undefined,
        dropoffNotes: orderType === "delivery" && deliveryNotes ? deliveryNotes : undefined,
      },
      grandTotalVal,
    };
  }, [items, customerName, customerLastName, customerPhone, customerEmail, orderType, schedule, appliedCoupon, liveFeeRate, uberFee, uberQuoteId, deliveryAddress, deliveryCity, deliveryState, deliveryZip, deliveryNotes, totalPrice]);

  /** Geocode address and check 20-mile radius */
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
        setGeoError(`Sorry, we only deliver within ${MAX_DELIVERY_MILES} miles. Your address is ~${miles.toFixed(1)} miles away. Call 725-204-0379 for special arrangements.`);
        setIsGeoChecking(false);
        return false;
      }
      setGeoError(null);
      setIsGeoChecking(false);
      return true;
    } catch {
      setIsGeoChecking(false);
      return true;
    }
  }, []);

  /** Trigger an Uber Direct quote — debounced 800ms */
  const quoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerUberQuote = (address: string, city: string, state: string, zip: string) => {
    if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    setUberQuoteId(null); setUberFee(null); setUberEta(null);
    if (!address.trim()) return;
    quoteDebounceRef.current = setTimeout(() => {
      setIsFetchingUberQuote(true);
      getUberQuote.mutate({ dropoffAddress: address, dropoffCity: city, dropoffState: state, dropoffZip: zip });
    }, 800);
  };

  const handleAddressChange = (field: "address" | "city" | "state" | "zip", value: string) => {
    setGeoValidated(false);
    const newAddress = field === "address" ? value : deliveryAddress;
    const newCity    = field === "city"    ? value : deliveryCity;
    const newState   = field === "state"   ? value : deliveryState;
    const newZip     = field === "zip"     ? value : deliveryZip;
    if (field === "address") setDeliveryAddress(value);
    if (field === "city")    setDeliveryCity(value);
    if (field === "state")   setDeliveryState(value);
    if (field === "zip")     setDeliveryZip(value);
    triggerUberQuote(newAddress, newCity, newState, newZip);
    if (geoDebounceRef.current) clearTimeout(geoDebounceRef.current);
    geoDebounceRef.current = setTimeout(() => {
      validateDeliveryRadius(newAddress, newCity, newState, newZip);
    }, 1200);
  };

  const handleAddressSelect = useCallback((components: AddressComponents) => {
    setDeliveryAddress(components.streetAddress);
    setDeliveryCity(components.city || "North Las Vegas");
    setDeliveryState(components.state || "NV");
    setDeliveryZip(components.zip || "");
    setGeoError(null);
    const miles = haversineMiles(RESTAURANT_LAT, RESTAURANT_LNG, components.lat, components.lng);
    if (miles > MAX_DELIVERY_MILES) {
      setGeoError(`Sorry, we only deliver within ${MAX_DELIVERY_MILES} miles. Your address is ~${miles.toFixed(1)} miles away. Call 725-204-0379 for special arrangements.`);
      setGeoValidated(false);
    } else {
      setGeoValidated(true);
      triggerUberQuote(components.streetAddress, components.city || "North Las Vegas", components.state || "NV", components.zip || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const isStoreClosed = !storeIsOpen && orderType !== "scheduled";

  /** Strip non-digits and return digit-only string */
  const digitsOnly = (v: string) => v.replace(/\D/g, "");

  /** Returns true if phone has at least 10 digits */
  const isPhoneValid = (phone: string) => digitsOnly(phone).length >= 10;

  const validateForm = () => {
    if (items.length === 0) return false;
    if (!customerName.trim()) {
      toast.error("Please enter your name. / Por favor ingresa tu nombre.");
      return false;
    }
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Please enter your delivery address. / Por favor ingresa tu dirección.");
      return false;
    }
    if (orderType === "delivery" && geoError) {
      toast.error("Delivery address is outside our service area. / Dirección fuera del área de entrega.");
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
    if (orderType === "delivery" && !geoValidated) {
      const ok = await validateDeliveryRadius(deliveryAddress, deliveryCity, deliveryState, deliveryZip);
      if (!ok) return;
    }
    setPaymentError(null);
    setCheckoutStep("payment");
  };

  /** Called by AuthNetCardForm after Accept.js tokenizes the card */
  const handleTokenize = async (descriptor: string, value: string) => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    const { payload } = buildOrderPayload();
    chargeCard.mutate({
      opaqueDataDescriptor: descriptor,
      opaqueDataValue: value,
      items: payload.items,
      orderType: payload.orderType,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      couponCode: payload.couponCode,
      discountPercent: payload.discountPercent,
      convenienceFeeCents: payload.convenienceFeeCents,
      salesTaxCents: payload.salesTaxCents,
    });
  };

  const isLoading = feeConfigLoading;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={checkoutStep === "details" ? closeCart : undefined}
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
            {totalItems > 0 && checkoutStep === "details" && (
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

        {/* ── ORDER DETAILS STEP ─────────────────────────────────────────────── */}
        {items.length > 0 && checkoutStep === "details" && (
          <div className="flex-1 overflow-y-auto">
            {/* Cart items */}
            <div className="px-4 py-3 space-y-2">
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

            {/* Order details form */}
            <div className="border-t px-4 py-4 space-y-3" style={{ borderColor: "oklch(0.88 0.015 80)", background: "white" }}>

              {/* ── Closed-store banner ── */}
              {isStoreClosed && (
                <div
                  className="rounded-lg border p-3 space-y-2.5"
                  style={{ borderColor: "oklch(0.75 0.12 45)", background: "oklch(0.97 0.05 45)" }}
                >
                  <div className="flex items-start gap-2">
                    <Clock size={15} className="shrink-0 mt-0.5" style={{ color: "oklch(0.52 0.15 45)" }} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: "oklch(0.35 0.12 45)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em" }}>
                        WE'RE CURRENTLY CLOSED
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.08 45)", fontFamily: "'Lato', sans-serif" }}>
                        Our hours are <strong>10:00 AM – 10:00 PM</strong> daily (Las Vegas time).
                        We open at <strong>{nextOpenTime}</strong>.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "oklch(0.40 0.08 45)", fontFamily: "'Lato', sans-serif" }}>
                    Online orders are accepted daily during restaurant hours: <strong>10:00 AM – 10:00 PM</strong>.
                    You can place a <strong>scheduled order</strong> now and we'll prepare it when we open!
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setOrderType("scheduled")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded font-bold text-xs transition-all active:scale-[0.98]"
                      style={{ background: "var(--napoli-red, #c0392b)", color: "white", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}
                    >
                      <Calendar size={13} />
                      Schedule Order for {nextOpenTime}
                    </button>
                    <a
                      href="/reservations"
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded text-xs border transition-colors hover:bg-amber-50"
                      style={{ borderColor: "oklch(0.75 0.12 45)", color: "oklch(0.40 0.10 45)", fontFamily: "'Lato', sans-serif" }}
                    >
                      <Info size={12} />
                      For events outside our hours, visit Reservations →
                    </a>
                  </div>
                </div>
              )}

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
                  <AddressAutocomplete
                    value={deliveryAddress}
                    onChange={(val) => handleAddressChange("address", val)}
                    onSelect={handleAddressSelect}
                    placeholder="Street address *"
                    hasError={!!geoError}
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
              <input
                type="text"
                placeholder="Your name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
              />
              <input
                type="text"
                placeholder="Last name"
                value={customerLastName}
                onChange={(e) => setCustomerLastName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
              />
              {/* Phone — required for SMS pay link, highlighted prominently */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 px-0.5">
                  <span className="text-xs font-semibold" style={{ color: "oklch(0.40 0.18 25)", fontFamily: "'Oswald', sans-serif" }}>📱 PHONE NUMBER</span>
                  <span className="text-xs font-bold" style={{ color: "oklch(0.40 0.18 25)" }}>*</span>
                  <span className="text-xs" style={{ color: "oklch(0.55 0.03 30)" }}>— required to receive your pay link via SMS</span>
                </div>
                <input
                  type="tel"
                  placeholder="(702) 555-1234"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded border-2 outline-none focus:ring-2 font-semibold"
                  style={{
                    borderColor: customerPhone.trim() === "" ? "oklch(0.65 0.18 25)" : isPhoneValid(customerPhone) ? "oklch(0.55 0.18 145)" : "oklch(0.55 0.18 25)",
                    background: customerPhone.trim() === "" ? "oklch(0.99 0.02 25)" : isPhoneValid(customerPhone) ? "oklch(0.97 0.03 145)" : "oklch(0.99 0.03 25)",
                    fontFamily: "'Lato', sans-serif",
                    color: "oklch(0.25 0.03 30)",
                  }}
                />
                {/* Inline validation hint */}
                {customerPhone.trim() !== "" && !isPhoneValid(customerPhone) && (
                  <p className="text-xs mt-0.5 px-0.5" style={{ color: "oklch(0.45 0.18 25)", fontFamily: "'Lato', sans-serif" }}>
                    ⚠️ At least 10 digits required · Se requieren al menos 10 dígitos
                  </p>
                )}
                {customerPhone.trim() !== "" && isPhoneValid(customerPhone) && (
                  <p className="text-xs mt-0.5 px-0.5" style={{ color: "oklch(0.40 0.15 145)", fontFamily: "'Lato', sans-serif" }}>
                    ✓ Phone number valid · Número válido
                  </p>
                )}
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
              </div>

              {/* ── PROCEED TO PAYMENT button ── */}
              <button
                onClick={handleProceedToPayment}
                disabled={isLoading || (orderType === "delivery" && (isFetchingUberQuote || isGeoChecking)) || !!geoError || isStoreClosed}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded font-bold text-sm transition-all active:scale-[0.98]"
                style={{
                  background: isLoading || (orderType === "delivery" && isFetchingUberQuote) || !!geoError || isStoreClosed
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
                    Loading...
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
                  </>
                )}
              </button>
              {/* ── PAY BY LINK (SMS) button ── */}
              <button
                onClick={handleSendPayByLink}
                disabled={sendPayByLink.isPending || isLoading || !!geoError || isStoreClosed}
                className="w-full flex items-center justify-center gap-2 py-3 rounded font-bold text-sm transition-all active:scale-[0.98] border-2"
                style={{
                  background: "transparent",
                  borderColor: sendPayByLink.isPending || isLoading || !!geoError || isStoreClosed
                    ? "oklch(0.75 0.03 30)"
                    : "oklch(0.38 0.18 25)",
                  color: sendPayByLink.isPending || isLoading || !!geoError || isStoreClosed
                    ? "oklch(0.65 0.03 30)"
                    : "oklch(0.38 0.18 25)",
                  fontFamily: "'Oswald', sans-serif",
                  letterSpacing: "0.05em",
                }}
              >
                {sendPayByLink.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Sending SMS...
                  </>
                ) : (
                  <>
                    <MessageSquare size={15} />
                    Send Pay Link via SMS — ${grandTotal.toFixed(2)}
                  </>
                )}
              </button>
              <p className="text-center text-xs pb-4" style={{ color: "oklch(0.60 0.03 30)" }}>
                {orderType === "delivery"
                  ? "Delivery by Uber Direct · Secured by Authorize.net"
                  : "Secured by Authorize.net · PCI Compliant"}
              </p>
            </div>
          </div>
        )}

        {/* ── PAYMENT STEP — Authorize.net Accept.js form ───────────────────── */}
        {items.length > 0 && checkoutStep === "payment" && (
          <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: "white" }}>
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
                  For: {customerName}{customerLastName.trim() ? ` ${customerLastName}` : ""}{customerPhone ? ` · ${customerPhone}` : ""}
                </p>
              )}
            </div>

            <p className="text-xs font-semibold mb-3" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
              PAYMENT DETAILS
            </p>

            {authnetConfig?.configured ? (
              <AuthNetCardForm
                apiLoginId={authnetConfig.apiLoginId}
                clientKey={authnetConfig.clientKey}
                grandTotal={grandTotal}
                onTokenize={handleTokenize}
                onCancel={() => { setCheckoutStep("details"); setPaymentError(null); }}
                isProcessing={isProcessingPayment}
                errorMsg={paymentError}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--napoli-red)" }} />
                <p className="text-xs text-center" style={{ color: "oklch(0.50 0.03 30)" }}>
                  Loading payment system...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
