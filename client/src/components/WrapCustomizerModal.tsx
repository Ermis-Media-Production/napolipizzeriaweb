/**
 * WrapCustomizerModal
 * 3-step interactive modal for Wraps orders.
 *
 * Step 1 — MANDATORY: choose wrap type (Grilled Chicken Caesar / Crispy Chicken / Buffalo Chicken)
 * Step 2 — MANDATORY: choose bread type (Flour / Wheat / Gluten Free)
 * Step 3 — OPTIONAL: add Ranch or Blue Cheese side (2oz $1.49 / 6oz $2.49), special notes
 */
import { useState } from "react";
import { X, ChevronRight, Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const WRAP_TYPES = [
  { name: "Grilled Chicken Caesar", emoji: "🥗" },
  { name: "Crispy Chicken",         emoji: "🍗" },
  { name: "Buffalo Chicken",        emoji: "🌶️" },
];

const BREAD_TYPES = [
  { name: "Flour",        desc: "Classic soft flour tortilla" },
  { name: "Wheat",        desc: "Hearty whole wheat bread" },
  { name: "Gluten Free",  desc: "Gluten free bread available" },
];

export interface WrapTrigger {
  basePrice: number;
}

interface Props {
  trigger: WrapTrigger | null;
  onClose: () => void;
}

type Step = 1 | 2 | 3;
type SauceOption = "none" | "ranch-2oz" | "ranch-6oz" | "bluecheese-2oz" | "bluecheese-6oz";

const SAUCE_OPTIONS: { id: SauceOption; label: string; extra: number }[] = [
  { id: "none",           label: "No Sauce",        extra: 0 },
  { id: "ranch-2oz",      label: "Ranch 2oz",       extra: 1.49 },
  { id: "ranch-6oz",      label: "Ranch 6oz",       extra: 2.49 },
  { id: "bluecheese-2oz", label: "Blue Cheese 2oz", extra: 1.49 },
  { id: "bluecheese-6oz", label: "Blue Cheese 6oz", extra: 2.49 },
];

export default function WrapCustomizerModal({ trigger, onClose }: Props) {
  if (!trigger) return null;
  return <WrapCustomizerInner trigger={trigger} onClose={onClose} />;
}

function WrapCustomizerInner({ trigger, onClose }: { trigger: WrapTrigger; onClose: () => void }) {
  const { addItem, openCart } = useCart();

  const [step, setStep] = useState<Step>(1);
  const [wrapType, setWrapType]   = useState("");
  const [breadType, setBreadType] = useState("");
  const [sauce, setSauce]         = useState<SauceOption>("none");
  const [notes, setNotes]         = useState("");

  const selectedSauce = SAUCE_OPTIONS.find(s => s.id === sauce)!;
  const totalPrice = trigger.basePrice + selectedSauce.extra;

  const handleAddToCart = () => {
    const addons: string[] = [];
    addons.push(breadType);
    if (sauce !== "none") addons.push(`${selectedSauce.label} (+$${selectedSauce.extra.toFixed(2)})`);
    if (notes.trim()) addons.push(`Note: ${notes.trim()}`);

    addItem({
      id: `wrap-${wrapType}-${breadType}-${sauce}-${Date.now()}`,
      name: `${wrapType} Wrap`,
      price: totalPrice,
      quantity: 1,
      category: "wraps",
      description: addons.join(" · "),
    });

    toast.success(`${wrapType} Wrap added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });

    onClose();
  };

  // Step indicator helpers
  const step1Done = wrapType !== "";
  const step2Done = breadType !== "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0.08 0.02 27 / 0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        style={{ background: "white" }}
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: "var(--napoli-red)" }}
        >
          <div>
            <p className="napoli-label text-xs text-white opacity-80 tracking-widest">CUSTOMIZE YOUR ORDER</p>
            <h2 className="napoli-heading text-lg text-white">
              {wrapType ? `${wrapType} Wrap` : "Wraps"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-90"
            style={{ background: "oklch(0.35 0.18 27)", color: "white" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── STEP INDICATOR ─────────────────────────────────── */}
        <div className="flex items-center px-5 py-3 gap-2 shrink-0" style={{ background: "oklch(0.97 0.012 80)" }}>
          {/* Step 1 */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step1Done && step > 1 ? "var(--napoli-green)" : step === 1 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                color: step1Done && step > 1 ? "white" : step === 1 ? "white" : "oklch(0.52 0.03 30)",
              }}
            >
              {step1Done && step > 1 ? <Check size={12} /> : "1"}
            </div>
            <span
              className="text-xs napoli-label"
              style={{ color: step === 1 ? "var(--napoli-red)" : step1Done ? "var(--napoli-green)" : "oklch(0.52 0.03 30)" }}
            >
              Wrap
            </span>
          </div>
          <ChevronRight size={14} style={{ color: "oklch(0.70 0.015 80)" }} />

          {/* Step 2 */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step2Done && step > 2 ? "var(--napoli-green)" : step === 2 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                color: step2Done && step > 2 ? "white" : step === 2 ? "white" : "oklch(0.52 0.03 30)",
              }}
            >
              {step2Done && step > 2 ? <Check size={12} /> : "2"}
            </div>
            <span
              className="text-xs napoli-label"
              style={{ color: step === 2 ? "var(--napoli-red)" : step2Done && step > 2 ? "var(--napoli-green)" : "oklch(0.52 0.03 30)" }}
            >
              Bread
            </span>
          </div>
          <ChevronRight size={14} style={{ color: "oklch(0.70 0.015 80)" }} />

          {/* Step 3 */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step === 3 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                color: step === 3 ? "white" : "oklch(0.52 0.03 30)",
              }}
            >
              3
            </div>
            <span className="text-xs napoli-label" style={{ color: step === 3 ? "var(--napoli-red)" : "oklch(0.52 0.03 30)" }}>
              Sides
            </span>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">

          {/* ── STEP 1: CHOOSE WRAP TYPE ───────────────────────── */}
          {step === 1 && (
            <div className="px-5 py-5">
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                CHOOSE YOUR WRAP <span>*</span>
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                Select one — required.
              </p>

              <div className="flex flex-col gap-3">
                {WRAP_TYPES.map((w) => (
                  <button
                    key={w.name}
                    onClick={() => setWrapType(w.name)}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all active:scale-98"
                    style={
                      wrapType === w.name
                        ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                        : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                    }
                  >
                    <span className="text-2xl">{w.emoji}</span>
                    <span className="napoli-body text-sm font-bold">{w.name}</span>
                    {wrapType === w.name && (
                      <Check size={16} className="ml-auto" style={{ color: "white" }} />
                    )}
                  </button>
                ))}
              </div>

              {/* Price */}
              <div
                className="mt-5 flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <span className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Base price</span>
                <span className="napoli-price text-lg" style={{ color: "var(--napoli-red)" }}>
                  ${trigger.basePrice.toFixed(2)}
                </span>
              </div>

              {/* Next button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!wrapType}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95"
                  style={
                    wrapType
                      ? { background: "var(--napoli-red)", color: "white" }
                      : { background: "oklch(0.88 0.015 80)", color: "oklch(0.62 0.03 30)", cursor: "not-allowed" }
                  }
                >
                  Next: Bread Type <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: CHOOSE BREAD TYPE ──────────────────────── */}
          {step === 2 && (
            <div className="px-5 py-5">
              {/* Wrap recap */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <Check size={14} style={{ color: "var(--napoli-green)" }} />
                <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                  Wrap: <span style={{ color: "var(--napoli-red)" }}>{wrapType}</span>
                </span>
                <button
                  onClick={() => setStep(1)}
                  className="ml-auto text-xs napoli-label underline shrink-0"
                  style={{ color: "oklch(0.52 0.03 30)" }}
                >
                  Change
                </button>
              </div>

              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                CHOOSE YOUR BREAD <span>*</span>
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                Select one — required. Gluten Free bread available.
              </p>

              <div className="flex flex-col gap-3">
                {BREAD_TYPES.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => setBreadType(b.name)}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all active:scale-98"
                    style={
                      breadType === b.name
                        ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                        : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                    }
                  >
                    <span className="text-2xl">🫓</span>
                    <div>
                      <p className="napoli-body text-sm font-bold">{b.name}</p>
                      <p
                        className="text-xs napoli-body mt-0.5"
                        style={{ color: breadType === b.name ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}
                      >
                        {b.desc}
                      </p>
                    </div>
                    {breadType === b.name && (
                      <Check size={16} className="ml-auto shrink-0" style={{ color: "white" }} />
                    )}
                  </button>
                ))}
              </div>

              {/* Next button */}
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setStep(3)}
                  disabled={!breadType}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95"
                  style={
                    breadType
                      ? { background: "var(--napoli-red)", color: "white" }
                      : { background: "oklch(0.88 0.015 80)", color: "oklch(0.62 0.03 30)", cursor: "not-allowed" }
                  }
                >
                  Next: Sides <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: SIDES ──────────────────────────────────── */}
          {step === 3 && (
            <div className="px-5 py-5">
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                OPTIONAL SIDES
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                Add a dipping sauce on the side. All optional.
              </p>

              {/* Order recap */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <Check size={14} style={{ color: "var(--napoli-green)" }} />
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                    {wrapType} Wrap
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold napoli-body"
                    style={{ background: "var(--napoli-red)", color: "white" }}
                  >
                    {breadType}
                  </span>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="ml-auto text-xs napoli-label underline shrink-0"
                  style={{ color: "oklch(0.52 0.03 30)" }}
                >
                  Change
                </button>
              </div>

              {/* Sauce selector */}
              <div className="mb-4">
                <p className="text-xs napoli-label mb-3" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                  🥣 DIPPING SAUCE (OPTIONAL)
                </p>

                {/* No sauce */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setSauce("none")}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold napoli-body transition-all active:scale-95"
                    style={
                      sauce === "none"
                        ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                        : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                    }
                  >
                    <span>No Sauce</span>
                    {sauce === "none" && <Check size={15} />}
                  </button>

                  {/* Ranch group */}
                  <p className="text-xs napoli-label mt-2 mb-1" style={{ color: "oklch(0.52 0.03 30)", letterSpacing: "0.08em" }}>
                    RANCH
                  </p>
                  <div className="flex gap-2">
                    {(["ranch-2oz", "ranch-6oz"] as const).map((id) => {
                      const opt = SAUCE_OPTIONS.find(s => s.id === id)!;
                      return (
                        <button
                          key={id}
                          onClick={() => setSauce(id)}
                          className="flex-1 py-3 rounded-xl text-xs font-semibold napoli-body transition-all active:scale-95"
                          style={
                            sauce === id
                              ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                              : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                          }
                        >
                          <div>{opt.label}</div>
                          <div className="napoli-price text-sm mt-0.5" style={{ color: sauce === id ? "oklch(0.90 0.015 80)" : "var(--napoli-red)" }}>
                            +${opt.extra.toFixed(2)}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Blue Cheese group */}
                  <p className="text-xs napoli-label mt-3 mb-1" style={{ color: "oklch(0.52 0.03 30)", letterSpacing: "0.08em" }}>
                    BLUE CHEESE
                  </p>
                  <div className="flex gap-2">
                    {(["bluecheese-2oz", "bluecheese-6oz"] as const).map((id) => {
                      const opt = SAUCE_OPTIONS.find(s => s.id === id)!;
                      return (
                        <button
                          key={id}
                          onClick={() => setSauce(id)}
                          className="flex-1 py-3 rounded-xl text-xs font-semibold napoli-body transition-all active:scale-95"
                          style={
                            sauce === id
                              ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                              : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                          }
                        >
                          <div>{opt.label}</div>
                          <div className="napoli-price text-sm mt-0.5" style={{ color: sauce === id ? "oklch(0.90 0.015 80)" : "var(--napoli-red)" }}>
                            +${opt.extra.toFixed(2)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
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
                  placeholder="E.g. extra crispy, no onions, sauce on the side..."
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
                className="mt-5 flex items-center justify-between px-4 py-3 rounded-lg"
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
                  Add to Cart
                </button>
              </div>
            </div>
          )}

        </div>{/* end scrollable body */}
      </div>
    </div>
  );
}
