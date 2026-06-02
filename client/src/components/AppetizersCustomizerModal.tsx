/**
 * AppetizersCustomizerModal — Unified interactive customizer for all Appetizer items
 * Each item has its own add-on options based on the menu description.
 * Follows the same design language as GarlicBreadModal.
 */
import { useState } from "react";
import { X, ChevronRight, Check, Plus, Minus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { getMenuPhoto } from "@/lib/napoliPhotos";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AppetizersModalTrigger {
  itemName: string;
  cloverItemId?: string;
}

interface AddOn {
  id: string;
  label: string;
  sublabel?: string;
  price: number;
  emoji?: string;
}

// ── Per-item configuration ────────────────────────────────────────────────────
interface ItemConfig {
  name: string;
  basePrice: number;
  description?: string;
  addOns: AddOn[];
  /** For multi-size items, show size selector instead of a flat price */
  sizes?: { label: string; price: number }[];
}

const ITEM_CONFIGS: ItemConfig[] = [
  {
    name: "Napoli's Combo Platter",
    basePrice: 14.49,
    description: "Deep Fried: Onion Rings, Zucchini Sticks, Breaded Mushrooms, Mozzarella Sticks & Jalapeño Peppers",
    addOns: [
      { id: "extra-ranch", label: "Extra Ranch", sublabel: "Additional dipping cup", price: 0.75, emoji: "🥣" },
      { id: "extra-marinara", label: "Extra Marinara", sublabel: "Additional dipping cup", price: 0.75, emoji: "🍅" },
    ],
  },
  {
    name: "French Fries",
    basePrice: 3.49,
    description: "Golden crispy fries",
    sizes: [
      { label: "Small", price: 3.49 },
      { label: "Medium", price: 4.49 },
      { label: "Large", price: 6.49 },
    ],
    addOns: [
      { id: "cheese", label: "Add Cheese", sublabel: "Melted cheddar on top", price: 2.0, emoji: "🧀" },
      { id: "garlic", label: "Add Garlic Butter", sublabel: "Tossed in garlic butter", price: 1.0, emoji: "🧄" },
    ],
  },
  {
    name: "Bread Sticks (12)",
    basePrice: 7.49,
    description: "12 freshly baked bread sticks",
    addOns: [
      { id: "cheese", label: "Add Cheese", sublabel: "Melted mozzarella on top", price: 3.0, emoji: "🧀" },
      { id: "extra-marinara", label: "Extra Marinara", sublabel: "Additional dipping cup", price: 0.75, emoji: "🍅" },
    ],
  },
  {
    name: "Curly Fries",
    basePrice: 3.49,
    description: "Seasoned crispy curly fries",
    addOns: [
      { id: "cheese-garlic", label: "Add Cheese & Garlic", sublabel: "Melted cheese + garlic butter", price: 3.0, emoji: "🧀" },
      { id: "cheese-only", label: "Add Cheese Only", sublabel: "Melted cheddar on top", price: 2.0, emoji: "🧀" },
    ],
  },
  {
    name: "Garlic Balls w/ Cheese (20)",
    basePrice: 3.49,
    description: "20 golden garlic dough balls stuffed with mozzarella",
    addOns: [
      { id: "extra-marinara", label: "Extra Marinara", sublabel: "Additional dipping cup", price: 0.75, emoji: "🍅" },
      { id: "extra-ranch", label: "Extra Ranch", sublabel: "Additional dipping cup", price: 0.75, emoji: "🥣" },
    ],
  },
  {
    name: "Breaded Mushrooms (12)",
    basePrice: 10.49,
    description: "12 crispy breaded mushrooms",
    addOns: [
      { id: "extra-ranch", label: "Extra Ranch", sublabel: "Additional dipping cup", price: 0.75, emoji: "🥣" },
      { id: "extra-marinara", label: "Extra Marinara", sublabel: "Additional dipping cup", price: 0.75, emoji: "🍅" },
    ],
  },
  {
    name: "Fried Ravioli (8)",
    basePrice: 10.49,
    description: "8 crispy golden fried ravioli",
    addOns: [
      { id: "extra-marinara", label: "Extra Marinara", sublabel: "Additional dipping cup", price: 0.75, emoji: "🍅" },
      { id: "extra-ranch", label: "Extra Ranch", sublabel: "Additional dipping cup", price: 0.75, emoji: "🥣" },
    ],
  },
  {
    name: "Zucchini Sticks (12)",
    basePrice: 10.49,
    description: "12 crispy breaded zucchini sticks",
    addOns: [
      { id: "extra-ranch", label: "Extra Ranch", sublabel: "Additional dipping cup", price: 0.75, emoji: "🥣" },
      { id: "extra-marinara", label: "Extra Marinara", sublabel: "Additional dipping cup", price: 0.75, emoji: "🍅" },
    ],
  },
  {
    name: "Jalapeño Poppers (6)",
    basePrice: 10.49,
    description: "6 crispy jalapeño poppers with cream cheese filling",
    addOns: [
      { id: "extra-ranch", label: "Extra Ranch", sublabel: "Additional dipping cup", price: 0.75, emoji: "🥣" },
      { id: "extra-marinara", label: "Extra Marinara", sublabel: "Additional dipping cup", price: 0.75, emoji: "🍅" },
    ],
  },
  {
    name: "Cheese Quesadilla",
    basePrice: 10.49,
    description: "Golden crispy quesadilla with melted cheese",
    addOns: [
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken inside", price: 2.0, emoji: "🍗" },
      { id: "extra-sour-cream", label: "Extra Sour Cream", sublabel: "Additional cup", price: 0.75, emoji: "🥣" },
      { id: "extra-salsa", label: "Extra Salsa", sublabel: "Additional cup", price: 0.75, emoji: "🍅" },
    ],
  },
  {
    name: "Chili Cheese Fries",
    basePrice: 10.49,
    description: "Crispy fries topped with beef chili and melted cheddar",
    addOns: [
      { id: "extra-chili", label: "Extra Chili", sublabel: "More hearty beef chili", price: 1.5, emoji: "🌶️" },
      { id: "extra-cheese", label: "Extra Cheese", sublabel: "More melted cheddar", price: 1.0, emoji: "🧀" },
      { id: "sour-cream", label: "Add Sour Cream", sublabel: "Cool & creamy topping", price: 0.75, emoji: "🥣" },
    ],
  },
  {
    name: "Bruschetta",
    basePrice: 12.49,
    description: "Toasted bread topped with fresh tomatoes, basil, garlic & olive oil",
    addOns: [
      { id: "extra-portion", label: "Extra Portion", sublabel: "Additional serving", price: 4.0, emoji: "🍞" },
      { id: "balsamic", label: "Add Balsamic Glaze", sublabel: "Sweet balsamic drizzle", price: 1.0, emoji: "🫙" },
    ],
  },
  {
    name: "Curly Fries W/ Bacon",
    basePrice: 12.49,
    description: "Seasoned curly fries topped with crispy bacon bits",
    addOns: [
      { id: "cheese", label: "Add Cheese", sublabel: "Melted cheddar on top", price: 2.0, emoji: "🧀" },
      { id: "extra-bacon", label: "Extra Bacon", sublabel: "More crispy bacon bits", price: 1.5, emoji: "🥓" },
    ],
  },
  {
    name: "Onion Rings",
    basePrice: 9.49,
    description: "Golden crispy breaded onion rings",
    addOns: [
      { id: "extra-ranch", label: "Extra Ranch", sublabel: "Additional dipping cup", price: 0.75, emoji: "🥣" },
      { id: "extra-marinara", label: "Extra Marinara", sublabel: "Additional dipping cup", price: 0.75, emoji: "🍅" },
    ],
  },
];

// ── Helper ────────────────────────────────────────────────────────────────────
function getConfig(name: string): ItemConfig | undefined {
  return ITEM_CONFIGS.find((c) => c.name === name);
}

// ── Checkbox toggle row ───────────────────────────────────────────────────────
function AddOnRow({
  addOn,
  checked,
  onToggle,
}: {
  addOn: AddOn;
  checked: boolean;
  onToggle: () => void;
}) {
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
          <p className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>
            {addOn.label}
          </p>
          {addOn.sublabel && (
            <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>
              {addOn.sublabel}
            </p>
          )}
        </div>
      </div>
      <span
        className="napoli-price text-sm shrink-0 px-2 py-1 rounded-lg"
        style={{
          background: checked ? "var(--napoli-red)" : "oklch(0.94 0.012 80)",
          color: checked ? "white" : "var(--napoli-red)",
        }}
      >
        +${addOn.price.toFixed(2)}
      </span>
    </button>
  );
}

