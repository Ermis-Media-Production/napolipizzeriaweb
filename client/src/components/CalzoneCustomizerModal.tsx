import { useState } from "react";
import { X, Check, ShoppingCart, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import {
  PIZZA_30_TOPPINGS,
  PIZZA_TOPPING_PRICES,
} from "@/lib/napoliData";

// ── Types ────────────────────────────────────────────────────
type Step = 1 | 2 | 3;

export interface CalzoneTrigger {
  itemType: "Calzone" | "Stromboli" | "Chicago Deep Dish" | "Sicilian";
  /** For size-based items (Calzone / Stromboli) */
  sizes?: string[];
  prices?: string[];
  /** For flat-price items (Chicago Deep Dish / Sicilian) */
  flatPrice?: number;
  flatPriceLabel?: string;
  /** Extra topping price — flat for Chicago/Sicilian, per-size for Calzone/Stromboli */
  flatExtraToppingPrice?: number;
  /** Number of free toppings included */
  freeToppings: number;
  /** Base description shown in step 1 */
  baseDesc: string;
  /** Clover catalog item ID for printer routing */
  cloverItemId?: string;
}

interface Props {
  trigger: CalzoneTrigger | null;
  modalKey: number;
  onClose: () => void;
}

function parsePrice(p: string): number {
  return parseFloat(p.replace(/[^0-9.]/g, "")) || 0;
}

const FREE_BADGE_STYLE = {
  background: "oklch(0.92 0.08 145)",
  color: "oklch(0.35 0.12 145)",
  fontFamily: "'Oswald', sans-serif",
};

export function CalzoneCustomizerModal({ trigger, onClose }: Props) {
  if (!trigger) return null;
  return <CalzoneCustomizerInner trigger={trigger} onClose={onClose} />;
}

function CalzoneCustomizerInner({ trigger, onClose }: { trigger: CalzoneTrigger; onClose: () => void }) {
  const { addItem, openCart } = useCart();

  const isFlatPrice = trigger.itemType === "Chicago Deep Dish" || trigger.itemType === "Sicilian";

  const [step, setStep] = useState<Step>(isFlatPrice ? 2 : 1);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedPrice, setSelectedPrice] = useState(
    isFlatPrice && trigger.flatPrice ? trigger.flatPrice : 0
  );
  const [freeToppingsList, setFreeToppingsList] = useState<string[]>([]);
  const [extraToppingsList, setExtraToppingsList] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Determine extra topping price based on item type
  const extraToppingPrice = isFlatPrice
    ? (trigger.flatExtraToppingPrice ?? 0)
    : (selectedSize ? PIZZA_TOPPING_PRICES[selectedSize] ?? 2.0 : 0);

  const extraCost = extraToppingsList.length * extraToppingPrice;
  const totalPrice = selectedPrice + extraCost;

  const step1Done = isFlatPrice ? true : selectedSize !== "";
  const step2Done = freeToppingsList.length === trigger.freeToppings;

  // ── Topping toggle helpers ───────────────────────────────
  const toggleFreeTopping = (t: string) => {
    setFreeToppingsList((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= trigger.freeToppings) return prev;
      return [...prev, t];
    });
  };

  const toggleExtraTopping = (t: string) => {
    setExtraToppingsList((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  // ── Add to cart ──────────────────────────────────────────
  const handleAddToCart = () => {
    const parts: string[] = [];

    if (!isFlatPrice && selectedSize) {
      parts.push(`Size: ${selectedSize}`);
    }

    if (trigger.itemType === "Calzone") {
      parts.push("Ricotta + Mozzarella");
    }

    if (freeToppingsList.length > 0) {
      parts.push(`Free toppings: ${freeToppingsList.join(", ")}`);
    }

    if (extraToppingsList.length > 0) {
      parts.push(
        `Extra toppings (+$${extraCost.toFixed(2)}): ${extraToppingsList.join(", ")}`
      );
    }

    if (notes.trim()) parts.push(`Note: ${notes.trim()}`);

    const itemName = isFlatPrice
      ? trigger.itemType
      : `${selectedSize} ${trigger.itemType}`;

    addItem({
      id: `${trigger.itemType.toLowerCase().replace(/ /g, "-")}-${selectedSize || "flat"}-${Date.now()}`,
      name: itemName,
      price: totalPrice,
      quantity: 1,
      category: trigger.itemType.toLowerCase().replace(/ /g, "-"),
      description: parts.join(" · "),
      cloverItemId: trigger.cloverItemId,
    });

    toast.success(`${itemName} added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });

    onClose();
  };

  // ── Step indicator ───────────────────────────────────────
  // For flat-price items, skip step 1 (size) — show only steps 2 & 3
  const steps = isFlatPrice
    ? [
        { num: 2, label: "TOPPINGS" },
        { num: 3, label: "EXTRAS" },
      ]
    : [
        { num: 1, label: "SIZE" },
        { num: 2, label: "TOPPINGS" },
        { num: 3, label: "EXTRAS" },
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "white", maxHeight: "92dvh" }}
      >
        {/* ── Header ── */}
        <div className="shrink-0 px-5 pt-5 pb-3" style={{ background: "var(--napoli-red)" }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold tracking-widest text-white/70 napoli-label">
                CUSTOMIZE YOUR ORDER
              </p>
              <h2
                className="text-xl font-bold text-white mt-0.5"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {trigger.itemType}
              </h2>
              {isFlatPrice && trigger.flatPriceLabel && (
                <p className="text-sm text-white/80 mt-0.5 napoli-body">{trigger.flatPriceLabel}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="mt-1 w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Step pills */}
          <div className="flex items-center gap-1 mt-3">
            {steps.map((s, i) => {
              const done = (s.num === 1 && step1Done) || (s.num === 2 && step2Done && step > 2);
              const active = s.num === step;
              return (
                <div key={s.num} className="flex items-center gap-1">
                  <div
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold napoli-label transition-all"
                    style={
                      done
                        ? { background: "oklch(0.92 0.08 145)", color: "oklch(0.35 0.12 145)" }
                        : active
                        ? { background: "white", color: "var(--napoli-red)" }
                        : { background: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }
                    }
                  >
                    {done ? <Check size={10} /> : <span>{i + 1}</span>}
                    <span className="ml-0.5">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <ChevronRight size={12} className="text-white/40" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: Size (only for Calzone / Stromboli) ── */}
          {step === 1 && !isFlatPrice && (
            <div className="px-5 py-5">
              <p className="napoli-label text-xs mb-0.5" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                CHOOSE YOUR SIZE *
              </p>
              <p className="text-xs napoli-body mb-1" style={{ color: "oklch(0.52 0.03 30)" }}>
                {trigger.baseDesc}
              </p>
              {trigger.itemType === "Calzone" && (
                <p className="text-xs napoli-body mb-4 font-semibold" style={{ color: "oklch(0.42 0.03 30)" }}>
                  Includes: Ricotta + Mozzarella + {trigger.freeToppings} toppings of your choice
                </p>
              )}
              {trigger.itemType === "Stromboli" && (
                <p className="text-xs napoli-body mb-4 font-semibold" style={{ color: "oklch(0.42 0.03 30)" }}>
                  Includes: {trigger.freeToppings} toppings of your choice
                </p>
              )}

              <div className="flex flex-col gap-2">
                {trigger.sizes!.map((size, i) => {
                  const price = parsePrice(trigger.prices![i]);
                  const active = selectedSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => { setSelectedSize(size); setSelectedPrice(price); }}
                      className="flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold napoli-body transition-all active:scale-95"
                      style={
                        active
                          ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                          : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                      }
                    >
                      <span>{size} {trigger.itemType}</span>
                      <span
                        className="napoli-price text-base"
                        style={{ color: active ? "rgba(255,255,255,0.9)" : "var(--napoli-red)" }}
                      >
                        {trigger.prices![i]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div
                className="mt-5 flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <div>
                  <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Base price</p>
                  <p className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>
                    {selectedSize ? `$${selectedPrice.toFixed(2)}` : "—"}
                  </p>
                </div>
                <button
                  onClick={() => step1Done && setStep(2)}
                  disabled={!step1Done}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95"
                  style={
                    step1Done
                      ? { background: "var(--napoli-red)", color: "white" }
                      : { background: "oklch(0.88 0.015 80)", color: "oklch(0.65 0.015 80)", cursor: "not-allowed" }
                  }
                >
                  NEXT: TOPPINGS <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Free toppings ── */}
          {step === 2 && (
            <div className="px-5 py-5">
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                CHOOSE {trigger.freeToppings} FREE TOPPINGS *
              </p>
              <p className="text-xs napoli-body mb-1" style={{ color: "oklch(0.52 0.03 30)" }}>
                Select exactly {trigger.freeToppings} — included at no extra cost.
              </p>

              {/* Recap */}
              <div
                className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <Check size={14} style={{ color: "var(--napoli-green)" }} />
                <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                  {isFlatPrice ? trigger.itemType : `${selectedSize} ${trigger.itemType}`}
                </span>
                {trigger.itemType === "Calzone" && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold napoli-body"
                    style={FREE_BADGE_STYLE}
                  >
                    Ricotta + Mozzarella ✓
                  </span>
                )}
                {!isFlatPrice && (
                  <button
                    onClick={() => setStep(1)}
                    className="ml-auto text-xs napoli-label underline shrink-0"
                    style={{ color: "oklch(0.52 0.03 30)" }}
                  >
                    Change
                  </button>
                )}
              </div>

              {/* Counter */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>
                  Selected: <strong>{freeToppingsList.length}</strong> / {trigger.freeToppings}
                </span>
                {freeToppingsList.length === trigger.freeToppings && (
                  <span className="text-xs font-semibold napoli-label" style={{ color: "oklch(0.40 0.12 145)" }}>
                    ✓ All free toppings selected
                  </span>
                )}
              </div>

              {/* Toppings grid */}
              <div className="grid grid-cols-2 gap-2">
                {PIZZA_30_TOPPINGS.map((t) => {
                  const selected = freeToppingsList.includes(t);
                  const maxed = !selected && freeToppingsList.length >= trigger.freeToppings;
                  return (
                    <button
                      key={t}
                      onClick={() => toggleFreeTopping(t)}
                      disabled={maxed}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold napoli-body text-left transition-all active:scale-95"
                      style={
                        selected
                          ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                          : maxed
                          ? { background: "oklch(0.96 0.005 80)", border: "2px solid oklch(0.90 0.010 80)", color: "oklch(0.72 0.015 80)", cursor: "not-allowed" }
                          : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                      }
                    >
                      {selected && <Check size={11} className="shrink-0" />}
                      <span>{t}</span>
                      <span
                        className="ml-auto text-xs shrink-0 napoli-label"
                        style={{ color: selected ? "rgba(255,255,255,0.8)" : "oklch(0.55 0.10 145)" }}
                      >
                        FREE
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div
                className="mt-5 flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <div>
                  <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Base price</p>
                  <p className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>
                    ${selectedPrice.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => step2Done && setStep(3)}
                  disabled={!step2Done}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95"
                  style={
                    step2Done
                      ? { background: "var(--napoli-red)", color: "white" }
                      : { background: "oklch(0.88 0.015 80)", color: "oklch(0.65 0.015 80)", cursor: "not-allowed" }
                  }
                >
                  NEXT: EXTRAS <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Extra toppings + notes ── */}
          {step === 3 && (
            <div className="px-5 py-5">
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                EXTRA TOPPINGS (OPTIONAL)
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                Each extra topping:{" "}
                <strong style={{ color: "var(--napoli-red)" }}>
                  +${extraToppingPrice.toFixed(2)}
                </strong>
                {!isFlatPrice && selectedSize && ` for ${selectedSize}`}.
              </p>

              {/* Recap */}
              <div
                className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <Check size={14} style={{ color: "var(--napoli-green)" }} />
                <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                  {isFlatPrice ? trigger.itemType : `${selectedSize} ${trigger.itemType}`}
                </span>
                {freeToppingsList.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded-full font-semibold napoli-body"
                    style={FREE_BADGE_STYLE}
                  >
                    {t}
                  </span>
                ))}
                <button
                  onClick={() => setStep(2)}
                  className="ml-auto text-xs napoli-label underline shrink-0"
                  style={{ color: "oklch(0.52 0.03 30)" }}
                >
                  Change
                </button>
              </div>

              {/* Extra toppings counter */}
              {extraToppingsList.length > 0 && (
                <div className="mb-2 text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>
                  Extra toppings: <strong>{extraToppingsList.length}</strong> (+${extraCost.toFixed(2)})
                </div>
              )}

              {/* Extra toppings grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PIZZA_30_TOPPINGS.map((t) => {
                  const isFree = freeToppingsList.includes(t);
                  const isExtra = extraToppingsList.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => !isFree && toggleExtraTopping(t)}
                      disabled={isFree}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold napoli-body text-left transition-all active:scale-95"
                      style={
                        isFree
                          ? { background: "oklch(0.92 0.08 145)", border: "2px solid oklch(0.80 0.10 145)", color: "oklch(0.35 0.12 145)", cursor: "default" }
                          : isExtra
                          ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                          : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                      }
                    >
                      {(isFree || isExtra) && <Check size={11} className="shrink-0" />}
                      <span>{t}</span>
                      <span
                        className="ml-auto text-xs shrink-0 napoli-label"
                        style={{
                          color: isFree
                            ? "oklch(0.45 0.12 145)"
                            : isExtra
                            ? "rgba(255,255,255,0.85)"
                            : "var(--napoli-red)",
                        }}
                      >
                        {isFree ? "FREE" : `+$${extraToppingPrice.toFixed(2)}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Special notes */}
              <div className="mt-2">
                <label
                  className="block text-xs napoli-label mb-1.5"
                  style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}
                >
                  📝 SPECIAL NOTES (OPTIONAL)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g. extra crispy, well done, light sauce..."
                  maxLength={200}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm napoli-body resize-none transition-all outline-none"
                  style={{
                    border: notes ? "2px solid var(--napoli-red)" : "2px solid oklch(0.88 0.015 80)",
                    color: "var(--napoli-dark)",
                    background: "white",
                  }}
                />
                <p className="text-right text-xs mt-0.5" style={{ color: "oklch(0.65 0.015 80)" }}>
                  {notes.length}/200
                </p>
              </div>

              {/* Total + Add to Cart */}
              <div
                className="mt-4 flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <div>
                  <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Order total</p>
                  <p className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>
                    ${totalPrice.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95 hover:opacity-90"
                  style={{ background: "var(--napoli-red)", color: "white" }}
                >
                  <ShoppingCart size={16} />
                  ADD TO CART
                </button>
              </div>
            </div>
          )}

        </div>{/* end scrollable body */}
      </div>
    </div>
  );
}
