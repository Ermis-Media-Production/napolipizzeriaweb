/**
 * PizzaCustomizerModal
 * 5-step interactive pizza builder:
 *  Step 1 — Choose size (10"–36")
 *  Step 2 — Choose dough type (Regular / Thin / Stuffed / Gluten Free)
 *  Step 3 — Choose cut style (Square / Triangle / Strips / Uncut)
 *  Step 4 — Add toppings (per-item limits + Half & Half for NY Style)
 *  Step 5 — Special notes + confirm add to cart
 */
import { useState, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Check, ShoppingCart, Plus, Minus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import {
  PIZZA_SIZES,
  PIZZA_BASE_PRICES,
  PIZZA_30_TOPPINGS,
  PIZZA_TOPPING_PRICES,
} from "@/lib/napoliData";

// ── Types ──────────────────────────────────────────────────────────────────
export interface PizzaSelection {
  pizzaName: string;   // "Plain Cheese" | "4 Topping Combo" | specialty name
  isSpecialty: boolean;
  /** Number of toppings included in the base price (0 = all charged) */
  freeToppings?: number;
  /** Flat extra-topping price override (for Sicilian / Chicago). If omitted, use PIZZA_TOPPING_PRICES */
  flatExtraToppingPrice?: number;
  /** If true, Half & Half option is available on the toppings step */
  allowHalfAndHalf?: boolean;
}

interface Props {
  selection: PizzaSelection | null;
  onClose: () => void;
}

// ── Crust options ──────────────────────────────────────────────────────────
const CRUST_OPTIONS = [
  { id: "regular", label: "Regular", desc: "Classic hand-tossed New York style" },
  { id: "thin", label: "Thin Crust", desc: "Light and crispy" },
  { id: "stuffed", label: "Stuffed Dough", desc: "Cheese-filled crust edges" },
  { id: "gluten-free", label: "Gluten Free", desc: '14" only — $12.75 base' },
];

// ── Cut options ────────────────────────────────────────────────────────────
const CUT_OPTIONS = [
  { id: "triangle", label: "Triangle Cut", desc: "Classic pizza slices", emoji: "🍕" },
  { id: "square", label: "Square Cut", desc: "Party-style squares", emoji: "⬛" },
  { id: "strips", label: "Strips", desc: "Long rectangular strips", emoji: "📏" },
  { id: "uncut", label: "Uncut", desc: "We leave the cutting to you", emoji: "⭕" },
];

// Gluten free is only available in 14"
const GLUTEN_FREE_SIZE = '14"';
const TOTAL_STEPS = 5;

// ── Helpers ────────────────────────────────────────────────────────────────
function getBasePrice(pizzaName: string, size: string, crust: string): number {
  if (crust === "gluten-free") return 12.75;

  const sizeIndex = PIZZA_SIZES.indexOf(size);
  if (sizeIndex === -1) return 0;

  for (const [name, prices] of Object.entries(PIZZA_BASE_PRICES)) {
    if (name.toLowerCase() === pizzaName.toLowerCase()) {
      const p = prices[sizeIndex];
      if (!p) return 0;
      return parseFloat(p.replace("$", "")) || 0;
    }
  }

  // Specialty pizzas — use "Plain Cheese" as base
  const cheesePrices = PIZZA_BASE_PRICES["Plain Cheese"];
  if (cheesePrices) {
    const p = cheesePrices[sizeIndex];
    return parseFloat((p || "$0").replace("$", "")) || 0;
  }
  return 0;
}

function formatPrice(n: number) {
  return `$${n.toFixed(2)}`;
}

// ── Step indicator ─────────────────────────────────────────────────────────
function StepDot({ active, done, num }: { active: boolean; done: boolean; num: number }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
      style={{
        background: done
          ? "var(--napoli-green)"
          : active
          ? "var(--napoli-red)"
          : "oklch(0.88 0.015 80)",
        color: done || active ? "white" : "oklch(0.52 0.03 30)",
      }}
    >
      {done ? <Check size={13} /> : num}
    </div>
  );
}

