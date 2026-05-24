/**
 * BurgerCustomizerModal
 * 4-step interactive modal for 100% Angus Beef Burgers.
 *
 * Step 1 — MANDATORY: choose burger type
 * Step 2 — MANDATORY: choose size (½ lb / 1 lb)
 * Step 3 — OPTIONAL: choose sauces (multi-select, all free)
 * Step 4 — OPTIONAL: choose fries size + extras (cheese, bacon, avocado, GF bread)
 */
import { useState } from "react";
import { X, ChevronRight, Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import {
  BURGERS,
  BURGER_SAUCES,
  BURGER_FRIES,
  BURGER_EXTRAS,
} from "@/lib/napoliData";

export interface BurgerTrigger {
  // no extra data needed — burger list comes from BURGERS constant
  open: true;
}

interface Props {
  trigger: BurgerTrigger | null;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4;

export default function BurgerCustomizerModal({ trigger, onClose }: Props) {
  if (!trigger) return null;
  return <BurgerCustomizerInner onClose={onClose} />;
}

function BurgerCustomizerInner({ onClose }: { onClose: () => void }) {
  const { addItem, openCart } = useCart();

  const [step, setStep] = useState<Step>(1);
  const [burgerName, setBurgerName] = useState("");
  const [burgerSize, setBurgerSize] = useState<"half" | "single" | "">("");
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [friesSize, setFriesSize] = useState<string | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Derive base price from selected burger + size
  const selectedBurger = BURGERS.items.find((b) => b.name === burgerName);
  const parseP = (s: string) => parseFloat(s.replace("$", "")) || 0;
  const basePrice =
    selectedBurger && burgerSize
      ? parseP(burgerSize === "half" ? selectedBurger.half : selectedBurger.single)
      : 0;

  const friesExtra = friesSize
    ? (BURGER_FRIES.find((f) => f.size === friesSize)?.price ?? 0)
    : 0;
  const extrasTotal = extras.reduce((sum, name) => {
    const e = BURGER_EXTRAS.find((x) => x.name === name);
    return sum + (e?.price ?? 0);
  }, 0);
  const totalPrice = basePrice + friesExtra + extrasTotal;

  const toggleSauce = (name: string) => {
    setSelectedSauces((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const toggleExtra = (name: string) => {
    setExtras((prev) =>
      prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]
    );
  };

  const handleAddToCart = () => {
    const parts: string[] = [];
    parts.push(burgerSize === "half" ? "½ lb" : "1 lb");
    if (selectedSauces.length > 0) parts.push(selectedSauces.join(", "));
    if (friesSize) parts.push(`${friesSize} (+$${friesExtra.toFixed(2)})`);
    if (extras.length > 0) parts.push(extras.join(", "));
    if (notes.trim()) parts.push(`Note: ${notes.trim()}`);

    addItem({
      id: `burger-${burgerName}-${burgerSize}-${Date.now()}`,
      name: `${burgerName}`,
      price: totalPrice,
      quantity: 1,
      category: "burgers",
      description: parts.join(" · "),
    });

    toast.success(`${burgerName} added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });

    onClose();
  };

  const step1Done = burgerName !== "";
  const step2Done = burgerSize !== "";
  const step3Done = true; // optional
  const step4Done = true; // optional

  const STEPS = [
    { num: 1, label: "Burger" },
    { num: 2, label: "Size" },
    { num: 3, label: "Sauces" },
    { num: 4, label: "Sides" },
  ];

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
              {burgerName || "100% Angus Beef Burgers"}
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
        <div className="flex items-center px-4 py-3 gap-1.5 shrink-0" style={{ background: "oklch(0.97 0.012 80)" }}>
          {STEPS.map((s, i) => {
            const isDone =
              (s.num === 1 && step1Done && step > 1) ||
              (s.num === 2 && step2Done && step > 2) ||
              (s.num === 3 && step > 3) ||
              (s.num === 4 && step > 4);
            const isActive = step === s.num;
            return (
              <div key={s.num} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} style={{ color: "oklch(0.70 0.015 80)" }} />}
                <div className="flex items-center gap-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: isDone ? "var(--napoli-green)" : isActive ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                      color: isDone || isActive ? "white" : "oklch(0.52 0.03 30)",
                    }}
                  >
                    {isDone ? <Check size={11} /> : s.num}
                  </div>
                  <span
                    className="text-xs napoli-label"
                    style={{ color: isActive ? "var(--napoli-red)" : isDone ? "var(--napoli-green)" : "oklch(0.52 0.03 30)" }}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── SCROLLABLE BODY ────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">

          {/* ── STEP 1: CHOOSE BURGER ─────────────────────────── */}
          {step === 1 && (
            <div className="px-5 py-5">
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                CHOOSE YOUR BURGER <span>*</span>
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                100% Angus Beef · Cheese, Lettuce, Tomatoes, Onions, Pickles & Mayo
              </p>

              <div className="flex flex-col gap-2">
                {BURGERS.items.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => setBurgerName(b.name)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-98"
                    style={
                      burgerName === b.name
                        ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                        : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                    }
                  >
                    <span className="text-xl">🍔</span>
                    <div className="flex-1 min-w-0">
                      <p className="napoli-body text-sm font-bold">{b.name}</p>
                      {b.desc && (
                        <p
                          className="text-xs napoli-body mt-0.5"
                          style={{ color: burgerName === b.name ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}
                        >
                          {b.desc}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-xs napoli-body shrink-0"
                      style={{ color: burgerName === b.name ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}
                    >
                      from {b.half}
                    </span>
                    {burgerName === b.name && (
                      <Check size={15} className="shrink-0" style={{ color: "white" }} />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!burgerName}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95"
                  style={
                    burgerName
                      ? { background: "var(--napoli-red)", color: "white" }
                      : { background: "oklch(0.88 0.015 80)", color: "oklch(0.62 0.03 30)", cursor: "not-allowed" }
                  }
                >
                  Next: Size <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: CHOOSE SIZE ───────────────────────────── */}
          {step === 2 && (
            <div className="px-5 py-5">
              {/* Recap */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <Check size={14} style={{ color: "var(--napoli-green)" }} />
                <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                  {burgerName}
                </span>
                <button onClick={() => setStep(1)} className="ml-auto text-xs napoli-label underline shrink-0" style={{ color: "oklch(0.52 0.03 30)" }}>
                  Change
                </button>
              </div>

              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                CHOOSE SIZE <span>*</span>
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                Select one — required.
              </p>

              <div className="flex flex-col gap-3">
                {selectedBurger && (
                  <>
                    <button
                      onClick={() => setBurgerSize("half")}
                      className="flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all active:scale-98"
                      style={
                        burgerSize === "half"
                          ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                          : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                      }
                    >
                      <span className="text-2xl">🍔</span>
                      <div className="flex-1">
                        <p className="napoli-body text-sm font-bold">½ lb Burger</p>
                        <p className="text-xs napoli-body mt-0.5" style={{ color: burgerSize === "half" ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}>
                          Half pound patty
                        </p>
                      </div>
                      <span className="napoli-price text-base shrink-0">{selectedBurger.half}</span>
                      {burgerSize === "half" && <Check size={16} className="shrink-0" style={{ color: "white" }} />}
                    </button>

                    <button
                      onClick={() => setBurgerSize("single")}
                      className="flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all active:scale-98"
                      style={
                        burgerSize === "single"
                          ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                          : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                      }
                    >
                      <span className="text-2xl">🍔</span>
                      <div className="flex-1">
                        <p className="napoli-body text-sm font-bold">1 lb Burger</p>
                        <p className="text-xs napoli-body mt-0.5" style={{ color: burgerSize === "single" ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}>
                          Full pound patty
                        </p>
                      </div>
                      <span className="napoli-price text-base shrink-0">{selectedBurger.single}</span>
                      {burgerSize === "single" && <Check size={16} className="shrink-0" style={{ color: "white" }} />}
                    </button>
                  </>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setStep(3)}
                  disabled={!burgerSize}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95"
                  style={
                    burgerSize
                      ? { background: "var(--napoli-red)", color: "white" }
                      : { background: "oklch(0.88 0.015 80)", color: "oklch(0.62 0.03 30)", cursor: "not-allowed" }
                  }
                >
                  Next: Sauces <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: SAUCES ────────────────────────────────── */}
          {step === 3 && (
            <div className="px-5 py-5">
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                CHOOSE YOUR SAUCES
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                Select as many as you like — all free.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {BURGER_SAUCES.map((s) => {
                  const isSelected = selectedSauces.includes(s.name);
                  return (
                    <button
                      key={s.name}
                      onClick={() => toggleSauce(s.name)}
                      className="flex items-center gap-2 px-3 py-3 rounded-xl text-left transition-all active:scale-95"
                      style={
                        isSelected
                          ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                          : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                      }
                    >
                      {isSelected ? <Check size={13} style={{ color: "white", flexShrink: 0 }} /> : <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={{ borderColor: "oklch(0.70 0.015 80)" }} />}
                      <span className="napoli-body text-xs font-semibold">{s.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-between">
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs napoli-label"
                  style={{ color: "oklch(0.52 0.03 30)", border: "1px solid oklch(0.88 0.015 80)" }}
                >
                  Skip
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95"
                  style={{ background: "var(--napoli-red)", color: "white" }}
                >
                  Next: Sides <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: FRIES + EXTRAS ────────────────────────── */}
          {step === 4 && (
            <div className="px-5 py-5">
              {/* Sauces recap */}
              {selectedSauces.length > 0 && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
                  style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
                >
                  <Check size={14} style={{ color: "var(--napoli-green)" }} />
                  <span className="text-xs napoli-body" style={{ color: "var(--napoli-dark)" }}>
                    Sauces: <span style={{ color: "var(--napoli-red)" }}>{selectedSauces.join(", ")}</span>
                  </span>
                  <button onClick={() => setStep(3)} className="ml-auto text-xs napoli-label underline shrink-0" style={{ color: "oklch(0.52 0.03 30)" }}>
                    Change
                  </button>
                </div>
              )}

              {/* Fries */}
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                🍟 ADD FRIES (OPTIONAL)
              </p>
              <p className="text-xs napoli-body mb-3" style={{ color: "oklch(0.52 0.03 30)" }}>
                Choose a size — optional.
              </p>
              <div className="flex flex-col gap-2 mb-5">
                {/* No fries option */}
                <button
                  onClick={() => setFriesSize(null)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-98"
                  style={
                    friesSize === null
                      ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                      : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                  }
                >
                  <span className="text-xl">🚫</span>
                  <span className="napoli-body text-sm font-bold flex-1">No Fries</span>
                  {friesSize === null && <Check size={15} style={{ color: "white" }} />}
                </button>
                {BURGER_FRIES.map((f) => (
                  <button
                    key={f.size}
                    onClick={() => setFriesSize(f.size)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-98"
                    style={
                      friesSize === f.size
                        ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                        : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                    }
                  >
                    <span className="text-xl">🍟</span>
                    <span className="napoli-body text-sm font-bold flex-1">{f.size}</span>
                    <span className="napoli-price text-sm shrink-0" style={{ color: friesSize === f.size ? "oklch(0.90 0.015 80)" : "var(--napoli-red)" }}>
                      +${f.price.toFixed(2)}
                    </span>
                    {friesSize === f.size && <Check size={15} style={{ color: "white" }} />}
                  </button>
                ))}
              </div>

              {/* Extras */}
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                ➕ ADD-ONS (OPTIONAL)
              </p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {BURGER_EXTRAS.map((e) => {
                  const isSelected = extras.includes(e.name);
                  return (
                    <button
                      key={e.name}
                      onClick={() => toggleExtra(e.name)}
                      className="flex items-center gap-2 px-3 py-3 rounded-xl text-left transition-all active:scale-95"
                      style={
                        isSelected
                          ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                          : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                      }
                    >
                      {isSelected ? <Check size={13} style={{ color: "white", flexShrink: 0 }} /> : <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={{ borderColor: "oklch(0.70 0.015 80)" }} />}
                      <div className="min-w-0">
                        <p className="napoli-body text-xs font-semibold">{e.name}</p>
                        <p className="text-xs" style={{ color: isSelected ? "oklch(0.90 0.015 80)" : "var(--napoli-red)" }}>+${e.price.toFixed(2)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Special notes */}
              <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                📝 SPECIAL NOTES (OPTIONAL)
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g. no onions, extra pickles, well done..."
                maxLength={200}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm napoli-body resize-none outline-none"
                style={{ border: "1.5px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }}
              />
              <p className="text-right text-xs mt-0.5" style={{ color: "oklch(0.65 0.03 30)" }}>{notes.length}/200</p>
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        {step === 4 && (
          <div
            className="px-5 py-4 flex items-center justify-between shrink-0"
            style={{ borderTop: "1px solid oklch(0.88 0.015 80)", background: "white" }}
          >
            <div>
              <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Order total</p>
              <p className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>
                ${totalPrice.toFixed(2)}
              </p>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!burgerName || !burgerSize}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold napoli-label transition-all active:scale-95"
              style={
                burgerName && burgerSize
                  ? { background: "var(--napoli-red)", color: "white" }
                  : { background: "oklch(0.88 0.015 80)", color: "oklch(0.62 0.03 30)", cursor: "not-allowed" }
              }
            >
              <ShoppingCart size={16} />
              ADD TO CART
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
