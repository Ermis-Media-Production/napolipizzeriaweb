/**
 * WingsCustomizerModal
 * 3-step interactive modal for Wings, Boneless & Chicken Fingers orders.
 *
 * Step 1 — auto-filled: type + quantity (passed from WingsRow button click)
 * Step 2 — MANDATORY: choose flavor(s)
 *   • For 10+ pieces: option to go Half & Half (two separate flavors)
 *   • Plain = no sauce
 * Step 3 — OPTIONAL: add Fries (+$2/$4), Ranch sauce (2oz $1.49 / 6oz $2.49), special notes
 */
import { useState } from "react";
import { X, ChevronRight, Check, ShoppingCart, Scissors } from "lucide-react";
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
  friesAddonPrice: number;
}

interface Props {
  selection: WingsSelection | null;
  onClose: () => void;
}

/** Parse "10pc", "20pc" etc. → number */
function parseQtyNumber(qty: string): number {
  return parseInt(qty.replace(/[^0-9]/g, ""), 10) || 0;
}

/** Flavor button — shared between single and half-half pickers */
function FlavorButton({
  f,
  selected,
  onClick,
  accentColor,
}: {
  f: string;
  selected: boolean;
  onClick: () => void;
  accentColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-lg text-xs font-semibold napoli-body transition-all active:scale-95"
      style={
        selected
          ? { background: accentColor, color: "white", border: `2px solid ${accentColor}` }
          : { background: "white", color: "oklch(0.35 0.03 30)", border: "2px solid oklch(0.88 0.015 80)" }
      }
    >
      {f === "Plain" ? "🍗 Plain" : f}
    </button>
  );
}