// ── Size selector ─────────────────────────────────────────────────────────────
function SizeSelector({
  sizes,
  selected,
  onSelect,
}: {
  sizes: { label: string; price: number }[];
  selected: number;
  onSelect: (idx: number) => void;
}) {
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
          <span
            className="napoli-label text-xs font-bold tracking-wide"
            style={{ color: selected === i ? "var(--napoli-red)" : "var(--napoli-dark)" }}
          >
            {s.label}
          </span>
          <span
            className="napoli-price text-sm"
            style={{ color: selected === i ? "var(--napoli-red)" : "oklch(0.52 0.03 30)" }}
          >
            ${s.price.toFixed(2)}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Quantity selector ─────────────────────────────────────────────────────────
function QuantitySelector({
  qty,
  onInc,
  onDec,
}: {
  qty: number;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onDec}
        disabled={qty <= 1}
        className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all active:scale-90 disabled:opacity-40"
        style={{ borderColor: "oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }}
      >
        <Minus size={14} />
      </button>
      <span className="napoli-heading text-base w-5 text-center" style={{ color: "var(--napoli-dark)" }}>
        {qty}
      </span>
      <button
        onClick={onInc}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{ background: "var(--napoli-red)", color: "white" }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

// ── Inner modal (all hooks here) ──────────────────────────────────────────────
function AppetizersModalInner({
  config,
  onClose,
  cloverItemId,
}: {
  config: ItemConfig;
  onClose: () => void;
  cloverItemId?: string;
}) {
  const { addItem, openCart } = useCart();
  const [checkedAddOns, setCheckedAddOns] = useState<Set<string>>(new Set());
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(0);
  const [qty, setQty] = useState(1);

  const photo = getMenuPhoto(config.name);

  const basePrice = config.sizes
    ? config.sizes[selectedSizeIdx].price
    : config.basePrice;

  const addOnsTotal = config.addOns
    .filter((a) => checkedAddOns.has(a.id))
    .reduce((sum, a) => sum + a.price, 0);

  const unitPrice = basePrice + addOnsTotal;
  const totalPrice = unitPrice * qty;

  const toggleAddOn = (id: string) => {
    setCheckedAddOns((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddToCart = () => {
    const selectedAddOns = config.addOns.filter((a) => checkedAddOns.has(a.id));
    const sizeLabel = config.sizes ? ` (${config.sizes[selectedSizeIdx].label})` : "";
    const addOnDesc = selectedAddOns.map((a) => a.label).join(", ");

    addItem({
      id: `${config.name}-${Date.now()}`,
      name: `${config.name}${sizeLabel}`,
      price: unitPrice,
      quantity: qty,
      category: "appetizers",
      description: addOnDesc || undefined,
      cloverItemId,
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
        <div
          className="relative flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: "var(--napoli-red)" }}
        >
          <div>
            <p className="napoli-label text-xs text-white/70 tracking-widest uppercase">Appetizers</p>
            <h2 className="napoli-heading text-lg text-white leading-tight">{config.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0"
            style={{ background: "oklch(1 0 0 / 0.18)", color: "white" }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Food photo */}
        {photo && (
          <div className="relative overflow-hidden shrink-0" style={{ height: 160 }}>
            <img
              src={photo}
              alt={config.name}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, oklch(0.14 0.03 27 / 0.5) 0%, transparent 55%)" }}
            />
            {config.description && (
              <p
                className="absolute bottom-2 left-4 right-4 text-xs napoli-body"
                style={{ color: "white", textShadow: "0 1px 3px oklch(0 0 0 / 0.7)" }}
              >
                {config.description}
              </p>
            )}
          </div>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Size selector */}
          {config.sizes && (
            <div>
              <p className="napoli-label text-xs tracking-widest uppercase mb-2" style={{ color: "oklch(0.52 0.03 30)" }}>
                Choose Size
              </p>
              <SizeSelector
                sizes={config.sizes}
                selected={selectedSizeIdx}
                onSelect={setSelectedSizeIdx}
              />
            </div>
          )}

          {/* Add-ons */}
          {config.addOns.length > 0 && (
            <div>
              <p className="napoli-label text-xs tracking-widest uppercase mb-2" style={{ color: "oklch(0.52 0.03 30)" }}>
                Customize Your Order
              </p>
              <div className="space-y-2">
                {config.addOns.map((addOn) => (
                  <AddOnRow
                    key={addOn.id}
                    addOn={addOn}
                    checked={checkedAddOns.has(addOn.id)}
                    onToggle={() => toggleAddOn(addOn.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 pb-6 pt-3 flex items-center gap-3 shrink-0"
          style={{ borderTop: "1px solid oklch(0.93 0.012 80)" }}
        >
          {/* Quantity */}
          <QuantitySelector
            qty={qty}
            onInc={() => setQty((q) => q + 1)}
            onDec={() => setQty((q) => Math.max(1, q - 1))}
          />

          <div className="flex-1 text-right">
            <p className="text-xs napoli-body" style={{ color: "oklch(0.62 0.03 30)" }}>Total</p>
            <p className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>
              ${totalPrice.toFixed(2)}
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm napoli-label tracking-wide transition-all active:scale-95 hover:opacity-90 shrink-0"
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

// ── Wrapper (safe early return) ───────────────────────────────────────────────
export default function AppetizersCustomizerModal({
  trigger,
  onClose,
}: {
  trigger: AppetizersModalTrigger | null;
  onClose: () => void;
}) {
  if (!trigger) return null;
  const config = getConfig(trigger.itemName);
  if (!config) return null;
  return <AppetizersModalInner config={config} onClose={onClose} cloverItemId={trigger.cloverItemId} />;
}

/** Convenience export: list of all item names that have a config */
export const APPETIZER_MODAL_ITEMS = ITEM_CONFIGS.map((c) => c.name);
