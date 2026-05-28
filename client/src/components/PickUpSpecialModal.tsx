/**
 * Pick Up Special Modal — 16" 1 Topping $12.99
 * - 1 topping included free
 * - Extra toppings cost $3.00 each (16" price)
 * - Cut type always available
 * - Half & Half only unlocked when 2+ toppings selected
 * - Casino winner sound effect on open
 */
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trophy } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { PIZZA_30_TOPPINGS } from "@/lib/napoliData";

const BASE_PRICE = 12.99;
const EXTRA_TOPPING_PRICE = 3.00;
const FREE_TOPPINGS = 1;

const CUT_TYPES = ["Traditional", "Square", "Thin", "Well Done", "Uncut"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PickUpSpecialModal({ open, onClose }: Props) {
  const { addItem, openCart } = useCart();
  const [step, setStep] = useState<"toppings" | "halfhalf" | "cut">("toppings");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [halfAndHalf, setHalfAndHalf] = useState(false);
  const [firstHalf, setFirstHalf] = useState<string[]>([]);
  const [secondHalf, setSecondHalf] = useState<string[]>([]);
  const [cutType, setCutType] = useState("Traditional");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundPlayedRef = useRef(false);

  // Play casino winner sound when modal opens
  useEffect(() => {
    if (!open) {
      soundPlayedRef.current = false;
      return;
    }
    if (soundPlayedRef.current) return;
    soundPlayedRef.current = true;

    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // Casino winner jingle: ascending notes + fanfare
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5 E5 G5 C6 E6
      const times = [0, 0.12, 0.24, 0.36, 0.52];
      const durations = [0.18, 0.18, 0.18, 0.22, 0.5];

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.value = freq;
        const start = ctx.currentTime + times[i];
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + durations[i]);
        osc.start(start);
        osc.stop(start + durations[i]);
      });

      // Add a coin-roll shimmer
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(1800, ctx.currentTime + 0.55);
      shimmer.frequency.linearRampToValueAtTime(2400, ctx.currentTime + 0.85);
      shimmerGain.gain.setValueAtTime(0, ctx.currentTime + 0.55);
      shimmerGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.6);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      shimmer.start(ctx.currentTime + 0.55);
      shimmer.stop(ctx.currentTime + 0.9);
    } catch {
      // AudioContext not available (e.g. SSR) — silently ignore
    }
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep("toppings");
      setSelectedToppings([]);
      setHalfAndHalf(false);
      setFirstHalf([]);
      setSecondHalf([]);
      setCutType("Traditional");
    }
  }, [open]);

  const totalToppings = halfAndHalf
    ? firstHalf.length + secondHalf.length
    : selectedToppings.length;

  const extraToppings = Math.max(0, totalToppings - FREE_TOPPINGS);
  const totalPrice = BASE_PRICE + extraToppings * EXTRA_TOPPING_PRICE;

  const toggleTopping = (t: string) => {
    setSelectedToppings((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const toggleHalfTopping = (half: "first" | "second", t: string) => {
    const setter = half === "first" ? setFirstHalf : setSecondHalf;
    setter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const canGoToHalfHalf = selectedToppings.length >= 2 || halfAndHalf;

  const buildDescription = () => {
    let toppingStr = "";
    if (halfAndHalf) {
      const f = firstHalf.length > 0 ? firstHalf.join(", ") : "Plain";
      const s = secondHalf.length > 0 ? secondHalf.join(", ") : "Plain";
      toppingStr = `Half & Half — 1st: ${f} | 2nd: ${s}`;
    } else if (selectedToppings.length === 0) {
      toppingStr = "Plain (no toppings)";
    } else {
      toppingStr = `Toppings: ${selectedToppings.join(", ")}`;
    }
    return `16" Pizza · ${toppingStr}\nCut: ${cutType}${extraToppings > 0 ? `\n+${extraToppings} extra topping${extraToppings > 1 ? "s" : ""}` : ""}`;
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
    toast.success('Pick Up Special added to cart! 🎉', {
      action: { label: "View Cart", onClick: openCart },
    });
    onClose();
  };

  const handleNext = () => {
    if (step === "toppings") {
      if (canGoToHalfHalf && halfAndHalf) {
        setStep("halfhalf");
      } else {
        setStep("cut");
      }
    } else if (step === "halfhalf") {
      setStep("cut");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={18} className="text-yellow-500" />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--napoli-gold)" }}>
              Pick Up Special
            </span>
          </div>
          <DialogTitle className="napoli-display text-2xl" style={{ color: "var(--napoli-dark)" }}>
            16" Pizza — 1 Topping
          </DialogTitle>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="napoli-price text-3xl" style={{ color: "var(--napoli-red)" }}>
              ${totalPrice.toFixed(2)}
            </span>
            {extraToppings > 0 && (
              <span className="text-xs text-muted-foreground">
                (+{extraToppings} extra topping{extraToppings > 1 ? "s" : ""} × $3.00)
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex gap-1 mb-4">
          {["toppings", ...(halfAndHalf ? ["halfhalf"] : []), "cut"].map((s, i, arr) => (
            <div
              key={s}
              className="h-1 rounded-full flex-1 transition-all"
              style={{
                background: arr.indexOf(step) >= i ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
              }}
            />
          ))}
        </div>

        {/* ── STEP: TOPPINGS ── */}
        {step === "toppings" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm" style={{ color: "var(--napoli-dark)" }}>
                Choose Your Toppings
              </p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.94 0.015 80)", color: "var(--napoli-dark)" }}>
                1 free · +$3.00 each extra
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {PIZZA_30_TOPPINGS.map((t) => {
                const selected = selectedToppings.includes(t);
                const isExtra = selected && selectedToppings.indexOf(t) >= FREE_TOPPINGS;
                return (
                  <button
                    key={t}
                    onClick={() => toggleTopping(t)}
                    className="flex items-center justify-between px-3 py-2 rounded text-xs text-left transition-all"
                    style={{
                      background: selected ? (isExtra ? "oklch(0.95 0.08 30)" : "oklch(0.94 0.06 145)") : "oklch(0.97 0.008 80)",
                      border: `1px solid ${selected ? (isExtra ? "var(--napoli-red)" : "oklch(0.55 0.12 145)") : "oklch(0.88 0.015 80)"}`,
                      color: "var(--napoli-dark)",
                    }}
                  >
                    <span>{t}</span>
                    {selected && (
                      <span className="text-xs font-bold ml-1" style={{ color: isExtra ? "var(--napoli-red)" : "oklch(0.45 0.12 145)" }}>
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
                className="flex items-center justify-between p-3 rounded mb-4 cursor-pointer transition-all"
                style={{
                  background: halfAndHalf ? "oklch(0.94 0.06 30)" : "oklch(0.97 0.008 80)",
                  border: `1px solid ${halfAndHalf ? "var(--napoli-red)" : "oklch(0.88 0.015 80)"}`,
                }}
                onClick={() => {
                  setHalfAndHalf(!halfAndHalf);
                  if (!halfAndHalf) {
                    setFirstHalf([]);
                    setSecondHalf([]);
                    setSelectedToppings([]);
                  }
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--napoli-dark)" }}>Half & Half</p>
                  <p className="text-xs text-muted-foreground">Different toppings on each half</p>
                </div>
                <div
                  className="w-10 h-6 rounded-full transition-all flex items-center px-1"
                  style={{ background: halfAndHalf ? "var(--napoli-red)" : "oklch(0.80 0.015 80)" }}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: halfAndHalf ? "translateX(16px)" : "translateX(0)" }}
                  />
                </div>
              </div>
            )}

            <Button
              className="w-full napoli-btn-red"
              style={{ background: "var(--napoli-red)", color: "white" }}
              onClick={halfAndHalf ? () => setStep("halfhalf") : () => setStep("cut")}
            >
              {halfAndHalf ? "Configure Half & Half →" : "Choose Cut Style →"}
            </Button>
          </div>
        )}

        {/* ── STEP: HALF & HALF ── */}
        {step === "halfhalf" && (
          <div>
            <p className="font-semibold text-sm mb-3" style={{ color: "var(--napoli-dark)" }}>
              Half & Half Toppings
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {(["first", "second"] as const).map((half) => {
                const current = half === "first" ? firstHalf : secondHalf;
                return (
                  <div key={half}>
                    <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--napoli-red)" }}>
                      {half === "first" ? "1st Half" : "2nd Half"}
                    </p>
                    <div className="flex flex-col gap-1">
                      {PIZZA_30_TOPPINGS.map((t) => {
                        const sel = current.includes(t);
                        return (
                          <button
                            key={t}
                            onClick={() => toggleHalfTopping(half, t)}
                            className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-left transition-all"
                            style={{
                              background: sel ? "oklch(0.94 0.06 30)" : "oklch(0.97 0.008 80)",
                              border: `1px solid ${sel ? "var(--napoli-red)" : "oklch(0.88 0.015 80)"}`,
                              color: "var(--napoli-dark)",
                            }}
                          >
                            <span>{t}</span>
                            {sel && <span style={{ color: "var(--napoli-red)" }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("toppings")}>← Back</Button>
              <Button
                className="flex-1"
                style={{ background: "var(--napoli-red)", color: "white" }}
                onClick={() => setStep("cut")}
              >
                Choose Cut Style →
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: CUT TYPE ── */}
        {step === "cut" && (
          <div>
            <p className="font-semibold text-sm mb-3" style={{ color: "var(--napoli-dark)" }}>
              How would you like it cut?
            </p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {CUT_TYPES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCutType(c)}
                  className="px-3 py-3 rounded text-sm font-medium transition-all"
                  style={{
                    background: cutType === c ? "var(--napoli-red)" : "oklch(0.97 0.008 80)",
                    border: `1px solid ${cutType === c ? "var(--napoli-red)" : "oklch(0.88 0.015 80)"}`,
                    color: cutType === c ? "white" : "var(--napoli-dark)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Order summary */}
            <div
              className="p-3 rounded mb-4 text-xs"
              style={{ background: "oklch(0.97 0.008 80)", border: "1px solid oklch(0.88 0.015 80)" }}
            >
              <p className="font-bold mb-1" style={{ color: "var(--napoli-dark)" }}>Order Summary</p>
              <p className="text-muted-foreground">16" Pizza · Cut: {cutType}</p>
              {halfAndHalf ? (
                <>
                  <p className="text-muted-foreground">1st Half: {firstHalf.length > 0 ? firstHalf.join(", ") : "Plain"}</p>
                  <p className="text-muted-foreground">2nd Half: {secondHalf.length > 0 ? secondHalf.join(", ") : "Plain"}</p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  {selectedToppings.length > 0 ? `Toppings: ${selectedToppings.join(", ")}` : "Plain (no toppings)"}
                </p>
              )}
              {extraToppings > 0 && (
                <p style={{ color: "var(--napoli-red)" }}>+{extraToppings} extra topping{extraToppings > 1 ? "s" : ""} × $3.00</p>
              )}
              <p className="font-bold mt-1" style={{ color: "var(--napoli-dark)" }}>Total: ${totalPrice.toFixed(2)}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(halfAndHalf ? "halfhalf" : "toppings")}>← Back</Button>
              <Button
                className="flex-1 font-bold"
                style={{ background: "var(--napoli-red)", color: "white" }}
                onClick={handleAddToCart}
              >
                Add to Cart — ${totalPrice.toFixed(2)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
