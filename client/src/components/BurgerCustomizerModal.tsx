/**
 * BurgerCustomizerModal
 * 6-step interactive modal for 100% Angus Beef Burgers.
 *
 * Step 1 — MANDATORY: choose burger type
 * Step 2 — MANDATORY: choose size (½ lb / 1 lb)
 * Step 3 — MANDATORY: choose doneness (Rare / Medium / Well Done)
 * Step 4 — MANDATORY: choose bread (Regular / Gluten Free — both free)
 * Step 5 — OPTIONAL:  choose sauces (1 free, $0.50 each additional)
 * Step 6 — OPTIONAL:  choose fries size + extras (cheese $1, bacon $1, avocado $1)
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
  BURGER_BREAD_OPTIONS,
  BURGER_DONENESS_OPTIONS,
  SAUCE_EXTRA_PRICE,
  SAUCES_FREE_COUNT,
} from "@/lib/napoliData";

export interface BurgerTrigger {
  open: true;
  preselectedBurger?: string;
  preselectedSize?: "half" | "single";
  cloverItemId?: string;
}

interface Props {
  trigger: BurgerTrigger | null;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function BurgerCustomizerModal({ trigger, onClose }: Props) {
  if (!trigger) return null;
  return (
    <BurgerCustomizerInner
      onClose={onClose}
      preselectedBurger={trigger.preselectedBurger}
      preselectedSize={trigger.preselectedSize}
      cloverItemId={trigger.cloverItemId}
    />
  );
}

function BurgerCustomizerInner({
  onClose,
  preselectedBurger,
  preselectedSize,
  cloverItemId,
}: {
  onClose: () => void;
  preselectedBurger?: string;
  preselectedSize?: "half" | "single";
  cloverItemId?: string;
}) {
  const { addItem, openCart } = useCart();

  const initialStep: Step = preselectedBurger ? (preselectedSize ? 3 : 2) : 1;

  const [step, setStep] = useState<Step>(initialStep);
  const [burgerName, setBurgerName] = useState(preselectedBurger ?? "");
  const [burgerSize, setBurgerSize] = useState<"half" | "single" | "">(preselectedSize ?? "");
  const [doneness, setDoneness] = useState<string>("Medium");
  const [breadChoice, setBreadChoice] = useState<string>("Regular Bread");
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [friesSize, setFriesSize] = useState<string | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // ── Price calculations ──────────────────────────────────────
  const selectedBurger = BURGERS.items.find((b) => b.name === burgerName);
  const parseP = (s: string) => parseFloat(s.replace("$", "")) || 0;
  const basePrice =
    selectedBurger && burgerSize
      ? parseP(burgerSize === "half" ? selectedBurger.half : selectedBurger.single)
      : 0;

  // Sauces: first SAUCES_FREE_COUNT are free, rest cost SAUCE_EXTRA_PRICE each
  const saucesExtraCount = Math.max(0, selectedSauces.length - SAUCES_FREE_COUNT);
  const saucesTotal = saucesExtraCount * SAUCE_EXTRA_PRICE;

  const friesExtra = friesSize
    ? (BURGER_FRIES.find((f) => f.size === friesSize)?.price ?? 0)
    : 0;

  const extrasTotal = extras.reduce((sum, name) => {
    const e = BURGER_EXTRAS.find((x) => x.name === name);
    return sum + (e?.price ?? 0);
  }, 0);

  const totalPrice = basePrice + saucesTotal + friesExtra + extrasTotal;

  // ── Sauce toggle ────────────────────────────────────────────
  const toggleSauce = (name: string) => {
    if (name === "No Sauce") {
      setSelectedSauces(["No Sauce"]);
      return;
    }
    setSelectedSauces((prev) => {
      const withoutNoSauce = prev.filter((s) => s !== "No Sauce");
      if (withoutNoSauce.includes(name)) {
        return withoutNoSauce.filter((s) => s !== name);
      }
      return [...withoutNoSauce, name];
    });
  };

  const toggleExtra = (name: string) => {
    setExtras((prev) =>
      prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]
    );
  };

  const handleAddToCart = () => {
    const parts: string[] = [];
    parts.push(burgerSize === "half" ? "½ lb" : "1 lb");
    parts.push(doneness);
    if (breadChoice !== "Regular Bread") parts.push(breadChoice);
    if (selectedSauces.length > 0) parts.push(selectedSauces.join(", "));
    if (friesSize) parts.push(`${friesSize}`);
    if (extras.length > 0) parts.push(extras.join(", "));
    if (notes.trim()) parts.push(`Note: ${notes.trim()}`);

    addItem({
      id: `burger-${burgerName}-${burgerSize}-${Date.now()}`,
      name: burgerName,
      price: totalPrice,
      quantity: 1,
      category: "burgers",
      description: parts.join(" · "),
      cloverItemId,
    });

    toast.success(`${burgerName} added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });

    onClose();
  };

  const STEPS = [
    { num: 1, label: "Burger" },
    { num: 2, label: "Size" },
    { num: 3, label: "Doneness" },
    { num: 4, label: "Bread" },
    { num: 5, label: "Sauces" },
    { num: 6, label: "Sides" },
  ];

  const stepDone = (n: number) => step > n;

  // ── Shared summary bar ──────────────────────────────────────
  const SummaryBar = ({ label, goBack }: { label: string; goBack: () => void }) => (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
      style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
    >
      <Check size={14} style={{ color: "var(--napoli-green)" }} />
      <span className="text-xs napoli-body font-semibold flex-1 truncate" style={{ color: "var(--napoli-dark)" }}>
        {label}
      </span>
      <button onClick={goBack} className="text-xs napoli-label underline shrink-0" style={{ color: "oklch(0.52 0.03 30)" }}>
        Change
      </button>
    </div>
  );

  const NextBtn = ({
    label,
    onClick,
    disabled,
  }: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <div className="mt-4 flex justify-end">
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95"
        style={
          !disabled
            ? { background: "var(--napoli-red)", color: "white" }
            : { background: "oklch(0.88 0.015 80)", color: "oklch(0.62 0.03 30)", cursor: "not-allowed" }
        }
      >
        {label} <ChevronRight size={15} />
      </button>
    </div>
  );

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
        <div
          className="flex items-center px-3 py-2.5 gap-0.5 shrink-0 overflow-x-auto"
          style={{ background: "oklch(0.97 0.012 80)" }}
        >
          {STEPS.map((s, i) => {
            const isDone = stepDone(s.num);
            const isActive = step === s.num;
            return (
              <div key={s.num} className="flex items-center gap-0.5 shrink-0">
                {i > 0 && <ChevronRight size={10} style={{ color: "oklch(0.70 0.015 80)" }} />}
                <div className="flex items-center gap-1">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: isDone
                        ? "var(--napoli-green)"
                        : isActive
                        ? "var(--napoli-red)"
                        : "oklch(0.88 0.015 80)",
                      color: isDone || isActive ? "white" : "oklch(0.52 0.03 30)",
                    }}
                  >
                    {isDone ? <Check size={10} /> : s.num}
                  </div>
                  <span
                    className="text-xs napoli-label"
                    style={{
                      color: isActive
                        ? "var(--napoli-red)"
                        : isDone
                        ? "var(--napoli-green)"
                        : "oklch(0.52 0.03 30)",
                    }}
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
                CHOOSE YOUR BURGER *
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                100% Angus Beef · Cheese, Lettuce, Tomatoes, Onions, Pickles &amp; Mayo
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
                    {burgerName === b.name && <Check size={15} className="shrink-0" style={{ color: "white" }} />}
                  </button>
                ))}
              </div>
              <NextBtn label="Next: Size" onClick={() => setStep(2)} disabled={!burgerName} />
            </div>
          )}

          {/* ── STEP 2: CHOOSE SIZE ───────────────────────────── */}
          {step === 2 && (
            <div className="px-5 py-5">
              <SummaryBar label={burgerName} goBack={() => setStep(1)} />
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                CHOOSE SIZE *
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                Select one — required.
              </p>
              <div className="flex flex-col gap-3">
                {selectedBurger &&
                  (["half", "single"] as const).map((sz) => {
                    const priceStr = sz === "half" ? selectedBurger.half : selectedBurger.single;
                    const label = sz === "half" ? "½ lb Burger" : "1 lb Burger";
                    const sub = sz === "half" ? "Half pound patty" : "Full pound patty";
                    return (
                      <button
                        key={sz}
                        onClick={() => setBurgerSize(sz)}
                        className="flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all active:scale-98"
                        style={
                          burgerSize === sz
                            ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                            : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                        }
                      >
                        <span className="text-2xl">🍔</span>
                        <div className="flex-1">
                          <p className="napoli-body text-sm font-bold">{label}</p>
                          <p
                            className="text-xs napoli-body mt-0.5"
                            style={{ color: burgerSize === sz ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}
                          >
                            {sub}
                          </p>
                        </div>
                        <span className="napoli-price text-base shrink-0">{priceStr}</span>
                        {burgerSize === sz && <Check size={16} className="shrink-0" style={{ color: "white" }} />}
                      </button>
                    );
                  })}
              </div>
              <NextBtn label="Next: Doneness" onClick={() => setStep(3)} disabled={!burgerSize} />
            </div>
          )}

          {/* ── STEP 3: DONENESS ──────────────────────────────── */}
          {step === 3 && (
            <div className="px-5 py-5">
              <SummaryBar
                label={`${burgerName} · ${burgerSize === "half" ? "½ lb" : "1 lb"}`}
                goBack={() => setStep(2)}
              />
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                HOW WOULD YOU LIKE IT COOKED? *
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                Select one — required.
              </p>
              <div className="flex flex-col gap-3">
                {BURGER_DONENESS_OPTIONS.map((d) => (
                  <button
                    key={d.name}
                    onClick={() => setDoneness(d.name)}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all active:scale-98"
                    style={
                      doneness === d.name
                        ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                        : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                    }
                  >
                    <span className="text-2xl">{d.icon}</span>
                    <div className="flex-1">
                      <p className="napoli-body text-sm font-bold">{d.name}</p>
                      <p
                        className="text-xs napoli-body mt-0.5"
                        style={{ color: doneness === d.name ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}
                      >
                        {d.desc}
                      </p>
                    </div>
                    {"isDefault" in d && d.isDefault && doneness !== d.name && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded napoli-label shrink-0"
                        style={{ background: "oklch(0.92 0.04 80)", color: "oklch(0.42 0.03 30)" }}
                      >
                        Default
                      </span>
                    )}
                    {doneness === d.name && <Check size={16} className="shrink-0" style={{ color: "white" }} />}
                  </button>
                ))}
              </div>
              <NextBtn label="Next: Bread" onClick={() => setStep(4)} disabled={!doneness} />
            </div>
          )}

          {/* ── STEP 4: CHOOSE BREAD ──────────────────────────── */}
          {step === 4 && (
            <div className="px-5 py-5">
              <SummaryBar
                label={`${burgerName} · ${burgerSize === "half" ? "½ lb" : "1 lb"} · ${doneness}`}
                goBack={() => setStep(3)}
              />
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                CHOOSE BREAD *
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                Gluten Free Bread available at no extra charge.
              </p>
              <div className="flex flex-col gap-3">
                {BURGER_BREAD_OPTIONS.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => setBreadChoice(b.name)}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all active:scale-98"
                    style={
                      breadChoice === b.name
                        ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                        : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                    }
                  >
                    <span className="text-2xl">{b.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="napoli-body text-sm font-bold">{b.name}</p>
                        {b.badge && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-bold"
                            style={
                              breadChoice === b.name
                                ? { background: "oklch(0.35 0.18 27)", color: "white" }
                                : { background: "oklch(0.92 0.08 145)", color: "oklch(0.30 0.12 145)" }
                            }
                          >
                            {b.badge}
                          </span>
                        )}
                      </div>
                      {b.name === "Gluten Free Bread" && (
                        <p
                          className="text-xs napoli-body mt-0.5"
                          style={{ color: breadChoice === b.name ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}
                        >
                          No additional charge
                        </p>
                      )}
                    </div>
                    <span
                      className="text-xs napoli-body shrink-0 font-semibold"
                      style={{ color: breadChoice === b.name ? "oklch(0.90 0.015 80)" : "var(--napoli-green)" }}
                    >
                      Free
                    </span>
                    {breadChoice === b.name && <Check size={16} className="shrink-0" style={{ color: "white" }} />}
                  </button>
                ))}
              </div>
              <NextBtn label="Next: Sauces" onClick={() => setStep(5)} />
            </div>
          )}

          {/* ── STEP 5: SAUCES ────────────────────────────────── */}
          {step === 5 && (
            <div className="px-5 py-5">
              <SummaryBar
                label={`${burgerName} · ${burgerSize === "half" ? "½ lb" : "1 lb"} · ${doneness} · ${breadChoice}`}
                goBack={() => setStep(4)}
              />

              {/* Pricing notice */}
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-lg mb-4"
                style={{ background: "oklch(0.97 0.06 80)", border: "1px solid oklch(0.88 0.06 80)" }}
              >
                <span className="text-base shrink-0">🧂</span>
                <div>
                  <p className="text-xs napoli-body font-semibold" style={{ color: "oklch(0.40 0.05 50)" }}>
                    1 sauce included free
                  </p>
                  <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>
                    Each additional sauce: +${SAUCE_EXTRA_PRICE.toFixed(2)}
                  </p>
                </div>
              </div>

              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                CHOOSE YOUR SAUCES
              </p>

              {/* Live count */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>
                  {selectedSauces.length === 0
                    ? "None selected"
                    : selectedSauces.length === 1
                    ? "1 selected — free"
                    : `${selectedSauces.length} selected — 1 free + ${saucesExtraCount} × $${SAUCE_EXTRA_PRICE.toFixed(2)}`}
                </p>
                {saucesTotal > 0 && (
                  <span className="text-xs font-bold napoli-label" style={{ color: "var(--napoli-red)" }}>
                    +${saucesTotal.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {BURGER_SAUCES.map((s, idx) => {
                  const isSelected = selectedSauces.includes(s.name);
                  // Determine if this sauce costs extra when selected
                  // Extra cost applies to sauces beyond the free count
                  const selectedIdx = selectedSauces.indexOf(s.name);
                  const wouldBePaid =
                    !isSelected && selectedSauces.length >= SAUCES_FREE_COUNT;
                  const isPaid =
                    isSelected && selectedIdx >= SAUCES_FREE_COUNT;

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
                      {isSelected ? (
                        <Check size={13} style={{ color: "white", flexShrink: 0 }} />
                      ) : (
                        <div
                          className="w-3.5 h-3.5 rounded-full border-2 shrink-0"
                          style={{ borderColor: "oklch(0.70 0.015 80)" }}
                        />
                      )}
                      <span className="napoli-body text-xs font-semibold flex-1">{s.name}</span>
                      {/* Show price badge */}
                      {(isPaid || wouldBePaid) && (
                        <span
                          className="text-xs shrink-0 font-bold"
                          style={{ color: isSelected ? "oklch(0.90 0.015 80)" : "var(--napoli-red)" }}
                        >
                          +${SAUCE_EXTRA_PRICE.toFixed(2)}
                        </span>
                      )}
                      {!isPaid && !wouldBePaid && !isSelected && idx < SAUCES_FREE_COUNT && (
                        <span className="text-xs shrink-0" style={{ color: "var(--napoli-green)" }}>
                          Free
                        </span>
                      )}
                      {isSelected && !isPaid && (
                        <span className="text-xs shrink-0" style={{ color: "oklch(0.90 0.015 80)" }}>
                          Free
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <NextBtn label="Next: Sides & Extras" onClick={() => setStep(6)} />
            </div>
          )}

          {/* ── STEP 6: FRIES + EXTRAS ────────────────────────── */}
          {step === 6 && (
            <div className="px-5 py-5">
              {selectedSauces.length > 0 && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
                  style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
                >
                  <Check size={14} style={{ color: "var(--napoli-green)" }} />
                  <span className="text-xs napoli-body flex-1 truncate" style={{ color: "var(--napoli-dark)" }}>
                    Sauces:{" "}
                    <span style={{ color: "var(--napoli-red)" }}>{selectedSauces.join(", ")}</span>
                    {saucesTotal > 0 && (
                      <span className="font-bold"> (+${saucesTotal.toFixed(2)})</span>
                    )}
                  </span>
                  <button
                    onClick={() => setStep(5)}
                    className="text-xs napoli-label underline shrink-0"
                    style={{ color: "oklch(0.52 0.03 30)" }}
                  >
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
                    <span
                      className="napoli-price text-sm shrink-0"
                      style={{ color: friesSize === f.size ? "oklch(0.90 0.015 80)" : "var(--napoli-red)" }}
                    >
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
              <p className="text-xs napoli-body mb-3" style={{ color: "oklch(0.52 0.03 30)" }}>
                Add Cheese · Add Bacon · Add Avocado — $1.00 each
              </p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {BURGER_EXTRAS.map((e) => {
                  const isSelected = extras.includes(e.name);
                  return (
                    <button
                      key={e.name}
                      onClick={() => toggleExtra(e.name)}
                      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-center transition-all active:scale-95"
                      style={
                        isSelected
                          ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                          : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                      }
                    >
                      <span className="text-xl">
                        {e.name === "Add Cheese" ? "🧀" : e.name === "Add Bacon" ? "🥓" : "🥑"}
                      </span>
                      {isSelected ? (
                        <Check size={13} style={{ color: "white" }} />
                      ) : (
                        <div
                          className="w-3.5 h-3.5 rounded-full border-2"
                          style={{ borderColor: "oklch(0.70 0.015 80)" }}
                        />
                      )}
                      <div>
                        <p className="napoli-body text-xs font-semibold leading-tight">
                          {e.name.replace("Add ", "")}
                        </p>
                        <p
                          className="text-xs font-bold"
                          style={{ color: isSelected ? "oklch(0.90 0.015 80)" : "var(--napoli-red)" }}
                        >
                          +${e.price.toFixed(2)}
                        </p>
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
                placeholder="E.g. no onions, extra pickles..."
                maxLength={200}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm napoli-body resize-none outline-none"
                style={{ border: "1.5px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }}
              />
              <p className="text-right text-xs mt-0.5" style={{ color: "oklch(0.65 0.03 30)" }}>
                {notes.length}/200
              </p>
            </div>
          )}
        </div>

        {/* ── FOOTER (shown on step 6) ────────────────────────── */}
        {step === 6 && (
          <div
            className="px-5 py-4 flex items-center justify-between shrink-0"
            style={{ borderTop: "1px solid oklch(0.88 0.015 80)", background: "white" }}
          >
            <div>
              <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>
                Order total
              </p>
              <p className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>
                ${totalPrice.toFixed(2)}
              </p>
              {(saucesTotal > 0 || extrasTotal > 0 || friesSize) && (
                <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>
                  Base ${basePrice.toFixed(2)}
                  {saucesTotal > 0 && ` + Sauces $${saucesTotal.toFixed(2)}`}
                  {friesExtra > 0 && ` + Fries $${friesExtra.toFixed(2)}`}
                  {extrasTotal > 0 && ` + Add-ons $${extrasTotal.toFixed(2)}`}
                </p>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!burgerName || !burgerSize || !doneness}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold napoli-label transition-all active:scale-95"
              style={
                burgerName && burgerSize && doneness
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
