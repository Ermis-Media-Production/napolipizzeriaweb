/**
 * WingsCustomizerModal
 * 3-step interactive modal for Wings, Boneless Wings & Chicken Tenders
 *
 * Step 1 — Choose type (Bone-In / Boneless / Tenders) + quantity
 * Step 2 — One Flavor or Half & Half? (Half & Half unlocks for 10pc+)
 * Step 3 — Flavor selector(s) + optional add-ons (fries, ranch, notes)
 */
import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Check, ShoppingCart, Scissors } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { WINGS } from "@/lib/napoliData";

// ── Pricing helpers ──────────────────────────────────────────
type WingRow = { qty: string; price: string; addFries: string };

function parsePrice(p: string): number {
  return parseFloat(p.replace("$", "")) || 0;
}

const TYPE_OPTIONS: { id: WingType; label: string; emoji: string; desc: string; rows: WingRow[] }[] = [
  {
    id: "Bone-In",
    label: "Wings",
    emoji: "🍗",
    desc: "Classic bone-in buffalo wings",
    rows: WINGS.boneIn,
  },
  {
    id: "Boneless",
    label: "Boneless Wings",
    emoji: "🍖",
    desc: "All-meat boneless bites",
    rows: WINGS.boneless,
  },
  {
    id: "Chicken Fingers",
    label: "Chicken Tenders",
    emoji: "🍤",
    desc: "Crispy hand-breaded tenders",
    rows: WINGS.chickenFingers,
  },
];

// ── Flavors ──────────────────────────────────────────────────
const FLAVOR_GROUPS = [
  {
    key: "heat",
    label: "🌡️ HEAT LEVELS",
    sublabel: "Classic buffalo-style — choose your heat",
    flavors: ["Plain", "Mild", "Medium", "Hot", "Extra Hot"],
    accentColor: "var(--napoli-red)",
  },
  {
    key: "sauce",
    label: "💧 SPECIALTY SAUCES",
    sublabel: "Bold flavors tossed in sauce",
    flavors: ["BBQ", "Spicy Honey BBQ", "Teriyaki", "Spicy Teriyaki", "Sweet Red Chili", "Mango Habanero"],
    accentColor: "oklch(0.52 0.18 50)",
  },
  {
    key: "dry",
    label: "🧂 DRY RUB",
    sublabel: "Seasoned dry — no sauce, crispy finish",
    flavors: ["Lemon Pepper"],
    accentColor: "oklch(0.52 0.12 250)",
  },
];

const HEAT_LEVELS: Record<string, string> = {
  Plain: "",
  Mild: "🌶️",
  Medium: "🌶️🌶️",
  Hot: "🌶️🌶️🌶️",
  "Extra Hot": "🌶️🌶️🌶️🌶️",
};

// ── Types ────────────────────────────────────────────────────
export type WingType = "Bone-In" | "Boneless" | "Chicken Fingers";

export interface WingsSelection {
  type: WingType;
  qty: string;
  basePrice: number;
  friesAddonPrice: number;
}

interface Props {
  /** Pass null to keep modal closed; pass a WingsSelection (even partial) to open */
  selection: WingsSelection | null;
  onClose: () => void;
}

// ── Flavor button ────────────────────────────────────────────
function FlavorButton({
  f,
  selected,
  onClick,
  accentColor,
}: {
  f: string;
  selected: boolean;
  onClick: () => void;
  accentColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center px-3 py-2 rounded-lg text-xs font-semibold napoli-body transition-all active:scale-95"
      style={
        selected
          ? { background: accentColor, color: "white", border: `2px solid ${accentColor}` }
          : { background: "white", color: "oklch(0.35 0.03 30)", border: "2px solid oklch(0.88 0.015 80)" }
      }
    >
      <span>{f === "Plain" ? "🍗 Plain" : f}</span>
      {HEAT_LEVELS[f] !== undefined && (
        <span className="text-xs mt-0.5" style={{ letterSpacing: "-1px", opacity: selected ? 1 : 0.75 }}>
          {HEAT_LEVELS[f] || "○ No heat"}
        </span>
      )}
    </button>
  );
}

