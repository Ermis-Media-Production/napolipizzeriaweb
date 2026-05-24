/**
 * SaladsCustomizerModal — Interactive customizer for all Salad items
 * Dressing selection (required for applicable items) + protein/topping add-ons
 */
import { useState } from "react";
import { X, ChevronRight, Check, Plus, Minus, ChevronDown } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { getMenuPhoto } from "@/lib/napoliPhotos";
import { toast } from "sonner";

export interface SaladsModalTrigger {
  itemName: string;
}

// ── Dressings ────────────────────────────────────────────────────────────────
const DRESSINGS = [
  "Italian", "Fat Free Italian", "Ranch", "Bleu Cheese",
  "1000 Island", "Honey Mustard", "Caesar", "French",
  "Oil & Balsamic Vinegar", "Vinaigrette",
];

// ── Add-on types ─────────────────────────────────────────────────────────────
interface AddOn {
  id: string;
  label: string;
  sublabel?: string;
  price: number;
  emoji?: string;
}

interface ItemConfig {
  name: string;
  basePrice: number;
  description?: string;
  hasDressing: boolean;
  sizes?: { label: string; price: number }[];
  addOns: AddOn[];
}

// ── Per-item config ───────────────────────────────────────────────────────────
const SALAD_CONFIGS: ItemConfig[] = [
  {
    name: "Dinner Side Salad",
    basePrice: 6.49,
    description: "Fresh garden salad with your choice of dressing",
    hasDressing: true,
    sizes: [
      { label: "Small", price: 6.49 },
      { label: "Medium", price: 9.49 },
      { label: "Large", price: 13.49 },
    ],
    addOns: [
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken breast", price: 3.0, emoji: "🍗" },
      { id: "shrimp", label: "Add Shrimp", sublabel: "Seasoned grilled shrimp", price: 4.0, emoji: "🍤" },
      { id: "croutons", label: "Extra Croutons", sublabel: "Crispy seasoned croutons", price: 0.75, emoji: "🍞" },
    ],
  },
  {
    name: "Antipasto Salad",
    basePrice: 10.49,
    description: "2 Types of Olives, Tomatoes, Cucumbers, Onions, Feta & Tzatziki",
    hasDressing: true,
    sizes: [
      { label: "Small", price: 10.49 },
      { label: "Medium", price: 13.49 },
      { label: "Large", price: 13.49 },
    ],
    addOns: [
      { id: "extra-feta", label: "Extra Feta Cheese", sublabel: "More crumbled feta", price: 1.5, emoji: "🧀" },
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken breast", price: 3.0, emoji: "🍗" },
    ],
  },
  {
    name: "Egg's Chef Salad",
    basePrice: 13.49,
    description: "Classic chef salad with eggs, ham, turkey & cheese",
    hasDressing: true,
    addOns: [
      { id: "extra-egg", label: "Extra Hard Boiled Egg", sublabel: "Additional sliced egg", price: 1.0, emoji: "🥚" },
      { id: "avocado", label: "Add Avocado", sublabel: "Fresh sliced avocado", price: 2.0, emoji: "🥑" },
    ],
  },
  {
    name: "Blackened Chicken Salad",
    basePrice: 13.49,
    description: "Cajun-blackened chicken over fresh greens",
    hasDressing: true,
    addOns: [
      { id: "extra-chicken", label: "Extra Chicken", sublabel: "More blackened chicken", price: 3.0, emoji: "🍗" },
      { id: "avocado", label: "Add Avocado", sublabel: "Fresh sliced avocado", price: 2.0, emoji: "🥑" },
      { id: "extra-cheese", label: "Add Cheese", sublabel: "Shredded cheddar", price: 1.5, emoji: "🧀" },
    ],
  },
  {
    name: "Buffalo Crispy Chicken Salad",
    basePrice: 13.49,
    description: "Crispy chicken tossed in buffalo sauce over fresh greens",
    hasDressing: true,
    addOns: [
      { id: "extra-hot", label: "Extra Buffalo Sauce", sublabel: "More spicy buffalo", price: 0.75, emoji: "🌶️" },
      { id: "bleu-cheese", label: "Add Bleu Cheese Crumbles", sublabel: "Tangy bleu cheese", price: 1.5, emoji: "🧀" },
      { id: "avocado", label: "Add Avocado", sublabel: "Fresh sliced avocado", price: 2.0, emoji: "🥑" },
    ],
  },
  {
    name: "Crispy Chicken Salad",
    basePrice: 13.49,
    description: "Golden crispy chicken over fresh greens",
    hasDressing: true,
    addOns: [
      { id: "extra-chicken", label: "Extra Crispy Chicken", sublabel: "Additional piece", price: 3.0, emoji: "🍗" },
      { id: "avocado", label: "Add Avocado", sublabel: "Fresh sliced avocado", price: 2.0, emoji: "🥑" },
      { id: "cheese", label: "Add Cheese", sublabel: "Shredded cheddar", price: 1.5, emoji: "🧀" },
    ],
  },
  {
    name: "Chicken Caesar Salad",
    basePrice: 13.49,
    description: "Romaine lettuce, grilled chicken, parmesan & croutons",
    hasDressing: false,
    addOns: [
      { id: "extra-chicken", label: "Extra Chicken", sublabel: "More grilled chicken", price: 3.0, emoji: "🍗" },
      { id: "anchovies", label: "Add Anchovies", sublabel: "Classic Caesar topping", price: 1.5, emoji: "🐟" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "More shaved parmesan", price: 1.0, emoji: "🧀" },
    ],
  },
  {
    name: "Mediterranean Salad",
    basePrice: 13.49,
    description: "Fresh Mediterranean-style salad with olives, feta & herbs",
    hasDressing: true,
    addOns: [
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken", price: 3.0, emoji: "🍗" },
      { id: "shrimp", label: "Add Shrimp", sublabel: "Seasoned grilled shrimp", price: 4.0, emoji: "🍤" },
      { id: "extra-feta", label: "Extra Feta", sublabel: "More crumbled feta", price: 1.5, emoji: "🧀" },
    ],
  },
  {
    name: "Greek Salad",
    basePrice: 13.49,
    description: "Olives, Feta & Tzatziki",
    hasDressing: true,
    addOns: [
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken", price: 3.0, emoji: "🍗" },
      { id: "extra-feta", label: "Extra Feta", sublabel: "More crumbled feta", price: 1.5, emoji: "🧀" },
      { id: "extra-tzatziki", label: "Extra Tzatziki", sublabel: "More creamy tzatziki", price: 1.0, emoji: "🥣" },
    ],
  },
  {
    name: "Napoli Italian Chopped Salad",
    basePrice: 15.49,
    description: "Signature Italian chopped salad with house dressing",
    hasDressing: true,
    addOns: [
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken", price: 3.0, emoji: "🍗" },
      { id: "shrimp", label: "Add Shrimp", sublabel: "Seasoned grilled shrimp", price: 4.0, emoji: "🍤" },
      { id: "avocado", label: "Add Avocado", sublabel: "Fresh sliced avocado", price: 2.0, emoji: "🥑" },
    ],
  },
  {
    name: "Gyro Salad",
    basePrice: 15.49,
    description: "2 Types of Olives, Tomatoes, Cucumbers, Onions, Feta & Tzatziki",
    hasDressing: true,
    addOns: [
      { id: "extra-gyro", label: "Extra Gyro Meat", sublabel: "More seasoned gyro", price: 3.0, emoji: "🥙" },
      { id: "extra-tzatziki", label: "Extra Tzatziki", sublabel: "More creamy tzatziki", price: 1.0, emoji: "🥣" },
      { id: "extra-feta", label: "Extra Feta", sublabel: "More crumbled feta", price: 1.5, emoji: "🧀" },
    ],
  },
  {
    name: "Spinach Salad",
    basePrice: 14.49,
    description: "Baby Spinach, Boiled Eggs, Bacon, Tomato & Bacon Dressing",
    hasDressing: false,
    addOns: [
      { id: "extra-bacon", label: "Extra Bacon", sublabel: "More crispy bacon", price: 1.5, emoji: "🥓" },
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken", price: 3.0, emoji: "🍗" },
      { id: "extra-egg", label: "Extra Boiled Egg", sublabel: "Additional sliced egg", price: 1.0, emoji: "🥚" },
    ],
  },
  {
    name: "Caesar Salad",
    basePrice: 9.49,
    description: "Romaine, parmesan & croutons with Caesar dressing",
    hasDressing: false,
    sizes: [
      { label: "Small", price: 9.49 },
      { label: "Large", price: 13.49 },
    ],
    addOns: [
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken", price: 3.0, emoji: "🍗" },
      { id: "anchovies", label: "Add Anchovies", sublabel: "Classic Caesar topping", price: 1.5, emoji: "🐟" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "More shaved parmesan", price: 1.0, emoji: "🧀" },
    ],
  },
  {
    name: "Steak Salad (Sirloin Beef Flap)",
    basePrice: 16.49,
    description: "Lettuce with Marinated Strips, Red Onion, Tomatoes, Pepperoncini & Feta Cheese",
    hasDressing: true,
    addOns: [
      { id: "extra-steak", label: "Extra Steak", sublabel: "More marinated sirloin strips", price: 4.0, emoji: "🥩" },
      { id: "avocado", label: "Add Avocado", sublabel: "Fresh sliced avocado", price: 2.0, emoji: "🥑" },
      { id: "extra-feta", label: "Extra Feta", sublabel: "More crumbled feta", price: 1.5, emoji: "🧀" },
    ],
  },
];

