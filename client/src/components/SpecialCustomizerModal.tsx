/**
 * SpecialCustomizerModal
 *
 * Interactive multi-step customizer for all 19 Anytime Specials.
 *
 * Flow per special:
 *  - For each pizza in the combo → Crust → Cut → Toppings (free count per special, extras priced by pizza size)
 *  - For soda (2L bottle) → choose flavor
 *  - For soda cans → choose flavor
 *  - For wings → choose sauce (+ half & half if ≥10pc)
 *  - For chicken fingers → choose sauce (+ half & half if ≥10pc)
 *  - Review & Add to Cart
 */
import { useState, useMemo } from "react";
import {
  X, ChevronLeft, ChevronRight, Check, ShoppingCart, Plus, Minus,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { PIZZA_30_TOPPINGS, PIZZA_TOPPING_PRICES } from "@/lib/napoliData";

// ─── Constants ────────────────────────────────────────────────────────────────

const CRUST_OPTIONS = [
  { id: "regular", label: "Regular", desc: "Classic hand-tossed New York style" },
  { id: "thin", label: "Thin Crust", desc: "Light and crispy" },
  { id: "stuffed", label: "Stuffed Dough", desc: "Cheese-filled crust edges" },
];

const CUT_OPTIONS = [
  { id: "triangle", label: "Triangle Cut", emoji: "🍕" },
  { id: "square", label: "Square Cut", emoji: "⬛" },
  { id: "strips", label: "Strips", emoji: "📏" },
  { id: "uncut", label: "Uncut", emoji: "⭕" },
];

// 2-Liter bottle flavors — from Clover modifier group "One 2 Liter Soda For Specials"
export const SODA_2L_FLAVORS = [
  "Coca-Cola",
  "Sprite",
  "Diet Coke",
  "Coke Zero",
  "Dr Pepper",
  "Root Beer",
  "Fanta",
  "Ginger Ale",
];

// Soda can flavors — from Clover modifier group "Cans For Specials"
export const SODA_CAN_FLAVORS = [
  "Coca-Cola",
  "Sprite",
  "Diet Coke",
  "Coke Zero",
  "Dr Pepper",
  "Fanta",
  "Root Beer",
  "Ice Tea",
  "Bottle Water",
];

// Mexican glass bottle soda (only regular soda available)
export const SODA_BOTTLE_FLAVORS = [
  "Mexican Soda (Glass Bottle)",
];

// Wing / finger sauces
const WING_SAUCES = [
  "Plain", "Mild", "Medium", "Hot", "BBQ", "Spicy Honey BBQ",
  "Lemon Pepper", "Teriyaki", "Spicy Teriyaki", "Sweet Red Chili", "Mango Habanero",
];

// ─── Special Config ────────────────────────────────────────────────────────────

/**
 * Describes the components of each Anytime Special.
 * `pizzas` — array of pizza configs (size fixed, free toppings per pizza)
 * `soda2L` — number of 2-liter sodas included
 * `sodaCan` — number of cans included
 * `wings` — number of bone-in wings
 * `fingers` — number of chicken fingers
 * `extras` — fixed items that need no customization (auto-added to description)
 * `specialtyPizza` — if true, the pizza is a specialty (no topping selection)
 */
export interface SpecialPizzaConfig {
  size: string;
  freeToppings: number;
  label: string; // display label e.g. "16\" Pizza"
  isSpecialty?: boolean;
}

export interface SpecialConfig {
  num: number;
  name: string;
  price: number;
  pizzas: SpecialPizzaConfig[];
  soda2L: number;
  sodaCan: number;
  wings: number;
  fingers: number;
  extras: string[]; // e.g. ["Lasagna", "House Salad", "Garlic Bread"]
  saladChoice?: string[]; // if set, customer must pick one salad from this list
}

export const SPECIAL_CONFIGS: SpecialConfig[] = [
  {
    num: 1, name: "Two 16\" Pizzas 1 Topping", price: 32.99,
    pizzas: [
      { size: '16"', freeToppings: 1, label: '16" Pizza #1' },
      { size: '16"', freeToppings: 1, label: '16" Pizza #2' },
    ],
    soda2L: 0, sodaCan: 0, wings: 0, fingers: 0, extras: [],
  },
  {
    num: 2, name: "28\" Pizza 4 Toppings + (1) 2 Liter Soda", price: 45.99,
    pizzas: [{ size: '28"', freeToppings: 4, label: '28" Pizza' }],
    soda2L: 1, sodaCan: 0, wings: 0, fingers: 0, extras: [],
  },
  {
    num: 3, name: "18\" Pizza 2 Toppings", price: 22.99,
    pizzas: [{ size: '18"', freeToppings: 2, label: '18" Pizza' }],
    soda2L: 0, sodaCan: 0, wings: 0, fingers: 0, extras: [],
  },
  {
    num: 4, name: "14\" Cheese Pizza + Spaghetti & Meatballs + Garlic Bread + (1) 2 Liter Soda", price: 30.99,
    pizzas: [{ size: '14"', freeToppings: 0, label: '14" Cheese Pizza' }],
    soda2L: 1, sodaCan: 0, wings: 0, fingers: 0,
    extras: ["Spaghetti & Meatballs", "Garlic Bread"],
  },
  {
    num: 5, name: "24\" Cheese Pizza + 20 Wings + (1) 2 Liter Soda", price: 52.99,
    pizzas: [{ size: '24"', freeToppings: 0, label: '24" Cheese Pizza' }],
    soda2L: 1, sodaCan: 0, wings: 20, fingers: 0, extras: [],
  },
  {
    num: 6, name: "6 Fingers + 20 Wings + 16\" Pizza 1 Topping + (1) 2 Liter Soda", price: 63.99,
    pizzas: [{ size: '16"', freeToppings: 1, label: '16" Pizza' }],
    soda2L: 1, sodaCan: 0, wings: 20, fingers: 6, extras: [],
  },
  {
    num: 7, name: "Two 16\" Pizzas 2 Toppings/ea + (1) 2 Liter Soda", price: 39.99,
    pizzas: [
      { size: '16"', freeToppings: 2, label: '16" Pizza #1' },
      { size: '16"', freeToppings: 2, label: '16" Pizza #2' },
    ],
    soda2L: 1, sodaCan: 0, wings: 0, fingers: 0, extras: [],
  },
  {
    num: 8, name: "16\" Pizza 1 Topping + 1 Lasagna + House Salad + Garlic Bread + (1) 2 Liter Soda", price: 39.99,
    pizzas: [{ size: '16"', freeToppings: 1, label: '16" Pizza' }],
    soda2L: 1, sodaCan: 0, wings: 0, fingers: 0,
    extras: ["Lasagna", "House Salad", "Garlic Bread"],
  },
  {
    num: 9, name: "16\" Pizza 1 Topping + 20 Wings + (1) 2 Liter Soda", price: 43.99,
    pizzas: [{ size: '16"', freeToppings: 1, label: '16" Pizza' }],
    soda2L: 1, sodaCan: 0, wings: 20, fingers: 0, extras: [],
  },
  {
    num: 10, name: "16\" Pizza 1 Topping + 10 Fingers + (1) 2 Liter Soda", price: 40.99,
    pizzas: [{ size: '16"', freeToppings: 1, label: '16" Pizza' }],
    soda2L: 1, sodaCan: 0, wings: 0, fingers: 10, extras: [],
  },
  {
    num: 11, name: "28\" Pizza 1 Topping + 40 Wings + Two 2 Liter Sodas", price: 93.99,
    pizzas: [{ size: '28"', freeToppings: 1, label: '28" Pizza' }],
    soda2L: 2, sodaCan: 0, wings: 40, fingers: 0, extras: [],
  },
  {
    num: 12, name: "10\" Pizza 4 Toppings + 40 Wings + 20 Fingers + Two Lg Fries + Two 2 Liter Sodas", price: 131.99,
    pizzas: [{ size: '10"', freeToppings: 4, label: '10" Pizza' }],
    soda2L: 2, sodaCan: 0, wings: 40, fingers: 20,
    extras: ["Two Large Fries"],
  },
  {
    num: 13, name: "16\" Specialty Pizza + 20 Wings + (1) 2 Liter Soda", price: 55.99,
    pizzas: [{ size: '16"', freeToppings: 0, label: '16" Specialty Pizza', isSpecialty: true }],
    soda2L: 1, sodaCan: 0, wings: 20, fingers: 0, extras: [],
  },
  {
    num: 14, name: "18\" Pizza 1 Topping + 20 Wings + Antipasto or Chef Salad + (1) 2 Liter Soda", price: 55.99,
    pizzas: [{ size: '18"', freeToppings: 1, label: '18" Pizza' }],
    soda2L: 1, sodaCan: 0, wings: 20, fingers: 0,
    extras: [],
    saladChoice: ["Antipasto Salad", "Chef Salad"],
  },
  {
    num: 15, name: "Two 18\" Pizzas 2 Toppings + Two 2 Liter Sodas", price: 100.99,
    pizzas: [
      { size: '18"', freeToppings: 2, label: '18" Pizza #1' },
      { size: '18"', freeToppings: 2, label: '18" Pizza #2' },
    ],
    soda2L: 2, sodaCan: 0, wings: 0, fingers: 0, extras: [],
  },
  {
    num: 16, name: "14\" Pizza 1 Topping + 10 Wings + (1) 2 Liter Soda", price: 33.99,
    pizzas: [{ size: '14"', freeToppings: 1, label: '14" Pizza' }],
    soda2L: 1, sodaCan: 0, wings: 10, fingers: 0, extras: [],
  },
  {
    num: 17, name: "14\" Pizza 1 Topping + 10 Wings + 5 Fingers", price: 38.99,
    pizzas: [{ size: '14"', freeToppings: 1, label: '14" Pizza' }],
    soda2L: 0, sodaCan: 0, wings: 10, fingers: 5, extras: [],
  },
  {
    num: 18, name: "16\" Pizza 1 Topping + 20 Wings + 10 Fingers + (1) 2 Liter Soda", price: 70.99,
    pizzas: [{ size: '16"', freeToppings: 1, label: '16" Pizza' }],
    soda2L: 1, sodaCan: 0, wings: 20, fingers: 10, extras: [],
  },
  {
    num: 19, name: "36\" Pizza 4 Toppings + 40 Wings + Garlic Balls + Two 2 Liter Sodas", price: 129.99,
    pizzas: [{ size: '36"', freeToppings: 4, label: '36" Pizza' }],
    soda2L: 2, sodaCan: 0, wings: 40, fingers: 0,
    extras: ["Garlic Balls"],
  },
];

// ─── Pizza state per pizza slot ────────────────────────────────────────────────

interface PizzaState {
  crust: string;
  cut: string;
  toppings: string[];
  halfAndHalf: boolean;
  firstHalf: string[];
  secondHalf: string[];
  specialtyName: string; // for specialty pizzas
}

function emptyPizzaState(): PizzaState {
  return {
    crust: "",
    cut: "",
    toppings: [],
    halfAndHalf: false,
    firstHalf: [],
    secondHalf: [],
    specialtyName: "",
  };
}

// ─── Specialty pizza names ─────────────────────────────────────────────────────

const SPECIALTY_NAMES = [
  "BBQ Chicken", "Buffalo Chicken", "3 Cheese", "Chicken Alfredo", "Deluxe",
  "Greek", "Italian", "Meat Lover", "Mexican Style", "Napoli's Special",
  "Pesto Chicken", "Ranch", "Southwestern Chicken", "Supreme", "Taco", "Vegetarian", "White Pizza",
];

// ─── Step helpers ──────────────────────────────────────────────────────────────

function buildSteps(cfg: SpecialConfig): string[] {
  const steps: string[] = [];
  cfg.pizzas.forEach((p, i) => {
    const label = cfg.pizzas.length > 1 ? `Pizza ${i + 1}` : "Pizza";
    if (p.isSpecialty) {
      steps.push(`${label} Style`);
    }
    steps.push(`${label} Crust`);
    steps.push(`${label} Cut`);
    steps.push(`${label} Toppings`);
  });
    if (cfg.soda2L > 0) steps.push(cfg.soda2L > 1 ? `Sodas (×${cfg.soda2L})` : "Soda");
    if (cfg.sodaCan > 0) steps.push(cfg.sodaCan > 1 ? `Cans (×${cfg.sodaCan})` : "Soda Can");
    if (cfg.wings > 0) steps.push(`Wings (${cfg.wings}pc)`);
    if (cfg.fingers > 0) steps.push(`Fingers (${cfg.fingers}pc)`);
    if (cfg.saladChoice && cfg.saladChoice.length > 0) steps.push("Salad Choice");
    steps.push("Review");
  return steps;
}

// ─── Shared UI helpers ─────────────────────────────────────────────────────────

function StepDot({ active, done, num }: { active: boolean; done: boolean; num: number }) {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0"
      style={{
        background: done ? "var(--napoli-green)" : active ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
        color: done || active ? "white" : "oklch(0.52 0.03 30)",
      }}
    >
      {done ? <Check size={11} /> : num}
    </div>
  );
}

