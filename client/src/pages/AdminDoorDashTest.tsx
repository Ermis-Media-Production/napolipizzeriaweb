/**
 * Admin — DoorDash Test Delivery  /admin/doordash-test
 *
 * Lets the owner create a real DoorDash Drive delivery through the API
 * to satisfy the DoorDash developer account verification requirement
 * ("Create a delivery — In progress").
 *
 * Accessible only to admins.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Truck,
  MapPin,
  Phone,
  User,
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ClipboardList,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId() {
  return `NAPOLI-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function fmtTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Component ─────────────────────────────────────────────────────────────────

type Step = "form" | "quoted" | "created";

interface QuoteResult {
  externalDeliveryId: string;
  fee: number;
  feeDollars: string;
  pickupTimeEstimated: string;
  dropoffTimeEstimated: string;
  durationMinutes: number;
}

interface DeliveryResult {
  externalDeliveryId: string;
  deliveryId: string;
  fee: number;
  feeDollars: string;
  status: string;
  trackingUrl: string;
  pickupTimeEstimated: string;
  dropoffTimeEstimated: string;
  dasher: { name: string; phone?: string; vehicle: string } | null;
}

export default function AdminDoorDashTest() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect non-admins
  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const [step, setStep] = useState<Step>("form");
  const [externalId, setExternalId] = useState(() => genId());

  // Form fields
  const [dropoffAddress, setDropoffAddress] = useState("3131 W. Craig Rd., North Las Vegas, NV 89032");
  const [contactFirstName, setContactFirstName] = useState("Test");
  const [contactLastName, setContactLastName] = useState("Customer");
  const [contactPhone, setContactPhone] = useState("+17252040379");
  const [dropoffInstructions, setDropoffInstructions] = useState("Leave at door");
  const [orderValueDollars, setOrderValueDollars] = useState("25.00");
  const [tipDollars, setTipDollars] = useState("3.00");

  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [deliveryResult, setDeliveryResult] = useState<DeliveryResult | null>(null);

  // tRPC mutations
  const getQuote = trpc.doordash.getQuote.useMutation({
    onSuccess: (data) => {
      setQuoteResult(data);
      setStep("quoted");
      toast.success(`Quote received — Delivery fee: $${data.feeDollars}`);
    },
    onError: (err) => {
      toast.error(`Quote failed: ${err.message}`);
    },
  });

  const createDelivery = trpc.doordash.createDelivery.useMutation({
    onSuccess: (data) => {
      setDeliveryResult(data);
      setStep("created");
      toast.success("Delivery created! DoorDash is dispatching a Dasher.");
    },
    onError: (err) => {
      toast.error(`Delivery failed: ${err.message}`);
    },
  });

  const handleGetQuote = () => {
    const orderValueCents = Math.round(parseFloat(orderValueDollars || "0") * 100);
    if (!dropoffAddress.trim()) return toast.error("Please enter a dropoff address.");
    if (!contactFirstName.trim()) return toast.error("Please enter a contact name.");
    if (!contactPhone.trim()) return toast.error("Please enter a contact phone.");
    if (orderValueCents <= 0) return toast.error("Order value must be greater than $0.");

    getQuote.mutate({
      externalDeliveryId: externalId,
      dropoffAddress,
      dropoffContactName: `${contactFirstName} ${contactLastName}`.trim(),
      dropoffPhone: contactPhone,
      orderValue: orderValueCents,
      items: [
        { name: "Test Pizza", quantity: 1, description: "Test order item", price: orderValueCents },
      ],
    });
  };

  const handleCreateDelivery = () => {
    if (!quoteResult) return;
    const orderValueCents = Math.round(parseFloat(orderValueDollars || "0") * 100);
    const tipCents = Math.round(parseFloat(tipDollars || "0") * 100);

    createDelivery.mutate({
      externalDeliveryId: externalId,
      dropoffAddress,
      dropoffContactGivenName: contactFirstName,
      dropoffContactFamilyName: contactLastName || undefined,
      dropoffPhone: contactPhone,
      dropoffInstructions: dropoffInstructions || undefined,
      orderValue: orderValueCents,
      tip: tipCents,
      items: [
        { name: "Test Pizza", quantity: 1, description: "Test order item", price: orderValueCents },
      ],
    });
  };

  const handleReset = () => {
    setStep("form");
    setExternalId(genId());
    setQuoteResult(null);
    setDeliveryResult(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--napoli-cream, #fdf6ec)" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "var(--napoli-red)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--napoli-cream, #fdf6ec)" }}>
      {/* Header */}
      <div
        className="border-b px-6 py-4 flex items-center gap-4"
        style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
      >
        <Link href="/admin/orders">
          <button className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70" style={{ color: "oklch(0.50 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
            <ArrowLeft size={15} /> Back to Orders
          </button>
        </Link>
        <div className="w-px h-5" style={{ background: "oklch(0.82 0.015 80)" }} />
        <div className="flex items-center gap-2">
          <Truck size={18} style={{ color: "var(--napoli-red)" }} />
          <h1 className="text-lg font-bold" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
            DOORDASH TEST DELIVERY
          </h1>
        </div>
        <span
          className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: "oklch(0.96 0.04 145)", color: "oklch(0.35 0.12 145)", fontFamily: "'Oswald', sans-serif" }}
        >
          SANDBOX
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Info banner */}
        <div
          className="flex gap-3 p-4 rounded-lg border"
          style={{ background: "oklch(0.97 0.02 264)", borderColor: "oklch(0.80 0.08 264)" }}
        >
          <ClipboardList size={18} className="shrink-0 mt-0.5" style={{ color: "oklch(0.46 0.18 264)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "oklch(0.30 0.12 264)", fontFamily: "'Oswald', sans-serif" }}>
              DoorDash Developer Verification
            </p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "oklch(0.42 0.08 264)" }}>
              DoorDash requires at least one real API delivery to activate your account. Use this form to create a test delivery. The pickup address is pre-filled with the restaurant. You can use the restaurant's own address as the dropoff for a same-address test.
            </p>
          </div>
        </div>

        {/* ── STEP 1: Form ─────────────────────────────────────────────────── */}
        {step === "form" && (
          <div
            className="rounded-xl border p-6 space-y-4"
            style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
          >
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif" }}>
              <MapPin size={16} style={{ color: "var(--napoli-red)" }} />
              Step 1 — Delivery Details
            </h2>

            {/* External ID (read-only) */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                External Delivery ID (auto-generated)
              </label>
              <div
                className="text-xs px-3 py-2 rounded border font-mono"
                style={{ background: "oklch(0.97 0.005 80)", borderColor: "oklch(0.82 0.015 80)", color: "oklch(0.45 0.03 30)" }}
              >
                {externalId}
              </div>
            </div>

            {/* Dropoff address */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                <MapPin size={11} className="inline mr-1" />Dropoff Address *
              </label>
              <input
                type="text"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                placeholder="123 Main St, Las Vegas, NV 89101"
                className="w-full text-sm px-3 py-2 rounded border outline-none focus:ring-2"
                style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
              />
            </div>

            {/* Contact name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                  <User size={11} className="inline mr-1" />First Name *
                </label>
                <input
                  type="text"
                  value={contactFirstName}
                  onChange={(e) => setContactFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full text-sm px-3 py-2 rounded border outline-none focus:ring-2"
                  style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={contactLastName}
                  onChange={(e) => setContactLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full text-sm px-3 py-2 rounded border outline-none focus:ring-2"
                  style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                <Phone size={11} className="inline mr-1" />Contact Phone * (E.164 format: +1XXXXXXXXXX)
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+17025550100"
                className="w-full text-sm px-3 py-2 rounded border outline-none focus:ring-2"
                style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
              />
            </div>

            {/* Dropoff instructions */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                Dropoff Instructions
              </label>
              <input
                type="text"
                value={dropoffInstructions}
                onChange={(e) => setDropoffInstructions(e.target.value)}
                placeholder="Leave at door"
                className="w-full text-sm px-3 py-2 rounded border outline-none focus:ring-2"
                style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
              />
            </div>

            {/* Order value + tip */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                  <Package size={11} className="inline mr-1" />Order Value ($) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={orderValueDollars}
                  onChange={(e) => setOrderValueDollars(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded border outline-none focus:ring-2"
                  style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                  Dasher Tip ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tipDollars}
                  onChange={(e) => setTipDollars(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded border outline-none focus:ring-2"
                  style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
                />
              </div>
            </div>

            {/* Pickup info (read-only) */}
            <div
              className="p-3 rounded-lg border text-xs"
              style={{ background: "oklch(0.97 0.005 80)", borderColor: "oklch(0.82 0.015 80)" }}
            >
              <p className="font-semibold mb-1" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                PICKUP (pre-filled)
              </p>
              <p style={{ color: "oklch(0.50 0.03 30)" }}>Napoli Pizzeria — 3640 N 5th St, North Las Vegas, NV 89032</p>
              <p style={{ color: "oklch(0.50 0.03 30)" }}>+1 (725) 204-0379</p>
            </div>

            <button
              onClick={handleGetQuote}
              disabled={getQuote.isPending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded font-bold text-sm transition-all active:scale-[0.98]"
              style={{
                background: getQuote.isPending ? "oklch(0.55 0.03 30)" : "var(--napoli-red, #c0392b)",
                color: "white",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              {getQuote.isPending ? <><Loader2 size={15} className="animate-spin" /> Getting Quote...</> : <><Truck size={15} /> Get Delivery Quote</>}
            </button>
          </div>
        )}

        {/* ── STEP 2: Quote received ────────────────────────────────────────── */}
        {step === "quoted" && quoteResult && (
          <div className="space-y-4">
            <div
              className="rounded-xl border p-6"
              style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
            >
              <h2 className="text-base font-bold flex items-center gap-2 mb-4" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif" }}>
                <CheckCircle2 size={16} style={{ color: "oklch(0.38 0.12 145)" }} />
                Step 2 — Quote Received
              </h2>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 rounded-lg" style={{ background: "oklch(0.97 0.005 80)" }}>
                  <div className="text-xl font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                    ${quoteResult.feeDollars}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.03 30)" }}>Delivery Fee</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ background: "oklch(0.97 0.005 80)" }}>
                  <div className="text-xl font-bold" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif" }}>
                    {fmtTime(quoteResult.pickupTimeEstimated)}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.03 30)" }}>Pickup ETA</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ background: "oklch(0.97 0.005 80)" }}>
                  <div className="text-xl font-bold" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif" }}>
                    {fmtTime(quoteResult.dropoffTimeEstimated)}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.03 30)" }}>Dropoff ETA</div>
                </div>
              </div>

              <div className="text-xs mb-4 p-3 rounded border" style={{ borderColor: "oklch(0.82 0.015 80)", color: "oklch(0.45 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                <strong>ID:</strong> {quoteResult.externalDeliveryId}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded border text-sm font-semibold transition-all"
                  style={{ borderColor: "oklch(0.82 0.015 80)", color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}
                >
                  <RefreshCw size={14} /> Start Over
                </button>
                <button
                  onClick={handleCreateDelivery}
                  disabled={createDelivery.isPending}
                  className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded font-bold text-sm transition-all active:scale-[0.98]"
                  style={{
                    background: createDelivery.isPending ? "oklch(0.55 0.03 30)" : "var(--napoli-red, #c0392b)",
                    color: "white",
                    fontFamily: "'Oswald', sans-serif",
                    letterSpacing: "0.05em",
                  }}
                >
                  {createDelivery.isPending
                    ? <><Loader2 size={15} className="animate-spin" /> Dispatching Dasher...</>
                    : <><Truck size={15} /> Confirm &amp; Create Delivery</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Delivery created ──────────────────────────────────────── */}
        {step === "created" && deliveryResult && (
          <div className="space-y-4">
            {/* Success banner */}
            <div
              className="flex gap-3 p-4 rounded-xl border"
              style={{ background: "oklch(0.96 0.04 145)", borderColor: "oklch(0.70 0.15 145)" }}
            >
              <CheckCircle2 size={20} className="shrink-0" style={{ color: "oklch(0.35 0.12 145)" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "oklch(0.28 0.10 145)", fontFamily: "'Oswald', sans-serif" }}>
                  DELIVERY CREATED SUCCESSFULLY
                </p>
                <p className="text-xs mt-0.5" style={{ color: "oklch(0.38 0.10 145)" }}>
                  DoorDash has received the delivery request. A Dasher will be assigned shortly. This satisfies the DoorDash developer verification requirement.
                </p>
              </div>
            </div>

            <div
              className="rounded-xl border p-6 space-y-4"
              style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
            >
              <h2 className="text-base font-bold" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif" }}>
                Delivery Details
              </h2>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: "Delivery ID", value: deliveryResult.deliveryId },
                  { label: "External ID", value: deliveryResult.externalDeliveryId },
                  { label: "Status", value: deliveryResult.status.toUpperCase() },
                  { label: "Fee", value: `$${deliveryResult.feeDollars}` },
                  { label: "Pickup ETA", value: fmtTime(deliveryResult.pickupTimeEstimated) },
                  { label: "Dropoff ETA", value: fmtTime(deliveryResult.dropoffTimeEstimated) },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-lg" style={{ background: "oklch(0.97 0.005 80)" }}>
                    <div className="font-semibold mb-0.5" style={{ color: "oklch(0.50 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>{label}</div>
                    <div className="font-mono" style={{ color: "oklch(0.30 0.03 30)" }}>{value}</div>
                  </div>
                ))}
              </div>

              {deliveryResult.dasher && (
                <div className="p-3 rounded-lg border text-xs" style={{ borderColor: "oklch(0.82 0.015 80)" }}>
                  <p className="font-semibold mb-1" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>DASHER ASSIGNED</p>
                  <p style={{ color: "oklch(0.45 0.03 30)" }}>{deliveryResult.dasher.name} · {deliveryResult.dasher.phone ?? "—"}</p>
                  {deliveryResult.dasher.vehicle && (
                    <p style={{ color: "oklch(0.55 0.03 30)" }}>{deliveryResult.dasher.vehicle}</p>
                  )}
                </div>
              )}

              {deliveryResult.trackingUrl && (
                <a
                  href={deliveryResult.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded border text-sm font-semibold transition-all hover:opacity-80"
                  style={{ borderColor: "oklch(0.46 0.18 264)", color: "oklch(0.46 0.18 264)", fontFamily: "'Oswald', sans-serif" }}
                >
                  <ExternalLink size={14} /> Track Delivery on DoorDash
                </a>
              )}

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded border text-sm font-semibold transition-all"
                style={{ borderColor: "oklch(0.82 0.015 80)", color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}
              >
                <RefreshCw size={14} /> Create Another Test Delivery
              </button>
            </div>

            {/* Verification reminder */}
            <div
              className="flex gap-3 p-4 rounded-xl border text-xs"
              style={{ background: "oklch(0.97 0.02 264)", borderColor: "oklch(0.80 0.08 264)" }}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: "oklch(0.46 0.18 264)" }} />
              <div style={{ color: "oklch(0.42 0.08 264)" }}>
                <strong>Next step:</strong> Go back to the DoorDash Developer Portal and check if the "Create a delivery" verification step is now marked as complete. It may take a few minutes to update.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
