/**
 * LunchCustomizerModal
 *
 * A lightweight multi-step customizer for Lunch Specials.
 * Every lunch special comes with a FREE Can of Soda — the customer must pick a flavor.
 * Items with wings/boneless wings also need a sauce selection.
 * Item #3 (10" Pizza 1 Topping) needs a topping selection.
 * Item #2 (Stromboli or Calzone) needs a choice between Stromboli and Calzone.
 * Item #4 (Meatball, Sausage or Ham Sub) needs a sub choice.
 * Item #6 (Manicotti, Ravioli or Stuffed Shells) needs a pasta choice.
 * Item #9 (Spaghetti & Meatballs or Sausage) needs a choice.
 * Item #19 (1 Slice Cheese or Pepperoni + 6 Boneless Wings) needs slice + sauce.
 * Item #24 (Chicken or Lamb Gyro) needs a choice.
 */
import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { PIZZA_30_TOPPINGS } from "@/lib/napoliData";
import { SODA_CAN_FLAVORS } from "@/components/SpecialCustomizerModal";

// ─── Wing sauces ──────────────────────────────────────────────────────────────
const WING_SAUCES = [
  "Plain", "Mild", "Medium", "Hot", "BBQ", "Spicy Honey BBQ",
  "Lemon Pepper", "Teriyaki", "Spicy Teriyaki", "Sweet Red Chili", "Mango Habanero",
];

// ─── Lunch item config ────────────────────────────────────────────────────────
export interface LunchItem {
  num: number;
  name: string;
  price: string;
}

interface LunchConfig {
  /** Choices for items with "A or B" options */
  choice?: { label: string; options: string[] };
  /** Whether this item includes wings/boneless that need sauce */
  hasWings?: boolean;
  /** Whether this item includes a pizza that needs 1 topping */
  hasPizzaTopping?: boolean;
}

const LUNCH_CONFIGS: Record<number, LunchConfig> = {
  2:  { choice: { label: "Choose your item", options: ["Stromboli", "Calzone"] } },
  3:  { hasPizzaTopping: true },
  4:  { choice: { label: "Choose your sub", options: ["Meatball Sub", "Sausage Sub", "Ham Sub"] } },
  6:  { choice: { label: "Choose your pasta", options: ["Manicotti", "Ravioli", "Stuffed Shells"] } },
  9:  { choice: { label: "Choose your pasta", options: ["Spaghetti & Meatballs", "Spaghetti & Sausage"] } },
  13: { hasWings: true },
  16: { hasWings: true },
  19: { choice: { label: "Choose your slice", options: ["Cheese Slice", "Pepperoni Slice"] }, hasWings: true },
  24: { choice: { label: "Choose your gyro", options: ["Chicken Gyro", "Lamb Gyro"] } },
};

// ─── Step types ───────────────────────────────────────────────────────────────
type Step = "choice" | "pizza-topping" | "wing-sauce" | "soda" | "review";

