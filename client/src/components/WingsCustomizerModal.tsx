/**
 * WingsCustomizerModal
 * 3-step interactive modal for Wings, Boneless & Chicken Fingers orders.
 *
 * Step 1 — auto-filled: type + quantity (passed from WingsRow button click)
 * Step 2 — MANDATORY: choose a flavor (Plain = no sauce)
 * Step 3 — OPTIONAL: add Fries (+$2/$4) and/or Ranch sauce (2oz $1.49 / 6oz $2.49)
 */
import { useState } from "react";
import { X, ChevronRight, Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const FLAVORS = [
  "Plain",
  "Mild",
  "Medium",
  "Hot",
  "BBQ",
  "Spicy Honey BBQ",
  "Lemon Pepper",
  "Teriyaki",
  "Spicy Teriyaki",
  "Sweet Red Chili",
  "Mango Habanero",
];

export interface WingsSelection {
  type: "Bone-In" | "Boneless" | "Chicken Fingers";
  qty: string;
  basePrice: number;
  friesAddonPrice: number; // $2 or $4 depending on qty
}

interface Props {
  selection: WingsSelection | null;
  onClose: () => void;
}

export default function WingsCustomizerModal({ selection, onClose }: Props) {
  const { addItem, openCart } = useCart();
  const [step, setStep] = useState<2 | 3>(2);
  const [flavor, setFlavor] = useState<string>("");
  const [addFries, setAddFries] = useState(false);
  const [ranchSize, setRanchSize] = useState<"none" | "2oz" | "6oz">("none");
  const [notes, setNotes] = useState("");

  if (!selection) return null;

  const ranchPrice = ranchSize === "2oz" ? 1.49 : ranchSize === "6oz" ? 2.49 : 0;
  const totalPrice =
    selection.basePrice +
    (addFries ? selection.friesAddonPrice : 0) +
    ranchPrice;

  const canProceedStep2 = flavor !== "";

  const handleAddToCart = () => {
    const addons: string[] = [];
    if (flavor && flavor !== "Plain") addons.push(`${flavor} sauce`);
    if (addFries) addons.push(`+Fries ($${selection.friesAddonPrice.toFixed(2)})`);
    if (ranchSize !== "none") addons.push(`Ranch ${ranchSize} ($${ranchPrice.toFixed(2)})`);
    if (notes.trim()) addons.push(`Note: ${notes.trim()}`);

    const description =
      addons.length > 0 ? addons.join(" · ") : flavor === "Plain" ? "Plain — no sauce" : undefined;

    addItem({
      id: `wings-${selection.type}-${selection.qty}-${flavor}-${Date.now()}`,
      name: `${selection.type} (${selection.qty}) — ${flavor}`,
      price: totalPrice,
      quantity: 1,
      category: "wings",
      description,
    });

    toast.success(`${selection.type} (${selection.qty}) added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });

    onClose();
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0.08 0.02 27 / 0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ background: "white" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: "var(--napoli-red)" }}
        >
          <div>
            <p className="napoli-label text-xs text-white opacity-80 tracking-widest">CUSTOMIZE YOUR ORDER</p>
            <h2 className="napoli-heading text-lg text-white">
              {selection.type} — {selection.qty}
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

        {/* Step indicator */}
        <div className="flex items-center px-5 py-3 gap-2" style={{ background: "oklch(0.97 0.012 80)" }}>
          {/* Step 1 — done */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "var(--napoli-green)", color: "white" }}
            >
              <Check size={12} />
            </div>
            <span className="text-xs napoli-label" style={{ color: "var(--napoli-green)" }}>Type & Qty</span>
          </div>
          <ChevronRight size={14} style={{ color: "oklch(0.70 0.015 80)" }} />
          {/* Step 2 */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step === 2 ? "var(--napoli-red)" : flavor ? "var(--napoli-green)" : "oklch(0.88 0.015 80)",
                color: step === 2 || flavor ? "white" : "oklch(0.52 0.03 30)",
              }}
            >
              {flavor && step === 3 ? <Check size={12} /> : "2"}
            </div>
            <span
              className="text-xs napoli-label"
              style={{ color: step === 2 ? "var(--napoli-red)" : flavor ? "var(--napoli-green)" : "oklch(0.52 0.03 30)" }}
            >
              Flavor
            </span>
          </div>
          <ChevronRight size={14} style={{ color: "oklch(0.70 0.015 80)" }} />
          {/* Step 3 */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step === 3 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                color: step === 3 ? "white" : "oklch(0.52 0.03 30)",
              }}
            >
              3
            </div>
            <span
              className="text-xs napoli-label"
              style={{ color: step === 3 ? "var(--napoli-red)" : "oklch(0.52 0.03 30)" }}
            >
              Add-ons
            </span>
          </div>
        </div>

        {/* ── STEP 2: FLAVOR ─────────────────────────────────── */}
        {step === 2 && (
          <div className="px-5 py-5">
            <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
              CHOOSE YOUR FLAVOR <span style={{ color: "var(--napoli-red)" }}>*</span>
            </p>
            <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
              Select one — required. Choose <strong>Plain</strong> for no sauce.
            </p>
            <div className="flex flex-wrap gap-2">
              {FLAVORS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFlavor(f)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold napoli-body transition-all active:scale-95"
                  style={
                    flavor === f
                      ? { background: "var(--napoli-red)", color: "white", border: "2px solid var(--napoli-red)" }
                      : { background: "white", color: "oklch(0.35 0.03 30)", border: "2px solid oklch(0.88 0.015 80)" }
                  }
                >
                  {f === "Plain" ? "🍗 Plain" : f}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95"
                style={
                  canProceedStep2
                    ? { background: "var(--napoli-red)", color: "white" }
                    : { background: "oklch(0.88 0.015 80)", color: "oklch(0.62 0.03 30)", cursor: "not-allowed" }
                }
              >
                Next: Add-ons <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: ADD-ONS ────────────────────────────────── */}
        {step === 3 && (
          <div className="px-5 py-5">
            <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
              OPTIONAL ADD-ONS
            </p>
            <p className="text-xs napoli-body mb-5" style={{ color: "oklch(0.52 0.03 30)" }}>
              Customize your order with extras. All optional.
            </p>

            {/* Selected flavor recap */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg mb-5"
              style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
            >
              <Check size={14} style={{ color: "var(--napoli-green)" }} />
              <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                Flavor: <span style={{ color: "var(--napoli-red)" }}>{flavor}</span>
              </span>
              <button
                onClick={() => setStep(2)}
                className="ml-auto text-xs napoli-label underline"
                style={{ color: "oklch(0.52 0.03 30)" }}
              >
                Change
              </button>
            </div>

            {/* Fries */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-lg mb-3 cursor-pointer transition-all"
              style={{
                border: addFries ? "2px solid var(--napoli-red)" : "2px solid oklch(0.88 0.015 80)",
                background: addFries ? "oklch(0.99 0.02 27 / 0.3)" : "white",
              }}
              onClick={() => setAddFries(!addFries)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🍟</span>
                <div>
                  <p className="text-sm napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>Add French Fries</p>
                  <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Crispy golden fries on the side</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>
                  +${selection.friesAddonPrice.toFixed(2)}
                </span>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: addFries ? "var(--napoli-red)" : "oklch(0.93 0.012 80)",
                    color: addFries ? "white" : "oklch(0.62 0.03 30)",
                  }}
                >
                  {addFries ? <Check size={13} /> : <span className="text-xs font-bold">+</span>}
                </div>
              </div>
            </div>

            {/* Ranch sauce */}
            <div className="mb-1">
              <p className="text-xs napoli-label mb-2" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                🥣 RANCH SAUCE (OPTIONAL)
              </p>
              <div className="flex gap-2">
                {(["none", "2oz", "6oz"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setRanchSize(size)}
                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold napoli-body transition-all active:scale-95"
                    style={
                      ranchSize === size
                        ? { background: "var(--napoli-red)", color: "white", border: "2px solid var(--napoli-red)" }
                        : { background: "white", color: "oklch(0.35 0.03 30)", border: "2px solid oklch(0.88 0.015 80)" }
                    }
                  >
                    {size === "none" ? "No Ranch" : size === "2oz" ? "2oz  +$1.49" : "6oz  +$2.49"}
                  </button>
                ))}
              </div>
            </div>

            {/* Special notes */}
            <div className="mt-4">
              <label
                className="block text-xs napoli-label mb-1.5"
                style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}
              >
                📝 NOTAS ESPECIALES (OPCIONAL)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: extra crispy, sin cebolla, salsa aparte..."
                maxLength={200}
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm napoli-body resize-none transition-all outline-none"
                style={{
                  border: notes ? "2px solid var(--napoli-red)" : "2px solid oklch(0.88 0.015 80)",
                  color: "var(--napoli-dark)",
                  background: "white",
                }}
              />
              <p className="text-right text-xs mt-0.5" style={{ color: "oklch(0.65 0.015 80)" }}>
                {notes.length}/200
              </p>
            </div>

            {/* Total + Add to Cart */}
            <div
              className="mt-6 flex items-center justify-between px-4 py-3 rounded-lg"
              style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
            >
              <div>
                <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Order total</p>
                <p className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>
                  ${totalPrice.toFixed(2)}
                </p>
              </div>
              <button
                onClick={handleAddToCart}
                className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95 hover:opacity-90"
                style={{ background: "var(--napoli-red)", color: "white" }}
              >
                <ShoppingCart size={16} />
                Add to Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
