/**
 * SubsCustomizerModal
 * 3-step interactive modal for Sub Sandwiches and Triple Deckers.
 *
 * Step 1 — MANDATORY: choose sub (passed from the menu row)
 * Step 2 — MANDATORY: choose bread type (Flour / Wheat / Gluten Free)
 * Step 3 — OPTIONAL: choose side (Fries / Coleslaw / Potato Salad / Pasta Salad / Side Salad),
 *           add-ons (Cheese +$1 / Avocado +$1 / Bacon +$1), special notes
 */
import { useState } from "react";
import { X, ChevronRight, Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const BREAD_TYPES = [
  { name: "Flour",        desc: "Classic soft flour roll" },
  { name: "Wheat",        desc: "Hearty whole wheat roll" },
  { name: "Gluten Free",  desc: "Gluten free bread available" },
];

const SIDE_OPTIONS = [
  "Fries",
  "Coleslaw",
  "Potato Salad",
  "Pasta Salad",
  "Side Salad",
];

const ADDON_OPTIONS: { id: string; label: string; price: number }[] = [
  { id: "cheese",  label: "Add Cheese",   price: 1.00 },
  { id: "avocado", label: "Add Avocado",  price: 1.00 },
  { id: "bacon",   label: "Add Bacon",    price: 1.00 },
];

export interface SubsTrigger {
  subName: string;
  basePrice: number;
  /** Extra cost already included in basePrice (e.g. "Add Cheese $1") — shown as info only */
  addNote?: string;
  /** Whether to show the add-ons (cheese/avocado/bacon) — false for Triple Deckers */
  showAddons?: boolean;
}

interface Props {
  trigger: SubsTrigger | null;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

export default function SubsCustomizerModal({ trigger, onClose }: Props) {
  if (!trigger) return null;
  return <SubsCustomizerInner trigger={trigger} onClose={onClose} />;
}

function SubsCustomizerInner({ trigger, onClose }: { trigger: SubsTrigger; onClose: () => void }) {
  const { addItem, openCart } = useCart();

  const [step, setStep]         = useState<Step>(1);
  const [breadType, setBreadType] = useState("");
  const [side, setSide]           = useState("");
  const [addons, setAddons]       = useState<Set<string>>(new Set());
  const [notes, setNotes]         = useState("");

  const showAddons = trigger.showAddons !== false;

  const toggleAddon = (id: string) => {
    setAddons(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addonTotal = Array.from(addons).reduce((sum, id) => {
    const opt = ADDON_OPTIONS.find(a => a.id === id);
    return sum + (opt?.price ?? 0);
  }, 0);

  const totalPrice = trigger.basePrice + addonTotal;

  const handleAddToCart = () => {
    const parts: string[] = [];
    parts.push(breadType);
    if (side) parts.push(`Side: ${side}`);
    if (addons.size > 0) {
      const addonLabels = Array.from(addons).map(id => ADDON_OPTIONS.find(a => a.id === id)?.label ?? id);
      parts.push(addonLabels.join(", "));
    }
    if (notes.trim()) parts.push(`Note: ${notes.trim()}`);

    addItem({
      id: `sub-${trigger.subName}-${breadType}-${Date.now()}`,
      name: trigger.subName,
      price: totalPrice,
      quantity: 1,
      category: "subs",
      description: parts.join(" · "),
    });

    toast.success(`${trigger.subName} added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });

    onClose();
  };

  const step1Done = true; // sub is pre-selected from the menu row
  const step2Done = breadType !== "";

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
        {/* ── HEADER ─────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: "var(--napoli-red)" }}
        >
          <div>
            <p className="napoli-label text-xs text-white opacity-80 tracking-widest">CUSTOMIZE YOUR ORDER</p>
            <h2 className="napoli-heading text-lg text-white leading-tight">{trigger.subName}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-90"
            style={{ background: "oklch(0.35 0.18 27)", color: "white" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── STEP INDICATOR ─────────────────────────────────── */}
        <div className="flex items-center px-5 py-3 gap-2 shrink-0" style={{ background: "oklch(0.97 0.012 80)" }}>
          {/* Step 1 — always done (sub pre-selected) */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "var(--napoli-green)", color: "white" }}
            >
              <Check size={12} />
            </div>
            <span className="text-xs napoli-label" style={{ color: "var(--napoli-green)" }}>Sub</span>
          </div>
          <ChevronRight size={14} style={{ color: "oklch(0.70 0.015 80)" }} />

          {/* Step 2 */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step2Done && step > 2 ? "var(--napoli-green)" : step === 2 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                color: step2Done && step > 2 ? "white" : step === 2 ? "white" : "oklch(0.52 0.03 30)",
              }}
            >
              {step2Done && step > 2 ? <Check size={12} /> : "2"}
            </div>
            <span
              className="text-xs napoli-label"
              style={{ color: step === 2 ? "var(--napoli-red)" : step2Done && step > 2 ? "var(--napoli-green)" : "oklch(0.52 0.03 30)" }}
            >
              Bread
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
            <span className="text-xs napoli-label" style={{ color: step === 3 ? "var(--napoli-red)" : "oklch(0.52 0.03 30)" }}>
              Sides
            </span>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">

          {/* ── STEP 1: SUB CONFIRMATION ───────────────────────── */}
          {step === 1 && (
            <div className="px-5 py-5">
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                YOUR SELECTION
              </p>
              <p className="text-xs napoli-body mb-5" style={{ color: "oklch(0.52 0.03 30)" }}>
                Confirm your sub and continue to choose your bread.
              </p>

              <div
                className="flex items-center gap-4 px-4 py-4 rounded-xl"
                style={{ background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }}
              >
                <span className="text-2xl">🥖</span>
                <div className="flex-1">
                  <p className="napoli-body text-sm font-bold">{trigger.subName}</p>
                  {trigger.addNote && (
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.90 0.015 80)" }}>{trigger.addNote}</p>
                  )}
                </div>
                <Check size={16} style={{ color: "white" }} />
              </div>

              {/* Price */}
              <div
                className="mt-4 flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <span className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Base price</span>
                <span className="napoli-price text-lg" style={{ color: "var(--napoli-red)" }}>
                  ${trigger.basePrice.toFixed(2)}
                </span>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95"
                  style={{ background: "var(--napoli-red)", color: "white" }}
                >
                  Next: Bread Type <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: CHOOSE BREAD TYPE ──────────────────────── */}
          {step === 2 && (
            <div className="px-5 py-5">
              {/* Sub recap */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <Check size={14} style={{ color: "var(--napoli-green)" }} />
                <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                  <span style={{ color: "var(--napoli-red)" }}>{trigger.subName}</span>
                </span>
                <button
                  onClick={() => setStep(1)}
                  className="ml-auto text-xs napoli-label underline shrink-0"
                  style={{ color: "oklch(0.52 0.03 30)" }}
                >
                  Change
                </button>
              </div>

              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                CHOOSE YOUR BREAD <span>*</span>
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                Select one — required. Gluten Free bread available.
              </p>

              <div className="flex flex-col gap-3">
                {BREAD_TYPES.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => setBreadType(b.name)}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all active:scale-98"
                    style={
                      breadType === b.name
                        ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                        : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                    }
                  >
                    <span className="text-2xl">🫓</span>
                    <div>
                      <p className="napoli-body text-sm font-bold">{b.name}</p>
                      <p
                        className="text-xs napoli-body mt-0.5"
                        style={{ color: breadType === b.name ? "oklch(0.90 0.015 80)" : "oklch(0.52 0.03 30)" }}
                      >
                        {b.desc}
                      </p>
                    </div>
                    {breadType === b.name && (
                      <Check size={16} className="ml-auto shrink-0" style={{ color: "white" }} />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setStep(3)}
                  disabled={!breadType}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95"
                  style={
                    breadType
                      ? { background: "var(--napoli-red)", color: "white" }
                      : { background: "oklch(0.88 0.015 80)", color: "oklch(0.62 0.03 30)", cursor: "not-allowed" }
                  }
                >
                  Next: Sides <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: SIDES & ADD-ONS ────────────────────────── */}
          {step === 3 && (
            <div className="px-5 py-5">
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.15em" }}>
                SIDES & ADD-ONS
              </p>
              <p className="text-xs napoli-body mb-4" style={{ color: "oklch(0.52 0.03 30)" }}>
                All optional. Choose a side and any extras.
              </p>

              {/* Order recap */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <Check size={14} style={{ color: "var(--napoli-green)" }} />
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                    {trigger.subName}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold napoli-body"
                    style={{ background: "var(--napoli-red)", color: "white" }}
                  >
                    {breadType}
                  </span>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="ml-auto text-xs napoli-label underline shrink-0"
                  style={{ color: "oklch(0.52 0.03 30)" }}
                >
                  Change
                </button>
              </div>

              {/* Side selector */}
              <div className="mb-5">
                <p className="text-xs napoli-label mb-2" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                  🍟 CHOOSE A SIDE (OPTIONAL)
                </p>
                <div className="flex flex-wrap gap-2">
                  {SIDE_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSide(side === s ? "" : s)}
                      className="px-3 py-2 rounded-lg text-xs font-semibold napoli-body transition-all active:scale-95"
                      style={
                        side === s
                          ? { background: "var(--napoli-red)", color: "white", border: "2px solid var(--napoli-red)" }
                          : { background: "white", color: "oklch(0.35 0.03 30)", border: "2px solid oklch(0.88 0.015 80)" }
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              {showAddons && (
                <div className="mb-5">
                  <p className="text-xs napoli-label mb-2" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                    ➕ ADD-ONS (OPTIONAL)
                  </p>
                  <div className="flex flex-col gap-2">
                    {ADDON_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => toggleAddon(opt.id)}
                        className="flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-95"
                        style={
                          addons.has(opt.id)
                            ? { background: "var(--napoli-red)", border: "2px solid var(--napoli-red)", color: "white" }
                            : { background: "white", border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }
                        }
                      >
                        <span className="napoli-body text-sm font-semibold">{opt.label}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className="napoli-price text-sm"
                            style={{ color: addons.has(opt.id) ? "oklch(0.90 0.015 80)" : "var(--napoli-red)" }}
                          >
                            +${opt.price.toFixed(2)}
                          </span>
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{
                              background: addons.has(opt.id) ? "oklch(0.35 0.18 27)" : "oklch(0.93 0.012 80)",
                              color: addons.has(opt.id) ? "white" : "oklch(0.62 0.03 30)",
                            }}
                          >
                            {addons.has(opt.id) ? <Check size={11} /> : <span className="text-xs font-bold">+</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Special notes */}
              <div className="mb-2">
                <label
                  className="block text-xs napoli-label mb-1.5"
                  style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}
                >
                  📝 SPECIAL NOTES (OPTIONAL)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g. no onions, extra mayo, toasted..."
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
                className="mt-4 flex items-center justify-between px-4 py-3 rounded-lg"
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