function OptionCard({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border text-left transition-all active:scale-[0.97]"
      style={{
        borderColor: selected ? "var(--napoli-red)" : "oklch(0.85 0.015 80)",
        background: selected ? "oklch(0.97 0.04 25)" : "white",
        outline: selected ? "2px solid var(--napoli-red)" : "none",
      }}
    >
      {children}
    </button>
  );
}

function ToppingChip({
  label, selected, disabled, onClick,
}: { label: string; selected: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled && !selected}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95"
      style={{
        borderColor: selected ? "var(--napoli-red)" : "oklch(0.85 0.015 80)",
        background: selected ? "var(--napoli-red)" : disabled && !selected ? "oklch(0.95 0.005 80)" : "white",
        color: selected ? "white" : disabled && !selected ? "oklch(0.70 0.015 80)" : "oklch(0.40 0.03 30)",
        cursor: disabled && !selected ? "not-allowed" : "pointer",
      }}
    >
      {selected ? <Minus size={9} /> : <Plus size={9} />}
      {label}
    </button>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

interface Props {
  specialNum: number | null;
  onClose: () => void;
}

export default function SpecialCustomizerModal({ specialNum, onClose }: Props) {
  if (specialNum === null) return null;
  const cfg = SPECIAL_CONFIGS.find((s) => s.num === specialNum);
  if (!cfg) return null;
  return <SpecialCustomizerInner cfg={cfg} onClose={onClose} />;
}

function SpecialCustomizerInner({ cfg, onClose }: { cfg: SpecialConfig; onClose: () => void }) {
  const { addItem, openCart } = useCart();

  // Pizza states (one per pizza in the combo)
  const [pizzaStates, setPizzaStates] = useState<PizzaState[]>(
    () => cfg.pizzas.map(() => emptyPizzaState())
  );

  // Soda 2L flavors (one per soda)
  const [soda2LFlavors, setSoda2LFlavors] = useState<string[]>(
    () => Array(cfg.soda2L).fill("")
  );

  // Soda can flavors
  const [sodaCanFlavors, setSodaCanFlavors] = useState<string[]>(
    () => Array(cfg.sodaCan).fill("")
  );

  // Salad choice (for special #14)
  const [saladChoice, setSaladChoice] = useState("");

  // Wings sauce
  const [wingsSauce, setWingsSauce] = useState("");
  const [wingsHalf1, setWingsHalf1] = useState("");
  const [wingsHalf2, setWingsHalf2] = useState("");
  const [wingsHalfAndHalf, setWingsHalfAndHalf] = useState(false);

  // Fingers sauce
  const [fingersSauce, setFingersSauce] = useState("");
  const [fingersHalf1, setFingersHalf1] = useState("");
  const [fingersHalf2, setFingersHalf2] = useState("");
  const [fingersHalfAndHalf, setFingersHalfAndHalf] = useState(false);

  const [step, setStep] = useState(0); // 0-indexed
  const steps = useMemo(() => buildSteps(cfg), [cfg]);
  const totalSteps = steps.length;

  // ── Step resolution ──────────────────────────────────────────────────────────
  // Build an ordered list of step descriptors so we know what each step index means
  type StepDescriptor =
    | { type: "pizza-specialty"; pizzaIdx: number }
    | { type: "pizza-crust"; pizzaIdx: number }
    | { type: "pizza-cut"; pizzaIdx: number }
    | { type: "pizza-toppings"; pizzaIdx: number }
    | { type: "soda2l" }
    | { type: "sodacan" }
    | { type: "wings" }
    | { type: "fingers" }
    | { type: "salad" }
    | { type: "review" };

  const stepDescriptors = useMemo<StepDescriptor[]>(() => {
    const descs: StepDescriptor[] = [];
    cfg.pizzas.forEach((p, i) => {
      if (p.isSpecialty) descs.push({ type: "pizza-specialty", pizzaIdx: i });
      descs.push({ type: "pizza-crust", pizzaIdx: i });
      descs.push({ type: "pizza-cut", pizzaIdx: i });
      descs.push({ type: "pizza-toppings", pizzaIdx: i });
    });
    if (cfg.soda2L > 0) descs.push({ type: "soda2l" });
    if (cfg.sodaCan > 0) descs.push({ type: "sodacan" });
    if (cfg.wings > 0) descs.push({ type: "wings" });
    if (cfg.fingers > 0) descs.push({ type: "fingers" });
    if (cfg.saladChoice && cfg.saladChoice.length > 0) descs.push({ type: "salad" });
    descs.push({ type: "review" });
    return descs;
  }, [cfg]);

  const currentDesc = stepDescriptors[step];

  // ── Pizza state helpers ──────────────────────────────────────────────────────
  function updatePizza(idx: number, patch: Partial<PizzaState>) {
    setPizzaStates((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function toggleTopping(pizzaIdx: number, t: string) {
    const ps = pizzaStates[pizzaIdx];
    const cur = ps.toppings;
    updatePizza(pizzaIdx, {
      toppings: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t],
    });
  }

  function toggleHalfTopping(pizzaIdx: number, half: "first" | "second", t: string) {
    const ps = pizzaStates[pizzaIdx];
    const cur = half === "first" ? ps.firstHalf : ps.secondHalf;
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
    updatePizza(pizzaIdx, half === "first" ? { firstHalf: next } : { secondHalf: next });
  }

  // ── Extra topping pricing ────────────────────────────────────────────────────
  function extraToppingCost(pizzaIdx: number): number {
    const pizzaCfg = cfg.pizzas[pizzaIdx];
    const ps = pizzaStates[pizzaIdx];
    const unitPrice = PIZZA_TOPPING_PRICES[pizzaCfg.size] ?? 3.00;
    const free = pizzaCfg.freeToppings;

    if (ps.halfAndHalf) {
      const total = ps.firstHalf.length + ps.secondHalf.length;
      const chargeable = Math.max(0, total - free * 2);
      return chargeable * (unitPrice / 2);
    }
    const chargeable = Math.max(0, ps.toppings.length - free);
    return chargeable * unitPrice;
  }

  const totalExtraCost = useMemo(
    () => cfg.pizzas.reduce((sum, _, i) => sum + extraToppingCost(i), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pizzaStates]
  );

  const grandTotal = cfg.price + totalExtraCost;

  // ── Can advance? ─────────────────────────────────────────────────────────────
  function canAdvance(): boolean {
    if (!currentDesc) return false;
    if (currentDesc.type === "pizza-specialty") {
      return pizzaStates[currentDesc.pizzaIdx].specialtyName !== "";
    }
    if (currentDesc.type === "pizza-crust") {
      return pizzaStates[currentDesc.pizzaIdx].crust !== "";
    }
    if (currentDesc.type === "pizza-cut") {
      return pizzaStates[currentDesc.pizzaIdx].cut !== "";
    }
    if (currentDesc.type === "pizza-toppings") return true;
    if (currentDesc.type === "soda2l") {
      return soda2LFlavors.every((f) => f !== "");
    }
    if (currentDesc.type === "sodacan") {
      return sodaCanFlavors.every((f) => f !== "");
    }
    if (currentDesc.type === "wings") {
      if (wingsHalfAndHalf) return wingsHalf1 !== "" && wingsHalf2 !== "";
      return wingsSauce !== "";
    }
    if (currentDesc.type === "fingers") {
      if (fingersHalfAndHalf) return fingersHalf1 !== "" && fingersHalf2 !== "";
      return fingersSauce !== "";
    }
    if (currentDesc.type === "salad") return saladChoice !== "";
    return true;
  }

  // ── Add to cart ──────────────────────────────────────────────────────────────
  function handleAddToCart() {
    const parts: string[] = [];

    cfg.pizzas.forEach((pizzaCfg, i) => {
      const ps = pizzaStates[i];
      const crustLabel = CRUST_OPTIONS.find((c) => c.id === ps.crust)?.label ?? ps.crust;
      const cutLabel = CUT_OPTIONS.find((c) => c.id === ps.cut)?.label ?? ps.cut;
      const label = cfg.pizzas.length > 1 ? `Pizza ${i + 1}` : "Pizza";

      let toppingStr: string;
      if (pizzaCfg.isSpecialty) {
        toppingStr = `Style: ${ps.specialtyName}`;
      } else if (ps.halfAndHalf) {
        const f = ps.firstHalf.length > 0 ? ps.firstHalf.join(", ") : "Plain";
        const s = ps.secondHalf.length > 0 ? ps.secondHalf.join(", ") : "Plain";
        toppingStr = `Half & Half — 1st: ${f} | 2nd: ${s}`;
      } else if (ps.toppings.length > 0) {
        toppingStr = `Toppings: ${ps.toppings.join(", ")}`;
      } else {
        toppingStr = pizzaCfg.freeToppings > 0 ? "No extra toppings" : "Plain (cheese)";
      }

      parts.push(`${label} (${pizzaCfg.size}): ${crustLabel} · ${cutLabel} · ${toppingStr}`);
    });

    if (cfg.soda2L > 0) {
      parts.push(`2L Soda${cfg.soda2L > 1 ? "s" : ""}: ${soda2LFlavors.join(", ")}`);
    }
    if (cfg.sodaCan > 0) {
      parts.push(`Soda Can${cfg.sodaCan > 1 ? "s" : ""}: ${sodaCanFlavors.join(", ")}`);
    }
    if (cfg.wings > 0) {
      const wSauce = wingsHalfAndHalf ? `Half & Half: ${wingsHalf1} / ${wingsHalf2}` : wingsSauce;
      parts.push(`${cfg.wings}pc Wings: ${wSauce}`);
    }
    if (cfg.fingers > 0) {
      const fSauce = fingersHalfAndHalf ? `Half & Half: ${fingersHalf1} / ${fingersHalf2}` : fingersSauce;
      parts.push(`${cfg.fingers}pc Fingers: ${fSauce}`);
    }
    if (saladChoice) {
      parts.push(`Salad: ${saladChoice}`);
    }
    if (cfg.extras.length > 0) {
      parts.push(`Includes: ${cfg.extras.join(", ")}`);
    }

    addItem({
      id: `special-${cfg.num}-${Date.now()}`,
      name: `#${cfg.num} ${cfg.name}`,
      price: grandTotal,
      quantity: 1,
      category: "specials",
      description: parts.join(" | "),
    });

    toast.success(`#${cfg.num} added to cart!`, {
      action: { label: "View Cart", onClick: openCart },
    });
    onClose();
  }

  // ─── Render helpers ──────────────────────────────────────────────────────────

  function renderPizzaSpecialtyStep(pizzaIdx: number) {
    const ps = pizzaStates[pizzaIdx];
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
          Choose your specialty style:
        </p>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
          {SPECIALTY_NAMES.map((name) => (
            <OptionCard
              key={name}
              selected={ps.specialtyName === name}
              onClick={() => updatePizza(pizzaIdx, { specialtyName: name })}
            >
              <span className="text-sm font-semibold" style={{ color: "oklch(0.28 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                {name}
              </span>
            </OptionCard>
          ))}
        </div>
      </div>
    );
  }

  function renderPizzaCrustStep(pizzaIdx: number) {
    const ps = pizzaStates[pizzaIdx];
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
          Choose crust type:
        </p>
        <div className="grid grid-cols-1 gap-2">
          {CRUST_OPTIONS.map((c) => (
            <OptionCard key={c.id} selected={ps.crust === c.id} onClick={() => updatePizza(pizzaIdx, { crust: c.id })}>
              <span className="text-sm font-bold" style={{ color: "oklch(0.28 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>{c.label}</span>
              <span className="text-xs" style={{ color: "oklch(0.55 0.03 30)" }}>{c.desc}</span>
            </OptionCard>
          ))}
        </div>
      </div>
    );
  }

  function renderPizzaCutStep(pizzaIdx: number) {
    const ps = pizzaStates[pizzaIdx];
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
          Choose cut style:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CUT_OPTIONS.map((c) => (
            <OptionCard key={c.id} selected={ps.cut === c.id} onClick={() => updatePizza(pizzaIdx, { cut: c.id })}>
              <span className="text-xl">{c.emoji}</span>
              <span className="text-sm font-bold" style={{ color: "oklch(0.28 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>{c.label}</span>
            </OptionCard>
          ))}
        </div>
      </div>
    );
  }

  function renderPizzaToppingsStep(pizzaIdx: number) {
    const pizzaCfg = cfg.pizzas[pizzaIdx];
    const ps = pizzaStates[pizzaIdx];
    const unitPrice = PIZZA_TOPPING_PRICES[pizzaCfg.size] ?? 3.00;
    const free = pizzaCfg.freeToppings;

    const totalSelected = ps.halfAndHalf
      ? ps.firstHalf.length + ps.secondHalf.length
      : ps.toppings.length;

    const freeRemaining = ps.halfAndHalf ? 0 : Math.max(0, free - ps.toppings.length);
    const extraCost = extraToppingCost(pizzaIdx);

    return (
      <div className="space-y-3">
        {/* Header info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
              {pizzaCfg.label}
            </p>
            <p className="text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>
              {free > 0
                ? `${free} topping${free > 1 ? "s" : ""} included free · extras $${unitPrice.toFixed(2)}/each`
                : `All toppings charged · $${unitPrice.toFixed(2)}/each`
              }
            </p>
          </div>
          {extraCost > 0 && (
            <span className="text-sm font-bold" style={{ color: "var(--napoli-red)" }}>
              +${extraCost.toFixed(2)} this pizza
            </span>
          )}
        </div>

        {/* Free remaining badge */}
        {!ps.halfAndHalf && free > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{
              background: freeRemaining > 0 ? "oklch(0.93 0.10 145)" : "oklch(0.95 0.04 30)",
              color: freeRemaining > 0 ? "oklch(0.30 0.12 145)" : "oklch(0.52 0.03 30)",
              border: `1px solid ${freeRemaining > 0 ? "oklch(0.80 0.12 145)" : "oklch(0.85 0.015 80)"}`,
            }}
          >
            <span className="text-base">{freeRemaining > 0 ? "🎁" : "✅"}</span>
            <span>
              {freeRemaining > 0
                ? `${freeRemaining} free topping${freeRemaining > 1 ? "s" : ""} remaining — pick now!`
                : `Free topping${free > 1 ? "s" : ""} used — additional toppings: $${(PIZZA_TOPPING_PRICES[pizzaCfg.size] ?? 3).toFixed(2)}/each`
              }
            </span>
          </div>
        )}

        {/* Half & Half toggle */}
        <button
          onClick={() => updatePizza(pizzaIdx, {
            halfAndHalf: !ps.halfAndHalf,
            toppings: [],
            firstHalf: [],
            secondHalf: [],
          })}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-all"
          style={{
            borderColor: ps.halfAndHalf ? "var(--napoli-red)" : "oklch(0.85 0.015 80)",
            background: ps.halfAndHalf ? "oklch(0.97 0.04 25)" : "white",
            color: ps.halfAndHalf ? "var(--napoli-red)" : "oklch(0.42 0.03 30)",
            fontFamily: "'Oswald', sans-serif",
          }}
        >
          <span className="text-base">🍕</span>
          Half & Half
          {ps.halfAndHalf && <Check size={14} />}
        </button>

        {/* Toppings grid */}
        {!ps.halfAndHalf ? (
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
            {PIZZA_30_TOPPINGS.map((t) => (
              <ToppingChip
                key={t}
                label={t}
                selected={ps.toppings.includes(t)}
                disabled={false}
                onClick={() => toggleTopping(pizzaIdx, t)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* First half */}
            <div>
              <p className="text-xs font-bold mb-1.5 px-1" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                1ST HALF {ps.firstHalf.length > 0 ? `(${ps.firstHalf.join(", ")})` : "(Plain)"}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {PIZZA_30_TOPPINGS.map((t) => (
                  <ToppingChip
                    key={t}
                    label={t}
                    selected={ps.firstHalf.includes(t)}
                    disabled={false}
                    onClick={() => toggleHalfTopping(pizzaIdx, "first", t)}
                  />
                ))}
              </div>
            </div>
            {/* Second half */}
            <div>
              <p className="text-xs font-bold mb-1.5 px-1" style={{ color: "oklch(0.40 0.15 220)", fontFamily: "'Oswald', sans-serif" }}>
                2ND HALF {ps.secondHalf.length > 0 ? `(${ps.secondHalf.join(", ")})` : "(Plain)"}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {PIZZA_30_TOPPINGS.map((t) => (
                  <ToppingChip
                    key={t}
                    label={t}
                    selected={ps.secondHalf.includes(t)}
                    disabled={false}
                    onClick={() => toggleHalfTopping(pizzaIdx, "second", t)}
                  />
                ))}
              </div>
            </div>
            {/* Half & half pricing note */}
            <p className="text-xs px-1" style={{ color: "oklch(0.55 0.03 30)" }}>
              Each half-topping costs ${(unitPrice / 2).toFixed(2)} (half price). {free > 0 ? `First ${free * 2} half-toppings free.` : ""}
            </p>
          </div>
        )}

        {totalSelected > 0 && (
          <p className="text-xs" style={{ color: "oklch(0.55 0.03 30)" }}>
            {totalSelected} topping{totalSelected > 1 ? "s" : ""} selected
            {extraCost > 0 ? ` · +$${extraCost.toFixed(2)} extra` : " · all free"}
          </p>
        )}
      </div>
    );
  }

  function renderSoda2LStep() {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
          Choose 2-Liter Soda flavor{cfg.soda2L > 1 ? "s" : ""}:
        </p>
        {Array.from({ length: cfg.soda2L }).map((_, i) => (
          <div key={i}>
            {cfg.soda2L > 1 && (
              <p className="text-xs font-bold mb-1.5" style={{ color: "oklch(0.52 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                SODA {i + 1}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {SODA_2L_FLAVORS.map((flavor) => (
                <OptionCard
                  key={flavor}
                  selected={soda2LFlavors[i] === flavor}
                  onClick={() => setSoda2LFlavors((prev) => prev.map((f, idx) => idx === i ? flavor : f))}
                >
                  <span className="text-lg">🥤</span>
                  <span className="text-sm font-semibold" style={{ color: "oklch(0.28 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                    {flavor}
                  </span>
                  <span className="text-xs" style={{ color: "oklch(0.55 0.03 30)" }}>2 Liter Bottle</span>
                </OptionCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderSodaCanStep() {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
          Choose Soda Can flavor{cfg.sodaCan > 1 ? "s" : ""}:
        </p>
        {Array.from({ length: cfg.sodaCan }).map((_, i) => (
          <div key={i}>
            {cfg.sodaCan > 1 && (
              <p className="text-xs font-bold mb-1.5" style={{ color: "oklch(0.52 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
                CAN {i + 1}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {SODA_CAN_FLAVORS.map((flavor) => (
                <OptionCard
                  key={flavor}
                  selected={sodaCanFlavors[i] === flavor}
                  onClick={() => setSodaCanFlavors((prev) => prev.map((f, idx) => idx === i ? flavor : f))}
                >
                  <span className="text-lg">🥫</span>
                  <span className="text-sm font-semibold" style={{ color: "oklch(0.28 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                    {flavor}
                  </span>
                  <span className="text-xs" style={{ color: "oklch(0.55 0.03 30)" }}>330ml Can</span>
                </OptionCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderWingsStep() {
    const canHalf = cfg.wings >= 10;
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
          Choose wing sauce ({cfg.wings}pc):
        </p>

        {canHalf && (
          <button
            onClick={() => { setWingsHalfAndHalf(!wingsHalfAndHalf); setWingsSauce(""); setWingsHalf1(""); setWingsHalf2(""); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-all"
            style={{
              borderColor: wingsHalfAndHalf ? "var(--napoli-red)" : "oklch(0.85 0.015 80)",
              background: wingsHalfAndHalf ? "oklch(0.97 0.04 25)" : "white",
              color: wingsHalfAndHalf ? "var(--napoli-red)" : "oklch(0.42 0.03 30)",
              fontFamily: "'Oswald', sans-serif",
            }}
          >
            🍗 Half & Half Sauce
            {wingsHalfAndHalf && <Check size={14} />}
          </button>
        )}

        {!wingsHalfAndHalf ? (
          <div className="grid grid-cols-2 gap-2">
            {WING_SAUCES.map((s) => (
              <OptionCard key={s} selected={wingsSauce === s} onClick={() => setWingsSauce(s)}>
                <span className="text-sm font-semibold" style={{ color: "oklch(0.28 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>{s}</span>
              </OptionCard>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold mb-1.5" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>1ST HALF</p>
              <div className="grid grid-cols-2 gap-2">
                {WING_SAUCES.map((s) => (
                  <OptionCard key={s} selected={wingsHalf1 === s} onClick={() => setWingsHalf1(s)}>
                    <span className="text-sm font-semibold" style={{ color: "oklch(0.28 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>{s}</span>
                  </OptionCard>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold mb-1.5" style={{ color: "oklch(0.40 0.15 220)", fontFamily: "'Oswald', sans-serif" }}>2ND HALF</p>
              <div className="grid grid-cols-2 gap-2">
                {WING_SAUCES.map((s) => (
                  <OptionCard key={s} selected={wingsHalf2 === s} onClick={() => setWingsHalf2(s)}>
                    <span className="text-sm font-semibold" style={{ color: "oklch(0.28 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>{s}</span>
                  </OptionCard>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderFingersStep() {
    const canHalf = cfg.fingers >= 10;
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
          Choose finger sauce ({cfg.fingers}pc):
        </p>

        {canHalf && (
          <button
            onClick={() => { setFingersHalfAndHalf(!fingersHalfAndHalf); setFingersSauce(""); setFingersHalf1(""); setFingersHalf2(""); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-all"
            style={{
              borderColor: fingersHalfAndHalf ? "var(--napoli-red)" : "oklch(0.85 0.015 80)",
              background: fingersHalfAndHalf ? "oklch(0.97 0.04 25)" : "white",
              color: fingersHalfAndHalf ? "var(--napoli-red)" : "oklch(0.42 0.03 30)",
              fontFamily: "'Oswald', sans-serif",
            }}
          >
            🍗 Half & Half Sauce
            {fingersHalfAndHalf && <Check size={14} />}
          </button>
        )}

        {!fingersHalfAndHalf ? (
          <div className="grid grid-cols-2 gap-2">
            {WING_SAUCES.map((s) => (
              <OptionCard key={s} selected={fingersSauce === s} onClick={() => setFingersSauce(s)}>
                <span className="text-sm font-semibold" style={{ color: "oklch(0.28 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>{s}</span>
              </OptionCard>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold mb-1.5" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>1ST HALF</p>
              <div className="grid grid-cols-2 gap-2">
                {WING_SAUCES.map((s) => (
                  <OptionCard key={s} selected={fingersHalf1 === s} onClick={() => setFingersHalf1(s)}>
                    <span className="text-sm font-semibold" style={{ color: "oklch(0.28 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>{s}</span>
                  </OptionCard>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold mb-1.5" style={{ color: "oklch(0.40 0.15 220)", fontFamily: "'Oswald', sans-serif" }}>2ND HALF</p>
              <div className="grid grid-cols-2 gap-2">
                {WING_SAUCES.map((s) => (
                  <OptionCard key={s} selected={fingersHalf2 === s} onClick={() => setFingersHalf2(s)}>
                    <span className="text-sm font-semibold" style={{ color: "oklch(0.28 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>{s}</span>
                  </OptionCard>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderReviewStep() {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
          Order Summary:
        </p>

        <div className="rounded-lg border divide-y" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
          {cfg.pizzas.map((pizzaCfg, i) => {
            const ps = pizzaStates[i];
            const crustLabel = CRUST_OPTIONS.find((c) => c.id === ps.crust)?.label ?? ps.crust;
            const cutLabel = CUT_OPTIONS.find((c) => c.id === ps.cut)?.label ?? ps.cut;
            const label = cfg.pizzas.length > 1 ? `Pizza ${i + 1}` : "Pizza";
            const extra = extraToppingCost(i);

            return (
              <div key={i} className="px-3 py-2.5">
                <p className="text-xs font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                  {label} — {pizzaCfg.size}
                </p>
                <p className="text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>
                  {crustLabel} · {cutLabel}
                </p>
                {pizzaCfg.isSpecialty ? (
                  <p className="text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>Style: {ps.specialtyName}</p>
                ) : ps.halfAndHalf ? (
                  <p className="text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>
                    Half & Half: [{ps.firstHalf.join(", ") || "Plain"}] / [{ps.secondHalf.join(", ") || "Plain"}]
                  </p>
                ) : (
                  <p className="text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>
                    {ps.toppings.length > 0 ? ps.toppings.join(", ") : "Plain (cheese)"}
                  </p>
                )}
                {extra > 0 && (
                  <p className="text-xs font-semibold" style={{ color: "var(--napoli-red)" }}>+${extra.toFixed(2)} extra toppings</p>
                )}
              </div>
            );
          })}

          {cfg.soda2L > 0 && (
            <div className="px-3 py-2.5">
              <p className="text-xs font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                2L Soda{cfg.soda2L > 1 ? "s" : ""}
              </p>
              <p className="text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>{soda2LFlavors.join(", ")}</p>
            </div>
          )}

          {cfg.wings > 0 && (
            <div className="px-3 py-2.5">
              <p className="text-xs font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                {cfg.wings}pc Wings
              </p>
              <p className="text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>
                {wingsHalfAndHalf ? `Half & Half: ${wingsHalf1} / ${wingsHalf2}` : wingsSauce}
              </p>
            </div>
          )}

          {cfg.fingers > 0 && (
            <div className="px-3 py-2.5">
              <p className="text-xs font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                {cfg.fingers}pc Chicken Fingers
              </p>
              <p className="text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>
                {fingersHalfAndHalf ? `Half & Half: ${fingersHalf1} / ${fingersHalf2}` : fingersSauce}
              </p>
            </div>
          )}

          {saladChoice && (
            <div className="px-3 py-2.5">
              <p className="text-xs font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                Salad
              </p>
              <p className="text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>{saladChoice}</p>
            </div>
          )}

          {cfg.extras.length > 0 && (
            <div className="px-3 py-2.5">
              <p className="text-xs font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                Included
              </p>
              <p className="text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>{cfg.extras.join(", ")}</p>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
            Total
          </span>
          <span className="text-lg font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
            ${grandTotal.toFixed(2)}
            {totalExtraCost > 0 && (
              <span className="text-xs font-normal ml-1" style={{ color: "oklch(0.55 0.03 30)" }}>
                (incl. +${totalExtraCost.toFixed(2)} extras)
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  function renderSaladChoiceStep() {
    if (!cfg.saladChoice) return null;
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
          Choose your salad:
        </p>
        <div className="grid grid-cols-1 gap-2">
          {cfg.saladChoice.map((s) => (
            <OptionCard key={s} selected={saladChoice === s} onClick={() => setSaladChoice(s)}>
              <span className="text-lg">🥗</span>
              <span className="text-sm font-bold" style={{ color: "oklch(0.28 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>{s}</span>
            </OptionCard>
          ))}
        </div>
      </div>
    );
  }

  function renderStep() {
    if (!currentDesc) return null;
    if (currentDesc.type === "pizza-specialty") return renderPizzaSpecialtyStep(currentDesc.pizzaIdx);
    if (currentDesc.type === "pizza-crust") return renderPizzaCrustStep(currentDesc.pizzaIdx);
    if (currentDesc.type === "pizza-cut") return renderPizzaCutStep(currentDesc.pizzaIdx);
    if (currentDesc.type === "pizza-toppings") return renderPizzaToppingsStep(currentDesc.pizzaIdx);
    if (currentDesc.type === "soda2l") return renderSoda2LStep();
    if (currentDesc.type === "sodacan") return renderSodaCanStep();
    if (currentDesc.type === "wings") return renderWingsStep();
    if (currentDesc.type === "fingers") return renderFingersStep();
    if (currentDesc.type === "salad") return renderSaladChoiceStep();
    if (currentDesc.type === "review") return renderReviewStep();
    return null;
  }

  const isLastStep = step === totalSteps - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "oklch(0.10 0.02 30 / 0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{
          background: "white",
          maxHeight: "92vh",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-start justify-between gap-3 rounded-t-2xl sm:rounded-t-2xl"
          style={{ background: "var(--napoli-red)" }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "var(--napoli-green)", color: "white" }}
              >
                {cfg.num}
              </span>
              <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {cfg.name}
              </p>
            </div>
            <p className="text-white/80 text-xs" style={{ fontFamily: "'Lato', sans-serif" }}>
              ${cfg.price.toFixed(2)} base
              {totalExtraCost > 0 ? (
                <span className="text-white/90 font-semibold"> + ${totalExtraCost.toFixed(2)} extras = <span style={{ color: 'oklch(0.95 0.12 80)' }}>${grandTotal.toFixed(2)}</span></span>
              ) : (
                <span className="text-white/60"> — no extras yet</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all hover:bg-white/20"
            style={{ color: "white" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-5 py-3 border-b flex items-center gap-1.5 overflow-x-auto" style={{ borderColor: "oklch(0.90 0.015 80)" }}>
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              <StepDot active={i === step} done={i < step} num={i + 1} />
              <span
                className="text-xs hidden sm:block"
                style={{
                  color: i === step ? "var(--napoli-red)" : i < step ? "var(--napoli-green)" : "oklch(0.65 0.02 30)",
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: i === step ? 700 : 400,
                }}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <ChevronRight size={12} style={{ color: "oklch(0.75 0.015 80)" }} className="shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Current step label (mobile) */}
        <div className="px-5 pt-3 pb-1 sm:hidden">
          <p className="text-sm font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
            Step {step + 1} of {totalSteps}: {steps[step]}
          </p>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div
          className="px-5 py-4 border-t flex items-center gap-3"
          style={{ borderColor: "oklch(0.90 0.015 80)" }}
        >
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all hover:bg-gray-50 active:scale-[0.97]"
              style={{
                borderColor: "oklch(0.82 0.015 80)",
                color: "oklch(0.42 0.03 30)",
                fontFamily: "'Oswald', sans-serif",
              }}
            >
              <ChevronLeft size={15} /> Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex-1" />

          {isLastStep ? (
            <button
              onClick={handleAddToCart}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90 active:scale-[0.97]"
              style={{
                background: "var(--napoli-green)",
                color: "white",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              <ShoppingCart size={15} />
              Add to Cart — ${grandTotal.toFixed(2)}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--napoli-red)",
                color: "white",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              Next <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
