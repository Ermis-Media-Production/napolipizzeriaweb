/**
 * Pick Up Special Modal — 16" 1 Topping $12.99
 *
 * Flow:
 *   Step 1 — Choose toppings (1 free, each extra = $3.00)
 *             Toggle "Half & Half" when 2+ toppings selected
 *   Step 2 — (optional) Half & Half: pick toppings per half
 *   Step 3 — Choose cut type
 *   → "Add to Cart" plays casino winner sound and adds item
 */
import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, Trophy, Check } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { PIZZA_30_TOPPINGS } from "@/lib/napoliData";

const BASE_PRICE = 12.99;
const EXTRA_TOPPING_PRICE = 3.0;
const FREE_TOPPINGS = 1;

const CUT_TYPES = [
  { id: "traditional", label: "Traditional", desc: "Classic triangular slices" },
  { id: "square", label: "Square", desc: "Party-style square cuts" },
  { id: "thin", label: "Thin Crust", desc: "Extra crispy thin cut" },
  { id: "well-done", label: "Well Done", desc: "Extra golden & crispy" },
  { id: "uncut", label: "Uncut", desc: "No cuts — whole pizza" },
];

type Step = "toppings" | "halfhalf" | "cut";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Play a casino winner jingle using Web Audio API */
function playCasinoWinSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();

    // Ascending fanfare: C5 E5 G5 C6 E6
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    const starts = [0, 0.11, 0.22, 0.33, 0.48];
    const durs = [0.18, 0.18, 0.18, 0.22, 0.55];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t = ctx.currentTime + starts[i];
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.38, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t + durs[i]);
      osc.start(t);
      osc.stop(t + durs[i]);
    });

    // Shimmer coin-roll at the end
    const shimmer = ctx.createOscillator();
    const shimGain = ctx.createGain();
    shimmer.connect(shimGain);
    shimGain.connect(ctx.destination);
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(1800, ctx.currentTime + 0.52);
    shimmer.frequency.linearRampToValueAtTime(2600, ctx.currentTime + 0.90);
    shimGain.gain.setValueAtTime(0, ctx.currentTime + 0.52);
    shimGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.57);
    shimGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.95);
    shimmer.start(ctx.currentTime + 0.52);
    shimmer.stop(ctx.currentTime + 0.95);

    setTimeout(() => ctx.close(), 1200);
  } catch {
    // AudioContext unavailable — silently ignore
  }
}