function buildSteps(cfg: LunchConfig): Step[] {
  const steps: Step[] = [];
  if (cfg.choice) steps.push("choice");
  if (cfg.hasPizzaTopping) steps.push("pizza-topping");
  if (cfg.hasWings) steps.push("wing-sauce");
  steps.push("soda");
  steps.push("review");
  return steps;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  item: LunchItem;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LunchCustomizerModal({ item, onClose }: Props) {
  const { addItem, openCart } = useCart();
  const cfg = LUNCH_CONFIGS[item.num] ?? {};
  const steps = buildSteps(cfg);

  const [stepIdx, setStepIdx] = useState(0);
  const [choice, setChoice] = useState<string>("");
  const [pizzaTopping, setPizzaTopping] = useState<string>("");
  const [wingSauce, setWingSauce] = useState<string>("");
  const [sodaFlavor, setSodaFlavor] = useState<string>("");

  const currentStep = steps[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;

  function canAdvance(): boolean {
    switch (currentStep) {
      case "choice":       return !!choice;
      case "pizza-topping": return !!pizzaTopping;
      case "wing-sauce":   return !!wingSauce;
      case "soda":         return !!sodaFlavor;
      case "review":       return true;
      default:             return true;
    }
  }

  function handleAddToCart() {
    const numericPrice = parseFloat(item.price.replace("$", ""));
    const parts: string[] = [];
    if (choice)       parts.push(choice);
    if (pizzaTopping) parts.push(`Topping: ${pizzaTopping}`);
    if (wingSauce)    parts.push(`Sauce: ${wingSauce}`);
    if (sodaFlavor)   parts.push(`Free Can: ${sodaFlavor}`);

    addItem({
      id: `lunch-${item.num}-${Date.now()}`,
      name: `#${item.num} ${item.name}`,
      price: numericPrice,
      quantity: 1,
      category: "lunch",
      description: parts.join(" · "),
    });
    toast.success(`#${item.num} ${item.name} added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });
    onClose();
  }

  // ── Step labels for breadcrumb ──────────────────────────────────────────────
  const STEP_LABELS: Record<Step, string> = {
    "choice":        cfg.choice?.label ?? "Choose",
    "pizza-topping": "Pizza Topping",
    "wing-sauce":    "Wing Sauce",
    "soda":          "Free Can",
    "review":        "Review",
  };

  // ── Renders ────────────────────────────────────────────────────────────────
  function renderStep() {
    switch (currentStep) {
      case "choice":
        return (
          <div>
            <h3 className="napoli-heading text-base mb-4" style={{ color: "var(--napoli-dark)" }}>
              {cfg.choice!.label}
            </h3>
            <div className="flex flex-col gap-2">
              {cfg.choice!.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setChoice(opt)}
                  className="flex items-center justify-between px-4 py-3 rounded border-2 text-left transition-all"
                  style={{
                    borderColor: choice === opt ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                    background: choice === opt ? "oklch(0.97 0.012 27)" : "white",
                  }}
                >
                  <span className="napoli-body text-sm font-semibold" style={{ color: "var(--napoli-dark)" }}>{opt}</span>
                  {choice === opt && <Check size={16} style={{ color: "var(--napoli-red)" }} />}
                </button>
              ))}
            </div>
          </div>
        );

      case "pizza-topping":
        return (
          <div>
            <h3 className="napoli-heading text-base mb-1" style={{ color: "var(--napoli-dark)" }}>
              Choose 1 Topping
            </h3>
            <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
              1 topping included · 10" pizza
            </p>
            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
              {PIZZA_30_TOPPINGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setPizzaTopping(t)}
                  className="px-3 py-1.5 rounded-full border text-xs napoli-body transition-all"
                  style={{
                    borderColor: pizzaTopping === t ? "var(--napoli-red)" : "oklch(0.85 0.015 80)",
                    background: pizzaTopping === t ? "var(--napoli-red)" : "white",
                    color: pizzaTopping === t ? "white" : "var(--napoli-dark)",
                    fontWeight: pizzaTopping === t ? 700 : 400,
                  }}
                >
                  {pizzaTopping === t ? "✓ " : "+ "}{t}
                </button>
              ))}
            </div>
          </div>
        );

      case "wing-sauce":
        return (
          <div>
            <h3 className="napoli-heading text-base mb-1" style={{ color: "var(--napoli-dark)" }}>
              Choose Wing Sauce
            </h3>
            <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
              Select your preferred sauce
            </p>
            <div className="flex flex-wrap gap-2">
              {WING_SAUCES.map((s) => (
                <button
                  key={s}
                  onClick={() => setWingSauce(s)}
                  className="px-3 py-1.5 rounded-full border text-xs napoli-body transition-all"
                  style={{
                    borderColor: wingSauce === s ? "var(--napoli-red)" : "oklch(0.85 0.015 80)",
                    background: wingSauce === s ? "var(--napoli-red)" : "white",
                    color: wingSauce === s ? "white" : "var(--napoli-dark)",
                    fontWeight: wingSauce === s ? 700 : 400,
                  }}
                >
                  {wingSauce === s ? "✓ " : ""}{s}
                </button>
              ))}
            </div>
          </div>
        );

      case "soda":
        return (
          <div>
            <h3 className="napoli-heading text-base mb-1" style={{ color: "var(--napoli-dark)" }}>
              🥤 Free Can of Soda
            </h3>
            <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
              Included with every Lunch Special — choose your flavor
            </p>
            <div className="flex flex-wrap gap-2">
              {SODA_CAN_FLAVORS.map((f) => (
                <button
                  key={f}
                  onClick={() => setSodaFlavor(f)}
                  className="px-3 py-1.5 rounded-full border text-xs napoli-body transition-all"
                  style={{
                    borderColor: sodaFlavor === f ? "var(--napoli-green)" : "oklch(0.85 0.015 80)",
                    background: sodaFlavor === f ? "var(--napoli-green)" : "white",
                    color: sodaFlavor === f ? "white" : "var(--napoli-dark)",
                    fontWeight: sodaFlavor === f ? 700 : 400,
                  }}
                >
                  {sodaFlavor === f ? "✓ " : ""}{f}
                </button>
              ))}
            </div>
          </div>
        );

      case "review":
        return (
          <div>
            <h3 className="napoli-heading text-base mb-4" style={{ color: "var(--napoli-dark)" }}>
              Review Your Order
            </h3>
            <div className="rounded border p-4 space-y-2" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.98 0.008 80)" }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="napoli-label text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>
                    #{item.num} {item.name}
                  </p>
                  {choice && (
                    <p className="text-xs napoli-body mt-1" style={{ color: "oklch(0.50 0.03 30)" }}>
                      {choice}
                    </p>
                  )}
                  {pizzaTopping && (
                    <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.50 0.03 30)" }}>
                      Topping: {pizzaTopping}
                    </p>
                  )}
                  {wingSauce && (
                    <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.50 0.03 30)" }}>
                      Sauce: {wingSauce}
                    </p>
                  )}
                  {sodaFlavor && (
                    <p className="text-xs napoli-body mt-0.5" style={{ color: "var(--napoli-green)", fontWeight: 600 }}>
                      🥤 Free Can: {sodaFlavor}
                    </p>
                  )}
                </div>
                <span className="napoli-price text-lg" style={{ color: "var(--napoli-red)" }}>{item.price}</span>
              </div>
            </div>
            <p className="text-xs napoli-body mt-3 text-center" style={{ color: "oklch(0.60 0.03 30)" }}>
              Mon–Fri 9AM–3PM only · Lunch Special pricing
            </p>
          </div>
        );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "white", maxHeight: "90dvh" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: "var(--napoli-red)" }}
        >
          <div className="min-w-0">
            <p className="napoli-label text-xs text-white/70 mb-0.5">Lunch Special</p>
            <h2 className="napoli-heading text-base text-white truncate">
              #{item.num} {item.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-5 py-2 overflow-x-auto shrink-0" style={{ background: "oklch(0.97 0.008 80)", borderBottom: "1px solid oklch(0.91 0.012 80)" }}>
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs napoli-label"
                style={{
                  background: i < stepIdx ? "var(--napoli-green)" : i === stepIdx ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                  color: i <= stepIdx ? "white" : "oklch(0.55 0.03 30)",
                }}
              >
                {i < stepIdx && <Check size={10} />}
                {STEP_LABELS[s]}
              </div>
              {i < steps.length - 1 && (
                <ChevronRight size={10} style={{ color: "oklch(0.65 0.015 80)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {renderStep()}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4 shrink-0 border-t"
          style={{ borderColor: "oklch(0.91 0.012 80)" }}
        >
          <button
            onClick={() => setStepIdx((i) => i - 1)}
            disabled={isFirst}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded text-sm napoli-label transition-all"
            style={{
              background: isFirst ? "oklch(0.92 0.012 80)" : "oklch(0.96 0.012 80)",
              color: isFirst ? "oklch(0.65 0.015 80)" : "var(--napoli-dark)",
              border: "1px solid oklch(0.88 0.015 80)",
            }}
          >
            <ChevronLeft size={14} /> Back
          </button>

          {isLast ? (
            <button
              onClick={handleAddToCart}
              className="flex items-center gap-2 px-6 py-2.5 rounded text-sm napoli-label transition-all"
              style={{ background: "var(--napoli-red)", color: "white" }}
            >
              <ShoppingCart size={14} /> Add to Cart · {item.price}
            </button>
          ) : (
            <button
              onClick={() => setStepIdx((i) => i + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-6 py-2.5 rounded text-sm napoli-label transition-all"
              style={{
                background: canAdvance() ? "var(--napoli-red)" : "oklch(0.75 0.015 80)",
                color: "white",
                cursor: canAdvance() ? "pointer" : "not-allowed",
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
