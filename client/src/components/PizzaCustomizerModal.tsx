/**
 * PizzaCustomizerModal — 5-step pizza builder
 *
 * Step 1 — Choose pizza type (specialty or build-your-own)
 * Step 2 — Choose size (10"–36") with live pricing
 * Step 3 — Whole pizza or Half & Half? (shown only when pizza has ≥2 included toppings)
 * Step 4 — Extra toppings (included toppings shown fixed; extras charged by size)
 * Step 5 — Cut style + special notes + add to cart
 */
import { useState, useMemo, useCallback } from "react";
import {
  X, ChevronLeft, ChevronRight, Check, ShoppingCart, Plus, Minus, Pizza,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  PIZZA_SIZES,
  PIZZA_BASE_PRICES,
  PIZZA_SPECIALS,
  PIZZA_TOPPING_PRICES,
} from "@/lib/napoliData";

// ── Types ──────────────────────────────────────────────────────────────────
export interface PizzaSelection {
  /** Pre-selected pizza name (from Clover item). If set, Step 1 is skipped. */
  pizzaName?: string;
  isSpecialty: boolean;
  freeToppings?: number;
  flatExtraToppingPrice?: number;
  allowHalfAndHalf?: boolean;
}

interface Props {
  selection: PizzaSelection | null;
  onClose: () => void;
}

// ── Pizza catalogue ────────────────────────────────────────────────────────
// Build-your-own options shown at the top of Step 1
const BUILD_YOUR_OWN = [
  {
    name: "Plain Cheese",
    desc: "Classic mozzarella on our house tomato sauce",
    includedToppings: [] as string[],
  },
  {
    name: "4 Topping Combo",
    desc: "Choose any 4 toppings — included in the price",
    includedToppings: [] as string[],
    freeCount: 4,
  },
];

// Map specialty pizza names → their included toppings (for display + Half&Half logic)
const SPECIALTY_TOPPINGS: Record<string, string[]> = {
  "BBQ Chicken":          ["Chicken", "Red Onions", "Spicy Honey BBQ Sauce"],
  "Buffalo Chicken":      ["Chicken", "Mozzarella", "Buffalo Sauce", "Ranch Sauce"],
  "3 Cheese":             ["Mozzarella", "Ricotta", "Provolone", "Feta", "Parmesan"],
  "Chicken Alfredo":      ["Chicken", "Mozzarella", "Mushrooms", "Alfredo Sauce"],
  "Deluxe":               ["Pastrami", "Chicken", "Green Olives", "Black Olives", "Cilantro", "Red Onions"],
  "Greek":                ["Chicken", "Green Olives", "Black Olives", "Tomatoes", "Garlic", "Oregano", "Feta"],
  "Italian":              ["Pepperoni", "Sausage", "Tomatoes", "Artichoke Hearts", "Garlic"],
  "Meat Lover":           ["Pepperoni", "Sausage", "Ham", "Meatballs"],
  "Mexican Style":        ["Pepperoni", "Beef", "Chorizo", "Jalapeños", "White Onions", "Cilantro"],
  "Napoli's Special":     ["Pepperoni", "Bacon", "Black Olives", "Feta"],
  "Pesto Chicken":        ["Chicken", "Mozzarella", "Red Onions", "Roasted Red Peppers", "Mushrooms", "Pesto Sauce"],
  "Ranch":                ["Crispy Chicken", "Mozzarella", "Ranch Sauce"],
  "Southwestern Chicken": ["Chicken", "Bell Peppers", "Red Onion", "Tomatoes", "Jalapeños", "Cilantro", "Mozzarella", "Cheddar"],
  "Supreme":              ["Pepperoni", "Sausage", "Mushrooms", "White Onions", "Black Olives", "Green Peppers"],
  "Taco":                 ["Taco Meat", "Cheddar", "Shredded Lettuce", "Tomatoes", "Salsa", "Jalapeños"],
  "Vegetarian":           ["Mushrooms", "Green Peppers", "White Onions", "Black Olives", "Tomatoes"],
  "White Pizza":          ["Garlic", "Ricotta", "Mozzarella", "Provolone"],
  "Hawaiian":             ["Ham", "Pineapple", "Mozzarella"],
};