export default function PickUpSpecialModal({ open, onClose }: Props) {
  const { addItem, openCart } = useCart();

  const [step, setStep] = useState<Step>("toppings");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [halfAndHalf, setHalfAndHalf] = useState(false);
  const [firstHalf, setFirstHalf] = useState<string[]>([]);
  const [secondHalf, setSecondHalf] = useState<string[]>([]);
  const [cutType, setCutType] = useState("traditional");

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setStep("toppings");
      setSelectedToppings([]);
      setHalfAndHalf(false);
      setFirstHalf([]);
      setSecondHalf([]);
      setCutType("traditional");
    }
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const totalToppings = halfAndHalf
    ? firstHalf.length + secondHalf.length
    : selectedToppings.length;

  const extraToppings = Math.max(0, totalToppings - FREE_TOPPINGS);
  const totalPrice = BASE_PRICE + extraToppings * EXTRA_TOPPING_PRICE;

  const toggleTopping = useCallback((t: string) => {
    setSelectedToppings((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }, []);

  const toggleHalfTopping = useCallback((half: "first" | "second", t: string) => {
    const setter = half === "first" ? setFirstHalf : setSecondHalf;
    setter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }, []);

  const buildDescription = () => {
    const cutLabel = CUT_TYPES.find((c) => c.id === cutType)?.label ?? cutType;
    if (halfAndHalf) {
      const f = firstHalf.length > 0 ? firstHalf.join(", ") : "Plain";
      const s = secondHalf.length > 0 ? secondHalf.join(", ") : "Plain";
      return `16" Pizza · Half & Half\n1st Half: ${f}\n2nd Half: ${s}\nCut: ${cutLabel}${extraToppings > 0 ? `\n+${extraToppings} extra topping${extraToppings > 1 ? "s" : ""} × $3.00` : ""}`;
    }
    const toppingStr = selectedToppings.length > 0 ? selectedToppings.join(", ") : "Plain (no toppings)";
    return `16" Pizza · ${toppingStr}\nCut: ${cutLabel}${extraToppings > 0 ? `\n+${extraToppings} extra topping${extraToppings > 1 ? "s" : ""} × $3.00` : ""}`;
  };

  const handleAddToCart = () => {
    addItem({
      id: `pickup-special-${Date.now()}`,
      name: 'Pick Up Special — 16" 1 Topping',
      price: totalPrice,
      quantity: 1,
      category: "pizza",
      description: buildDescription(),
    });
    playCasinoWinSound();
    toast.success("🎉 Pick Up Special added to cart!", {
      action: { label: "View Cart", onClick: openCart },
    });
    onClose();
    setTimeout(() => openCart(), 350);
  };

  if (!open) return null;

  const steps: Step[] = halfAndHalf ? ["toppings", "halfhalf", "cut"] : ["toppings", "cut"];
  const stepIndex = steps.indexOf(step);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ background: "white", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* ── HEADER ── */}
        <div className="px-5 pt-5 pb-4 shrink-0" style={{ background: "var(--napoli-dark)" }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "oklch(0.28 0.05 27)", color: "oklch(0.75 0.015 80)" }}
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} className="text-yellow-400" />
            <span className="napoli-label text-xs tracking-widest" style={{ color: "var(--napoli-gold)" }}>
              PICK UP SPECIAL
            </span>
          </div>
          <h2 className="napoli-display text-2xl" style={{ color: "oklch(0.99 0.015 80)" }}>
            16" Pizza — 1 Topping
          </h2>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="napoli-price text-3xl" style={{ color: "var(--napoli-gold)" }}>
              ${totalPrice.toFixed(2)}
            </span>
            {extraToppings > 0 && (
              <span className="text-xs" style={{ color: "oklch(0.65 0.015 80)" }}>
                +{extraToppings} extra × $3.00
              </span>
            )}
          </div>

          {/* Step progress bar */}
          <div className="flex gap-1.5 mt-3">
            {steps.map((s, i) => (
              <div
                key={s}
                className="h-1 rounded-full flex-1 transition-all duration-300"
                style={{ background: i <= stepIndex ? "var(--napoli-red)" : "oklch(0.35 0.05 27)" }}
              />
            ))}
          </div>
        </div>

        {/* ── BODY (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ══ STEP 1: TOPPINGS ══ */}
          {step === "toppings" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-sm" style={{ color: "var(--napoli-dark)" }}>
                  Choose Your Toppings
                </p>
                <span
                  className="text-xs px-2 py-0.5 rounded-full napoli-label"
                  style={{ background: "oklch(0.94 0.015 80)", color: "var(--napoli-dark)" }}
                >
                  1 free · +$3.00 each extra
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {PIZZA_30_TOPPINGS.map((t) => {
                  const selected = selectedToppings.includes(t);
                  const isFree = selected && selectedToppings.indexOf(t) < FREE_TOPPINGS;
                  const isExtra = selected && !isFree;
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTopping(t)}
                      className="flex items-center justify-between px-3 py-2 rounded text-xs text-left transition-all active:scale-95"
                      style={{
                        background: selected
                          ? isExtra
                            ? "oklch(0.95 0.06 30)"
                            : "oklch(0.93 0.07 145)"
                          : "oklch(0.97 0.006 80)",
                        border: `1.5px solid ${selected
                          ? isExtra
                            ? "var(--napoli-red)"
                            : "oklch(0.52 0.13 145)"
                          : "oklch(0.88 0.015 80)"}`,
                        color: "var(--napoli-dark)",
                      }}
                    >
                      <span className="font-medium">{t}</span>
                      {selected && (
                        <span
                          className="text-xs font-bold ml-1 shrink-0"
                          style={{ color: isExtra ? "var(--napoli-red)" : "oklch(0.40 0.13 145)" }}
                        >
                          {isExtra ? "+$3" : "✓ Free"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Half & Half toggle — only when 2+ toppings */}
              {selectedToppings.length >= 2 && (
                <div
                  className="flex items-center justify-between p-3 rounded-lg mb-4 cursor-pointer transition-all"
                  style={{
                    background: halfAndHalf ? "oklch(0.94 0.06 30)" : "oklch(0.97 0.006 80)",
                    border: `1.5px solid ${halfAndHalf ? "var(--napoli-red)" : "oklch(0.88 0.015 80)"}`,
                  }}
                  onClick={() => {
                    const next = !halfAndHalf;
                    setHalfAndHalf(next);
                    if (next) {
                      setFirstHalf([]);
                      setSecondHalf([]);
                      setSelectedToppings([]);
                    }
                  }}
                >
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>
                      Half & Half
                    </p>
                    <p className="text-xs" style={{ color: "oklch(0.52 0.03 30)" }}>
                      Different toppings on each half
                    </p>
                  </div>
                  {/* Toggle switch */}
                  <div
                    className="w-11 h-6 rounded-full transition-all flex items-center px-0.5 shrink-0"
                    style={{ background: halfAndHalf ? "var(--napoli-red)" : "oklch(0.80 0.015 80)" }}
                  >
                    <div
                      className="w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                      style={{ transform: halfAndHalf ? "translateX(20px)" : "translateX(0)" }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ STEP 2: HALF & HALF ══ */}
          {step === "halfhalf" && (
            <div>
              <p className="font-bold text-sm mb-4" style={{ color: "var(--napoli-dark)" }}>
                Half & Half Toppings
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(["first", "second"] as const).map((half) => {
                  const current = half === "first" ? firstHalf : secondHalf;
                  return (
                    <div key={half}>
                      <div
                        className="text-xs font-bold mb-2 px-2 py-1 rounded napoli-label text-center"
                        style={{ background: "var(--napoli-red)", color: "white" }}
                      >
                        {half === "first" ? "1st Half" : "2nd Half"}
                      </div>
                      <div className="flex flex-col gap-1">
                        {PIZZA_30_TOPPINGS.map((t) => {
                          const sel = current.includes(t);
                          return (
                            <button
                              key={t}
                              onClick={() => toggleHalfTopping(half, t)}
                              className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-left transition-all active:scale-95"
                              style={{
                                background: sel ? "oklch(0.94 0.06 30)" : "oklch(0.97 0.006 80)",
                                border: `1.5px solid ${sel ? "var(--napoli-red)" : "oklch(0.88 0.015 80)"}`,
                                color: "var(--napoli-dark)",
                              }}
                            >
                              <span>{t}</span>
                              {sel && <Check size={11} style={{ color: "var(--napoli-red)", flexShrink: 0 }} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ STEP 3: CUT TYPE ══ */}
          {step === "cut" && (
            <div>
              <p className="font-bold text-sm mb-3" style={{ color: "var(--napoli-dark)" }}>
                How would you like it cut?
              </p>
              <div className="flex flex-col gap-2 mb-5">
                {CUT_TYPES.map((c) => {
                  const sel = cutType === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCutType(c.id)}
                      className="flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-all active:scale-98"
                      style={{
                        background: sel ? "var(--napoli-red)" : "oklch(0.97 0.006 80)",
                        border: `1.5px solid ${sel ? "var(--napoli-red)" : "oklch(0.88 0.015 80)"}`,
                        color: sel ? "white" : "var(--napoli-dark)",
                      }}
                    >
                      <div className="text-left">
                        <div className="font-bold">{c.label}</div>
                        <div className="text-xs opacity-75">{c.desc}</div>
                      </div>
                      {sel && <Check size={16} />}
                    </button>
                  );
                })}
              </div>

              {/* Order summary */}
              <div
                className="p-3 rounded-lg text-xs mb-1"
                style={{ background: "oklch(0.96 0.008 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <p className="font-bold mb-1.5 text-sm" style={{ color: "var(--napoli-dark)" }}>
                  Order Summary
                </p>
                <p style={{ color: "oklch(0.45 0.03 30)" }}>
                  16" Pizza · Cut: {CUT_TYPES.find((c) => c.id === cutType)?.label}
                </p>
                {halfAndHalf ? (
                  <>
                    <p style={{ color: "oklch(0.45 0.03 30)" }}>
                      1st Half: {firstHalf.length > 0 ? firstHalf.join(", ") : "Plain"}
                    </p>
                    <p style={{ color: "oklch(0.45 0.03 30)" }}>
                      2nd Half: {secondHalf.length > 0 ? secondHalf.join(", ") : "Plain"}
                    </p>
                  </>
                ) : (
                  <p style={{ color: "oklch(0.45 0.03 30)" }}>
                    {selectedToppings.length > 0
                      ? `Toppings: ${selectedToppings.join(", ")}`
                      : "Plain (no toppings)"}
                  </p>
                )}
                {extraToppings > 0 && (
                  <p className="font-semibold" style={{ color: "var(--napoli-red)" }}>
                    +{extraToppings} extra topping{extraToppings > 1 ? "s" : ""} × $3.00 = +${(extraToppings * 3).toFixed(2)}
                  </p>
                )}
                <p className="font-bold mt-1.5 text-sm" style={{ color: "var(--napoli-dark)" }}>
                  Total: ${totalPrice.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER BUTTONS ── */}
        <div className="px-5 pb-5 pt-3 shrink-0 border-t" style={{ borderColor: "oklch(0.90 0.012 80)" }}>
          {step === "toppings" && (
            <button
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-bold text-sm napoli-label transition-all active:scale-98"
              style={{ background: "var(--napoli-red)", color: "white" }}
              onClick={() => {
                if (halfAndHalf) {
                  setStep("halfhalf");
                } else {
                  setStep("cut");
                }
              }}
            >
              {halfAndHalf ? "Configure Half & Half" : "Choose Cut Style"}
              <ChevronRight size={16} />
            </button>
          )}

          {step === "halfhalf" && (
            <div className="flex gap-2">
              <button
                className="flex-1 py-3 rounded-lg text-sm font-semibold border transition-all"
                style={{ borderColor: "oklch(0.85 0.015 80)", color: "var(--napoli-dark)", background: "white" }}
                onClick={() => setStep("toppings")}
              >
                ← Back
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm napoli-label transition-all active:scale-98"
                style={{ background: "var(--napoli-red)", color: "white" }}
                onClick={() => setStep("cut")}
              >
                Choose Cut <ChevronRight size={15} />
              </button>
            </div>
          )}

          {step === "cut" && (
            <div className="flex gap-2">
              <button
                className="flex-1 py-3 rounded-lg text-sm font-semibold border transition-all"
                style={{ borderColor: "oklch(0.85 0.015 80)", color: "var(--napoli-dark)", background: "white" }}
                onClick={() => setStep(halfAndHalf ? "halfhalf" : "toppings")}
              >
                ← Back
              </button>
              <button
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm napoli-label transition-all active:scale-98"
                style={{ background: "var(--napoli-red)", color: "white", flex: 2 }}
                onClick={handleAddToCart}
              >
                🎰 Add to Cart — ${totalPrice.toFixed(2)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
