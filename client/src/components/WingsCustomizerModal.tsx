/**
 * WingsCustomizerModal
 * 4-step interactive modal for Wings, Boneless Wings & Chicken Tenders
 *
 * Step 1 — Choose quantity
 * Step 2 — One Flavor or Half & Half? (Half & Half unlocks for 10pc+)
 * Step 3 — Sauce selector(s) — 1 free sauce per 10pc, spicy indicator shown
 * Step 4 — Optional add-ons (fries, ranch, notes)
 */
import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Check, ShoppingCart, Scissors, Flame } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { WINGS } from "@/lib/napoliData";

// ── Pricing helpers ──────────────────────────────────────────
type WingRow = { qty: string; price: string; addFries: string };

function parsePrice(p: string): number {
  return parseFloat(p.replace("$", "")) || 0;
}

const TYPE_OPTIONS: { id: WingType; label: string; photo: string; desc: string; rows: WingRow[] }[] = [
  {
    id: "Bone-In",
    label: "Wings",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/wings-bone-in-cy6LNXxUdyyo3uqGtCMzw9.webp",
    desc: "Classic bone-in · 6pc–80pc",
    rows: WINGS.boneIn,
  },
  {
    id: "Boneless",
    label: "Boneless Wings",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/wings-boneless-MW4NGfxaXKRPobsxPdZaWs.webp",
    desc: "All-meat bites · 6pc–80pc",
    rows: WINGS.boneless,
  },
  {
    id: "Chicken Fingers",
    label: "Chicken Tenders",
    photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/wings-tenders-ez4oQGRwZw7V4Fe4Wvo3Jt.webp",
    desc: "Hand-breaded · 5pc–80pc",
    rows: WINGS.chickenFingers,
  },
];

// ── Sauce data with spicy indicator ─────────────────────────
interface SauceInfo {
  name: string;
  spicy: 0 | 1 | 2 | 3 | 4; // 0 = not spicy, 1-4 = heat level
}

const FLAVOR_GROUPS: { key: string; label: string; sublabel: string; sauces: SauceInfo[]; accentColor: string }[] = [
  {
    key: "heat",
    label: "🌡️ HEAT LEVELS",
    sublabel: "Classic buffalo-style — choose your heat",
    sauces: [
      { name: "Plain", spicy: 0 },
      { name: "Mild", spicy: 1 },
      { name: "Medium", spicy: 2 },
      { name: "Hot", spicy: 3 },
      { name: "Extra Hot", spicy: 4 },
    ],
    accentColor: "var(--napoli-red)",
  },
  {
    key: "sauce",
    label: "💧 SPECIALTY SAUCES",
    sublabel: "Bold flavors tossed in sauce",
    sauces: [
      { name: "BBQ", spicy: 0 },
      { name: "Spicy Honey BBQ", spicy: 2 },
      { name: "Teriyaki", spicy: 0 },
      { name: "Spicy Teriyaki", spicy: 2 },
      { name: "Sweet Red Chili", spicy: 1 },
      { name: "Mango Habanero", spicy: 3 },
    ],
    accentColor: "oklch(0.52 0.18 50)",
  },
  {
    key: "dry",
    label: "🧂 DRY RUB",
    sublabel: "Seasoned dry — no sauce, crispy finish",
    sauces: [
      { name: "Lemon Pepper", spicy: 0 },
    ],
    accentColor: "oklch(0.52 0.12 250)",
  },
];

// ── Types ────────────────────────────────────────────────────
export type WingType = "Bone-In" | "Boneless" | "Chicken Fingers";

export interface WingsSelection {
  type: WingType;
  qty: string;
  basePrice: number;
  friesAddonPrice: number;
}

interface Props {
  selection: WingsSelection | null;
  onClose: () => void;
}

// ── Spicy indicator ──────────────────────────────────────────
function SpicyBadge({ level }: { level: 0 | 1 | 2 | 3 | 4 }) {
  if (level === 0) return <span className="text-[10px] text-gray-400 font-medium">No spicy</span>;
  const color = level >= 4 ? "oklch(0.45 0.25 20)" : level === 3 ? "oklch(0.52 0.22 27)" : level === 2 ? "oklch(0.58 0.20 40)" : "oklch(0.62 0.16 50)";
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: level }).map((_, i) => (
        <Flame key={i} size={12} fill={color} style={{ color }} />
      ))}
    </span>
  );
}