// All extra toppings the customer can add
const EXTRA_TOPPINGS = [
  "Anchovies", "Artichoke Hearts", "Fresh Basil", "Black Olives", "Broccoli", "Zucchini",
  "Capicola", "Cheddar Cheese", "Grilled Chicken", "Chorizo", "Eggplant", "Fresh Garlic",
  "Green Olives", "Green Peppers", "Ground Beef", "Ham", "Italian Sausage", "Jalapeños",
  "Meatballs", "Mushrooms", "Onions", "Pepperoni", "Pineapple", "Red Roasted Peppers",
  "Salami", "Spinach", "Tomatoes", "Canadian Bacon",
];

// ── Cut options ────────────────────────────────────────────────────────────
const CUT_OPTIONS = [
  { id: "triangle", label: "Triangle Cut",  desc: "Classic pizza slices",        emoji: "🍕" },
  { id: "square",   label: "Square Cut",    desc: "Party-style squares",          emoji: "⬛" },
  { id: "strips",   label: "Strips",        desc: "Long rectangular strips",      emoji: "📏" },
  { id: "uncut",    label: "Uncut",         desc: "We leave the cutting to you",  emoji: "⭕" },
];

const TOTAL_STEPS = 5;

// ── Helpers ────────────────────────────────────────────────────────────────
function getBasePrice(pizzaName: string, size: string): number {
  const sizeIndex = PIZZA_SIZES.indexOf(size);
  if (sizeIndex === -1) return 0;
  // Use exact match first
  for (const [name, prices] of Object.entries(PIZZA_BASE_PRICES)) {
    if (name.toLowerCase() === pizzaName.toLowerCase()) {
      const p = prices[sizeIndex];
      return parseFloat((p ?? "$0").replace("$", "")) || 0;
    }
  }
  // Specialty: use Plain Cheese base
  const cheese = PIZZA_BASE_PRICES["Plain Cheese"];
  if (cheese) {
    const p = cheese[sizeIndex];
    return parseFloat((p ?? "$0").replace("$", "")) || 0;
  }
  return 0;
}

function fmt(n: number) { return `$${n.toFixed(2)}`; }