// ── Step indicator ───────────────────────────────────────────
function StepDot({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
        style={{
          background: done ? "var(--napoli-green)" : active ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
          color: done || active ? "white" : "oklch(0.52 0.03 30)",
        }}
      >
        {done ? <Check size={13} /> : num}
      </div>
      <span
        className="text-[9px] font-semibold"
        style={{
          color: active ? "var(--napoli-red)" : done ? "oklch(0.45 0.10 145)" : "oklch(0.65 0.015 80)",
          fontFamily: "'Oswald', sans-serif",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function WingsCustomizerModal({ selection, onClose }: Props) {
  if (!selection) return null;
  return <WingsCustomizerInner initialType={selection.type} onClose={onClose} />;
}

function WingsCustomizerInner({ initialType, onClose }: { initialType: WingType; onClose: () => void }) {
  const { addItem, openCart } = useCart();

  // Step 1 state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<WingType>(initialType);
  const [selectedRow, setSelectedRow] = useState<WingRow | null>(null);

  // Step 2 state
  const [isHalfHalf, setIsHalfHalf] = useState(false);

  // Step 3 state
  const [flavor, setFlavor] = useState("");
  const [flavorA, setFlavorA] = useState("");
  const [flavorB, setFlavorB] = useState("");
  const [addFries, setAddFries] = useState(false);
  const [ranchSize, setRanchSize] = useState<"none" | "2oz" | "6oz">("none");
  const [notes, setNotes] = useState("");

  // Derived
  const typeOption = TYPE_OPTIONS.find((t) => t.id === selectedType)!;
  const rows = typeOption.rows;
  const qtyNum = selectedRow ? parseInt(selectedRow.qty.replace(/[^0-9]/g, ""), 10) : 0;
  const halfHalfEligible = qtyNum >= 10;
  const basePrice = selectedRow ? parsePrice(selectedRow.price) : 0;
  const friesAddonPrice = selectedRow ? parsePrice(selectedRow.addFries) : 2;
  const ranchPrice = ranchSize === "2oz" ? 1.49 : ranchSize === "6oz" ? 2.49 : 0;
  const totalPrice = basePrice + (addFries ? friesAddonPrice : 0) + ranchPrice;

  const canProceedStep1 = selectedRow !== null;
  const canProceedStep3 = isHalfHalf
    ? flavorA !== "" && flavorB !== "" && flavorA !== flavorB
    : flavor !== "";

  const flavorSummary = isHalfHalf ? `½ ${flavorA} · ½ ${flavorB}` : flavor;

  function handleClose() {
    setStep(1);
    setSelectedRow(null);
    setIsHalfHalf(false);
    setFlavor("");
    setFlavorA("");
    setFlavorB("");
    setAddFries(false);
    setRanchSize("none");
    setNotes("");
    onClose();
  }

  function handleToggleHalfHalf(val: boolean) {
    setIsHalfHalf(val);
    setFlavor("");
    setFlavorA("");
    setFlavorB("");
  }

  // Clover catalog IDs for wings types (verified from DB — do not change without re-syncing)
  const WINGS_CLOVER_IDS: Record<WingType, string> = {
    "Bone-In": "KQXZYE71T0EME",
    "Boneless": "5Y7Y3AQ23XFPG",
    "Chicken Fingers": "R71JXR9M68JNJ",
  };

  function handleAddToCart() {
    const addons: string[] = [];
    if (isHalfHalf) {
      addons.push(`½ ${flavorA}`);
      addons.push(`½ ${flavorB}`);
    } else if (flavor !== "Plain") {
      addons.push(`${flavor} sauce`);
    }
    if (addFries) addons.push(`+Fries ($${friesAddonPrice.toFixed(2)})`);
    if (ranchSize !== "none") addons.push(`Ranch ${ranchSize} ($${ranchPrice.toFixed(2)})`);
    if (notes.trim()) addons.push(`Note: ${notes.trim()}`);

    const description =
      addons.length > 0
        ? addons.join(" · ")
        : flavor === "Plain"
        ? "Plain — no sauce"
        : undefined;

    addItem({
      id: `wings-${selectedType}-${selectedRow!.qty}-${flavorSummary}-${Date.now()}`,
      name: `${typeOption.label} (${selectedRow!.qty}) — ${isHalfHalf ? "Half & Half" : flavor}`,
      price: totalPrice,
      quantity: 1,
      category: "wings",
      description,
      cloverItemId: WINGS_CLOVER_IDS[selectedType],
    });

    toast.success(`${typeOption.label} (${selectedRow!.qty}) added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });

    handleClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "oklch(0.08 0.02 27 / 0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: "white", maxHeight: "92dvh" }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: "var(--napoli-red)" }}
        >
          <div>
            <p className="napoli-label text-xs text-white opacity-80 tracking-widest">CUSTOMIZE YOUR ORDER</p>
            <h2 className="napoli-heading text-lg text-white">
              {step === 1 ? "Wings, Boneless & Tenders" : `${typeOption.label} — ${selectedRow?.qty ?? ""}`}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-90"
            style={{ background: "oklch(0.35 0.18 27)", color: "white" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Step indicator ── */}
        <div
          className="flex items-center justify-center gap-3 px-5 py-2.5 shrink-0"
          style={{ background: "oklch(0.97 0.012 80)", borderBottom: "1px solid oklch(0.90 0.015 80)" }}
        >
          <StepDot num={1} label="Quantity" active={step === 1} done={step > 1} />
          <div className="w-8 h-0.5 rounded mb-3" style={{ background: step > 1 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)" }} />
          <StepDot num={2} label="Flavor Mode" active={step === 2} done={step > 2} />
          <div className="w-8 h-0.5 rounded mb-3" style={{ background: step > 2 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)" }} />
          <StepDot num={3} label="Flavor & Extras" active={step === 3} done={false} />
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1">

          {/* ══ STEP 1: TYPE + QUANTITY ══════════════════════════ */}
          {step === 1 && (
            <div className="px-5 py-5 flex flex-col gap-5">

              {/* Type selector */}
              <div>
                <p className="napoli-label text-xs mb-2" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                  CHOOSE TYPE
                </p>
                <div className="flex flex-col gap-2">
                  {TYPE_OPTIONS.map((opt) => {
                    const isActive = selectedType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => { setSelectedType(opt.id); setSelectedRow(null); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all active:scale-[0.99]"
                        style={{
                          borderColor: isActive ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                          background: isActive ? "oklch(0.97 0.04 27)" : "white",
                        }}
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                            {opt.label}
                          </div>
                          <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                            {opt.desc}
                          </div>
                        </div>
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={{ borderColor: isActive ? "var(--napoli-red)" : "oklch(0.75 0.015 80)" }}
                        >
                          {isActive && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--napoli-red)" }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity selector */}
              <div>
                <p className="napoli-label text-xs mb-2" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                  CHOOSE QUANTITY
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {rows.map((row) => {
                    const isActive = selectedRow?.qty === row.qty;
                    return (
                      <button
                        key={row.qty}
                        onClick={() => setSelectedRow(row)}
                        className="flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all active:scale-[0.98]"
                        style={{
                          borderColor: isActive ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                          background: isActive ? "oklch(0.97 0.04 27)" : "white",
                        }}
                      >
                        <div className="text-left">
                          <div className="text-sm font-bold" style={{ color: isActive ? "var(--napoli-red)" : "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                            {row.qty}
                          </div>
                          <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                            +Fries {row.addFries}
                          </div>
                        </div>
                        <span className="napoli-price text-base font-bold" style={{ color: isActive ? "var(--napoli-red)" : "oklch(0.35 0.04 30)" }}>
                          {row.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Next button */}
              <button
                onClick={() => canProceedStep1 && setStep(2)}
                disabled={!canProceedStep1}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold napoli-label tracking-wider transition-all active:scale-95 disabled:opacity-40"
                style={{ background: canProceedStep1 ? "var(--napoli-red)" : "oklch(0.75 0.015 80)", color: "white" }}
              >
                Next — Choose Flavor Mode <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* ══ STEP 2: FLAVOR MODE ══════════════════════════════ */}
          {step === 2 && (
            <div className="px-5 py-5 flex flex-col gap-5">

              {/* Order recap */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}>
                <span className="text-xl">{typeOption.emoji}</span>
                <div>
                  <div className="text-sm font-bold" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif" }}>
                    {typeOption.label} — {selectedRow!.qty}
                  </div>
                  <div className="text-xs" style={{ color: "oklch(0.52 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                    {selectedRow!.price} · Add Fries {selectedRow!.addFries}
                  </div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="ml-auto text-xs napoli-label underline shrink-0"
                  style={{ color: "oklch(0.52 0.03 30)" }}
                >
                  Change
                </button>
              </div>

              {/* Flavor mode */}
              <div>
                <p className="napoli-label text-xs mb-1" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                  HOW DO YOU WANT YOUR FLAVOR?
                </p>
                {!halfHalfEligible && (
                  <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                    Half &amp; Half is available for orders of 10pc or more.
                  </p>
                )}

                <div className="flex flex-col gap-3 mt-3">
                  {/* One Flavor */}
                  <button
                    onClick={() => handleToggleHalfHalf(false)}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl border-2 text-left transition-all active:scale-[0.99]"
                    style={{
                      borderColor: !isHalfHalf ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                      background: !isHalfHalf ? "oklch(0.97 0.04 27)" : "white",
                    }}
                  >
                    <span className="text-3xl">🍗</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                        One Flavor
                      </div>
                      <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                        All pieces tossed in the same sauce
                      </div>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: !isHalfHalf ? "var(--napoli-red)" : "oklch(0.75 0.015 80)" }}
                    >
                      {!isHalfHalf && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--napoli-red)" }} />}
                    </div>
                  </button>

                  {/* Half & Half */}
                  <button
                    onClick={() => halfHalfEligible && handleToggleHalfHalf(true)}
                    disabled={!halfHalfEligible}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl border-2 text-left transition-all active:scale-[0.99] disabled:opacity-40"
                    style={{
                      borderColor: isHalfHalf ? "oklch(0.26 0.10 145)" : "oklch(0.88 0.015 80)",
                      background: isHalfHalf ? "oklch(0.97 0.06 145 / 0.20)" : "white",
                    }}
                  >
                    <span className="text-3xl"><Scissors size={28} style={{ color: "oklch(0.26 0.10 145)" }} /></span>
                    <div className="flex-1">
                      <div className="text-sm font-bold flex items-center gap-2" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Half &amp; Half
                        {!halfHalfEligible && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "oklch(0.88 0.015 80)", color: "oklch(0.52 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                            10pc+
                          </span>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                        Two different sauces — one for each half
                      </div>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: isHalfHalf ? "oklch(0.26 0.10 145)" : "oklch(0.75 0.015 80)" }}
                    >
                      {isHalfHalf && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.26 0.10 145)" }} />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95"
                  style={{ border: "1.5px solid oklch(0.82 0.015 80)", color: "oklch(0.40 0.04 30)", fontFamily: "'Oswald', sans-serif", background: "white" }}
                >
                  <ChevronLeft size={15} /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold napoli-label tracking-wider transition-all active:scale-95"
                  style={{ background: "var(--napoli-red)", color: "white" }}
                >
                  Next — Pick Flavor <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 3: FLAVOR SELECTOR + ADD-ONS ═══════════════ */}
          {step === 3 && (
            <div className="px-5 py-5">

              {/* Recap bar */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <span className="text-base">{typeOption.emoji}</span>
                <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                  {typeOption.label} ({selectedRow!.qty}) · {isHalfHalf ? "Half & Half" : "One Flavor"}
                </span>
                <button
                  onClick={() => setStep(2)}
                  className="ml-auto text-xs napoli-label underline shrink-0"
                  style={{ color: "oklch(0.52 0.03 30)" }}
                >
                  Change
                </button>
              </div>

              {/* ── SINGLE FLAVOR ── */}
              {!isHalfHalf && (
                <>
                  <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                    CHOOSE YOUR FLAVOR <span>*</span>
                  </p>
                  <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                    Select one — required. Choose <strong>Plain</strong> for no sauce.
                  </p>
                  <div className="space-y-4">
                    {FLAVOR_GROUPS.map((group) => (
                      <div key={group.key}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="napoli-label text-xs font-bold" style={{ color: "oklch(0.35 0.03 30)", letterSpacing: "0.1em" }}>{group.label}</span>
                          <div className="flex-1 h-px" style={{ background: "oklch(0.90 0.012 80)" }} />
                        </div>
                        <p className="text-xs napoli-body mb-2" style={{ color: "oklch(0.58 0.03 30)" }}>{group.sublabel}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.flavors.map((f) => (
                            <FlavorButton
                              key={f}
                              f={f}
                              selected={flavor === f}
                              onClick={() => setFlavor(f)}
                              accentColor={group.accentColor}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── HALF & HALF ── */}
              {isHalfHalf && (
                <div className="space-y-5">
                  {/* First half */}
                  <div className="rounded-xl p-4" style={{ border: "2px solid var(--napoli-red)", background: "oklch(0.99 0.02 27 / 0.15)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--napoli-red)" }}>1</div>
                      <p className="napoli-label text-xs" style={{ color: "var(--napoli-red)", letterSpacing: "0.12em" }}>
                        FIRST HALF — {Math.ceil(qtyNum / 2)}pc
                      </p>
                      {flavorA && (
                        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold napoli-body" style={{ background: "var(--napoli-red)", color: "white" }}>
                          {flavorA}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {FLAVOR_GROUPS.map((group) => (
                        <div key={group.key}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="napoli-label font-bold" style={{ color: "oklch(0.45 0.03 30)", letterSpacing: "0.08em", fontSize: "10px" }}>{group.label}</span>
                            <div className="flex-1 h-px" style={{ background: "oklch(0.90 0.012 80)" }} />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.flavors.map((f) => (
                              <FlavorButton key={f} f={f} selected={flavorA === f} onClick={() => setFlavorA(f)} accentColor={group.accentColor} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.015 80)" }} />
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold napoli-label" style={{ background: "oklch(0.26 0.10 145)", color: "white" }}>
                      <Scissors size={11} /> HALF &amp; HALF
                    </div>
                    <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.015 80)" }} />
                  </div>

                  {/* Second half */}
                  <div className="rounded-xl p-4" style={{ border: "2px solid oklch(0.26 0.10 145)", background: "oklch(0.97 0.06 145 / 0.15)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "oklch(0.26 0.10 145)" }}>2</div>
                      <p className="napoli-label text-xs" style={{ color: "oklch(0.26 0.10 145)", letterSpacing: "0.12em" }}>
                        SECOND HALF — {Math.floor(qtyNum / 2)}pc
                      </p>
                      {flavorB && (
                        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold napoli-body" style={{ background: "oklch(0.26 0.10 145)", color: "white" }}>
                          {flavorB}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {FLAVOR_GROUPS.map((group) => (
                        <div key={group.key}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="napoli-label font-bold" style={{ color: "oklch(0.45 0.03 30)", letterSpacing: "0.08em", fontSize: "10px" }}>{group.label}</span>
                            <div className="flex-1 h-px" style={{ background: "oklch(0.90 0.012 80)" }} />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.flavors.map((f) => (
                              <FlavorButton key={f} f={f} selected={flavorB === f} onClick={() => setFlavorB(f)} accentColor={group.accentColor} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {flavorA && flavorB && flavorA === flavorB && (
                      <p className="text-xs mt-2 font-semibold" style={{ color: "oklch(0.55 0.18 27)" }}>
                        ⚠️ Both halves have the same flavor — please choose different flavors for Half &amp; Half.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── ADD-ONS ── */}
              <div className="mt-6">
                <p className="napoli-label text-xs mb-3" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                  OPTIONAL ADD-ONS
                </p>

                {/* Fries */}
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-lg mb-3 cursor-pointer transition-all"
                  style={{
                    border: addFries ? "2px solid var(--napoli-red)" : "2px solid oklch(0.88 0.015 80)",
                    background: addFries ? "oklch(0.99 0.02 27 / 0.3)" : "white",
                  }}
                  onClick={() => setAddFries(!addFries)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🍟</span>
                    <div>
                      <p className="text-sm napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>Add French Fries</p>
                      <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Crispy golden fries on the side</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>+${friesAddonPrice.toFixed(2)}</span>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                      style={{ background: addFries ? "var(--napoli-red)" : "oklch(0.93 0.012 80)", color: addFries ? "white" : "oklch(0.62 0.03 30)" }}
                    >
                      {addFries ? <Check size={13} /> : <span className="text-xs font-bold">+</span>}
                    </div>
                  </div>
                </div>

                {/* Ranch */}
                <div className="mb-4">
                  <p className="text-xs napoli-label mb-2" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                    🥣 RANCH SAUCE (OPTIONAL)
                  </p>
                  <div className="flex gap-2">
                    {(["none", "2oz", "6oz"] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setRanchSize(size)}
                        className="flex-1 py-2.5 rounded-lg text-xs font-semibold napoli-body transition-all active:scale-95"
                        style={
                          ranchSize === size
                            ? { background: "var(--napoli-red)", color: "white", border: "2px solid var(--napoli-red)" }
                            : { background: "white", color: "oklch(0.35 0.03 30)", border: "2px solid oklch(0.88 0.015 80)" }
                        }
                      >
                        {size === "none" ? "No Ranch" : size === "2oz" ? "2oz  +$1.49" : "6oz  +$2.49"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs napoli-label mb-1.5" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                    📝 SPECIAL NOTES (OPTIONAL)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. extra crispy, sauce on the side..."
                    maxLength={200}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm napoli-body resize-none transition-all outline-none"
                    style={{
                      border: notes ? "2px solid var(--napoli-red)" : "2px solid oklch(0.88 0.015 80)",
                      color: "var(--napoli-dark)",
                      background: "white",
                    }}
                  />
                  <p className="text-right text-xs mt-0.5" style={{ color: "oklch(0.65 0.015 80)" }}>{notes.length}/200</p>
                </div>
              </div>

              {/* Total + Add to Cart */}
              <div
                className="mt-5 flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <div>
                  <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Order total</p>
                  <p className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>${totalPrice.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                    style={{ border: "1.5px solid oklch(0.82 0.015 80)", color: "oklch(0.40 0.04 30)", fontFamily: "'Oswald', sans-serif", background: "white" }}
                  >
                    <ChevronLeft size={13} /> Back
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={!canProceedStep3}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: canProceedStep3 ? "var(--napoli-red)" : "oklch(0.75 0.015 80)", color: "white" }}
                  >
                    <ShoppingCart size={16} /> Add to Cart
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>{/* end scrollable body */}
      </div>
    </div>
  );
}