// ── Sauce button ─────────────────────────────────────────────
function SauceButton({
  sauce,
  selected,
  onClick,
  accentColor,
}: {
  sauce: SauceInfo;
  selected: boolean;
  onClick: () => void;
  accentColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center px-3 py-2 rounded-lg text-xs font-semibold napoli-body transition-all active:scale-95"
      style={
        selected
          ? { background: accentColor, color: "white", border: `2px solid ${accentColor}` }
          : { background: "white", color: "oklch(0.35 0.03 30)", border: "2px solid oklch(0.88 0.015 80)" }
      }
    >
      <span>{sauce.name === "Plain" ? "🍗 Plain" : sauce.name}</span>
      <span className="mt-0.5">
        <SpicyBadge level={sauce.spicy} />
      </span>
    </button>
  );
}

// ── Step indicator ───────────────────────────────────────────
function StepDot({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
        style={{
          background: done ? "oklch(0.45 0.15 145)" : active ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
          color: done || active ? "white" : "oklch(0.52 0.03 30)",
        }}
      >
        {done ? <Check size={13} /> : num}
      </div>
      <span
        className="text-[9px] font-semibold"
        style={{
          color: active ? "var(--napoli-red)" : done ? "oklch(0.45 0.15 145)" : "oklch(0.65 0.015 80)",
          fontFamily: "'Oswald', sans-serif",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Sauce selector (shared for single and half&half) ─────────
function SauceSelector({
  title,
  accentBorder,
  accentBg,
  selected,
  onSelect,
  label,
}: {
  title: string;
  accentBorder: string;
  accentBg: string;
  selected: string;
  onSelect: (s: string) => void;
  label?: string;
}) {
  return (
    <div className="rounded-xl p-4" style={{ border: `2px solid ${accentBorder}`, background: accentBg }}>
      {label && (
        <p className="napoli-label text-xs mb-3" style={{ color: accentBorder, letterSpacing: "0.12em" }}>
          {label}
        </p>
      )}
      <p className="napoli-label text-xs mb-3" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
        {title}
      </p>
      <div className="space-y-3">
        {FLAVOR_GROUPS.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="napoli-label text-xs font-bold" style={{ color: "oklch(0.35 0.03 30)", letterSpacing: "0.1em" }}>{group.label}</span>
              <div className="flex-1 h-px" style={{ background: "oklch(0.90 0.012 80)" }} />
            </div>
            <p className="text-xs napoli-body mb-2" style={{ color: "oklch(0.58 0.03 30)" }}>{group.sublabel}</p>
            <div className="flex flex-wrap gap-2">
              {group.sauces.map((s) => (
                <SauceButton
                  key={s.name}
                  sauce={s}
                  selected={selected === s.name}
                  onClick={() => onSelect(s.name)}
                  accentColor={group.accentColor}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function WingsCustomizerModal({ selection, onClose }: Props) {
  if (!selection) return null;
  return <WingsCustomizerInner initialType={selection.type} onClose={onClose} />;
}

function WingsCustomizerInner({ initialType, onClose }: { initialType: WingType; onClose: () => void }) {
  const { addItem, openCart } = useCart();

  // For < 10pc: steps are 1=Qty, 3=Sauce, 4=Add-ons (skip step 2)
  // For >= 10pc: steps are 1=Qty, 2=FlavorMode, 3=Sauce, 4=Add-ons
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedRow, setSelectedRow] = useState<WingRow | null>(null);

  // Step 2
  const [isHalfHalf, setIsHalfHalf] = useState(false);

  // Step 3 — sauces
  const [flavor, setFlavor] = useState("");
  const [flavorA, setFlavorA] = useState("");
  const [flavorB, setFlavorB] = useState("");

  // Step 4 — add-ons
  const [addFries, setAddFries] = useState(false);
  const [ranchSize, setRanchSize] = useState<"none" | "2oz" | "6oz">("none");
  const [notes, setNotes] = useState("");

  // Derived
  const typeOption = TYPE_OPTIONS.find((t) => t.id === initialType)!;
  const rows = typeOption.rows;
  const qtyNum = selectedRow ? parseInt(selectedRow.qty.replace(/[^0-9]/g, ""), 10) : 0;
  const halfHalfEligible = qtyNum >= 10;
  const freeSauces = Math.floor(qtyNum / 10); // 1 free sauce per 10pc
  const basePrice = selectedRow ? parsePrice(selectedRow.price) : 0;
  const friesAddonPrice = selectedRow ? parsePrice(selectedRow.addFries) : 2;
  const ranchPrice = ranchSize === "2oz" ? 1.49 : ranchSize === "6oz" ? 2.49 : 0;
  const totalPrice = basePrice + (addFries ? friesAddonPrice : 0) + ranchPrice;

  const canProceedStep1 = selectedRow !== null;

  // When qty < 10, skip flavor mode step and go straight to sauce
  function handleProceedFromQty() {
    if (!canProceedStep1) return;
    const qty = parseInt(selectedRow!.qty.replace(/[^0-9]/g, ""), 10);
    if (qty >= 10) {
      setStep(2); // show flavor mode
    } else {
      setIsHalfHalf(false); // force one flavor
      setStep(3); // skip to sauce
    }
  }

  const canProceedStep3 = isHalfHalf
    ? flavorA !== "" && flavorB !== "" && flavorA !== flavorB
    : flavor !== "";

  const flavorSummary = isHalfHalf ? `½ ${flavorA} · ½ ${flavorB}` : flavor;

  function handleClose() {
    setStep(1);
    setSelectedRow(null);
    setIsHalfHalf(false);
    setFlavor("");
    setFlavorA("");
    setFlavorB("");
    setAddFries(false);
    setRanchSize("none");
    setNotes("");
    onClose();
  }

  function handleToggleHalfHalf(val: boolean) {
    setIsHalfHalf(val);
    setFlavor("");
    setFlavorA("");
    setFlavorB("");
  }

  // Clover catalog IDs
  const WINGS_CLOVER_IDS: Record<WingType, string> = {
    "Bone-In": "KQXZYE71T0EME",
    "Boneless": "5Y7Y3AQ23XFPG",
    "Chicken Fingers": "R71JXR9M68JNJ",
  };

  function handleAddToCart() {
    const parts: string[] = [];
    if (isHalfHalf) {
      parts.push(`Half & Half`);
      parts.push(`1st Half: ${flavorA}`);
      parts.push(`2nd Half: ${flavorB}`);
    } else {
      parts.push(`Sauce: ${flavor === "Plain" ? "Plain — no sauce" : flavor}`);
    }
    if (freeSauces > 0) parts.push(`Includes ${freeSauces} free sauce${freeSauces > 1 ? "s" : ""}`);
    if (addFries) parts.push(`+Fries ($${friesAddonPrice.toFixed(2)})`);
    if (ranchSize !== "none") parts.push(`Ranch ${ranchSize} ($${ranchPrice.toFixed(2)})`);
    if (notes.trim()) parts.push(`Note: ${notes.trim()}`);

    const description = parts.join(" · ");

    addItem({
      id: `wings-${initialType}-${selectedRow!.qty}-${flavorSummary}-${Date.now()}`,
      name: `${typeOption.label} (${selectedRow!.qty}) — ${isHalfHalf ? "Half & Half" : flavor}`,
      price: totalPrice,
      quantity: 1,
      category: "wings",
      description,
      cloverItemId: WINGS_CLOVER_IDS[initialType],
    });

    toast.success(`${typeOption.label} (${selectedRow!.qty}) added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });

    handleClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "oklch(0.08 0.02 27 / 0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: "white", maxHeight: "92dvh" }}
      >
        {/* ── Header with photo ── */}
        <div className="relative shrink-0" style={{ height: "120px" }}>
          <img
            src={typeOption.photo}
            alt={typeOption.label}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, oklch(0.15 0.08 27 / 0.4) 0%, oklch(0.08 0.05 27 / 0.85) 100%)" }} />
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-90"
            style={{ background: "oklch(0.15 0.05 27 / 0.7)", color: "white" }}
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-0 left-0 px-5 pb-3">
            <p className="napoli-label text-xs text-white opacity-70 tracking-widest">CUSTOMIZE YOUR ORDER</p>
            <h2 className="napoli-heading text-lg text-white drop-shadow">
              {typeOption.label}
              {selectedRow && <span className="text-sm font-normal opacity-80 ml-2">— {selectedRow.qty}</span>}
            </h2>
          </div>
        </div>

        {/* ── Step indicator — 3 steps for <10pc, 4 steps for 10pc+ ── */}
        <div
          className="flex items-center justify-center gap-2 px-5 py-2.5 shrink-0"
          style={{ background: "oklch(0.97 0.012 80)", borderBottom: "1px solid oklch(0.90 0.015 80)" }}
        >
          {halfHalfEligible ? (
            // 4-step indicator for 10pc+
            <>
              <StepDot num={1} label="Quantity" active={step === 1} done={step > 1} />
              <div className="w-5 h-0.5 rounded mb-3" style={{ background: step > 1 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)" }} />
              <StepDot num={2} label="Flavor Mode" active={step === 2} done={step > 2} />
              <div className="w-5 h-0.5 rounded mb-3" style={{ background: step > 2 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)" }} />
              <StepDot num={3} label="Sauce" active={step === 3} done={step > 3} />
              <div className="w-5 h-0.5 rounded mb-3" style={{ background: step > 3 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)" }} />
              <StepDot num={4} label="Add-ons" active={step === 4} done={false} />
            </>
          ) : (
            // 3-step indicator for <10pc (no Flavor Mode step)
            <>
              <StepDot num={1} label="Quantity" active={step === 1} done={step > 1} />
              <div className="w-8 h-0.5 rounded mb-3" style={{ background: step > 1 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)" }} />
              <StepDot num={2} label="Sauce" active={step === 3} done={step > 3} />
              <div className="w-8 h-0.5 rounded mb-3" style={{ background: step > 3 ? "var(--napoli-red)" : "oklch(0.88 0.015 80)" }} />
              <StepDot num={3} label="Add-ons" active={step === 4} done={false} />
            </>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1">

          {/* ══ STEP 1: QUANTITY ════════════════════════════════ */}
          {step === 1 && (
            <div className="px-5 py-5 flex flex-col gap-5">
              <div>
                <p className="napoli-label text-xs mb-2" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                  CHOOSE QUANTITY
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {rows.map((row) => {
                    const isActive = selectedRow?.qty === row.qty;
                    const qty = parseInt(row.qty.replace(/[^0-9]/g, ""), 10);
                    const freeSaucesForRow = Math.floor(qty / 10);
                    return (
                      <button
                        key={row.qty}
                        onClick={() => setSelectedRow(row)}
                        className="flex flex-col px-4 py-3 rounded-lg border-2 transition-all active:scale-[0.98] text-left"
                        style={{
                          borderColor: isActive ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                          background: isActive ? "oklch(0.97 0.04 27)" : "white",
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="text-sm font-bold" style={{ color: isActive ? "var(--napoli-red)" : "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                            {row.qty}
                          </div>
                          <span className="napoli-price text-base font-bold" style={{ color: isActive ? "var(--napoli-red)" : "oklch(0.35 0.04 30)" }}>
                            {row.price}
                          </span>
                        </div>
                        <div className="flex items-center justify-between w-full mt-0.5">
                          <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                            +Fries {row.addFries}
                          </div>
                          {freeSaucesForRow > 0 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.45 0.15 145)", color: "white", fontFamily: "'Lato', sans-serif" }}>
                              {freeSaucesForRow} free sauce{freeSaucesForRow > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleProceedFromQty}
                disabled={!canProceedStep1}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold napoli-label tracking-wider transition-all active:scale-95 disabled:opacity-40"
                style={{ background: canProceedStep1 ? "var(--napoli-red)" : "oklch(0.75 0.015 80)", color: "white" }}
              >
                {canProceedStep1 && qtyNum >= 10 ? "Next — Choose Flavor Mode" : "Next — Pick Sauce"} <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* ══ STEP 2: FLAVOR MODE ══════════════════════════════ */}
          {step === 2 && (
            <div className="px-5 py-5 flex flex-col gap-5">

              {/* Recap */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}>
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif" }}>
                    {typeOption.label} — {selectedRow!.qty}
                  </div>
                  <div className="text-xs" style={{ color: "oklch(0.52 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                    {selectedRow!.price}
                    {freeSauces > 0 && (
                      <span className="ml-2 font-semibold" style={{ color: "oklch(0.45 0.15 145)" }}>
                        · {freeSauces} free sauce{freeSauces > 1 ? "s" : ""} included
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs napoli-label underline shrink-0"
                  style={{ color: "oklch(0.52 0.03 30)" }}
                >
                  Change
                </button>
              </div>

              {/* Flavor mode */}
              <div>
                <p className="napoli-label text-xs mb-1" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                  HOW DO YOU WANT YOUR FLAVOR?
                </p>
                {!halfHalfEligible && (
                  <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                    Half &amp; Half is available for orders of 10pc or more.
                  </p>
                )}

                <div className="flex flex-col gap-3 mt-3">
                  <button
                    onClick={() => handleToggleHalfHalf(false)}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl border-2 text-left transition-all active:scale-[0.99]"
                    style={{
                      borderColor: !isHalfHalf ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
                      background: !isHalfHalf ? "oklch(0.97 0.04 27)" : "white",
                    }}
                  >
                    <span className="text-3xl">🍗</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                        One Flavor
                      </div>
                      <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                        All pieces tossed in the same sauce
                      </div>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: !isHalfHalf ? "var(--napoli-red)" : "oklch(0.75 0.015 80)" }}
                    >
                      {!isHalfHalf && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--napoli-red)" }} />}
                    </div>
                  </button>

                  <button
                    onClick={() => halfHalfEligible && handleToggleHalfHalf(true)}
                    disabled={!halfHalfEligible}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl border-2 text-left transition-all active:scale-[0.99] disabled:opacity-40"
                    style={{
                      borderColor: isHalfHalf ? "oklch(0.26 0.10 145)" : "oklch(0.88 0.015 80)",
                      background: isHalfHalf ? "oklch(0.97 0.06 145 / 0.20)" : "white",
                    }}
                  >
                    <span className="text-3xl"><Scissors size={28} style={{ color: "oklch(0.26 0.10 145)" }} /></span>
                    <div className="flex-1">
                      <div className="text-sm font-bold flex items-center gap-2" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                        Half &amp; Half
                        {!halfHalfEligible && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "oklch(0.88 0.015 80)", color: "oklch(0.52 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                            10pc+
                          </span>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                        Two different sauces — one for each half
                      </div>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: isHalfHalf ? "oklch(0.26 0.10 145)" : "oklch(0.75 0.015 80)" }}
                    >
                      {isHalfHalf && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.26 0.10 145)" }} />}
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95"
                  style={{ border: "1.5px solid oklch(0.82 0.015 80)", color: "oklch(0.40 0.04 30)", fontFamily: "'Oswald', sans-serif", background: "white" }}
                >
                  <ChevronLeft size={15} /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold napoli-label tracking-wider transition-all active:scale-95"
                  style={{ background: "var(--napoli-red)", color: "white" }}
                >
                  Next — Pick Sauce <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 3: SAUCE SELECTOR ═══════════════════════════ */}
          {step === 3 && (
            <div className="px-5 py-5 flex flex-col gap-4">

              {/* Recap bar */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                  {typeOption.label} ({selectedRow!.qty}) · {isHalfHalf ? "Half & Half" : "One Flavor"}
                </span>
                {freeSauces > 0 && (
                  <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: "oklch(0.45 0.15 145)", color: "white" }}>
                    {freeSauces} free sauce{freeSauces > 1 ? "s" : ""}
                  </span>
                )}
                <button
                  onClick={() => setStep(2)}
                  className="text-xs napoli-label underline shrink-0 ml-2"
                  style={{ color: "oklch(0.52 0.03 30)" }}
                >
                  Change
                </button>
              </div>

              {!isHalfHalf ? (
                <SauceSelector
                  title="CHOOSE YOUR SAUCE *"
                  accentBorder="var(--napoli-red)"
                  accentBg="oklch(0.99 0.02 27 / 0.15)"
                  selected={flavor}
                  onSelect={setFlavor}
                />
              ) : (
                <div className="space-y-4">
                  <SauceSelector
                    title="CHOOSE SAUCE FOR 1ST HALF"
                    accentBorder="var(--napoli-red)"
                    accentBg="oklch(0.99 0.02 27 / 0.15)"
                    label={`1ST HALF — ${Math.ceil(qtyNum / 2)}pc`}
                    selected={flavorA}
                    onSelect={setFlavorA}
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.015 80)" }} />
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold napoli-label" style={{ background: "oklch(0.26 0.10 145)", color: "white" }}>
                      <Scissors size={11} /> HALF &amp; HALF
                    </div>
                    <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.015 80)" }} />
                  </div>
                  <SauceSelector
                    title="CHOOSE SAUCE FOR 2ND HALF"
                    accentBorder="oklch(0.26 0.10 145)"
                    accentBg="oklch(0.97 0.06 145 / 0.15)"
                    label={`2ND HALF — ${Math.floor(qtyNum / 2)}pc`}
                    selected={flavorB}
                    onSelect={setFlavorB}
                  />
                  {flavorA && flavorB && flavorA === flavorB && (
                    <p className="text-xs font-semibold" style={{ color: "oklch(0.55 0.18 27)" }}>
                      ⚠️ Both halves have the same sauce — please choose different sauces for Half &amp; Half.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => halfHalfEligible ? setStep(2) : setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95"
                  style={{ border: "1.5px solid oklch(0.82 0.015 80)", color: "oklch(0.40 0.04 30)", fontFamily: "'Oswald', sans-serif", background: "white" }}
                >
                  <ChevronLeft size={15} /> Back
                </button>
                <button
                  onClick={() => canProceedStep3 && setStep(4)}
                  disabled={!canProceedStep3}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold napoli-label tracking-wider transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: canProceedStep3 ? "var(--napoli-red)" : "oklch(0.75 0.015 80)", color: "white" }}
                >
                  Next — Add-ons <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 4: ADD-ONS ══════════════════════════════════ */}
          {step === 4 && (
            <div className="px-5 py-5 flex flex-col gap-4">

              {/* Recap bar */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>
                  {typeOption.label} ({selectedRow!.qty}) · {flavorSummary}
                </span>
                <button
                  onClick={() => setStep(3)}
                  className="ml-auto text-xs napoli-label underline shrink-0"
                  style={{ color: "oklch(0.52 0.03 30)" }}
                >
                  Change
                </button>
              </div>

              <p className="napoli-label text-xs" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                OPTIONAL ADD-ONS
              </p>

              {/* Fries */}
              <div
                className="flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all"
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
                  <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>+${friesAddonPrice.toFixed(2)}</span>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                    style={{ background: addFries ? "var(--napoli-red)" : "oklch(0.93 0.012 80)", color: addFries ? "white" : "oklch(0.62 0.03 30)" }}
                  >
                    {addFries ? <Check size={13} /> : <span className="text-xs font-bold">+</span>}
                  </div>
                </div>
              </div>

              {/* Ranch */}
              <div>
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

              {/* Notes */}
              <div>
                <label className="block text-xs napoli-label mb-1.5" style={{ color: "oklch(0.42 0.03 30)", letterSpacing: "0.1em" }}>
                  📝 SPECIAL NOTES (OPTIONAL)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. extra crispy, sauce on the side..."
                  maxLength={200}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm napoli-body resize-none transition-all outline-none"
                  style={{
                    border: notes ? "2px solid var(--napoli-red)" : "2px solid oklch(0.88 0.015 80)",
                    color: "var(--napoli-dark)",
                    background: "white",
                  }}
                />
                <p className="text-right text-xs mt-0.5" style={{ color: "oklch(0.65 0.015 80)" }}>{notes.length}/200</p>
              </div>

              {/* Total + Add to Cart */}
              <div
                className="mt-2 flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.88 0.015 80)" }}
              >
                <div>
                  <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Order total</p>
                  <p className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>${totalPrice.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(3)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                    style={{ border: "1.5px solid oklch(0.82 0.015 80)", color: "oklch(0.40 0.04 30)", fontFamily: "'Oswald', sans-serif", background: "white" }}
                  >
                    <ChevronLeft size={13} /> Back
                  </button>
                  <button
                    onClick={handleAddToCart}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold napoli-label transition-all active:scale-95"
                    style={{ background: "var(--napoli-red)", color: "white" }}
                  >
                    <ShoppingCart size={16} /> Add to Cart
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
