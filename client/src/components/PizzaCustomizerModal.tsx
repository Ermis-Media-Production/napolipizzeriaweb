/**
 * PizzaCustomizerModal
 * 4-step interactive pizza builder:
 *  Step 1 — Choose size (10"–36")
 *  Step 2 — Choose crust type (Regular / Thin / Stuffed / Gluten Free)
 *  Step 3 — Add toppings (+$1.50 each, up to 10)
 *  Step 4 — Special notes + confirm add to cart
 */
import { useState, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Check, ShoppingCart, Plus, Minus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import {
  PIZZA_SIZES,
  PIZZA_BASE_PRICES,
  PIZZA_30_TOPPINGS,
} from "@/lib/napoliData";

// ── Types ──────────────────────────────────────────────────────────────────
export interface PizzaSelection {
  pizzaName: string;   // "Plain Cheese" | specialty name
  isSpecialty: boolean;
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
  { id: "gluten-free", label: "Gluten Free", desc: "14\" only — $12.75 base" },
];

// Gluten free is only available in 14"
const GLUTEN_FREE_SIZE = '14"';

// Topping price per topping
const TOPPING_PRICE = 1.50;
const MAX_TOPPINGS = 10;

// ── Helpers ────────────────────────────────────────────────────────────────
function getBasePrice(pizzaName: string, size: string, crust: string): number {
  if (crust === "gluten-free") return 12.75;

  // Look up base price from PIZZA_BASE_PRICES
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
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const { pizzaName, isSpecialty } = selection;

  // When gluten free is selected, force size to 14"
  const effectiveSize = selectedCrust === "gluten-free" ? GLUTEN_FREE_SIZE : selectedSize;

  const basePrice = useMemo(
    () => getBasePrice(pizzaName, effectiveSize, selectedCrust),
    [pizzaName, effectiveSize, selectedCrust]
  );

  const toppingsTotal = selectedToppings.length * TOPPING_PRICE;
  const grandTotal = basePrice + toppingsTotal;

  // ── Topping toggle ─────────────────────────────────────────────────────
  function toggleTopping(t: string) {
    setSelectedToppings((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= MAX_TOPPINGS) {
        toast.error(`Maximum ${MAX_TOPPINGS} toppings allowed`);
        return prev;
      }
      return [...prev, t];
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────
  function canAdvance() {
    if (step === 1) return effectiveSize !== "";
    if (step === 2) return selectedCrust !== "";
    if (step === 3) return true; // toppings optional
    return false;
  }

  function handleAddToCart() {
    const toppingStr =
      selectedToppings.length > 0
        ? `Toppings: ${selectedToppings.join(", ")}`
        : "Plain (no extra toppings)";
    const crustLabel = CRUST_OPTIONS.find((c) => c.id === selectedCrust)?.label ?? selectedCrust;
    const descParts = [
      `Size: ${effectiveSize}`,
      `Crust: ${crustLabel}`,
      toppingStr,
    ];
    if (notes.trim()) descParts.push(`Note: ${notes.trim()}`);

    addItem({
      id: `pizza-${pizzaName}-${effectiveSize}-${selectedCrust}-${Date.now()}`,
      name: `${pizzaName} Pizza (${effectiveSize})`,
      price: grandTotal,
      quantity: 1,
      category: "pizza",
      description: descParts.join(" · "),
    });

    toast.success(`${pizzaName} Pizza (${effectiveSize}) added to cart!`);
    onClose();
  }

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
        <div className="flex items-center justify-center gap-2 px-5 py-3 shrink-0" style={{ background: "oklch(0.97 0.012 80)", borderBottom: "1px solid oklch(0.90 0.012 80)" }}>
          {[1, 2, 3, 4].map((n, i) => (
            <div key={n} className="flex items-center gap-2">
              <StepDot active={step === n} done={step > n} num={n} />
              {i < 3 && (
                <div className="w-8 h-0.5 rounded" style={{ background: step > n + 1 ? "var(--napoli-green)" : step > n ? "var(--napoli-red)" : "oklch(0.88 0.015 80)" }} />
              )}
            </div>
          ))}
          <span className="ml-3 text-xs font-semibold" style={{ color: "oklch(0.45 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
            {step === 1 ? "Choose Size" : step === 2 ? "Choose Crust" : step === 3 ? "Add Toppings" : "Review & Add"}
          </span>
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
                  // Get price for this size from Plain Cheese as reference
                  const prices = PIZZA_BASE_PRICES["Plain Cheese"];
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
              <p className="text-xs mt-3" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                Prices shown are for Plain Cheese. Specialty pizzas may vary.
              </p>
            </div>
          )}

          {/* STEP 2 — Crust */}
          {step === 2 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                Select Crust Type
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
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all active:scale-[0.99]"
                      style={{
                        borderColor: isSelected ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                        background: isSelected ? "oklch(0.97 0.04 27)" : "white",
                        opacity: isGFDisabled ? 0.5 : 1,
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

          {/* STEP 3 — Toppings */}
          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                  Add Toppings (Optional)
                </p>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: selectedToppings.length > 0 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                    color: selectedToppings.length > 0 ? "white" : "oklch(0.52 0.03 30)",
                    fontFamily: "'Oswald', sans-serif",
                  }}
                >
                  {selectedToppings.length}/{MAX_TOPPINGS} · +{formatPrice(toppingsTotal)}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                Each topping adds <strong>+$1.50</strong>. Skip to keep as-is.
              </p>
              <div className="flex flex-wrap gap-2">
                {PIZZA_30_TOPPINGS.map((t) => {
                  const isSelected = selectedToppings.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTopping(t)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95"
                      style={{
                        borderColor: isSelected ? "var(--napoli-red)" : "oklch(0.85 0.015 80)",
                        background: isSelected ? "var(--napoli-red)" : "white",
                        color: isSelected ? "white" : "oklch(0.40 0.03 30)",
                        fontFamily: "'Lato', sans-serif",
                      }}
                    >
                      {isSelected ? <Minus size={10} /> : <Plus size={10} />}
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4 — Review & Notes */}
          {step === 4 && (
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
                  {selectedToppings.length > 0 && (
                    <div className="flex justify-between items-start gap-2">
                      <span style={{ color: "oklch(0.45 0.03 30)" }}>Toppings ({selectedToppings.length})</span>
                      <span className="font-semibold text-right" style={{ color: "oklch(0.25 0.04 30)", maxWidth: "60%" }}>
                        {selectedToppings.join(", ")}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-1 flex justify-between font-bold" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
                    <span style={{ color: "oklch(0.30 0.04 30)" }}>Base</span>
                    <span style={{ color: "oklch(0.30 0.04 30)" }}>{formatPrice(basePrice)}</span>
                  </div>
                  {toppingsTotal > 0 && (
                    <div className="flex justify-between" style={{ color: "var(--napoli-green)" }}>
                      <span>Toppings</span>
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
          {step < 4 ? (
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
