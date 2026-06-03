/**
 * GlutenFreePizzaModal
 * 2-step customizer for Gluten Free Pizza 14"
 * Step 1 — Choose toppings ($2.75 each)
 * Step 2 — Choose cut style + add to cart
 */
import { useState } from "react";
import { X, ShoppingCart, Plus, Minus, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const GLUTEN_FREE_BASE_PRICE = 12.75;
const TOPPING_PRICE = 2.75;

const TOPPINGS = [
  "Anchovies", "Artichoke Hearts", "Fresh Basil", "Black Olives", "Broccoli",
  "Zucchini", "Capicola", "Cheddar Cheese", "Grilled Chicken", "Chorizo",
  "Eggplant", "Fresh Garlic", "Green Olives", "Green Peppers", "Ground Beef",
  "Ham", "Italian Sausage", "Jalapeños", "Meatballs", "Mushrooms",
  "Onions", "Pepperoni", "Pineapple", "Red Roasted Peppers", "Salami",
  "Spinach", "Tomatoes", "Canadian Bacon",
];

const CUT_OPTIONS = [
  { id: "triangle", label: "Triangle Cut",  desc: "Classic pizza slices",        emoji: "🍕" },
  { id: "square",   label: "Square Cut",    desc: "Party-style squares",          emoji: "⬛" },
  { id: "strips",   label: "Strips",        desc: "Long rectangular strips",      emoji: "📏" },
  { id: "uncut",    label: "Uncut",         desc: "We leave the cutting to you",  emoji: "⭕" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlutenFreePizzaModal({ isOpen, onClose }: Props) {
  const { addItem } = useCart();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [selectedCut, setSelectedCut] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  if (!isOpen) return null;

  const itemPrice = GLUTEN_FREE_BASE_PRICE + selectedToppings.length * TOPPING_PRICE;
  const totalPrice = itemPrice * quantity;

  function toggleTopping(t: string) {
    setSelectedToppings((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function handleClose() {
    setStep(1);
    setSelectedToppings([]);
    setSelectedCut("");
    setQuantity(1);
    onClose();
  }

  function handleAddToCart() {
    const cutLabel = CUT_OPTIONS.find((c) => c.id === selectedCut)?.label ?? selectedCut;
    const parts: string[] = [];
    if (selectedToppings.length > 0) {
      parts.push(`Toppings: ${selectedToppings.join(", ")}`);
    } else {
      parts.push("No extra toppings (cheese only)");
    }
    parts.push(`Cut: ${cutLabel}`);

    addItem({
      id: `gluten-free-pizza-${Date.now()}`,
      name: `Gluten Free Pizza 14"${selectedToppings.length > 0 ? ` (+${selectedToppings.length} topping${selectedToppings.length > 1 ? "s" : ""})` : ""}`,
      price: itemPrice,
      quantity,
      category: "pizza",
      description: parts.join(" · "),
    });

    toast.success("Gluten Free Pizza added to cart!", {
      description: parts.join(" · "),
    });

    handleClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{
          background: "oklch(0.99 0.008 80)",
          maxHeight: "88dvh",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: "var(--napoli-dark)", color: "white" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌾</span>
            <div>
              <h2 className="napoli-label text-base tracking-wider text-white">Gluten Free Pizza 14"</h2>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.70 0.015 80)" }}>
                Hand-tossed 14" gluten-free crust — includes cheese
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "oklch(0.30 0.04 30)", color: "white" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Step indicator ── */}
        <div
          className="flex items-center justify-center gap-3 px-5 py-2.5 shrink-0"
          style={{ background: "oklch(0.97 0.012 80)", borderBottom: "1px solid oklch(0.90 0.015 80)" }}
        >
          {[
            { num: 1, label: "Toppings" },
            { num: 2, label: "Cut Style" },
          ].map(({ num, label }, i) => {
            const isActive = step === num;
            const isDone = step > num;
            return (
              <div key={num} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: isDone ? "var(--napoli-green)" : isActive ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                      color: isDone || isActive ? "white" : "oklch(0.52 0.03 30)",
                    }}
                  >
                    {isDone ? <Check size={13} /> : num}
                  </div>
                  <span
                    className="text-[9px] font-semibold"
                    style={{
                      color: isActive ? "var(--napoli-red)" : isDone ? "oklch(0.45 0.10 145)" : "oklch(0.65 0.015 80)",
                      fontFamily: "'Oswald', sans-serif",
                    }}
                  >
                    {label}
                  </span>
                </div>
                {i === 0 && (
                  <div
                    className="w-8 h-0.5 rounded mb-3"
                    style={{ background: isDone ? "var(--napoli-red)" : "oklch(0.88 0.015 80)" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Price bar ── */}
        <div
          className="flex items-center justify-between px-5 py-2 shrink-0 border-b"
          style={{ background: "white", borderColor: "oklch(0.90 0.015 80)" }}
        >
          <div className="flex items-center gap-2 text-xs napoli-body" style={{ color: "oklch(0.50 0.03 30)" }}>
            <span>Base <strong style={{ color: "var(--napoli-red)" }}>${GLUTEN_FREE_BASE_PRICE.toFixed(2)}</strong></span>
            {selectedToppings.length > 0 && (
              <>
                <span>+</span>
                <span>{selectedToppings.length} topping{selectedToppings.length > 1 ? "s" : ""} <strong style={{ color: "var(--napoli-red)" }}>+${(selectedToppings.length * TOPPING_PRICE).toFixed(2)}</strong></span>
              </>
            )}
          </div>
          <span className="napoli-price text-base font-bold" style={{ color: "var(--napoli-red)" }}>
            ${itemPrice.toFixed(2)}
          </span>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>

          {/* STEP 1 — Toppings */}
          {step === 1 && (
            <>
              <p className="napoli-label text-xs mb-3" style={{ color: "oklch(0.52 0.03 30)", letterSpacing: "0.12em" }}>
                SELECT TOPPINGS — ${TOPPING_PRICE.toFixed(2)} EACH (OPTIONAL)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TOPPINGS.map((t) => {
                  const selected = selectedToppings.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTopping(t)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-all active:scale-95"
                      style={{
                        border: `2px solid ${selected ? "var(--napoli-red)" : "oklch(0.88 0.015 80)"}`,
                        background: selected ? "oklch(0.97 0.04 25)" : "white",
                        color: selected ? "var(--napoli-red)" : "oklch(0.35 0.03 30)",
                        fontFamily: "'Source Sans 3', sans-serif",
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-xs"
                        style={{ background: selected ? "var(--napoli-red)" : "oklch(0.93 0.012 80)", color: "white" }}
                      >
                        {selected ? "✓" : "+"}
                      </span>
                      <span className="truncate">{t}</span>
                      {selected && (
                        <span className="ml-auto text-xs shrink-0" style={{ color: "var(--napoli-red)" }}>
                          +$2.75
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* STEP 2 — Cut style */}
          {step === 2 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                How would you like it cut?
              </p>
              <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                Select a cut style for your Gluten Free 14" pizza.
              </p>
              <div className="flex flex-col gap-2 mb-5">
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
                      <span className="text-xl">{cut.emoji}</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                          {cut.label}
                        </div>
                        <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                          {cut.desc}
                        </div>
                      </div>
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: isSelected ? "var(--napoli-red)" : "oklch(0.75 0.015 80)" }}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--napoli-red)" }} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Mini summary */}
              <div className="rounded-lg p-3" style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.90 0.012 80)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>Summary</p>
                <div className="text-xs flex flex-col gap-1" style={{ fontFamily: "'Lato', sans-serif", color: "oklch(0.40 0.03 30)" }}>
                  <div className="flex justify-between">
                    <span>Gluten Free Pizza 14"</span>
                    <span className="font-semibold">${GLUTEN_FREE_BASE_PRICE.toFixed(2)}</span>
                  </div>
                  {selectedToppings.length > 0 && (
                    <div className="flex justify-between items-start gap-2">
                      <span>Toppings ({selectedToppings.length})</span>
                      <span className="font-semibold text-right" style={{ maxWidth: "55%" }}>{selectedToppings.join(", ")}</span>
                    </div>
                  )}
                  {selectedCut && (
                    <div className="flex justify-between">
                      <span>Cut</span>
                      <span className="font-semibold">{CUT_OPTIONS.find((c) => c.id === selectedCut)?.label}</span>
                    </div>
                  )}
                  <div className="border-t pt-1 mt-0.5 flex justify-between font-bold" style={{ borderColor: "oklch(0.88 0.015 80)", color: "var(--napoli-red)" }}>
                    <span>Total</span>
                    <span>${itemPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="px-5 py-4 shrink-0 border-t flex items-center gap-3"
          style={{ borderColor: "oklch(0.88 0.015 80)", background: "white" }}
          onClick={(e) => e.stopPropagation()}
        >
          {step === 1 ? (
            <>
              {/* Quantity selector */}
              <div
                className="flex items-center rounded-lg overflow-hidden border shrink-0"
                style={{ borderColor: "oklch(0.85 0.015 80)" }}
              >
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center transition-colors"
                  style={{ background: "oklch(0.96 0.012 80)", color: "var(--napoli-dark)" }}
                >
                  <Minus size={14} />
                </button>
                <span className="w-9 text-center text-sm font-bold napoli-price" style={{ color: "var(--napoli-dark)" }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 flex items-center justify-center transition-colors"
                  style={{ background: "oklch(0.96 0.012 80)", color: "var(--napoli-dark)" }}
                >
                  <Plus size={14} />
                </button>
              </div>
              {/* Next */}
              <button
                onClick={() => setStep(2)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold napoli-label tracking-wider transition-all active:scale-95"
                style={{ background: "var(--napoli-red)", color: "white" }}
              >
                Next — Choose Cut <ChevronRight size={15} />
              </button>
            </>
          ) : (
            <>
              {/* Back */}
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95"
                style={{ border: "1.5px solid oklch(0.82 0.015 80)", color: "oklch(0.40 0.04 30)", fontFamily: "'Oswald', sans-serif", background: "white" }}
              >
                <ChevronLeft size={15} /> Back
              </button>
              {/* Add to cart */}
              <button
                onClick={handleAddToCart}
                disabled={!selectedCut}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold napoli-label tracking-wider transition-all active:scale-95 disabled:opacity-40"
                style={{ background: selectedCut ? "var(--napoli-green)" : "oklch(0.75 0.015 80)", color: "white" }}
              >
                <ShoppingCart size={15} />
                Add to Cart — ${totalPrice.toFixed(2)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
