/**
 * PastaCustomizerModal — Interactive customizer for all Pasta items
 * Sauce selection + protein/topping add-ons + garlic bread option
 */
import { useState } from "react";
import { X, ChevronRight, Check, Plus, Minus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { getMenuPhoto } from "@/lib/napoliPhotos";
import { toast } from "sonner";

export interface PastaModalTrigger {
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

interface ItemConfig {
  name: string;
  basePrice: number;
  description?: string;
  addOns: AddOn[];
}

// ── Per-item config ───────────────────────────────────────────────────────────
const PASTA_CONFIGS: ItemConfig[] = [
  {
    name: "Spaghetti & Meatballs",
    basePrice: 16.49,
    description: "Spaghetti with house marinara and homemade meatballs. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "extra-meatballs", label: "Extra Meatballs", sublabel: "2 additional homemade meatballs", price: 3.0, emoji: "🍝" },
      { id: "extra-sauce", label: "Extra Marinara Sauce", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "Shaved parmesan on top", price: 1.0, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Spaghetti & Sausage",
    basePrice: 16.49,
    description: "Spaghetti with house marinara and Italian sausage. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "extra-sausage", label: "Extra Sausage", sublabel: "Additional Italian sausage", price: 3.0, emoji: "🌭" },
      { id: "extra-sauce", label: "Extra Marinara Sauce", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "Shaved parmesan on top", price: 1.0, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Baked Ziti",
    basePrice: 19.99,
    description: "Ziti baked with marinara and melted mozzarella. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "meatballs", label: "Add Meatballs", sublabel: "2 homemade meatballs", price: 3.0, emoji: "🍝" },
      { id: "sausage", label: "Add Sausage", sublabel: "Italian sausage", price: 3.0, emoji: "🌭" },
      { id: "extra-cheese", label: "Extra Mozzarella", sublabel: "More melted mozzarella", price: 1.5, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Ziti w/ Marinara",
    basePrice: 13.49,
    description: "Ziti pasta with house marinara sauce. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "meatballs", label: "Add Meatballs", sublabel: "2 homemade meatballs", price: 3.0, emoji: "🍝" },
      { id: "sausage", label: "Add Sausage", sublabel: "Italian sausage", price: 3.0, emoji: "🌭" },
      { id: "extra-sauce", label: "Extra Marinara", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Chicken Parmigiana",
    basePrice: 20.49,
    description: "Breaded chicken breast with marinara and mozzarella. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "extra-sauce", label: "Extra Marinara", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "extra-cheese", label: "Extra Mozzarella", sublabel: "More melted mozzarella", price: 1.5, emoji: "🧀" },
      { id: "spaghetti", label: "Add Spaghetti Side", sublabel: "Side of spaghetti with marinara", price: 3.0, emoji: "🍝" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Homemade Shells",
    basePrice: 17.49,
    description: "Homemade pasta shells with ricotta filling. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "extra-sauce", label: "Extra Marinara", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "meatballs", label: "Add Meatballs", sublabel: "2 homemade meatballs", price: 3.0, emoji: "🍝" },
      { id: "extra-ricotta", label: "Extra Ricotta", sublabel: "More creamy ricotta", price: 1.5, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Manicotti w/ Ricotta & Egg",
    basePrice: 17.49,
    description: "Manicotti tubes stuffed with ricotta & egg filling. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "extra-sauce", label: "Extra Marinara", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "extra-ricotta", label: "Extra Ricotta", sublabel: "More creamy ricotta filling", price: 1.5, emoji: "🧀" },
      { id: "meatballs", label: "Add Meatballs", sublabel: "2 homemade meatballs", price: 3.0, emoji: "🍝" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Cannelloni",
    basePrice: 17.49,
    description: "Rolled pasta tubes with meat and ricotta filling. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "extra-sauce", label: "Extra Marinara", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "extra-cheese", label: "Extra Mozzarella", sublabel: "More melted mozzarella", price: 1.5, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Fettuccine Alfredo",
    basePrice: 19.99,
    description: "Fettuccine in creamy Alfredo sauce. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken breast", price: 3.0, emoji: "🍗" },
      { id: "shrimp", label: "Add Shrimp", sublabel: "Seasoned grilled shrimp", price: 4.0, emoji: "🍤" },
      { id: "broccoli", label: "Add Broccoli", sublabel: "Steamed broccoli florets", price: 1.5, emoji: "🥦" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "Shaved parmesan on top", price: 1.0, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Chicken Fettuccine Alfredo",
    basePrice: 22.99,
    description: "Fettuccine Alfredo with grilled chicken. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "shrimp", label: "Add Shrimp", sublabel: "Seasoned grilled shrimp", price: 4.0, emoji: "🍤" },
      { id: "broccoli", label: "Add Broccoli", sublabel: "Steamed broccoli florets", price: 1.5, emoji: "🥦" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "Shaved parmesan on top", price: 1.0, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Shrimp & Chicken Fettuccine Alfredo",
    basePrice: 24.99,
    description: "Fettuccine Alfredo with shrimp and grilled chicken. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "extra-shrimp", label: "Extra Shrimp", sublabel: "More seasoned shrimp", price: 4.0, emoji: "🍤" },
      { id: "broccoli", label: "Add Broccoli", sublabel: "Steamed broccoli florets", price: 1.5, emoji: "🥦" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "Shaved parmesan on top", price: 1.0, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Stuffed Shells w/ Ricotta",
    basePrice: 17.49,
    description: "Large pasta shells stuffed with creamy ricotta. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "extra-sauce", label: "Extra Marinara", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "extra-ricotta", label: "Extra Ricotta", sublabel: "More creamy ricotta", price: 1.5, emoji: "🧀" },
      { id: "meatballs", label: "Add Meatballs", sublabel: "2 homemade meatballs", price: 3.0, emoji: "🍝" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Creamy Butter Ravioli",
    basePrice: 16.49,
    description: "Ravioli in a rich creamy butter sauce. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken", price: 3.0, emoji: "🍗" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "Shaved parmesan on top", price: 1.0, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Marinara Ravioli",
    basePrice: 16.49,
    description: "Ravioli in house marinara sauce. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "meatballs", label: "Add Meatballs", sublabel: "2 homemade meatballs", price: 3.0, emoji: "🍝" },
      { id: "extra-sauce", label: "Extra Marinara", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "Shaved parmesan on top", price: 1.0, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Baked Ravioli",
    basePrice: 19.99,
    description: "Oven-baked ravioli with marinara and mozzarella. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "meatballs", label: "Add Meatballs", sublabel: "2 homemade meatballs", price: 3.0, emoji: "🍝" },
      { id: "extra-cheese", label: "Extra Mozzarella", sublabel: "More melted mozzarella", price: 1.5, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Ravioli Bolognese (Sauteed)",
    basePrice: 19.99,
    description: "Sautéed ravioli in hearty Bolognese meat sauce. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "extra-bolognese", label: "Extra Bolognese Sauce", sublabel: "More hearty meat sauce", price: 2.0, emoji: "🍝" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "Shaved parmesan on top", price: 1.0, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Spaghetti w/ Marinara",
    basePrice: 13.49,
    description: "Classic spaghetti with house marinara sauce. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "meatballs", label: "Add Meatballs", sublabel: "2 homemade meatballs", price: 3.0, emoji: "🍝" },
      { id: "sausage", label: "Add Sausage", sublabel: "Italian sausage", price: 3.0, emoji: "🌭" },
      { id: "extra-sauce", label: "Extra Marinara", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Tortellini w/ Marinara",
    basePrice: 19.99,
    description: "Cheese tortellini in house marinara. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken", price: 3.0, emoji: "🍗" },
      { id: "extra-sauce", label: "Extra Marinara", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "Shaved parmesan on top", price: 1.0, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Tortellini Ala Parma",
    basePrice: 19.99,
    description: "Cheese tortellini in Parma-style cream sauce. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken", price: 3.0, emoji: "🍗" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "Shaved parmesan on top", price: 1.0, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Tortellini Alfredo",
    basePrice: 20.49,
    description: "Cheese tortellini in creamy Alfredo sauce. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "chicken", label: "Add Grilled Chicken", sublabel: "Sliced grilled chicken", price: 3.0, emoji: "🍗" },
      { id: "shrimp", label: "Add Shrimp", sublabel: "Seasoned grilled shrimp", price: 4.0, emoji: "🍤" },
      { id: "broccoli", label: "Add Broccoli", sublabel: "Steamed broccoli florets", price: 1.5, emoji: "🥦" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "Shaved parmesan on top", price: 1.0, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Alfredo, Chicken, Garlic & Broccoli",
    basePrice: 24.99,
    description: "Fettuccine Alfredo with chicken, roasted garlic & broccoli. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "extra-shrimp", label: "Add Shrimp", sublabel: "Seasoned grilled shrimp", price: 4.0, emoji: "🍤" },
      { id: "extra-broccoli", label: "Extra Broccoli", sublabel: "More steamed broccoli", price: 1.5, emoji: "🥦" },
      { id: "extra-parm", label: "Extra Parmesan", sublabel: "Shaved parmesan on top", price: 1.0, emoji: "🧀" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Eggplant Parmigiana",
    basePrice: 17.49,
    description: "Breaded eggplant with marinara and mozzarella. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "extra-sauce", label: "Extra Marinara", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "extra-cheese", label: "Extra Mozzarella", sublabel: "More melted mozzarella", price: 1.5, emoji: "🧀" },
      { id: "spaghetti", label: "Add Spaghetti Side", sublabel: "Side of spaghetti with marinara", price: 3.0, emoji: "🍝" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
  {
    name: "Lasagna",
    basePrice: 17.49,
    description: "Classic layered lasagna with meat sauce and ricotta. Served with Garlic Bread & House Salad",
    addOns: [
      { id: "extra-sauce", label: "Extra Marinara", sublabel: "More house marinara", price: 1.0, emoji: "🍅" },
      { id: "extra-cheese", label: "Extra Mozzarella", sublabel: "More melted mozzarella", price: 1.5, emoji: "🧀" },
      { id: "meatballs", label: "Add Meatballs", sublabel: "2 homemade meatballs", price: 3.0, emoji: "🍝" },
      { id: "garlic-bread", label: "Extra Garlic Bread", sublabel: "Additional garlic bread", price: 2.5, emoji: "🍞" },
    ],
  },
];

function getConfig(name: string): ItemConfig | undefined {
  return PASTA_CONFIGS.find((c) => c.name === name);
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

// ── Inner modal ───────────────────────────────────────────────────────────────
function PastaModalInner({ config, onClose, cloverItemId }: { config: ItemConfig; onClose: () => void; cloverItemId?: string }) {
  const { addItem, openCart } = useCart();
  const [checkedAddOns, setCheckedAddOns] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState(1);

  const photo = getMenuPhoto(config.name);
  const addOnsTotal = config.addOns.filter((a) => checkedAddOns.has(a.id)).reduce((s, a) => s + a.price, 0);
  const unitPrice = config.basePrice + addOnsTotal;
  const totalPrice = unitPrice * qty;

  const toggleAddOn = (id: string) => {
    setCheckedAddOns((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleAddToCart = () => {
    const selectedAddOns = config.addOns.filter((a) => checkedAddOns.has(a.id));
    const addOnDesc = selectedAddOns.map((a) => a.label).join(" · ");

    addItem({
      id: `${config.name}-${Date.now()}`,
      name: config.name,
      price: unitPrice,
      quantity: qty,
      category: "pasta",
      description: addOnDesc || undefined,
      cloverItemId,
    });

    toast.success(`${config.name} added to cart`, {
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
            <p className="napoli-label text-xs text-white/70 tracking-widest uppercase">Pasta</p>
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

        {/* Included note */}
        <div className="px-5 pt-3 pb-1 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "oklch(0.96 0.02 140)" }}>
            <span className="text-base">✅</span>
            <p className="text-xs napoli-body font-semibold" style={{ color: "oklch(0.35 0.08 140)" }}>
              Served with Garlic Bread & House Salad
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-4">
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

// ── Wrapper ───────────────────────────────────────────────────────────────────
export default function PastaCustomizerModal({ trigger, onClose }: { trigger: PastaModalTrigger | null; onClose: () => void }) {
  if (!trigger) return null;
  const config = getConfig(trigger.itemName);
  if (!config) return null;
  return <PastaModalInner config={config} onClose={onClose} cloverItemId={trigger.cloverItemId} />;
}

export const PASTA_MODAL_ITEMS = PASTA_CONFIGS.map((c) => c.name);