// ── Step dot indicator ─────────────────────────────────────────────────────
function StepDot({ active, done, num, label }: { active: boolean; done: boolean; num: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
        style={{
          background: done ? "var(--napoli-green)" : active ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
          color: done || active ? "white" : "oklch(0.52 0.03 30)",
        }}
      >
        {done ? <Check size={13} /> : num}
      </div>
      <span
        className="text-[9px] font-semibold leading-none text-center"
        style={{
          color: active ? "var(--napoli-red)" : done ? "oklch(0.45 0.10 145)" : "oklch(0.65 0.015 80)",
          fontFamily: "'Oswald', sans-serif",
          maxWidth: 44,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Topping chip ───────────────────────────────────────────────────────────
function ToppingChip({ label, selected, fixed, onClick }: {
  label: string; selected: boolean; fixed?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={fixed}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95"
      style={{
        borderColor: fixed ? "var(--napoli-green)" : selected ? "var(--napoli-red)" : "oklch(0.85 0.015 80)",
        background: fixed ? "oklch(0.95 0.06 145)" : selected ? "var(--napoli-red)" : "white",
        color: fixed ? "var(--napoli-green)" : selected ? "white" : "oklch(0.40 0.03 30)",
        fontFamily: "'Lato', sans-serif",
        cursor: fixed ? "default" : "pointer",
      }}
    >
      {fixed ? <Check size={10} /> : selected ? <Minus size={10} /> : <Plus size={10} />}
      {label}
    </button>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function PizzaCustomizerModal({ selection, onClose }: Props) {
  if (!selection) return null;
  return <PizzaWizard selection={selection} onClose={onClose} />;
}

// ── Wizard ─────────────────────────────────────────────────────────────────
function PizzaWizard({ selection, onClose }: { selection: PizzaSelection; onClose: () => void }) {
  const { addItem } = useCart();

  // If a pizza name was pre-selected (from Clover item), start at step 2
  const preSelected = selection.pizzaName ?? null;
  const initialStep = preSelected ? 2 : 1;

  const [step, setStep] = useState(initialStep);
  const [selectedPizzaName, setSelectedPizzaName] = useState<string>(preSelected ?? "");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [halfAndHalf, setHalfAndHalf] = useState<boolean>(false);
  const [extraToppings, setExtraToppings] = useState<string[]>([]);
  const [firstHalfExtras, setFirstHalfExtras] = useState<string[]>([]);
  const [secondHalfExtras, setSecondHalfExtras] = useState<string[]>([]);
  const [selectedCut, setSelectedCut] = useState<string>("");
  const [notes, setNotes] = useState("");

  // ── Derived pizza data ─────────────────────────────────────────────────
  const allPizzas = useMemo(() => {
    const byoItems = BUILD_YOUR_OWN.map((p) => ({ ...p, isSpecialty: false }));
    const specialtyItems = PIZZA_SPECIALS.map((p) => ({
      name: p.name,
      desc: p.desc,
      includedToppings: SPECIALTY_TOPPINGS[p.name] ?? [],
      isSpecialty: true,
    }));
    return [...byoItems, ...specialtyItems];
  }, []);

  const currentPizza = useMemo(
    () => allPizzas.find((p) => p.name === selectedPizzaName) ?? null,
    [allPizzas, selectedPizzaName]
  );

  const includedToppings: string[] = currentPizza?.includedToppings ?? [];
  const freeCount: number = (currentPizza as { freeCount?: number })?.freeCount ?? 0;
  // Show Half & Half step only when pizza has ≥2 included toppings
  const showHalfHalfStep = includedToppings.length >= 2;

  // Steps: 1=pizza, 2=size, [3=half&half if applicable], 4=toppings, 5=cut
  // We always show 5 dots but skip step 3 if not applicable
  const stepLabels = ["Pizza", "Size", "Style", "Toppings", "Cut"];

  // Effective step count — step 3 is skipped for plain/single-topping pizzas
  function effectiveStep(raw: number): number {
    if (!showHalfHalfStep && raw >= 3) return raw + 1; // skip step 3
    return raw;
  }

  // ── Pricing ────────────────────────────────────────────────────────────
  const basePrice = useMemo(() => getBasePrice(selectedPizzaName, selectedSize), [selectedPizzaName, selectedSize]);
  const toppingUnitPrice = PIZZA_TOPPING_PRICES[selectedSize] ?? 2.75;

  const extraToppingsCost = useMemo(() => {
    if (halfAndHalf) {
      const total = firstHalfExtras.length + secondHalfExtras.length;
      return total * (toppingUnitPrice / 2);
    }
    return extraToppings.length * toppingUnitPrice;
  }, [halfAndHalf, extraToppings, firstHalfExtras, secondHalfExtras, toppingUnitPrice]);

  const grandTotal = basePrice + extraToppingsCost;

  // ── Navigation ─────────────────────────────────────────────────────────
  function canAdvance(): boolean {
    if (step === 1) return selectedPizzaName !== "";
    if (step === 2) return selectedSize !== "";
    if (step === 3) return true; // half&half choice is optional (default = whole)
    if (step === 4) return true; // toppings are optional
    if (step === 5) return selectedCut !== "";
    return false;
  }

  function goNext() {
    if (step === 2 && !showHalfHalfStep) {
      setStep(4); // skip step 3
    } else {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  }

  function goBack() {
    if (step === 4 && !showHalfHalfStep) {
      setStep(2); // skip step 3 going back
    } else {
      setStep((s) => Math.max(s - 1, preSelected ? 2 : 1));
    }
  }

  // ── Topping toggles ────────────────────────────────────────────────────
  function toggleExtra(t: string) {
    setExtraToppings((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }
  function toggleHalfExtra(half: "first" | "second", t: string) {
    const setter = half === "first" ? setFirstHalfExtras : setSecondHalfExtras;
    setter((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  // ── Resolve Clover item ID ─────────────────────────────────────────────
  const utils = trpc.useUtils();

  // ── Add to cart ────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(async () => {
    const cutLabel = CUT_OPTIONS.find((c) => c.id === selectedCut)?.label ?? selectedCut;
    const lines: string[] = [];

    // ── 1. Size ──────────────────────────────────────────────────────────────
    lines.push(`Size: ${selectedSize}`);

    // ── 2. Whole or Half & Half, with included toppings per side ─────────────
    if (halfAndHalf) {
      lines.push("*** Half & Half ***");

      // 1st half — pizza name + included toppings
      lines.push(`1st Half: ${selectedPizzaName}`);
      for (const t of includedToppings) {
        lines.push(`  Included: ${t}`);
      }
      // 1st half extra toppings
      for (const t of firstHalfExtras) {
        lines.push(`  Extra: ${t}`);
      }

      // 2nd half — same pizza (only extras differ in current flow)
      lines.push(`2nd Half: ${selectedPizzaName}`);
      for (const t of includedToppings) {
        lines.push(`  Included: ${t}`);
      }
      // 2nd half extra toppings
      for (const t of secondHalfExtras) {
        lines.push(`  Extra: ${t}`);
      }
    } else {
      // Whole pizza — included toppings
      lines.push(`Whole: ${selectedPizzaName}`);
      for (const t of includedToppings) {
        lines.push(`  Included: ${t}`);
      }
      if (freeCount > 0) lines.push(`  (${freeCount} toppings included in price)`);
      // Extra toppings for whole pizza
      for (const t of extraToppings) {
        lines.push(`  Extra: ${t}`);
      }
    }

    // ── 3. Cut style ─────────────────────────────────────────────────────────
    lines.push(`Cut: ${cutLabel}`);

    // ── 4. Special notes ─────────────────────────────────────────────────────
    if (notes.trim()) lines.push(`Note: ${notes.trim()}`);

    // Resolve the Clover catalog ID for this specific pizza + size combination
    // e.g. "BBQ Chicken 16\"" → matches "BBQ Chicken 16\" Pizza" in DB
    let cloverItemId: string | undefined;
    try {
      const searchName = `${selectedPizzaName} ${selectedSize}`;
      const resolved = await utils.client.menuItems.resolveCloverIds.query({
        items: [{ name: searchName, category: "pizza" }],
      });
      cloverItemId = resolved[searchName] ?? undefined;
    } catch {
      // Non-fatal — order still goes through without catalog ID
      console.warn("[Pizza] Could not resolve cloverItemId");
    }

    addItem({
      id: `pizza-${selectedPizzaName}-${selectedSize}-${selectedCut}-${Date.now()}`,
      name: `${selectedPizzaName} Pizza (${selectedSize})`,
      price: grandTotal,
      quantity: 1,
      category: "pizza",
      description: lines.join(" · "),
      cloverItemId,
    });

    toast.success(`${selectedPizzaName} Pizza (${selectedSize}) added to cart!`);
    onClose();
  }, [selectedPizzaName, selectedSize, selectedCut, grandTotal, halfAndHalf, extraToppings, firstHalfExtras, secondHalfExtras, includedToppings, freeCount, notes, addItem, utils, onClose]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0.10 0.02 30 / 0.78)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: "white", maxHeight: "92vh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ background: "var(--napoli-red)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.88 0.015 80)", fontFamily: "'Oswald', sans-serif" }}>
              Build Your Pizza
            </p>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              {selectedPizzaName ? `${selectedPizzaName}` : "Napoli Pizzeria"}
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
        <div
          className="flex items-center justify-center gap-1 px-4 py-3 shrink-0"
          style={{ background: "oklch(0.97 0.012 80)", borderBottom: "1px solid oklch(0.90 0.012 80)" }}
        >
          {[1, 2, 3, 4, 5].map((n, i) => {
            const isActive = step === n || (n === 3 && !showHalfHalfStep && step === 4);
            const isDone = step > n || (!showHalfHalfStep && n === 3 && step >= 4);
            const isSkipped = n === 3 && !showHalfHalfStep;
            return (
              <div key={n} className="flex items-center gap-1">
                <div style={{ opacity: isSkipped ? 0.35 : 1 }}>
                  <StepDot active={step === n} done={isDone} num={n} label={stepLabels[i]} />
                </div>
                {i < TOTAL_STEPS - 1 && (
                  <div
                    className="w-4 h-0.5 rounded mb-3"
                    style={{ background: isDone ? "var(--napoli-red)" : "oklch(0.88 0.015 80)" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* ── STEP 1: Choose pizza type ── */}
          {step === 1 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                What pizza would you like?
              </p>

              {/* Build-your-own */}
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                Build Your Own
              </p>
              <div className="flex flex-col gap-2 mb-4">
                {BUILD_YOUR_OWN.map((p) => {
                  const isSelected = selectedPizzaName === p.name;
                  return (
                    <button
                      key={p.name}
                      onClick={() => setSelectedPizzaName(p.name)}
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
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold" style={{ color: "oklch(0.22 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                          {p.name}
                        </div>
                        <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                          {p.desc}
                        </div>
                      </div>
                      {isSelected && <Check size={16} style={{ color: "var(--napoli-red)", flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>

              {/* Specialty pizzas */}
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                Specialty Pizzas
              </p>
              <div className="flex flex-col gap-2">
                {PIZZA_SPECIALS.map((p) => {
                  const isSelected = selectedPizzaName === p.name;
                  const toppings = SPECIALTY_TOPPINGS[p.name] ?? [];
                  return (
                    <button
                      key={p.name}
                      onClick={() => setSelectedPizzaName(p.name)}
                      className="flex items-start gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all active:scale-[0.99]"
                      style={{
                        borderColor: isSelected ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                        background: isSelected ? "oklch(0.97 0.04 27)" : "white",
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                        style={{ borderColor: isSelected ? "var(--napoli-red)" : "oklch(0.75 0.015 80)" }}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--napoli-red)" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold" style={{ color: "oklch(0.22 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                          {p.name}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                          {toppings.length > 0 ? toppings.join(", ") : p.desc}
                        </div>
                      </div>
                      {isSelected && <Check size={16} style={{ color: "var(--napoli-red)", flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 2: Choose size ── */}
          {step === 2 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                Select a Size
              </p>
              {currentPizza && includedToppings.length > 0 && (
                <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                  Includes: <span style={{ color: "var(--napoli-green)", fontWeight: 600 }}>{includedToppings.join(", ")}</span>
                </p>
              )}
              <div className="grid grid-cols-4 gap-2">
                {PIZZA_SIZES.map((size) => {
                  const sizeIndex = PIZZA_SIZES.indexOf(size);
                  const prices = PIZZA_BASE_PRICES[selectedPizzaName as keyof typeof PIZZA_BASE_PRICES] ?? PIZZA_BASE_PRICES["Plain Cheese"];
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
                      {isSelected && <Check size={12} style={{ color: "var(--napoli-red)" }} />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs mt-3" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                Extra toppings: <strong>+${toppingUnitPrice.toFixed(2)}</strong> each for {selectedSize || "selected size"}.
              </p>
            </div>
          )}

          {/* ── STEP 3: Whole pizza or Half & Half ── */}
          {step === 3 && showHalfHalfStep && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                Whole Pizza or Half & Half?
              </p>
              <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                Half & Half lets you customize each half with different extra toppings.
              </p>
              <div className="flex flex-col gap-3">
                {/* Whole */}
                <button
                  onClick={() => setHalfAndHalf(false)}
                  className="flex items-center gap-4 px-4 py-4 rounded-xl border-2 text-left transition-all active:scale-[0.99]"
                  style={{
                    borderColor: !halfAndHalf ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                    background: !halfAndHalf ? "oklch(0.97 0.04 27)" : "white",
                  }}
                >
                  <span className="text-3xl">🍕</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold" style={{ color: "oklch(0.22 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                      Whole Pizza
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                      Same toppings all around — {selectedPizzaName} style
                    </div>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: !halfAndHalf ? "var(--napoli-red)" : "oklch(0.75 0.015 80)" }}
                  >
                    {!halfAndHalf && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--napoli-red)" }} />}
                  </div>
                </button>

                {/* Half & Half */}
                <button
                  onClick={() => {
                    setHalfAndHalf(true);
                    setExtraToppings([]);
                    setFirstHalfExtras([]);
                    setSecondHalfExtras([]);
                  }}
                  className="flex items-center gap-4 px-4 py-4 rounded-xl border-2 text-left transition-all active:scale-[0.99]"
                  style={{
                    borderColor: halfAndHalf ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                    background: halfAndHalf ? "oklch(0.97 0.04 27)" : "white",
                  }}
                >
                  {/* Half & half visual */}
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex">
                    <div className="flex-1" style={{ background: "var(--napoli-red)" }} />
                    <div className="flex-1" style={{ background: "oklch(0.45 0.10 145)" }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold" style={{ color: "oklch(0.22 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                      Half & Half
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                      Different extra toppings on each half · half-toppings at ½ price
                    </div>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: halfAndHalf ? "var(--napoli-red)" : "oklch(0.75 0.015 80)" }}
                  >
                    {halfAndHalf && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--napoli-red)" }} />}
                  </div>
                </button>
              </div>

              {/* Included toppings reminder */}
              {includedToppings.length > 0 && (
                <div className="mt-4 p-3 rounded-lg" style={{ background: "oklch(0.96 0.06 145 / 0.25)", border: "1px solid oklch(0.80 0.10 145)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--napoli-green)", fontFamily: "'Oswald', sans-serif" }}>
                    ✓ Included on both halves:
                  </p>
                  <p className="text-xs" style={{ color: "oklch(0.40 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                    {includedToppings.join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Extra toppings ── */}
          {step === 4 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                  {halfAndHalf ? "Extra Toppings — Half & Half" : "Extra Toppings (Optional)"}
                </p>
                {extraToppingsCost > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}>
                    +{fmt(extraToppingsCost)}
                  </span>
                )}
              </div>
              <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                Each extra topping: <strong>+${toppingUnitPrice.toFixed(2)}</strong> for {selectedSize}.
                {halfAndHalf && " Half-toppings charged at ½ price each."}
              </p>

              {/* Included toppings (fixed) */}
              {includedToppings.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--napoli-green)", fontFamily: "'Oswald', sans-serif" }}>
                    ✓ Already included
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {includedToppings.map((t) => (
                      <ToppingChip key={t} label={t} selected={false} fixed onClick={() => {}} />
                    ))}
                  </div>
                </div>
              )}

              {/* Extra toppings — whole pizza */}
              {!halfAndHalf && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                    Add extra toppings
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXTRA_TOPPINGS.filter((t) => !includedToppings.includes(t)).map((t) => (
                      <ToppingChip
                        key={t}
                        label={t}
                        selected={extraToppings.includes(t)}
                        onClick={() => toggleExtra(t)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Extra toppings — half & half */}
              {halfAndHalf && (
                <div className="flex flex-col gap-4">
                  {/* 1st half */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: "var(--napoli-red)" }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                        1st Half extras ({firstHalfExtras.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {EXTRA_TOPPINGS.filter((t) => !includedToppings.includes(t)).map((t) => (
                        <ToppingChip
                          key={t}
                          label={t}
                          selected={firstHalfExtras.includes(t)}
                          onClick={() => toggleHalfExtra("first", t)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.015 80)" }} />
                    <span className="text-xs font-bold px-2" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>2ND HALF</span>
                    <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.015 80)" }} />
                  </div>

                  {/* 2nd half */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.45 0.10 145)" }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "oklch(0.45 0.10 145)", fontFamily: "'Oswald', sans-serif" }}>
                        2nd Half extras ({secondHalfExtras.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {EXTRA_TOPPINGS.filter((t) => !includedToppings.includes(t)).map((t) => (
                        <ToppingChip
                          key={t}
                          label={t}
                          selected={secondHalfExtras.includes(t)}
                          onClick={() => toggleHalfExtra("second", t)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 5: Cut style + review ── */}
          {step === 5 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                How would you like it cut?
              </p>
              <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                Select a cut style for your {selectedSize} {selectedPizzaName} pizza.
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

              {/* Order summary */}
              <div className="rounded-lg p-4 mb-4" style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.90 0.012 80)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                  Order Summary
                </p>
                <div className="flex flex-col gap-1.5 text-sm" style={{ fontFamily: "'Lato', sans-serif" }}>
                  <div className="flex justify-between">
                    <span style={{ color: "oklch(0.45 0.03 30)" }}>Pizza</span>
                    <span className="font-semibold" style={{ color: "oklch(0.25 0.04 30)" }}>{selectedPizzaName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "oklch(0.45 0.03 30)" }}>Size</span>
                    <span className="font-semibold" style={{ color: "oklch(0.25 0.04 30)" }}>{selectedSize}</span>
                  </div>
                  {selectedCut && (
                    <div className="flex justify-between">
                      <span style={{ color: "oklch(0.45 0.03 30)" }}>Cut</span>
                      <span className="font-semibold" style={{ color: "oklch(0.25 0.04 30)" }}>{CUT_OPTIONS.find((c) => c.id === selectedCut)?.label}</span>
                    </div>
                  )}
                  {includedToppings.length > 0 && (
                    <div className="flex justify-between items-start gap-2">
                      <span style={{ color: "oklch(0.45 0.03 30)" }}>Included</span>
                      <span className="font-semibold text-right" style={{ color: "var(--napoli-green)", maxWidth: "60%" }}>
                        {includedToppings.join(", ")}
                      </span>
                    </div>
                  )}
                  {!halfAndHalf && extraToppings.length > 0 && (
                    <div className="flex justify-between items-start gap-2">
                      <span style={{ color: "oklch(0.45 0.03 30)" }}>Extra ({extraToppings.length})</span>
                      <span className="font-semibold text-right" style={{ color: "oklch(0.25 0.04 30)", maxWidth: "60%" }}>
                        {extraToppings.join(", ")}
                      </span>
                    </div>
                  )}
                  {halfAndHalf && (
                    <>
                      <div className="flex justify-between items-start gap-2">
                        <span style={{ color: "oklch(0.45 0.03 30)" }}>1st Half extras</span>
                        <span className="font-semibold text-right" style={{ color: "oklch(0.25 0.04 30)", maxWidth: "60%" }}>
                          {firstHalfExtras.length > 0 ? firstHalfExtras.join(", ") : "None"}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span style={{ color: "oklch(0.45 0.03 30)" }}>2nd Half extras</span>
                        <span className="font-semibold text-right" style={{ color: "oklch(0.25 0.04 30)", maxWidth: "60%" }}>
                          {secondHalfExtras.length > 0 ? secondHalfExtras.join(", ") : "None"}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="border-t pt-2 mt-1 flex justify-between font-bold" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
                    <span style={{ color: "oklch(0.30 0.04 30)" }}>Base</span>
                    <span style={{ color: "oklch(0.30 0.04 30)" }}>{fmt(basePrice)}</span>
                  </div>
                  {extraToppingsCost > 0 && (
                    <div className="flex justify-between" style={{ color: "var(--napoli-green)" }}>
                      <span>Extra toppings</span>
                      <span>+{fmt(extraToppingsCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold" style={{ color: "var(--napoli-red)" }}>
                    <span>Total</span>
                    <span>{fmt(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Special notes */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                  placeholder="e.g. extra sauce, well done, no garlic..."
                  rows={2}
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
          <button
            onClick={goBack}
            disabled={step === (preSelected ? 2 : 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-30"
            style={{ border: "1.5px solid oklch(0.82 0.015 80)", color: "oklch(0.40 0.04 30)", fontFamily: "'Oswald', sans-serif", background: "white" }}
          >
            <ChevronLeft size={15} /> Back
          </button>

          {grandTotal > 0 && (
            <span className="text-sm font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
              {fmt(grandTotal)}
            </span>
          )}

          {step < TOTAL_STEPS ? (
            <button
              onClick={goNext}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}
            >
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
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