export default function WingsCustomizerModal({ selection, onClose }: Props) {
  const { addItem, openCart } = useCart();
  const [step, setStep] = useState<2 | 3>(2);

  // Flavor state
  const [isHalfHalf, setIsHalfHalf] = useState(false);
  const [flavor, setFlavor] = useState("");          // single flavor
  const [flavorA, setFlavorA] = useState("");        // half & half — first half
  const [flavorB, setFlavorB] = useState("");        // half & half — second half

  // Add-ons state
  const [addFries, setAddFries] = useState(false);
  const [ranchSize, setRanchSize] = useState<"none" | "2oz" | "6oz">("none");
  const [notes, setNotes] = useState("");

  if (!selection) return null;

  const qtyNum = parseQtyNumber(selection.qty);
  const halfHalfEligible = qtyNum >= 10;

  const ranchPrice = ranchSize === "2oz" ? 1.49 : ranchSize === "6oz" ? 2.49 : 0;
  const totalPrice =
    selection.basePrice +
    (addFries ? selection.friesAddonPrice : 0) +
    ranchPrice;

  // Step 2 is valid when:
  // - single mode: one flavor chosen
  // - half & half mode: both halves chosen AND they are different
  const canProceedStep2 = isHalfHalf
    ? flavorA !== "" && flavorB !== "" && flavorA !== flavorB
    : flavor !== "";

  const flavorSummary = isHalfHalf
    ? `½ ${flavorA} · ½ ${flavorB}`
    : flavor;

  const handleAddToCart = () => {
    const addons: string[] = [];
    if (isHalfHalf) {
      addons.push(`½ ${flavorA}`);
      addons.push(`½ ${flavorB}`);
    } else if (flavor !== "Plain") {
      addons.push(`${flavor} sauce`);
    }
    if (addFries) addons.push(`+Fries ($${selection.friesAddonPrice.toFixed(2)})`);
    if (ranchSize !== "none") addons.push(`Ranch ${ranchSize} ($${ranchPrice.toFixed(2)})`);
    if (notes.trim()) addons.push(`Note: ${notes.trim()}`);

    const description =
      addons.length > 0
        ? addons.join(" · ")
        : flavor === "Plain"
        ? "Plain — no sauce"
        : undefined;

    addItem({
      id: `wings-${selection.type}-${selection.qty}-${flavorSummary}-${Date.now()}`,
      name: `${selection.type} (${selection.qty}) — ${isHalfHalf ? "Half & Half" : flavor}`,
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

  // Reset half-half state when toggling mode
  const handleToggleHalfHalf = (val: boolean) => {
    setIsHalfHalf(val);
    setFlavor("");
    setFlavorA("");
    setFlavorB("");
  };

  const flavorDone = isHalfHalf ? (flavorA !== "" && flavorB !== "") : flavor !== "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0.08 0.02 27 / 0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        style={{ background: "white" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
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
        <div className="flex items-center px-5 py-3 gap-2 shrink-0" style={{ background: "oklch(0.97 0.012 80)" }}>
          {/* Step 1 — done */}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "var(--napoli-green)", color: "white" }}>
              <Check size={12} />
            </div>
            <span className="text-xs napoli-label" style={{ color: "var(--napoli-green)" }}>Type & Qty</span>
          </div>
          <ChevronRight size={14} style={{ color: "oklch(0.70 0.015 80)" }} />
          {/* Step 2 */}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step === 2 ? "var(--napoli-red)" : flavorDone ? "var(--napoli-green)" : "oklch(0.88 0.015 80)",
                color: step === 2 || flavorDone ? "white" : "oklch(0.52 0.03 30)",
              }}>
              {flavorDone && step === 3 ? <Check size={12} /> : "2"}
            </div>
            <span className="text-xs napoli-label"
              style={{ color: step === 2 ? "var(--napoli-red)" : flavorDone ? "var(--napoli-green)" : "oklch(0.52 0.03 30)" }}>
              Flavor
            </span>
          </div>
          <ChevronRight size={14} style={{ color: "oklch(0.70 0.015 80)" }} />
          {/* Step 3 */}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step === 3 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                color: step === 3 ? "white" : "oklch(0.52 0.03 30)",
              }}>
              3
            </div>
            <span className="text-xs napoli-label"
              style={{ color: step === 3 ? "var(--napoli-red)" : "oklch(0.52 0.03 30)" }}>
              Add-ons
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* ── STEP 2: FLAVOR ─────────────────────────────────── */}
          {step === 2 && (
            <div className="px-5 py-5">

              {/* Half & Half toggle — only for 10+ */}
              {halfHalfEligible && (
                <div className="mb-5">
                  <p className="napoli-label text-xs mb-2" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                    FLAVOR MODE
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleHalfHalf(false)}
                      className="flex-1 py-2.5 rounded-lg text-xs font-semibold napoli-label transition-all active:scale-95"
                      style={
                        !isHalfHalf
                          ? { background: "var(--napoli-red)", color: "white", border: "2px solid var(--napoli-red)" }
                          : { background: "white", color: "oklch(0.35 0.03 30)", border: "2px solid oklch(0.88 0.015 80)" }
                      }
                    >
                      🍗 One Flavor
                    </button>
                    <button
                      onClick={() => handleToggleHalfHalf(true)}
                      className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-lg text-xs font-semibold napoli-label transition-all active:scale-95"
                      style={
                        isHalfHalf
                          ? { background: "oklch(0.26 0.10 145)", color: "white", border: "2px solid oklch(0.26 0.10 145)" }
                          : { background: "white", color: "oklch(0.35 0.03 30)", border: "2px solid oklch(0.88 0.015 80)" }
                      }
                    >
                      <Scissors size={12} />
                      Half &amp; Half
                    </button>
                  </div>
                  {isHalfHalf && (
                    <p className="text-xs napoli-body mt-2" style={{ color: "oklch(0.52 0.03 30)" }}>
                      Choose a different flavor for each half of your order.
                    </p>
                  )}
                </div>
              )}

              {/* ── SINGLE FLAVOR ── */}
              {!isHalfHalf && (
                <>
                  <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                    CHOOSE YOUR FLAVOR <span>*</span>
                  </p>
                  <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                    Select one — required. Choose <strong>Plain</strong> for no sauce.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FLAVORS.map((f) => (
                      <FlavorButton
                        key={f}
                        f={f}
                        selected={flavor === f}
                        onClick={() => setFlavor(f)}
                        accentColor="var(--napoli-red)"
                      />
                    ))}
                  </div>
                </>
              )}

              {/* ── HALF & HALF ── */}
              {isHalfHalf && (
                <div className="space-y-5">
                  {/* First half */}
                  <div
                    className="rounded-xl p-4"
                    style={{ border: "2px solid var(--napoli-red)", background: "oklch(0.99 0.02 27 / 0.15)" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: "var(--napoli-red)" }}
                      >
                        1
                      </div>
                      <p className="napoli-label text-xs" style={{ color: "var(--napoli-red)", letterSpacing: "0.12em" }}>
                        FIRST HALF — {Math.ceil(qtyNum / 2)}pc
                      </p>
                      {flavorA && (
                        <span
                          className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold napoli-body"
                          style={{ background: "var(--napoli-red)", color: "white" }}
                        >
                          {flavorA}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {FLAVORS.map((f) => (
                        <FlavorButton
                          key={f}
                          f={f}
                          selected={flavorA === f}
                          onClick={() => setFlavorA(f)}
                          accentColor="var(--napoli-red)"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.015 80)" }} />
                    <div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold napoli-label"
                      style={{ background: "oklch(0.26 0.10 145)", color: "white" }}
                    >
                      <Scissors size={11} /> HALF &amp; HALF
                    </div>
                    <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.015 80)" }} />
                  </div>

                  {/* Second half */}
                  <div
                    className="rounded-xl p-4"
                    style={{ border: "2px solid oklch(0.26 0.10 145)", background: "oklch(0.97 0.06 145 / 0.15)" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: "oklch(0.26 0.10 145)" }}
                      >
                        2
                      </div>
                      <p className="napoli-label text-xs" style={{ color: "oklch(0.26 0.10 145)", letterSpacing: "0.12em" }}>
                        SECOND HALF — {Math.floor(qtyNum / 2)}pc
                      </p>
                      {flavorB && (
                        <span
                          className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold napoli-body"
                          style={{ background: "oklch(0.26 0.10 145)", color: "white" }}
                        >
                          {flavorB}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {FLAVORS.map((f) => (
                        <FlavorButton
                          key={f}
                          f={f}
                          selected={flavorB === f}
                          onClick={() => setFlavorB(f)}
                          accentColor="oklch(0.26 0.10 145)"
                        />
                      ))}
                    </div>
                    {flavorA && flavorB && flavorA === flavorB && (
                      <p className="text-xs mt-2 font-semibold" style={{ color: "oklch(0.55 0.18 27)" }}>
                        ⚠️ Both halves have the same flavor — please choose different flavors for Half &amp; Half.
                      </p>
                    )}
                  </div>
                </div>
              )}

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
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                Customize your order with extras. All optional.
              </p>

              {/* Flavor recap */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <Check size={14} style={{ color: "var(--napoli-green)" }} />
                {isHalfHalf ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                      Half &amp; Half:
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold napoli-body"
                      style={{ background: "var(--napoli-red)", color: "white" }}>
                      ½ {flavorA}
                    </span>
                    <span className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>+</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold napoli-body"
                      style={{ background: "oklch(0.26 0.10 145)", color: "white" }}>
                      ½ {flavorB}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                    Flavor: <span style={{ color: "var(--napoli-red)" }}>{flavor}</span>
                  </span>
                )}
                <button
                  onClick={() => setStep(2)}
                  className="ml-auto text-xs napoli-label underline shrink-0"
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
                className="mt-5 flex items-center justify-between px-4 py-3 rounded-lg"
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

        </div>{/* end scrollable body */}
      </div>
    </div>
  );
}