// ── Topping chip ───────────────────────────────────────────────────────────
function ToppingChip({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled && !selected}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95"
      style={{
        borderColor: selected ? "var(--napoli-red)" : "oklch(0.85 0.015 80)",
        background: selected ? "var(--napoli-red)" : disabled && !selected ? "oklch(0.95 0.005 80)" : "white",
        color: selected ? "white" : disabled && !selected ? "oklch(0.70 0.015 80)" : "oklch(0.40 0.03 30)",
        fontFamily: "'Lato', sans-serif",
        cursor: disabled && !selected ? "not-allowed" : "pointer",
      }}
    >
      {selected ? <Minus size={10} /> : <Plus size={10} />}
      {label}
    </button>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────
export default function PizzaCustomizerModal({ selection, onClose }: Props) {
  if (!selection) return null;
  return <PizzaCustomizerInner selection={selection} onClose={onClose} />;
}

function PizzaCustomizerInner({ selection, onClose }: { selection: PizzaSelection; onClose: () => void }) {
  const { addItem } = useCart();

  const [step, setStep] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedCrust, setSelectedCrust] = useState<string>("");
  const [selectedCut, setSelectedCut] = useState<string>("");
  // Whole-pizza toppings (normal mode)
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  // Half & Half mode
  const [halfAndHalf, setHalfAndHalf] = useState(false);
  const [firstHalf, setFirstHalf] = useState<string[]>([]);
  const [secondHalf, setSecondHalf] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const {
    pizzaName,
    isSpecialty,
    freeToppings = 0,
    flatExtraToppingPrice,
    allowHalfAndHalf = false,
  } = selection;

  // When gluten free is selected, force size to 14"
  const effectiveSize = selectedCrust === "gluten-free" ? GLUTEN_FREE_SIZE : selectedSize;

  const basePrice = useMemo(
    () => getBasePrice(pizzaName, effectiveSize, selectedCrust),
    [pizzaName, effectiveSize, selectedCrust]
  );

  // Topping price per unit — flat override (Sicilian/Chicago) or size-based
  const toppingUnitPrice = flatExtraToppingPrice ?? (PIZZA_TOPPING_PRICES[effectiveSize] ?? 2.75);

  // ── Pricing calculations ───────────────────────────────────────────────
  const chargeableToppings = useMemo(() => {
    if (halfAndHalf) {
      // Each half-topping costs half price
      const totalHalfToppings = firstHalf.length + secondHalf.length;
      const chargeableHalf = Math.max(0, totalHalfToppings - freeToppings * 2);
      return chargeableHalf;
    }
    return Math.max(0, selectedToppings.length - freeToppings);
  }, [halfAndHalf, firstHalf, secondHalf, selectedToppings, freeToppings]);

  const toppingsTotal = useMemo(() => {
    if (halfAndHalf) {
      // Half-toppings cost half the unit price each
      const totalHalfToppings = firstHalf.length + secondHalf.length;
      const chargeableHalf = Math.max(0, totalHalfToppings - freeToppings * 2);
      return chargeableHalf * (toppingUnitPrice / 2);
    }
    return chargeableToppings * toppingUnitPrice;
  }, [halfAndHalf, firstHalf, secondHalf, chargeableToppings, toppingUnitPrice, freeToppings]);

  const grandTotal = basePrice + toppingsTotal;

  // ── Topping toggles ────────────────────────────────────────────────────
  function toggleTopping(t: string) {
    setSelectedToppings((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      return [...prev, t];
    });
  }

  function toggleHalfTopping(half: "first" | "second", t: string) {
    const setter = half === "first" ? setFirstHalf : setSecondHalf;
    setter((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      return [...prev, t];
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────
  function canAdvance() {
    if (step === 1) return effectiveSize !== "";
    if (step === 2) return selectedCrust !== "";
    if (step === 3) return selectedCut !== "";
    if (step === 4) return true; // toppings optional
    return false;
  }

  function stepLabel(n: number) {
    if (n === 1) return "Size";
    if (n === 2) return "Dough";
    if (n === 3) return "Cut Style";
    if (n === 4) return "Toppings";
    return "Review";
  }

  // ── Cart ───────────────────────────────────────────────────────────────
  function handleAddToCart() {
    const crustLabel = CRUST_OPTIONS.find((c) => c.id === selectedCrust)?.label ?? selectedCrust;
    const cutLabel = CUT_OPTIONS.find((c) => c.id === selectedCut)?.label ?? selectedCut;

    let toppingStr: string;
    if (halfAndHalf) {
      const f = firstHalf.length > 0 ? firstHalf.join(", ") : "Plain";
      const s = secondHalf.length > 0 ? secondHalf.join(", ") : "Plain";
      toppingStr = `Half & Half — 1st Half: ${f} | 2nd Half: ${s}`;
    } else if (selectedToppings.length > 0) {
      toppingStr = `Toppings: ${selectedToppings.join(", ")}`;
    } else {
      toppingStr = freeToppings > 0 ? "No extra toppings" : "Plain (no toppings)";
    }

    const descParts = [
      `Size: ${effectiveSize}`,
      `Crust: ${crustLabel}`,
      `Cut: ${cutLabel}`,
      toppingStr,
    ];
    if (notes.trim()) descParts.push(`Note: ${notes.trim()}`);

    addItem({
      id: `pizza-${pizzaName}-${effectiveSize}-${selectedCrust}-${selectedCut}-${Date.now()}`,
      name: `${pizzaName} Pizza (${effectiveSize})`,
      price: grandTotal,
      quantity: 1,
      category: "pizza",
      description: descParts.join(" · "),
    });

    toast.success(`${pizzaName} Pizza (${effectiveSize}) added to cart!`);
    onClose();
  }

  // ── Toppings step helpers ──────────────────────────────────────────────
  const totalSelectedCount = halfAndHalf
    ? firstHalf.length + secondHalf.length
    : selectedToppings.length;

  const freeRemaining = Math.max(0, freeToppings - (halfAndHalf ? 0 : selectedToppings.length));

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0.10 0.02 30 / 0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: "white", maxHeight: "90vh" }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: "var(--napoli-red)" }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.88 0.015 80)", fontFamily: "'Oswald', sans-serif" }}>
              Customize Your Pizza
            </p>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              {pizzaName} {isSpecialty ? "Specialty" : ""}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "oklch(0.35 0.18 27)", color: "white" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Step Indicator ── */}
        <div className="flex items-center justify-center gap-1 px-4 py-3 shrink-0" style={{ background: "oklch(0.97 0.012 80)", borderBottom: "1px solid oklch(0.90 0.012 80)" }}>
          {[1, 2, 3, 4, 5].map((n, i) => (
            <div key={n} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-0.5">
                <StepDot active={step === n} done={step > n} num={n} />
                <span
                  className="text-[9px] font-semibold leading-none"
                  style={{
                    color: step === n ? "var(--napoli-red)" : step > n ? "oklch(0.45 0.10 145)" : "oklch(0.65 0.015 80)",
                    fontFamily: "'Oswald', sans-serif",
                  }}
                >
                  {stepLabel(n)}
                </span>
              </div>
              {i < TOTAL_STEPS - 1 && (
                <div className="w-4 h-0.5 rounded mb-3" style={{ background: step > n ? "var(--napoli-red)" : "oklch(0.88 0.015 80)" }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* STEP 1 — Size */}
          {step === 1 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                Select a Size
              </p>
              <div className="grid grid-cols-4 gap-2">
                {PIZZA_SIZES.map((size) => {
                  const sizeIndex = PIZZA_SIZES.indexOf(size);
                  const prices = PIZZA_BASE_PRICES[pizzaName as keyof typeof PIZZA_BASE_PRICES] ?? PIZZA_BASE_PRICES["Plain Cheese"];
                  const priceStr = prices?.[sizeIndex] ?? "";
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className="flex flex-col items-center gap-1 py-3 px-2 rounded-lg border-2 transition-all active:scale-95"
                      style={{
                        borderColor: isSelected ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                        background: isSelected ? "oklch(0.97 0.04 27)" : "white",
                      }}
                    >
                      <span className="text-sm font-bold" style={{ color: isSelected ? "var(--napoli-red)" : "oklch(0.30 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                        {size}
                      </span>
                      {priceStr && (
                        <span className="text-xs" style={{ color: isSelected ? "var(--napoli-red)" : "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                          {priceStr}
                        </span>
                      )}
                      {isSelected && (
                        <Check size={12} style={{ color: "var(--napoli-red)" }} />
                      )}
                    </button>
                  );
                })}
              </div>
              {freeToppings > 0 && (
                <p className="text-xs mt-3 font-semibold" style={{ color: "var(--napoli-green)", fontFamily: "'Lato', sans-serif" }}>
                  ✓ Includes {freeToppings} free toppings
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                {freeToppings > 0
                  ? "Prices shown include the combo. Extra toppings charged separately."
                  : "Prices shown are for cheese only. Toppings charged separately."}
              </p>
            </div>
          )}

          {/* STEP 2 — Dough Type */}
          {step === 2 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                Select Dough Type
              </p>
              <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                Choose how you want your pizza dough prepared.
              </p>
              <div className="flex flex-col gap-2">
                {CRUST_OPTIONS.map((crust) => {
                  const isSelected = selectedCrust === crust.id;
                  const isGFDisabled = crust.id === "gluten-free" && selectedSize !== GLUTEN_FREE_SIZE && selectedSize !== "";
                  return (
                    <button
                      key={crust.id}
                      onClick={() => {
                        if (crust.id === "gluten-free") {
                          setSelectedSize(GLUTEN_FREE_SIZE);
                        }
                        setSelectedCrust(crust.id);
                      }}
                      disabled={isGFDisabled}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all active:scale-[0.99]"
                      style={{
                        borderColor: isSelected ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                        background: isSelected ? "oklch(0.97 0.04 27)" : "white",
                        opacity: isGFDisabled ? 0.5 : 1,
                        cursor: isGFDisabled ? "not-allowed" : "pointer",
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: isSelected ? "var(--napoli-red)" : "oklch(0.75 0.015 80)" }}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--napoli-red)" }} />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                          {crust.label}
                        </div>
                        <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                          {crust.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3 — Cut Style */}
          {step === 3 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                Select Cut Style
              </p>
              <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                How would you like your pizza sliced?
              </p>
              <div className="flex flex-col gap-2">
                {CUT_OPTIONS.map((cut) => {
                  const isSelected = selectedCut === cut.id;
                  return (
                    <button
                      key={cut.id}
                      onClick={() => setSelectedCut(cut.id)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all active:scale-[0.99]"
                      style={{
                        borderColor: isSelected ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                        background: isSelected ? "oklch(0.97 0.04 27)" : "white",
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: isSelected ? "var(--napoli-red)" : "oklch(0.75 0.015 80)" }}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--napoli-red)" }} />}
                      </div>
                      <span className="text-xl">{cut.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                          {cut.label}
                        </div>
                        <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                          {cut.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4 — Toppings */}
          {step === 4 && (
            <div>
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                  {freeToppings > 0 ? `Toppings (${freeToppings} Free)` : "Add Toppings (Optional)"}
                </p>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: totalSelectedCount > 0 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                    color: totalSelectedCount > 0 ? "white" : "oklch(0.52 0.03 30)",
                    fontFamily: "'Oswald', sans-serif",
                  }}
                >
                  {halfAndHalf
                    ? `${firstHalf.length}+${secondHalf.length} · +${formatPrice(toppingsTotal)}`
                    : `${selectedToppings.length} selected · +${formatPrice(toppingsTotal)}`}
                </span>
              </div>

              {/* Pricing note */}
              <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                {freeToppings > 0
                  ? <>First <strong>{freeToppings} toppings included</strong>. Additional toppings: <strong>+${toppingUnitPrice.toFixed(2)}</strong> each.{freeRemaining > 0 && !halfAndHalf && <span style={{ color: "var(--napoli-green)" }}> ({freeRemaining} free remaining)</span>}</>
                  : <>Each topping adds <strong>+${toppingUnitPrice.toFixed(2)}</strong> for {effectiveSize} pizza. Skip to keep as-is.</>}
              </p>

              {/* Half & Half toggle — only for NY Style items */}
              {allowHalfAndHalf && (
                <div className="mb-4">
                  <button
                    onClick={() => {
                      setHalfAndHalf((v) => !v);
                      setSelectedToppings([]);
                      setFirstHalf([]);
                      setSecondHalf([]);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 w-full text-left transition-all active:scale-[0.99]"
                    style={{
                      borderColor: halfAndHalf ? "var(--napoli-red)" : "oklch(0.85 0.015 80)",
                      background: halfAndHalf ? "oklch(0.97 0.04 27)" : "white",
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: halfAndHalf ? "var(--napoli-red)" : "oklch(0.75 0.015 80)" }}
                    >
                      {halfAndHalf && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--napoli-red)" }} />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Half & Half
                      </div>
                      <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                        Different toppings on each half · half-toppings at ½ price
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Normal topping picker */}
              {!halfAndHalf && (
                <div className="flex flex-wrap gap-2">
                  {PIZZA_30_TOPPINGS.map((t) => {
                    const isSelected = selectedToppings.includes(t);
                    return (
                      <ToppingChip
                        key={t}
                        label={t}
                        selected={isSelected}
                        disabled={false}
                        onClick={() => toggleTopping(t)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Half & Half picker */}
              {halfAndHalf && (
                <div className="flex flex-col gap-4">
                  {/* First half */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: "var(--napoli-red)" }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                        1st Half ({firstHalf.length} toppings)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PIZZA_30_TOPPINGS.map((t) => (
                        <ToppingChip
                          key={t}
                          label={t}
                          selected={firstHalf.includes(t)}
                          disabled={false}
                          onClick={() => toggleHalfTopping("first", t)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.015 80)" }} />
                    <span className="text-xs font-bold px-2" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                      2ND HALF
                    </span>
                    <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.015 80)" }} />
                  </div>

                  {/* Second half */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.45 0.10 145)" }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "oklch(0.45 0.10 145)", fontFamily: "'Oswald', sans-serif" }}>
                        2nd Half ({secondHalf.length} toppings)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PIZZA_30_TOPPINGS.map((t) => (
                        <ToppingChip
                          key={t}
                          label={t}
                          selected={secondHalf.includes(t)}
                          disabled={false}
                          onClick={() => toggleHalfTopping("second", t)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5 — Review & Notes */}
          {step === 5 && (
            <div>
              {/* Summary */}
              <div className="rounded-lg p-4 mb-4" style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.90 0.012 80)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                  Order Summary
                </p>
                <div className="flex flex-col gap-1.5 text-sm" style={{ fontFamily: "'Lato', sans-serif" }}>
                  <div className="flex justify-between">
                    <span style={{ color: "oklch(0.45 0.03 30)" }}>Pizza</span>
                    <span className="font-semibold" style={{ color: "oklch(0.25 0.04 30)" }}>{pizzaName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "oklch(0.45 0.03 30)" }}>Size</span>
                    <span className="font-semibold" style={{ color: "oklch(0.25 0.04 30)" }}>{effectiveSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "oklch(0.45 0.03 30)" }}>Crust</span>
                    <span className="font-semibold" style={{ color: "oklch(0.25 0.04 30)" }}>
                      {CRUST_OPTIONS.find((c) => c.id === selectedCrust)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "oklch(0.45 0.03 30)" }}>Cut</span>
                    <span className="font-semibold" style={{ color: "oklch(0.25 0.04 30)" }}>
                      {CUT_OPTIONS.find((c) => c.id === selectedCut)?.label}
                    </span>
                  </div>

                  {/* Toppings summary */}
                  {!halfAndHalf && selectedToppings.length > 0 && (
                    <>
                      {freeToppings > 0 && (
                        <div className="flex justify-between items-start gap-2">
                          <span style={{ color: "oklch(0.45 0.03 30)" }}>Included ({Math.min(selectedToppings.length, freeToppings)})</span>
                          <span className="font-semibold text-right" style={{ color: "var(--napoli-green)", maxWidth: "60%" }}>
                            {selectedToppings.slice(0, freeToppings).join(", ")}
                          </span>
                        </div>
                      )}
                      {selectedToppings.length > freeToppings && (
                        <div className="flex justify-between items-start gap-2">
                          <span style={{ color: "oklch(0.45 0.03 30)" }}>Extra ({selectedToppings.length - freeToppings})</span>
                          <span className="font-semibold text-right" style={{ color: "oklch(0.25 0.04 30)", maxWidth: "60%" }}>
                            {selectedToppings.slice(freeToppings).join(", ")}
                          </span>
                        </div>
                      )}
                      {freeToppings === 0 && (
                        <div className="flex justify-between items-start gap-2">
                          <span style={{ color: "oklch(0.45 0.03 30)" }}>Toppings ({selectedToppings.length})</span>
                          <span className="font-semibold text-right" style={{ color: "oklch(0.25 0.04 30)", maxWidth: "60%" }}>
                            {selectedToppings.join(", ")}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {halfAndHalf && (
                    <>
                      <div className="flex justify-between items-start gap-2">
                        <span style={{ color: "oklch(0.45 0.03 30)" }}>1st Half</span>
                        <span className="font-semibold text-right" style={{ color: "oklch(0.25 0.04 30)", maxWidth: "60%" }}>
                          {firstHalf.length > 0 ? firstHalf.join(", ") : "Plain"}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span style={{ color: "oklch(0.45 0.03 30)" }}>2nd Half</span>
                        <span className="font-semibold text-right" style={{ color: "oklch(0.25 0.04 30)", maxWidth: "60%" }}>
                          {secondHalf.length > 0 ? secondHalf.join(", ") : "Plain"}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="border-t pt-2 mt-1 flex justify-between font-bold" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
                    <span style={{ color: "oklch(0.30 0.04 30)" }}>Base{freeToppings > 0 ? ` (incl. ${freeToppings} toppings)` : ""}</span>
                    <span style={{ color: "oklch(0.30 0.04 30)" }}>{formatPrice(basePrice)}</span>
                  </div>
                  {toppingsTotal > 0 && (
                    <div className="flex justify-between" style={{ color: "var(--napoli-green)" }}>
                      <span>Extra Toppings</span>
                      <span>+{formatPrice(toppingsTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold" style={{ color: "var(--napoli-red)" }}>
                    <span>Total</span>
                    <span>{formatPrice(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Special Notes */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                  placeholder="e.g. extra sauce, well done, no garlic..."
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none transition-colors"
                  style={{
                    border: `1.5px solid ${notes ? "var(--napoli-red)" : "oklch(0.85 0.015 80)"}`,
                    fontFamily: "'Lato', sans-serif",
                    color: "oklch(0.30 0.04 30)",
                  }}
                />
                <p className="text-xs text-right mt-0.5" style={{ color: "oklch(0.65 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                  {notes.length}/200
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0 border-t"
          style={{ borderColor: "oklch(0.90 0.012 80)", background: "oklch(0.98 0.008 80)" }}
        >
          {/* Back */}
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-30"
            style={{
              border: "1.5px solid oklch(0.82 0.015 80)",
              color: "oklch(0.40 0.04 30)",
              fontFamily: "'Oswald', sans-serif",
              background: "white",
            }}
          >
            <ChevronLeft size={15} /> Back
          </button>

          {/* Price preview */}
          {grandTotal > 0 && (
            <span className="text-sm font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
              {formatPrice(grandTotal)}
            </span>
          )}

          {/* Next / Add to Cart */}
          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}
            >
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95"
              style={{ background: "var(--napoli-green)", fontFamily: "'Oswald', sans-serif" }}
            >
              <ShoppingCart size={15} /> Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