function getConfig(name: string): ItemConfig | undefined {
  return SALAD_CONFIGS.find((c) => c.name === name);
}

// ── Dressing dropdown ─────────────────────────────────────────────────────────
function DressingSelector({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (d: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all"
        style={{
          borderColor: selected ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
          background: selected ? "oklch(0.98 0.015 25)" : "oklch(0.99 0.008 80)",
        }}
      >
        <span className="napoli-body text-sm font-bold" style={{ color: selected ? "var(--napoli-dark)" : "oklch(0.62 0.03 30)" }}>
          {selected || "Choose your dressing…"}
        </span>
        <ChevronDown size={16} style={{ color: "var(--napoli-red)", transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
      </button>
      {open && (
        <div
          className="absolute z-10 left-0 right-0 mt-1 rounded-xl shadow-lg overflow-hidden"
          style={{ background: "white", border: "1px solid oklch(0.88 0.015 80)" }}
        >
          <div className="max-h-48 overflow-y-auto">
            {DRESSINGS.map((d) => (
              <button
                key={d}
                onClick={() => { onSelect(d); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm napoli-body flex items-center gap-2 transition-colors hover:bg-red-50"
                style={{ color: "var(--napoli-dark)" }}
              >
                {selected === d && <Check size={14} style={{ color: "var(--napoli-red)" }} />}
                {selected !== d && <span className="w-3.5" />}
                {d}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add-on row ────────────────────────────────────────────────────────────────
function AddOnRow({ addOn, checked, onToggle }: { addOn: AddOn; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98]"
      style={{
        borderColor: checked ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
        background: checked ? "oklch(0.98 0.015 25)" : "oklch(0.99 0.008 80)",
      }}
    >
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all"
        style={{
          background: checked ? "var(--napoli-red)" : "white",
          border: checked ? "2px solid var(--napoli-red)" : "2px solid oklch(0.80 0.015 80)",
        }}
      >
        {checked && <Check size={14} color="white" strokeWidth={3} />}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
        {addOn.emoji && <span className="text-xl">{addOn.emoji}</span>}
        <div>
          <p className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{addOn.label}</p>
          {addOn.sublabel && (
            <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{addOn.sublabel}</p>
          )}
        </div>
      </div>
      <span
        className="napoli-price text-sm shrink-0 px-2 py-1 rounded-lg"
        style={{ background: checked ? "var(--napoli-red)" : "oklch(0.94 0.012 80)", color: checked ? "white" : "var(--napoli-red)" }}
      >
        +${addOn.price.toFixed(2)}
      </span>
    </button>
  );
}

// ── Size selector ─────────────────────────────────────────────────────────────
function SizeSelector({ sizes, selected, onSelect }: { sizes: { label: string; price: number }[]; selected: number; onSelect: (i: number) => void }) {
  return (
    <div className="flex gap-2">
      {sizes.map((s, i) => (
        <button
          key={s.label}
          onClick={() => onSelect(i)}
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl border-2 transition-all active:scale-95"
          style={{
            borderColor: selected === i ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
            background: selected === i ? "oklch(0.98 0.015 25)" : "oklch(0.99 0.008 80)",
          }}
        >
          <span className="napoli-label text-xs font-bold tracking-wide" style={{ color: selected === i ? "var(--napoli-red)" : "var(--napoli-dark)" }}>{s.label}</span>
          <span className="napoli-price text-sm" style={{ color: selected === i ? "var(--napoli-red)" : "oklch(0.52 0.03 30)" }}>${s.price.toFixed(2)}</span>
        </button>
      ))}
    </div>
  );
}

// ── Inner modal ───────────────────────────────────────────────────────────────
function SaladsModalInner({ config, onClose }: { config: ItemConfig; onClose: () => void }) {
  const { addItem, openCart } = useCart();
  const [dressing, setDressing] = useState("");
  const [checkedAddOns, setCheckedAddOns] = useState<Set<string>>(new Set());
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(0);
  const [qty, setQty] = useState(1);

  const photo = getMenuPhoto(config.name);
  const basePrice = config.sizes ? config.sizes[selectedSizeIdx].price : config.basePrice;
  const addOnsTotal = config.addOns.filter((a) => checkedAddOns.has(a.id)).reduce((s, a) => s + a.price, 0);
  const unitPrice = basePrice + addOnsTotal;
  const totalPrice = unitPrice * qty;

  const toggleAddOn = (id: string) => {
    setCheckedAddOns((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const canAdd = !config.hasDressing || dressing !== "";

  const handleAddToCart = () => {
    if (!canAdd) return;
    const selectedAddOns = config.addOns.filter((a) => checkedAddOns.has(a.id));
    const sizeLabel = config.sizes ? ` (${config.sizes[selectedSizeIdx].label})` : "";
    const dressingNote = dressing ? `Dressing: ${dressing}` : "";
    const addOnDesc = [dressingNote, ...selectedAddOns.map((a) => a.label)].filter(Boolean).join(" · ");

    addItem({
      id: `${config.name}-${Date.now()}`,
      name: `${config.name}${sizeLabel}`,
      price: unitPrice,
      quantity: qty,
      category: "salads",
      description: addOnDesc || undefined,
    });

    toast.success(`${config.name}${sizeLabel} added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "oklch(0.06 0.02 27 / 0.72)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: "white", maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between px-5 py-4 shrink-0" style={{ background: "var(--napoli-red)" }}>
          <div>
            <p className="napoli-label text-xs text-white/70 tracking-widest uppercase">Salads</p>
            <h2 className="napoli-heading text-lg text-white leading-tight">{config.name}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0" style={{ background: "oklch(1 0 0 / 0.18)", color: "white" }} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Photo */}
        {photo && (
          <div className="relative overflow-hidden shrink-0" style={{ height: 150 }}>
            <img src={photo} alt={config.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, oklch(0.14 0.03 27 / 0.5) 0%, transparent 55%)" }} />
            {config.description && (
              <p className="absolute bottom-2 left-4 right-4 text-xs napoli-body" style={{ color: "white", textShadow: "0 1px 3px oklch(0 0 0 / 0.7)" }}>{config.description}</p>
            )}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {config.sizes && (
            <div>
              <p className="napoli-label text-xs tracking-widest uppercase mb-2" style={{ color: "oklch(0.52 0.03 30)" }}>Choose Size</p>
              <SizeSelector sizes={config.sizes} selected={selectedSizeIdx} onSelect={setSelectedSizeIdx} />
            </div>
          )}

          {config.hasDressing && (
            <div>
              <p className="napoli-label text-xs tracking-widest uppercase mb-2 flex items-center gap-1" style={{ color: "oklch(0.52 0.03 30)" }}>
                Choose Dressing <span className="text-red-500">*</span>
              </p>
              <DressingSelector selected={dressing} onSelect={setDressing} />
              {!dressing && (
                <p className="text-xs mt-1 napoli-body" style={{ color: "oklch(0.62 0.03 30)" }}>Required — please select a dressing</p>
              )}
            </div>
          )}

          {config.addOns.length > 0 && (
            <div>
              <p className="napoli-label text-xs tracking-widest uppercase mb-2" style={{ color: "oklch(0.52 0.03 30)" }}>Customize Your Order</p>
              <div className="space-y-2">
                {config.addOns.map((addOn) => (
                  <AddOnRow key={addOn.id} addOn={addOn} checked={checkedAddOns.has(addOn.id)} onToggle={() => toggleAddOn(addOn.id)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 flex items-center gap-3 shrink-0" style={{ borderTop: "1px solid oklch(0.93 0.012 80)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all active:scale-90 disabled:opacity-40" style={{ borderColor: "oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }}>
              <Minus size={14} />
            </button>
            <span className="napoli-heading text-base w-5 text-center" style={{ color: "var(--napoli-dark)" }}>{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90" style={{ background: "var(--napoli-red)", color: "white" }}>
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs napoli-body" style={{ color: "oklch(0.62 0.03 30)" }}>Total</p>
            <p className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>${totalPrice.toFixed(2)}</p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!canAdd}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm napoli-label tracking-wide transition-all active:scale-95 hover:opacity-90 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--napoli-red)", color: "white" }}
          >
            Add to Cart
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Wrapper ───────────────────────────────────────────────────────────────────
export default function SaladsCustomizerModal({ trigger, onClose }: { trigger: SaladsModalTrigger | null; onClose: () => void }) {
  if (!trigger) return null;
  const config = getConfig(trigger.itemName);
  if (!config) return null;
  return <SaladsModalInner config={config} onClose={onClose} />;
}

export const SALAD_MODAL_ITEMS = SALAD_CONFIGS.map((c) => c.name);
