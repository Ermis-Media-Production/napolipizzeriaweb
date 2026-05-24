/**
 * GarlicBreadModal — Interactive customizer for Garlic Bread
 * Allows customers to optionally add cheese for $2
 */
import { useState } from "react";
import { X, ChevronRight, Check } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

export interface GarlicBreadTrigger {
  open: boolean;
}

// ── Inner component (all hooks here, safe from early return) ──────────────────
function GarlicBreadModalInner({ onClose }: { onClose: () => void }) {
  const { addItem, openCart } = useCart();
  const [addCheese, setAddCheese] = useState(false);

  const BASE_PRICE = 3.49;
  const CHEESE_PRICE = 2.0;
  const totalPrice = BASE_PRICE + (addCheese ? CHEESE_PRICE : 0);

  const handleAddToCart = () => {
    const description = addCheese ? "With melted cheese" : undefined;
    const itemName = addCheese ? "Garlic Bread w/ Cheese" : "Garlic Bread";

    addItem({
      id: `garlic-bread-${Date.now()}`,
      name: itemName,
      price: totalPrice,
      quantity: 1,
      category: "appetizers",
      description,
    });

    toast.success(`${itemName} added to cart`, {
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
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "white" }}
      >
        {/* Header */}
        <div
          className="relative flex items-center justify-between px-5 py-4"
          style={{ background: "var(--napoli-red)" }}
        >
          <div>
            <p className="napoli-label text-xs text-white/70 tracking-widest uppercase">Appetizers</p>
            <h2 className="napoli-heading text-lg text-white">Garlic Bread</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: "oklch(1 0 0 / 0.18)", color: "white" }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Food photo */}
        <div className="relative overflow-hidden" style={{ height: "180px" }}>
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/napoli-garlic-bread-BGUR6YGQLqbBXawWuDkbem.webp"
            alt="Garlic Bread"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, oklch(0.14 0.03 27 / 0.45) 0%, transparent 60%)" }}
          />
          <div className="absolute bottom-3 left-4">
            <span
              className="napoli-price text-2xl"
              style={{ color: "white", textShadow: "0 1px 4px oklch(0 0 0 / 0.6)" }}
            >
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Customize section */}
        <div className="px-5 py-4">
          <p className="napoli-label text-xs tracking-widest uppercase mb-3" style={{ color: "oklch(0.52 0.03 30)" }}>
            Customize Your Order
          </p>

          {/* Cheese toggle */}
          <button
            onClick={() => setAddCheese(!addCheese)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98]"
            style={{
              borderColor: addCheese ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
              background: addCheese ? "oklch(0.98 0.015 25)" : "oklch(0.99 0.008 80)",
            }}
          >
            {/* Checkbox */}
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all"
              style={{
                background: addCheese ? "var(--napoli-red)" : "white",
                border: addCheese ? "2px solid var(--napoli-red)" : "2px solid oklch(0.80 0.015 80)",
              }}
            >
              {addCheese && <Check size={14} color="white" strokeWidth={3} />}
            </div>

            {/* Cheese icon + label */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xl">🧀</span>
              <div className="text-left">
                <p className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>
                  Add Melted Cheese
                </p>
                <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>
                  Gooey mozzarella melted on top
                </p>
              </div>
            </div>

            {/* Price badge */}
            <span
              className="napoli-price text-sm shrink-0 px-2 py-1 rounded-lg"
              style={{
                background: addCheese ? "var(--napoli-red)" : "oklch(0.94 0.012 80)",
                color: addCheese ? "white" : "var(--napoli-red)",
              }}
            >
              +$2.00
            </span>
          </button>
        </div>

        {/* Footer — price summary + Add to Cart */}
        <div
          className="px-5 pb-6 pt-2 flex items-center gap-3"
          style={{ borderTop: "1px solid oklch(0.93 0.012 80)" }}
        >
          <div className="flex-1">
            <p className="text-xs napoli-body" style={{ color: "oklch(0.62 0.03 30)" }}>Total</p>
            <p className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>
              ${totalPrice.toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm napoli-label tracking-wide transition-all active:scale-95 hover:opacity-90"
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

// ── Wrapper (safe early return before any hooks) ──────────────────────────────
export default function GarlicBreadModal({
  trigger,
  onClose,
}: {
  trigger: GarlicBreadTrigger | null;
  onClose: () => void;
}) {
  if (!trigger?.open) return null;
  return <GarlicBreadModalInner onClose={onClose} />;
}
