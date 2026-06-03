/**
 * BurgerCustomizerModal
 * 7-step interactive modal for 100% Angus Beef Burgers.
 *
 * Step 1 — MANDATORY: choose burger type
 * Step 2 — MANDATORY: choose size (½ lb / 1 lb)
 * Step 3 — MANDATORY: choose doneness (Rare / Medium / Well Done)
 * Step 4 — MANDATORY: choose bread (Regular / Gluten Free — both free)
 * Step 5 — OPTIONAL:  remove default toppings (No Onion, No Pickles, etc.)
 * Step 6 — OPTIONAL:  choose sauces (1 free, $0.50 each additional)
 * Step 7 — OPTIONAL:  fries + extras + allergy note (with legal disclaimer)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { X, ChevronRight, ChevronLeft, Check, ShoppingCart, AlertTriangle } from "lucide-react";
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

// ── Remove options (negative customizations) ─────────────────
const REMOVE_OPTIONS = [
  { id: "no-onion",   label: "No Onion",   emoji: "🧅" },
  { id: "no-pickles", label: "No Pickles", emoji: "🥒" },
  { id: "no-mustard", label: "No Mustard", emoji: "🟡" },
  { id: "no-jalapen", label: "No Jalapeño", emoji: "🌶️" },
  { id: "no-mayo",    label: "No Mayo",    emoji: "🥛" },
  { id: "no-lettuce", label: "No Lettuce", emoji: "🥬" },
  { id: "no-tomato",  label: "No Tomato",  emoji: "🍅" },
  { id: "no-ketchup", label: "No Ketchup", emoji: "🍅" },
];

export interface BurgerTrigger {
  open: true;
  preselectedBurger?: string;
  preselectedSize?: "half" | "single";
}

interface Props {
  trigger: BurgerTrigger | null;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function BurgerCustomizerModal({ trigger, onClose }: Props) {
  if (!trigger) return null;
  return (
    <BurgerCustomizerInner
      onClose={onClose}
      preselectedBurger={trigger.preselectedBurger}
      preselectedSize={trigger.preselectedSize}
    />
  );
}

function BurgerCustomizerInner({
  onClose,
  preselectedBurger,
  preselectedSize,
}: {
  onClose: () => void;
  preselectedBurger?: string;
  preselectedSize?: "half" | "single";
}) {
  const { addItem, openCart } = useCart();

  const initialStep: Step = preselectedBurger ? (preselectedSize ? 3 : 2) : 1;

  const [step, setStep] = useState<Step>(initialStep);
  const [burgerName, setBurgerName] = useState(preselectedBurger ?? "");
  const [burgerSize, setBurgerSize] = useState<"half" | "single" | "">(preselectedSize ?? "");
  const [doneness, setDoneness] = useState<string>("Medium");
  const [breadChoice, setBreadChoice] = useState<string>("Regular Bread");
  const [removals, setRemovals] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [friesSize, setFriesSize] = useState<string | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const [allergyNote, setAllergyNote] = useState("");
  const [allergyAcknowledged, setAllergyAcknowledged] = useState(false);

  // ── Price calculations ──────────────────────────────────────
  const selectedBurger = BURGERS.items.find((b) => b.name === burgerName);
  const parseP = (s: string) => parseFloat(s.replace("$", "")) || 0;
  const basePrice =
    selectedBurger && burgerSize
      ? parseP(burgerSize === "half" ? selectedBurger.half : selectedBurger.single)
      : 0;

  const saucesExtraCount = Math.max(0, selectedSauces.length - SAUCES_FREE_COUNT);
  const saucesTotal = saucesExtraCount * SAUCE_EXTRA_PRICE;
  const friesExtra = friesSize ? (BURGER_FRIES.find((f) => f.size === friesSize)?.price ?? 0) : 0;
  const extrasTotal = extras.reduce((sum, name) => {
    const e = BURGER_EXTRAS.find((x) => x.name === name);
    return sum + (e?.price ?? 0);
  }, 0);
  const totalPrice = basePrice + saucesTotal + friesExtra + extrasTotal;

  // ── Toggles ─────────────────────────────────────────────────
  const toggleRemoval = (id: string) => {
    setRemovals((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  };

  const toggleSauce = (name: string) => {
    if (name === "No Sauce") { setSelectedSauces(["No Sauce"]); return; }
    setSelectedSauces((prev) => {
      const withoutNoSauce = prev.filter((s) => s !== "No Sauce");
      if (withoutNoSauce.includes(name)) return withoutNoSauce.filter((s) => s !== name);
      return [...withoutNoSauce, name];
    });
  };

  const toggleExtra = (name: string) => {
    setExtras((prev) => prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]);
  };

  const utils = trpc.useUtils();

  const handleAddToCart = async () => {
    const parts: string[] = [];
    parts.push(burgerSize === "half" ? "½ lb" : "1 lb");
    parts.push(doneness);
    if (breadChoice !== "Regular Bread") parts.push(breadChoice);
    if (removals.length > 0) {
      const labels = removals.map((id) => REMOVE_OPTIONS.find((r) => r.id === id)?.label ?? id);
      parts.push(labels.join(", "));
    }
    if (selectedSauces.length > 0) parts.push(selectedSauces.join(", "));
    if (friesSize) parts.push(friesSize);
    if (extras.length > 0) parts.push(extras.join(", "));
    if (allergyNote.trim()) parts.push(`⚠️ Allergy: ${allergyNote.trim()}`);

    // Resolve Clover catalog ID: DB has "1/2 Bacon Burger" and "Full pound Bacon Burger"
    // The wizard burger name is e.g. "Bacon Burger" — prefix with size to match DB
    let cloverItemId: string | undefined;
    try {
      const sizePrefix = burgerSize === "half" ? "1/2" : "Full pound";
      const searchName = `${sizePrefix} ${burgerName}`;
      const resolved = await utils.client.menuItems.resolveCloverIds.query({
        items: [{ name: searchName, category: "burger" }],
      });
      cloverItemId = resolved[searchName] ?? undefined;
    } catch {
      console.warn("[Burger] Could not resolve cloverItemId");
    }

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
    { num: 5, label: "Remove" },
    { num: 6, label: "Sauces" },
    { num: 7, label: "Extras" },
  ];

  const stepDone = (n: number) => step > n;

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

  const NavButtons = ({
    onBack,
    onNext,
    nextLabel,
    nextDisabled,
    isLast,
  }: {
    onBack?: () => void;
    onNext: () => void;
    nextLabel: string;
    nextDisabled?: boolean;
    isLast?: boolean;
  }) => (
    <div className="mt-5 flex gap-3">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95"
          style={{ border: "1.5px solid oklch(0.82 0.015 80)", color: "oklch(0.40 0.04 30)", background: "white", fontFamily: "'Oswald', sans-serif" }}
        >
          <ChevronLeft size={15} /> Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold napoli-label tracking-wider transition-all active:scale-95 disabled:opacity-40"
        style={{ background: nextDisabled ? "oklch(0.75 0.015 80)" : "var(--napoli-red)", color: "white" }}
      >
        {isLast ? <ShoppingCart size={15} /> : null}
        {nextLabel} {!isLast && <ChevronRight size={15} />}
      </button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "oklch(0.08 0.02 27 / 0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: "white", maxHeight: "92dvh" }}
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: "var(--napoli-red)" }}
        >
          <div>
            <p className="napoli-label text-xs text-white opacity-80 tracking-widest">CUSTOMIZE YOUR BURGER</p>
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
          className="flex items-center px-3 py-2 gap-0.5 shrink-0 overflow-x-auto"
          style={{ background: "oklch(0.97 0.012 80)", borderBottom: "1px solid oklch(0.90 0.015 80)" }}
        >
          {STEPS.map((s, i) => {
            const isDone = stepDone(s.num);
            const isActive = step === s.num;
            return (
              <div key={s.num} className="flex items-center gap-0.5 shrink-0">
                {i > 0 && <ChevronRight size={9} style={{ color: "oklch(0.70 0.015 80)" }} />}
                <div className="flex items-center gap-1">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{
                      background: isDone ? "var(--napoli-green)" : isActive ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                      color: isDone || isActive ? "white" : "oklch(0.52 0.03 30)",
                    }}
                  >
                    {isDone ? <Check size={9} /> : s.num}
                  </div>
                  <span
                    className="text-[10px] napoli-label"
                    style={{
                      color: isActive ? "var(--napoli-red)" : isDone ? "var(--napoli-green)" : "oklch(0.52 0.03 30)",
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

          {/* ══ STEP 1: CHOOSE BURGER ══════════════════════════ */}
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
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.99]"
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
                        <p className="text-xs napoli-body mt-0.5" style={{ color: burgerName === b.name ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}>
                          {b.desc}
                        </p>
                      )}
                    </div>
                    <span className="text-xs napoli-body shrink-0" style={{ color: burgerName === b.name ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}>
                      from {b.half}
                    </span>
                    {burgerName === b.name && <Check size={15} className="shrink-0" style={{ color: "white" }} />}
                  </button>
                ))}
              </div>
              <NavButtons onNext={() => setStep(2)} nextLabel="Next: Size" nextDisabled={!burgerName} />
            </div>
          )}

          {/* ══ STEP 2: CHOOSE SIZE ════════════════════════════ */}
          {step === 2 && (
            <div className="px-5 py-5">
              <SummaryBar label={burgerName} goBack={() => setStep(1)} />
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>CHOOSE SIZE *</p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>Select one — required.</p>
              <div className="flex flex-col gap-3">
                {selectedBurger && (["half", "single"] as const).map((sz) => {
                  const priceStr = sz === "half" ? selectedBurger.half : selectedBurger.single;
                  const label = sz === "half" ? "½ lb Burger" : "1 lb Burger";
                  const sub = sz === "half" ? "Half pound Angus patty" : "Full pound Angus patty";
                  return (
                    <button
                      key={sz}
                      onClick={() => setBurgerSize(sz)}
                      className="flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all active:scale-[0.99]"
                      style={
                        burgerSize === sz
                          ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                          : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                      }
                    >
                      <span className="text-2xl">🍔</span>
                      <div className="flex-1">
                        <p className="napoli-body text-sm font-bold">{label}</p>
                        <p className="text-xs napoli-body mt-0.5" style={{ color: burgerSize === sz ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}>{sub}</p>
                      </div>
                      <span className="napoli-price text-base shrink-0">{priceStr}</span>
                      {burgerSize === sz && <Check size={16} className="shrink-0" style={{ color: "white" }} />}
                    </button>
                  );
                })}
              </div>
              <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Next: Doneness" nextDisabled={!burgerSize} />
            </div>
          )}

          {/* ══ STEP 3: DONENESS ═══════════════════════════════ */}
          {step === 3 && (
            <div className="px-5 py-5">
              <SummaryBar label={`${burgerName} · ${burgerSize === "half" ? "½ lb" : "1 lb"}`} goBack={() => setStep(2)} />
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>HOW WOULD YOU LIKE IT COOKED? *</p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>Select one — required.</p>
              <div className="flex flex-col gap-3">
                {BURGER_DONENESS_OPTIONS.map((d) => (
                  <button
                    key={d.name}
                    onClick={() => setDoneness(d.name)}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all active:scale-[0.99]"
                    style={
                      doneness === d.name
                        ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                        : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                    }
                  >
                    <span className="text-2xl">{d.icon}</span>
                    <div className="flex-1">
                      <p className="napoli-body text-sm font-bold">{d.name}</p>
                      <p className="text-xs napoli-body mt-0.5" style={{ color: doneness === d.name ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}>{d.desc}</p>
                    </div>
                    {"isDefault" in d && d.isDefault && doneness !== d.name && (
                      <span className="text-xs px-1.5 py-0.5 rounded napoli-label shrink-0" style={{ background: "oklch(0.92 0.04 80)", color: "oklch(0.42 0.03 30)" }}>Default</span>
                    )}
                    {doneness === d.name && <Check size={16} className="shrink-0" style={{ color: "white" }} />}
                  </button>
                ))}
              </div>
              <NavButtons onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="Next: Bread" nextDisabled={!doneness} />
            </div>
          )}

          {/* ══ STEP 4: CHOOSE BREAD ═══════════════════════════ */}
          {step === 4 && (
            <div className="px-5 py-5">
              <SummaryBar label={`${burgerName} · ${burgerSize === "half" ? "½ lb" : "1 lb"} · ${doneness}`} goBack={() => setStep(3)} />
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>CHOOSE BREAD *</p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>Gluten Free Bread available at no extra charge.</p>
              <div className="flex flex-col gap-3">
                {BURGER_BREAD_OPTIONS.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => setBreadChoice(b.name)}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all active:scale-[0.99]"
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
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={breadChoice === b.name ? { background: "oklch(0.35 0.18 27)", color: "white" } : { background: "oklch(0.92 0.08 145)", color: "oklch(0.30 0.12 145)" }}>
                            {b.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs napoli-body mt-0.5" style={{ color: breadChoice === b.name ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}>
                        {b.name === "Gluten Free Bread" ? "No additional charge" : "Classic sesame bun"}
                      </p>
                    </div>
                    <span className="text-xs napoli-body shrink-0 font-semibold" style={{ color: breadChoice === b.name ? "oklch(0.90 0.015 80)" : "var(--napoli-green)" }}>Free</span>
                    {breadChoice === b.name && <Check size={16} className="shrink-0" style={{ color: "white" }} />}
                  </button>
                ))}
              </div>
              <NavButtons onBack={() => setStep(3)} onNext={() => setStep(5)} nextLabel="Next: Remove Items" />
            </div>
          )}

          {/* ══ STEP 5: REMOVE TOPPINGS ════════════════════════ */}
          {step === 5 && (
            <div className="px-5 py-5">
              <SummaryBar label={`${burgerName} · ${burgerSize === "half" ? "½ lb" : "1 lb"} · ${doneness} · ${breadChoice}`} goBack={() => setStep(4)} />

              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                REMOVE ITEMS (OPTIONAL)
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                Tap anything you want left off your burger. Leave all unselected to keep everything.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {REMOVE_OPTIONS.map((opt) => {
                  const isSelected = removals.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleRemoval(opt.id)}
                      className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-left transition-all active:scale-95"
                      style={
                        isSelected
                          ? { background: "oklch(0.25 0.04 30)", border: "2px solid oklch(0.25 0.04 30)", color: "white" }
                          : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                      }
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <span className="napoli-body text-xs font-semibold flex-1">{opt.label}</span>
                      {isSelected ? (
                        <Check size={13} style={{ color: "white", flexShrink: 0 }} />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={{ borderColor: "oklch(0.70 0.015 80)" }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {removals.length > 0 && (
                <div
                  className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "oklch(0.25 0.04 30)", color: "white" }}
                >
                  <Check size={13} style={{ color: "oklch(0.70 0.10 145)" }} />
                  <p className="text-xs napoli-body">
                    Removing: <span className="font-semibold">{removals.map((id) => REMOVE_OPTIONS.find((r) => r.id === id)?.label).join(", ")}</span>
                  </p>
                </div>
              )}

              <NavButtons onBack={() => setStep(4)} onNext={() => setStep(6)} nextLabel="Next: Sauces" />
            </div>
          )}

          {/* ══ STEP 6: SAUCES ═════════════════════════════════ */}
          {step === 6 && (
            <div className="px-5 py-5">
              <SummaryBar
                label={`${burgerName} · ${burgerSize === "half" ? "½ lb" : "1 lb"} · ${doneness}${removals.length > 0 ? ` · ${removals.length} removed` : ""}`}
                goBack={() => setStep(5)}
              />

              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg mb-4" style={{ background: "oklch(0.97 0.06 80)", border: "1px solid oklch(0.88 0.06 80)" }}>
                <span className="text-base shrink-0">🧂</span>
                <div>
                  <p className="text-xs napoli-body font-semibold" style={{ color: "oklch(0.40 0.05 50)" }}>1 sauce included free</p>
                  <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>Each additional sauce: +${SAUCE_EXTRA_PRICE.toFixed(2)}</p>
                </div>
              </div>

              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>CHOOSE YOUR SAUCES</p>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>
                  {selectedSauces.length === 0 ? "None selected" : selectedSauces.length === 1 ? "1 selected — free" : `${selectedSauces.length} selected — 1 free + ${saucesExtraCount} × $${SAUCE_EXTRA_PRICE.toFixed(2)}`}
                </p>
                {saucesTotal > 0 && <span className="text-xs font-bold napoli-label" style={{ color: "var(--napoli-red)" }}>+${saucesTotal.toFixed(2)}</span>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {BURGER_SAUCES.map((s, idx) => {
                  const isSelected = selectedSauces.includes(s.name);
                  const selectedIdx = selectedSauces.indexOf(s.name);
                  const wouldBePaid = !isSelected && selectedSauces.length >= SAUCES_FREE_COUNT;
                  const isPaid = isSelected && selectedIdx >= SAUCES_FREE_COUNT;
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
                      <span className="napoli-body text-xs font-semibold flex-1">{s.name}</span>
                      {(isPaid || wouldBePaid) && <span className="text-xs shrink-0 font-bold" style={{ color: isSelected ? "oklch(0.90 0.015 80)" : "var(--napoli-red)" }}>+${SAUCE_EXTRA_PRICE.toFixed(2)}</span>}
                      {!isPaid && !wouldBePaid && !isSelected && idx < SAUCES_FREE_COUNT && <span className="text-xs shrink-0" style={{ color: "var(--napoli-green)" }}>Free</span>}
                      {isSelected && !isPaid && <span className="text-xs shrink-0" style={{ color: "oklch(0.90 0.015 80)" }}>Free</span>}
                    </button>
                  );
                })}
              </div>

              <NavButtons onBack={() => setStep(5)} onNext={() => setStep(7)} nextLabel="Next: Sides & Extras" />
            </div>
          )}

          {/* ══ STEP 7: FRIES + EXTRAS + ALLERGY NOTE ══════════ */}
          {step === 7 && (
            <div className="px-5 py-5">
              {selectedSauces.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4" style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}>
                  <Check size={14} style={{ color: "var(--napoli-green)" }} />
                  <span className="text-xs napoli-body flex-1 truncate" style={{ color: "var(--napoli-dark)" }}>
                    Sauces: <span style={{ color: "var(--napoli-red)" }}>{selectedSauces.join(", ")}</span>
                    {saucesTotal > 0 && <span className="font-bold"> (+${saucesTotal.toFixed(2)})</span>}
                  </span>
                  <button onClick={() => setStep(6)} className="text-xs napoli-label underline shrink-0" style={{ color: "oklch(0.52 0.03 30)" }}>Change</button>
                </div>
              )}

              {/* Fries */}
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>🍟 ADD FRIES (OPTIONAL)</p>
              <p className="text-xs napoli-body mb-3" style={{ color: "oklch(0.52 0.03 30)" }}>Choose a size — optional.</p>
              <div className="flex flex-col gap-2 mb-5">
                <button
                  onClick={() => setFriesSize(null)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.99]"
                  style={friesSize === null ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" } : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }}
                >
                  <span className="text-xl">🚫</span>
                  <span className="napoli-body text-sm font-bold flex-1">No Fries</span>
                  {friesSize === null && <Check size={15} style={{ color: "white" }} />}
                </button>
                {BURGER_FRIES.map((f) => (
                  <button
                    key={f.size}
                    onClick={() => setFriesSize(f.size)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.99]"
                    style={friesSize === f.size ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" } : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }}
                  >
                    <span className="text-xl">🍟</span>
                    <span className="napoli-body text-sm font-bold flex-1">{f.size}</span>
                    <span className="napoli-price text-sm shrink-0" style={{ color: friesSize === f.size ? "oklch(0.90 0.015 80)" : "var(--napoli-red)" }}>+${f.price.toFixed(2)}</span>
                    {friesSize === f.size && <Check size={15} style={{ color: "white" }} />}
                  </button>
                ))}
              </div>

              {/* Extras */}
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>➕ ADD-ONS (OPTIONAL)</p>
              <p className="text-xs napoli-body mb-3" style={{ color: "oklch(0.52 0.03 30)" }}>Cheese, Bacon, or Avocado — each $1.00</p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {BURGER_EXTRAS.map((e) => {
                  const isSelected = extras.includes(e.name);
                  return (
                    <button
                      key={e.name}
                      onClick={() => toggleExtra(e.name)}
                      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-center transition-all active:scale-95"
                      style={isSelected ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" } : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }}
                    >
                      <span className="text-xl">{e.name === "Add Cheese" ? "🧀" : e.name === "Add Bacon" ? "🥓" : "🥑"}</span>
                      {isSelected ? <Check size={13} style={{ color: "white" }} /> : <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: "oklch(0.70 0.015 80)" }} />}
                      <div>
                        <p className="napoli-body text-xs font-semibold leading-tight">{e.name.replace("Add ", "")}</p>
                        <p className="text-xs font-bold" style={{ color: isSelected ? "oklch(0.90 0.015 80)" : "var(--napoli-red)" }}>+${e.price.toFixed(2)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── ALLERGY NOTE + LEGAL DISCLAIMER ── */}
              <div
                className="rounded-xl p-4 mb-4"
                style={{ background: "oklch(0.98 0.04 80)", border: "2px solid oklch(0.85 0.06 80)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} style={{ color: "oklch(0.55 0.18 70)", flexShrink: 0 }} />
                  <p className="napoli-label text-xs font-bold" style={{ color: "oklch(0.45 0.10 60)", letterSpacing: "0.1em" }}>
                    FOOD ALLERGY NOTICE
                  </p>
                </div>
                <p className="text-xs napoli-body mb-3" style={{ color: "oklch(0.42 0.03 30)", lineHeight: "1.5" }}>
                  If you have a food allergy, intolerance, or dietary restriction, please describe it below. Our kitchen handles common allergens including <strong>gluten, dairy, eggs, nuts, soy, and shellfish</strong>.
                </p>
                <textarea
                  value={allergyNote}
                  onChange={(e) => setAllergyNote(e.target.value)}
                  placeholder="E.g. severe peanut allergy, lactose intolerant, celiac disease..."
                  maxLength={300}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm napoli-body resize-none outline-none mb-2"
                  style={{ border: allergyNote ? "2px solid oklch(0.55 0.18 70)" : "1.5px solid oklch(0.82 0.03 80)", color: "var(--napoli-dark)", background: "white" }}
                />
                <p className="text-right text-xs mb-3" style={{ color: "oklch(0.65 0.015 80)" }}>{allergyNote.length}/300</p>

                {/* Legal acknowledgment checkbox */}
                <button
                  onClick={() => setAllergyAcknowledged(!allergyAcknowledged)}
                  className="flex items-start gap-2.5 text-left w-full"
                >
                  <div
                    className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                    style={{
                      borderColor: allergyAcknowledged ? "var(--napoli-red)" : "oklch(0.70 0.015 80)",
                      background: allergyAcknowledged ? "var(--napoli-red)" : "white",
                    }}
                  >
                    {allergyAcknowledged && <Check size={10} style={{ color: "white" }} />}
                  </div>
                  <p className="text-xs napoli-body" style={{ color: "oklch(0.42 0.03 30)", lineHeight: "1.5" }}>
                    <strong>I understand</strong> that Napoli Pizzeria cannot guarantee a completely allergen-free environment. By placing this order, I acknowledge that if I fail to disclose any food allergy or dietary restriction, Napoli Pizzeria shall not be held liable for any adverse reaction. See our{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--napoli-red)" }}>
                      Terms &amp; Conditions
                    </a>
                    .
                  </p>
                </button>
              </div>

              {/* Total + Add to Cart */}
              <div
                className="flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <div>
                  <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Order total</p>
                  <p className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>${totalPrice.toFixed(2)}</p>
                  {(saucesTotal > 0 || extrasTotal > 0 || friesSize) && (
                    <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>
                      Base ${basePrice.toFixed(2)}
                      {saucesTotal > 0 && ` + Sauces $${saucesTotal.toFixed(2)}`}
                      {friesExtra > 0 && ` + Fries $${friesExtra.toFixed(2)}`}
                      {extrasTotal > 0 && ` + Add-ons $${extrasTotal.toFixed(2)}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(6)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                    style={{ border: "1.5px solid oklch(0.82 0.015 80)", color: "oklch(0.40 0.04 30)", background: "white", fontFamily: "'Oswald', sans-serif" }}
                  >
                    <ChevronLeft size={13} /> Back
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={!allergyAcknowledged}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold napoli-label transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: allergyAcknowledged ? "var(--napoli-red)" : "oklch(0.75 0.015 80)", color: "white" }}
                  >
                    <ShoppingCart size={16} /> ADD TO CART
                  </button>
                </div>
              </div>
              {!allergyAcknowledged && (
                <p className="text-center text-xs mt-2" style={{ color: "oklch(0.55 0.18 70)", fontFamily: "'Lato', sans-serif" }}>
                  ⚠️ Please check the allergy acknowledgment above to continue.
                </p>
              )}
            </div>
          )}

        </div>{/* end scrollable body */}
      </div>
    </div>
  );
}
