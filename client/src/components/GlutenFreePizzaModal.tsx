/**
 * GlutenFreePizzaModal
 * Interactive customizer for Gluten Free Pizza 14"
 * Base: $12.75 · Each topping: $2.75
 */
import { useState } from "react";
import { X, ShoppingCart, Plus, Minus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const GLUTEN_FREE_BASE_PRICE = 12.75;
const TOPPING_PRICE = 2.75;

const TOPPINGS = [
  "Anchovies", "Artichoke Hearts", "Fresh Basil", "Black Olives", "Broccoli",
  "Zucchini", "Capicola", "Cheddar Cheese", "Grilled Chicken", "Chorizo",
  "Eggplant", "Fresh Garlic", "Green Olives", "Green Peppers", "Ground Beef",
  "Ham", "Italian Sausage", "Jalapeños", "Meatballs", "Mushrooms",
  "Onions", "Pepperoni", "Pineapple", "Red Roasted Peppers", "Salami",
  "Spinach", "Tomatoes", "Canadian Bacon",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlutenFreePizzaModal({ isOpen, onClose }: Props) {
  const { addItem } = useCart();
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  if (!isOpen) return null;

  const totalPrice = (GLUTEN_FREE_BASE_PRICE + selectedToppings.length * TOPPING_PRICE) * quantity;

  function toggleTopping(t: string) {
    setSelectedToppings((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function handleAddToCart() {
    const toppingDesc = selectedToppings.length > 0
      ? `Toppings: ${selectedToppings.join(", ")}`
      : "No extra toppings (cheese only)";

    addItem({
      id: `gluten-free-pizza-${Date.now()}`,
      name: `Gluten Free Pizza 14"${selectedToppings.length > 0 ? ` (+${selectedToppings.length} topping${selectedToppings.length > 1 ? "s" : ""})` : ""}`,
      price: GLUTEN_FREE_BASE_PRICE + selectedToppings.length * TOPPING_PRICE,
      quantity,
      category: "pizza",
      description: toppingDesc,
    });

    toast.success(`Gluten Free Pizza added to cart!`, {
      description: selectedToppings.length > 0 ? toppingDesc : "Plain cheese — enjoy!",
    });

    // Reset and close
    setSelectedToppings([]);
    setQuantity(1);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{
          background: "oklch(0.99 0.008 80)",
          maxHeight: "88dvh",
          height: "88dvh",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: "var(--napoli-dark)", color: "white" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍕</span>
            <div>
              <h2 className="napoli-label text-base tracking-wider text-white">Gluten Free Pizza 14"</h2>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.70 0.015 80)" }}>
                Hand-tossed 14" gluten-free crust — includes cheese
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "oklch(0.30 0.04 30)", color: "white" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Price summary bar */}
        <div
          className="flex items-center justify-between px-5 py-2.5 shrink-0 border-b"
          style={{ background: "oklch(0.97 0.012 80)", borderColor: "oklch(0.90 0.015 80)" }}
        >
          <div className="flex items-center gap-2 text-xs napoli-body" style={{ color: "oklch(0.50 0.03 30)" }}>
            <span>Base <strong style={{ color: "var(--napoli-red)" }}>${GLUTEN_FREE_BASE_PRICE.toFixed(2)}</strong></span>
            {selectedToppings.length > 0 && (
              <>
                <span>+</span>
                <span>{selectedToppings.length} topping{selectedToppings.length > 1 ? "s" : ""} <strong style={{ color: "var(--napoli-red)" }}>+${(selectedToppings.length * TOPPING_PRICE).toFixed(2)}</strong></span>
              </>
            )}
          </div>
          <span className="napoli-price text-lg font-bold" style={{ color: "var(--napoli-red)" }}>
            ${(GLUTEN_FREE_BASE_PRICE + selectedToppings.length * TOPPING_PRICE).toFixed(2)}
          </span>
        </div>

        {/* Toppings grid — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
          <p className="napoli-label text-xs mb-3" style={{ color: "oklch(0.52 0.03 30)", letterSpacing: "0.12em" }}>
            SELECT TOPPINGS — ${TOPPING_PRICE.toFixed(2)} EACH
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TOPPINGS.map((t) => {
              const selected = selectedToppings.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTopping(t)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-all active:scale-95"
                  style={{
                    border: `2px solid ${selected ? "var(--napoli-red)" : "oklch(0.88 0.015 80)"}`,
                    background: selected ? "oklch(0.97 0.04 25)" : "white",
                    color: selected ? "var(--napoli-red)" : "oklch(0.35 0.03 30)",
                    fontFamily: "'Source Sans 3', sans-serif",
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-xs"
                    style={{
                      background: selected ? "var(--napoli-red)" : "oklch(0.93 0.012 80)",
                      color: "white",
                    }}
                  >
                    {selected ? "✓" : "+"}
                  </span>
                  <span className="truncate">{t}</span>
                  {selected && (
                    <span className="ml-auto text-xs shrink-0" style={{ color: "var(--napoli-red)" }}>
                      +$2.75
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer — quantity + add to cart */}
        <div
          className="px-5 py-4 shrink-0 border-t flex items-center gap-3"
          style={{ borderColor: "oklch(0.88 0.015 80)", background: "white", flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quantity selector */}
          <div
            className="flex items-center rounded-lg overflow-hidden border shrink-0"
            style={{ borderColor: "oklch(0.85 0.015 80)" }}
          >
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 flex items-center justify-center transition-colors"
              style={{ background: "oklch(0.96 0.012 80)", color: "var(--napoli-dark)" }}
            >
              <Minus size={14} />
            </button>
            <span
              className="w-9 text-center text-sm font-bold napoli-price"
              style={{ color: "var(--napoli-dark)" }}
            >
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 flex items-center justify-center transition-colors"
              style={{ background: "oklch(0.96 0.012 80)", color: "var(--napoli-dark)" }}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add to cart button */}
          <button
            onClick={handleAddToCart}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold napoli-label tracking-wider transition-all active:scale-95"
            style={{ background: "var(--napoli-red)", color: "white" }}
          >
            <ShoppingCart size={15} />
            Add to Cart — ${totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
