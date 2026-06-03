/**
 * Napoli Pizzeria — Full Menu Page
 * All categories: Appetizers, Lunch Specials, Pizzeria, Wings, Pasta, Subs, Burgers, Salads, Desserts, Specials
 */
import React, { useState, useEffect, useRef } from "react";
import { useLunchTimer } from "@/hooks/useLunchTimer";
import LunchTimerBadge from "@/components/LunchTimerBadge";
import { ChevronDown, ChevronUp, Plus, X, ZoomIn } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateItem, translateCategory } from "@/lib/napoliTranslations";
import { toast } from "sonner";
import NapoliNavbar from "@/components/NapoliNavbar";
import MenuLightbox, { type LightboxItem } from "@/components/MenuLightbox";
import NapoliFooter from "@/components/NapoliFooter";
import WingsCustomizerModal, { type WingsSelection } from "@/components/WingsCustomizerModal";
import PizzaCustomizerModal, { type PizzaSelection } from "@/components/PizzaCustomizerModal";
import WrapCustomizerModal, { type WrapTrigger } from "@/components/WrapCustomizerModal";
import SubsCustomizerModal, { type SubsTrigger } from "@/components/SubsCustomizerModal";
import { CalzoneCustomizerModal, type CalzoneTrigger } from "@/components/CalzoneCustomizerModal";
import BurgerCustomizerModal, { type BurgerTrigger } from "@/components/BurgerCustomizerModal";
import AppetizersCustomizerModal, { type AppetizersModalTrigger, APPETIZER_MODAL_ITEMS } from "@/components/AppetizersCustomizerModal";
import SpecialCustomizerModal, { SPECIAL_CONFIGS } from "@/components/SpecialCustomizerModal";
import LunchCustomizerModal, { type LunchItem } from "@/components/LunchCustomizerModal";
import SaladsCustomizerModal, { type SaladsModalTrigger, SALAD_MODAL_ITEMS } from "@/components/SaladsCustomizerModal";
import PastaCustomizerModal, { type PastaModalTrigger, PASTA_MODAL_ITEMS } from "@/components/PastaCustomizerModal";
import GlutenFreePizzaModal from "@/components/GlutenFreePizzaModal";
import { LUNCH_SPECIALS, BURGERS } from "@/lib/napoliData";
import { getMenuPhoto, getBurgerPhoto } from "@/lib/napoliPhotos";
import { NutritionBadges } from "@/components/NutritionBadges";

function SectionHeader({ id, title, emoji, photo }: { id: string; title: string; emoji: string; photo?: string }) {
  const { lang } = useLanguage();
  const displayTitle = translateCategory(title, lang);
  if (photo) {
    return (
      <div
        id={id}
        className="relative overflow-hidden rounded-t-md scroll-mt-24"
        style={{ height: "140px" }}
      >
        <img
          src={photo}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(180,20,20,0.88) 0%, rgba(180,20,20,0.55) 60%, rgba(0,0,0,0.25) 100%)" }}
        />
        <div className="relative flex items-center gap-3 h-full px-5">
          <span className="text-3xl drop-shadow">{emoji}</span>
          <h2 className="napoli-label text-xl text-white tracking-widest drop-shadow-md">{displayTitle}</h2>
        </div>
      </div>
    );
  }
  return (
    <div
      id={id}
      className="flex items-center gap-3 py-3 px-5 rounded-t-md scroll-mt-24"
      style={{ background: "var(--napoli-red)" }}
    >
      <span className="text-xl">{emoji}</span>
      <h2 className="napoli-label text-base text-white tracking-widest">{displayTitle}</h2>
    </div>
  );
}

function MenuCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-b-md border border-t-0 bg-white mb-8"
      style={{ borderColor: "oklch(0.88 0.015 80)" }}
    >
      {children}
    </div>
  );
}

function parsePrice(priceStr?: string): number | null {
  if (!priceStr) return null;
  const match = priceStr.match(/\$([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Renders an item that has multiple size options (S/M/L etc.).
 * Each size becomes a button that adds that specific size+price to the cart.
 */
function MultiSizeItemRow({ name, desc, prices, highlight, category }: {
  name: string;
  desc?: string;
  prices: { size: string; price: string }[];
  highlight?: boolean;
  category?: string;
}) {
  const { addItem, openCart } = useCart();
  const { lang } = useLanguage();
  const translated = translateItem(name, desc, lang);

  const handleAdd = (size: string, priceStr: string) => {
    const numericPrice = parsePrice(priceStr);
    if (!numericPrice) return;
    const itemName = `${name} (${size})`;
    addItem({
      id: `${name}-${size}-${Date.now()}`,
      name: itemName,
      price: numericPrice,
      quantity: 1,
      category: category ?? "food",
      description: desc,
    });
    toast.success(`${itemName} added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });
  };

  const photo = getMenuPhoto(name);

  return (
    <div
      className="napoli-menu-item flex items-start gap-3 px-4 py-3 border-b last:border-b-0"
      style={{
        borderColor: "oklch(0.93 0.012 80)",
        background: highlight ? "oklch(0.99 0.02 65 / 0.4)" : "transparent",
      }}
    >
      {photo && (
        <div className="shrink-0 rounded overflow-hidden" style={{ width: 64, height: 64 }}>
          <img
            src={photo}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{translated.name}</span>
        {translated.desc && <p className="text-xs napoli-body mt-0.5 leading-relaxed" style={{ color: "oklch(0.52 0.03 30)" }}>{translated.desc}</p>}
        <NutritionBadges itemName={name} />
      </div>
      <div className="flex gap-2 shrink-0 flex-wrap justify-end">
        {prices.map((p) => {
          const numeric = parsePrice(p.price);
          return (
            <button
              key={p.size}
              onClick={() => handleAdd(p.size, p.price)}
              disabled={!numeric}
              className="flex flex-col items-center px-2.5 py-1.5 rounded border transition-all active:scale-95 hover:opacity-90"
              style={{
                borderColor: "var(--napoli-red)",
                background: "white",
                minWidth: "52px",
                cursor: numeric ? "pointer" : "default",
              }}
              title={numeric ? `Add ${name} (${p.size}) to cart` : undefined}
            >
              <span className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{p.size}</span>
              <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{p.price}</span>
              {numeric && (
                <Plus size={10} style={{ color: "var(--napoli-red)", marginTop: "2px" }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// WingsRow kept for compatibility but replaced inline in the wings section below
function WingsRow(_props: {
  qty: string;
  boneIn: { qty: string; price: string; addFries: string };
  boneless: { qty: string; price: string; addFries: string };
  fingers: { qty: string; price: string; addFries: string };
  onSelect: (sel: WingsSelection) => void;
}) { return null; }

function WingsTypeCard({
  type,
  label,
  description,
  photo,
  accentColor,
  rows,
  onSelect,
}: {
  type: WingsSelection["type"];
  label: string;
  description: string;
  photo: string;
  accentColor: string;
  rows: { qty: string; price: string; addFries: string }[];
  onSelect: (sel: WingsSelection) => void;
}) {
  return (
    <div className="flex flex-col" style={{ border: `1px solid oklch(0.88 0.015 80)`, borderRadius: "10px", overflow: "hidden", background: "white" }}>
      {/* Photo header */}
      <div className="relative" style={{ height: "120px" }}>
        <img src={photo} alt={label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.6) 100%)` }} />
        <div className="absolute bottom-0 left-0 px-3 pb-2">
          <span className="text-white font-bold text-sm napoli-label tracking-wide drop-shadow">{label}</span>
        </div>
      </div>
      {/* Description */}
      <div className="px-3 pt-2 pb-1">
        <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{description}</p>
        <NutritionBadges itemName={label} compact />
      </div>
      {/* Price rows */}
      <div className="flex-1 divide-y" style={{ borderColor: "oklch(0.93 0.012 80)" }}>
        {rows.map((row) => {
          const price = parsePrice(row.price);
          const friesAddon = parsePrice(row.addFries) ?? 2;
          return (
            <div key={row.qty} className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold napoli-price" style={{ background: "oklch(0.97 0.012 80)", color: "var(--napoli-dark)", border: "1px solid oklch(0.88 0.015 80)" }}>{row.qty}</span>
                <span className="text-xs napoli-body" style={{ color: "oklch(0.55 0.03 30)" }}>+Fries {row.addFries}</span>
              </div>
              <button
                onClick={() => price && onSelect({ type, qty: row.qty, basePrice: price, friesAddonPrice: friesAddon })}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95 hover:opacity-90"
                style={{ background: accentColor, color: "white", fontFamily: "'Oswald', sans-serif" }}
              >
                <Plus size={11} /> {row.price}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BurgerRow({
  item,
  onOpenModal,
}: {
  item: { name: string; desc?: string; half: string; single: string };
  onOpenModal: (burgerName: string, size: "half" | "single") => void;
}) {
  const photo = getBurgerPhoto(item.name);
  const halfPrice = parsePrice(item.half);
  const singlePrice = parsePrice(item.single);
  const [zoomOpen, setZoomOpen] = useState(false);

  return (
    <>
    {zoomOpen && photo && (
      <ImageZoomLightbox src={photo} alt={item.name} onClose={() => setZoomOpen(false)} />
    )}
    <div
      className="napoli-menu-item flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: "1px solid oklch(0.93 0.012 80)" }}
    >
      {/* Small square photo */}
      <div
        className="shrink-0 rounded overflow-hidden relative group"
        style={{ width: 68, height: 68, cursor: photo ? "zoom-in" : "default" }}
        onClick={() => photo && setZoomOpen(true)}
        title={photo ? "Click to enlarge" : undefined}
      >
        {photo ? (
          <>
            <img src={photo} alt={item.name} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ background: "rgba(0,0,0,0.35)" }}>
              <ZoomIn size={18} color="white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "oklch(0.95 0.012 80)" }}>
            <span style={{ fontSize: 28 }}>🍔</span>
          </div>
        )}
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight napoli-body" style={{ color: "var(--napoli-dark)" }}>{item.name}</p>
        {item.desc && (
          <p className="text-xs napoli-body mt-0.5 leading-snug" style={{ color: "oklch(0.52 0.03 30)" }}>{item.desc}</p>
        )}
        <NutritionBadges itemName={item.name} compact />
        <div className="flex gap-1.5 mt-1.5">
          {halfPrice && (
            <span className="text-xs font-medium" style={{ color: "oklch(0.52 0.03 30)" }}>½ lb {item.half}</span>
          )}
          {halfPrice && singlePrice && (
            <span className="text-xs" style={{ color: "oklch(0.75 0.01 80)" }}>·</span>
          )}
          {singlePrice && (
            <span className="text-xs font-medium" style={{ color: "oklch(0.52 0.03 30)" }}>1 lb {item.single}</span>
          )}
        </div>
      </div>

      {/* Single Order button */}
      <button
        onClick={() => onOpenModal(item.name, singlePrice ? "single" : "half")}
        className="shrink-0 flex items-center gap-1 px-3 py-2 rounded font-semibold text-xs transition-all active:scale-95 hover:opacity-90"
        style={{ background: "var(--napoli-red)", color: "white", whiteSpace: "nowrap" }}
      >
        <Plus size={12} />
        Order
      </button>
    </div>
    </>
  );
}

function AnytimeSpecialRow({
  item,
  onCustomize,
}: {
  item: { num: number; name: string; price: string };
  onCustomize: (num: number) => void;
}) {
  const { lang } = useLanguage();
  const translated = translateItem(item.name, undefined, lang);
  return (
    <div
      className="napoli-menu-item flex items-center gap-3 px-5 py-4 border-b"
      style={{ borderColor: "oklch(0.93 0.012 80)" }}
    >
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 napoli-price"
        style={{ background: "var(--napoli-green)", color: "white" }}
      >
        {item.num}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{translated.name}</span>
        <NutritionBadges itemName={item.name} compact />
      </div>
      <span className="napoli-price text-sm shrink-0" style={{ color: "var(--napoli-red)" }}>{item.price}</span>
      <button
        onClick={() => onCustomize(item.num)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold transition-all active:scale-95 hover:opacity-90 shrink-0"
        style={{ background: "var(--napoli-green)", color: "white", fontFamily: "'Oswald', sans-serif" }}
        title={`Customize #${item.num} ${item.name}`}
      >
        <Plus size={11} /> Order
      </button>
    </div>
  );
}

function ImageZoomLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-90"
        style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
        aria-label="Close"
      >
        <X size={20} />
      </button>
      <div
        className="relative max-w-[90vw] max-h-[85vh] rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "zoomIn 200ms cubic-bezier(0.23,1,0.32,1)" }}
      >
        <img
          src={src}
          alt={alt}
          className="block max-w-full max-h-[85vh] object-contain"
          style={{ minWidth: 200, minHeight: 200 }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 px-4 py-2 text-center text-sm font-semibold"
          style={{ background: "rgba(0,0,0,0.55)", color: "white", backdropFilter: "blur(2px)" }}
        >
          {alt}
        </div>
      </div>
      <style>{`
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function AppetizersItemRow({
  name,
  desc,
  price,
  highlight,
  onOpen,
}: {
  name: string;
  desc?: string;
  price?: string;
  highlight?: boolean;
  onOpen: () => void;
}) {
  const { lang } = useLanguage();
  const translated = translateItem(name, desc, lang);
  const photo = getMenuPhoto(name);
  const [zoomOpen, setZoomOpen] = useState(false);
  return (
    <>
    {zoomOpen && photo && (
      <ImageZoomLightbox src={photo} alt={translated.name} onClose={() => setZoomOpen(false)} />
    )}
    <div
      className="napoli-menu-item flex items-start gap-3 px-4 py-3 border-b last:border-b-0"
      style={{ borderColor: "oklch(0.93 0.012 80)", background: highlight ? "oklch(0.99 0.02 65 / 0.25)" : undefined }}
    >
      {photo && (
        <div
          className="shrink-0 rounded overflow-hidden relative cursor-zoom-in group"
          style={{ width: 64, height: 64 }}
          onClick={() => setZoomOpen(true)}
          title="Click to enlarge"
        >
          <img src={photo} alt={name} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ background: "rgba(0,0,0,0.35)" }}>
            <ZoomIn size={18} color="white" />
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {highlight && <span className="napoli-badge-gold text-xs">Popular</span>}
          <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{translated.name}</span>
        </div>
        {translated.desc && (
          <p className="text-xs napoli-body mt-0.5 leading-relaxed" style={{ color: "oklch(0.52 0.03 30)" }}>{translated.desc}</p>
        )}
        <NutritionBadges itemName={name} />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {price && (
          <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{price}</span>
        )}
        <button
          onClick={onOpen}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 hover:opacity-90"
          style={{ background: "var(--napoli-red)", color: "white" }}
          title={`Customize ${name}`}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
    </>
  );
}

// ── KIDS MENU GRID ──────────────────────────────────────────────────────────
const SAUCE_ITEMS = new Set(["Ziti w/ Marinara or Butter", "Spaghetti w/ Marinara or Butter"]);
function KidsMenuCard({
  item,
  price,
  addItem,
  openCart,
}: {
  item: string;
  price: string;
  addItem: ReturnType<typeof useCart>["addItem"];
  openCart: () => void;
}) {
  const photo = getMenuPhoto(item);
  const numericPrice = parseFloat(price.replace("$", ""));
  const hasSauceChoice = SAUCE_ITEMS.has(item);
  const [showSaucePicker, setShowSaucePicker] = React.useState(false);
  const { t, lang } = useLanguage();
  const translated = translateItem(item, undefined, lang);

  const confirmAdd = (sauce: "Marinara" | "Butter") => {
    const itemName = `${item} (${sauce})`;
    addItem({
      id: `kids-${item}-${sauce}-${Date.now()}`,
      name: itemName,
      price: numericPrice,
      quantity: 1,
      category: "childrens-menu",
      description: `Sauce: ${sauce}`,
    });
    toast.success(`${itemName} added to cart!`, {
      action: { label: t.ui.viewCart, onClick: openCart },
    });
    setShowSaucePicker(false);
  };

  const handleAdd = () => {
    if (hasSauceChoice) {
      setShowSaucePicker(true);
    } else {
      addItem({
        id: `kids-${item}-${Date.now()}`,
        name: item,
        price: numericPrice,
        quantity: 1,
        category: "childrens-menu",
      });
      toast.success(`${item} added to cart!`, {
        action: { label: t.ui.viewCart, onClick: openCart },
      });
    }
  };

  return (
    <>
      <div
        className="napoli-menu-item flex items-start gap-3 px-4 py-3 border-b last:border-b-0"
        style={{ borderColor: "oklch(0.93 0.012 80)" }}
      >
        {/* Square photo */}
        {photo && (
          <div className="shrink-0 rounded overflow-hidden" style={{ width: 64, height: 64 }}>
            <img src={photo} alt={item} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{translated.name}</span>
          {hasSauceChoice && (
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
              {lang === "es" ? "Elige salsa al ordenar" : "Choose sauce when ordering"}
            </p>
          )}
          <NutritionBadges itemName={item} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{price}</span>
          <button
            onClick={handleAdd}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 hover:opacity-90"
            style={{ background: "var(--napoli-red)", color: "white" }}
            title={`Add ${item} to cart`}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Sauce picker modal */}
      {showSaucePicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowSaucePicker(false)}
        >
          <div
            className="rounded-xl shadow-2xl p-6 mx-4 w-full max-w-xs"
            style={{ background: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              {photo && (
                <div className="shrink-0 rounded overflow-hidden" style={{ width: 44, height: 44 }}>
                  <img src={photo} alt={item} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif" }}>
                  {translated.name}
                </p>
                <p className="text-xs" style={{ color: "oklch(0.52 0.03 30)" }}>{price}</p>
              </div>
            </div>

            <hr className="my-3" style={{ borderColor: "oklch(0.93 0.012 80)" }} />

            <p className="text-sm font-semibold mb-3" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif" }}>
              {lang === "es" ? "¿Con qué salsa?" : "Choose your sauce:"}
            </p>

            <div className="flex flex-col gap-2">
              {(["Marinara", "Butter"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => confirmAdd(s)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 hover:opacity-90"
                  style={{
                    background: s === "Marinara" ? "var(--napoli-red)" : "oklch(0.96 0.015 80)",
                    color: s === "Marinara" ? "white" : "var(--napoli-dark)",
                    border: s === "Butter" ? "1px solid oklch(0.80 0.015 80)" : "none",
                    fontFamily: "'Oswald', sans-serif",
                    letterSpacing: "0.03em",
                  }}
                >
                  {s === "Marinara" ? (lang === "es" ? "Marinara" : "Marinara") : (lang === "es" ? "Mantequilla" : "Butter")}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowSaucePicker(false)}
              className="w-full mt-3 py-2 rounded-lg text-xs transition-all active:scale-95"
              style={{ color: "oklch(0.52 0.03 30)", background: "transparent" }}
            >
              {lang === "es" ? "Cancelar" : "Cancel"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function KidsMenuGrid({
  price,
  items,
  addItem,
  openCart,
}: {
  price: string;
  items: string[];
  addItem: ReturnType<typeof useCart>["addItem"];
  openCart: () => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ borderTop: "1px solid oklch(0.93 0.012 80)" }}>
      {items.map((item) => (
        <div key={item} style={{ borderBottom: "1px solid oklch(0.93 0.012 80)", borderRight: "1px solid oklch(0.93 0.012 80)" }}>
          <KidsMenuCard item={item} price={price} addItem={addItem} openCart={openCart} />
        </div>
      ))}
    </div>
  );
}

// ── Clover-Synced DB Items Section ──────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; emoji: string; photo?: string; order: number }> = {
  appetizer: { label: "Appetizers", emoji: "🧅", photo: "/manus-storage/napoli-appetizers_dc37c73d.jpg", order: 1 },
  lunch:     { label: "Lunch Specials", emoji: "🕙", photo: "/manus-storage/napoli-lunch_94df386a.jpg", order: 2 },
  pizza:     { label: "Pizzeria", emoji: "🍕", photo: "/manus-storage/napoli-pizza-header_a1b2c3d4.jpg", order: 3 },
  wings:     { label: "Wings", emoji: "🍗", order: 4 },
  pasta:     { label: "Pasta", emoji: "🍝", order: 5 },
  sandwich:  { label: "Subs & Sandwiches", emoji: "🥖", order: 6 },
  burger:    { label: "Burgers", emoji: "🍔", order: 7 },
  salad:     { label: "Salads", emoji: "🥗", order: 8 },
  sides:     { label: "Sides", emoji: "🍟", order: 9 },
  dessert:   { label: "Desserts", emoji: "🍰", order: 10 },
  kids:      { label: "Children's Menu", emoji: "🧒", order: 11 },
  beverage:  { label: "Beverages", emoji: "🥤", order: 12 },
  special:   { label: "Anytime Specials", emoji: "⭐", photo: "/manus-storage/napoli-specials-header_30ef5751.jpg", order: 13 },
  catering:  { label: "Catering", emoji: "🍽️", order: 14 },
  soup:      { label: "Soups", emoji: "🍲", order: 15 },
};

// ── Helpers for routing Clover items to customizer modals ─────────────────────

/** Parse the #N prefix from a Clover special item name, e.g. "#5 - 24 \" Cheese Pizza..." → 5 */
function parseSpecialNum(name: string): number | null {
  const m = name.match(/^#\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Return true if the item name looks like an Anytime Special (has pizza size like 16", 28") */
function isAnytimeSpecial(name: string): boolean {
  return /\d+"/.test(name) || /\d+\s*inch/i.test(name);
}

interface CloverSyncedItemsProps {
  addItem: (item: { id: string; name: string; price: number; quantity: number; category: string; cloverItemId?: string }) => void;
  onPizzaCustomize: (sel: PizzaSelection) => void;
  onWingsCustomize: (sel: WingsSelection) => void;
  onBurgerCustomize: (trigger: BurgerTrigger) => void;
  onWrapCustomize: (trigger: WrapTrigger) => void;
  onSubsCustomize: (trigger: SubsTrigger) => void;
  onCalzoneCustomize: (trigger: CalzoneTrigger) => void;
  onAppetizersCustomize: (trigger: AppetizersModalTrigger) => void;
  onSaladsCustomize: (trigger: SaladsModalTrigger) => void;
  onPastaCustomize: (trigger: PastaModalTrigger) => void;
  onSpecialCustomize: (num: number) => void;
  onLunchCustomize: (item: LunchItem) => void;
  onGlutenFreeOpen: () => void;
}

const LUNCH_NEEDS_CUSTOMIZER = new Set([2, 3, 4, 6, 9, 13, 16, 19, 24]);

function CloverSyncedItems({
  addItem,
  onPizzaCustomize,
  onWingsCustomize,
  onBurgerCustomize,
  onWrapCustomize,
  onSubsCustomize,
  onCalzoneCustomize,
  onAppetizersCustomize,
  onSaladsCustomize,
  onPastaCustomize,
  onSpecialCustomize,
  onLunchCustomize,
  onGlutenFreeOpen,
}: CloverSyncedItemsProps) {
  const { data: items, isLoading } = trpc.menuItems.list.useQuery(
    { includeUnavailable: false },
    { staleTime: 5 * 60 * 1000 }
  );
  const [lightboxState, setLightboxState] = useState<{ items: LightboxItem[]; catKey: string; index: number } | null>(null);
  const lunchTimer = useLunchTimer();
  const { lang } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--napoli-red)", borderTopColor: "transparent" }} />
          <p className="text-sm napoli-body" style={{ color: "oklch(0.55 0.03 30)" }}>Loading menu…</p>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  // Group by category, skip "fee" items
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const cat = item.category || "special";
    if (cat === "fee") return acc;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Sort categories by defined order
  const sortedCats = Object.keys(grouped).sort((a, b) => {
    const oa = CATEGORY_META[a]?.order ?? 99;
    const ob = CATEGORY_META[b]?.order ?? 99;
    return oa - ob;
  });

  return (
    <>
      {lightboxState && (
        <MenuLightbox
          items={lightboxState.items}
          currentIndex={lightboxState.index}
          onClose={() => setLightboxState(null)}
          onNavigate={(i) => setLightboxState((s) => s ? { ...s, index: i } : null)}
        />
      )}
      {sortedCats.map((cat) => {
        const catItems = grouped[cat];
        const meta = CATEGORY_META[cat] ?? { label: cat.charAt(0).toUpperCase() + cat.slice(1), emoji: "🍽️", order: 99 };
        const isLunch = cat === "lunch";

        // Build lightbox items for this category (use photo fallback)
        const sectionLightboxItems: LightboxItem[] = catItems.map((ci) => ({
          cloverId: ci.cloverItemId ?? ci.id.toString(),
          name: ci.name,
          imageUrl: ci.imageUrl ?? getMenuPhoto(ci.name),
          price: Math.round(parseFloat(ci.price) * 100),
          description: ci.description,
        }));

        return (
          <React.Fragment key={cat}>
            {/* Section header */}
            {meta.photo ? (
              <div
                id={cat}
                className="relative overflow-hidden rounded-t-md scroll-mt-24 mt-2"
                style={{ height: "140px" }}
              >
                <img src={meta.photo} alt={meta.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(180,20,20,0.88) 0%, rgba(180,20,20,0.55) 60%, rgba(0,0,0,0.25) 100%)" }} />
                <div className="relative flex items-center h-full px-5">
                  <span className="text-3xl drop-shadow">{meta.emoji}</span>
                  <h2 className="napoli-label text-xl text-white tracking-widest drop-shadow-md ml-3">{translateCategory(meta.label, lang)}</h2>
                </div>
              </div>
            ) : (
              <div
                id={cat}
                className="flex items-center gap-3 py-3 px-5 rounded-t-md scroll-mt-24 mt-2"
                style={{ background: "var(--napoli-red)" }}
              >
                <span className="text-xl">{meta.emoji}</span>
                <h2 className="napoli-label text-base text-white tracking-widest">{translateCategory(meta.label, lang)}</h2>
              </div>
            )}

            <div className="rounded-b-md border border-t-0 bg-white mb-6" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
              {/* Lunch timer bar */}
              {isLunch && (
                <div
                  className="px-5 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                  style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="napoli-badge-green">Mon–Fri 10AM–3PM Only</span>
                    <span className="napoli-label text-xs font-bold" style={{ color: "var(--napoli-green)" }}>
                      🥤 FREE Can of Soda with any Lunch Special!
                    </span>
                  </div>
                  <LunchTimerBadge />
                </div>
              )}
              {isLunch && !lunchTimer.isOpen && lunchTimer.hasStarted && (
                <div className="px-5 py-4 text-center" style={{ background: "oklch(0.96 0.01 30)" }}>
                  <p className="napoli-label text-sm font-bold" style={{ color: "oklch(0.45 0.06 30)" }}>
                    🔒 Lunch Specials are only available 10 AM – 3 PM
                  </p>
                </div>
              )}

              {/* ── Pizza category: single entry point ── */}
              {cat === "pizza" && (
                <div className="px-5 py-6 flex flex-col gap-4">
                  {/* Hero CTA */}
                  <div
                    className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-xl"
                    style={{ background: "linear-gradient(135deg, oklch(0.97 0.04 27) 0%, oklch(0.99 0.015 80) 100%)", border: "2px solid var(--napoli-red)" }}
                  >
                    <div className="text-5xl">🍕</div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>Hand Tossed New York Style</h3>
                      <p className="text-sm mt-0.5" style={{ color: "oklch(0.45 0.03 30)", fontFamily: "'Lato', sans-serif" }}>Choose your pizza, size, toppings & cut — step by step</p>
                      <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>Sizes: 10" · 14" · 16" · 18" · 24" · 28" · 30" · 36" · Gluten Free 14"</p>
                    </div>
                    <button
                      onClick={() => onPizzaCustomize({ isSpecialty: false, freeToppings: 0, allowHalfAndHalf: true })}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 hover:opacity-90 shrink-0"
                      style={{ background: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}
                    >
                      <span className="text-base">🍕</span> Build My Pizza
                    </button>
                  </div>

                  {/* Quick specialty shortcuts */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>Popular Specialties — tap to start</p>
                    <div className="flex flex-wrap gap-2">
                      {["BBQ Chicken", "Buffalo Chicken", "Supreme", "Meat Lover", "Vegetarian", "3 Cheese", "Italian", "Taco", "Greek", "White Pizza", "Ranch", "Pesto Chicken"].map((name) => (
                        <button
                          key={name}
                          onClick={() => onPizzaCustomize({ pizzaName: name, isSpecialty: true, freeToppings: 0, allowHalfAndHalf: true })}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all active:scale-95 hover:border-red-600 hover:text-red-700"
                          style={{ borderColor: "oklch(0.82 0.015 80)", color: "oklch(0.35 0.04 30)", background: "white", fontFamily: "'Lato', sans-serif" }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gluten Free shortcut */}
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "oklch(0.96 0.06 145 / 0.20)", border: "1px solid oklch(0.80 0.10 145)" }}>
                    <span className="text-xl">🌾</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: "var(--napoli-green)", fontFamily: "'Oswald', sans-serif" }}>Gluten Free Pizza — 14"</p>
                      <p className="text-xs" style={{ color: "oklch(0.45 0.03 30)", fontFamily: "'Lato', sans-serif" }}>$12.75 base · +$2.75/topping</p>
                    </div>
                    <button
                      onClick={() => onGlutenFreeOpen()}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                      style={{ background: "var(--napoli-green)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                    >
                      Order
                    </button>
                  </div>
                </div>
              )}

              {/* ── Wings category: single entry point ── */}
              {cat === "wings" && (
                <div className="px-5 py-6 flex flex-col gap-4">
                  {/* Hero CTA */}
                  <div
                    className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-xl"
                    style={{ background: "linear-gradient(135deg, oklch(0.97 0.04 27) 0%, oklch(0.99 0.015 80) 100%)", border: "2px solid var(--napoli-red)" }}
                  >
                    <div className="text-5xl">🍗</div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>Wings, Boneless & Tenders</h3>
                      <p className="text-sm mt-0.5" style={{ color: "oklch(0.45 0.03 30)", fontFamily: "'Lato', sans-serif" }}>Choose type, quantity, flavor & extras — step by step</p>
                      <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>12 sauces · Half &amp; Half available for 10pc+</p>
                    </div>
                  </div>

                  {/* 3 type cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      { type: "Bone-In" as const, label: "Wings", emoji: "🍗", desc: "Classic bone-in · 6pc–80pc", from: "From $11.49" },
                      { type: "Boneless" as const, label: "Boneless Wings", emoji: "🍖", desc: "All-meat bites · 6pc–80pc", from: "From $9.49" },
                      { type: "Chicken Fingers" as const, label: "Tenders", emoji: "🍤", desc: "Hand-breaded · 5pc–80pc", from: "From $13.49" },
                    ] as const).map(({ type, label, emoji, desc, from }) => (
                      <button
                        key={type}
                        onClick={() => onWingsCustomize({ type, qty: "6pc", basePrice: 0, friesAddonPrice: 2 })}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all active:scale-[0.98] hover:border-red-600"
                        style={{ borderColor: "oklch(0.88 0.015 80)", background: "white" }}
                      >
                        <span className="text-3xl">{emoji}</span>
                        <div className="text-center">
                          <div className="text-sm font-bold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>{label}</div>
                          <div className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>{desc}</div>
                          <div className="text-xs font-bold mt-1" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>{from}</div>
                        </div>
                        <div
                          className="w-full py-1.5 rounded-lg text-xs font-bold text-center transition-all"
                          style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                        >
                          Order
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Flavors preview */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>Available Sauces &amp; Dry Rubs</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["Plain", "Mild", "Medium", "Hot", "Extra Hot", "BBQ", "Spicy Honey BBQ", "Lemon Pepper", "Teriyaki", "Spicy Teriyaki", "Sweet Red Chili", "Mango Habanero"].map((f) => (
                        <span
                          key={f}
                          className="px-2.5 py-1 rounded-full text-xs border"
                          style={{ borderColor: "oklch(0.88 0.015 80)", color: "oklch(0.40 0.04 30)", background: "white", fontFamily: "'Lato', sans-serif" }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Burger category: single entry point per type ── */}
              {cat === "burger" && (
                <div className="px-5 py-6 flex flex-col gap-4">
                  {/* Hero CTA */}
                  <div
                    className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-xl"
                    style={{ background: "linear-gradient(135deg, oklch(0.97 0.04 27) 0%, oklch(0.99 0.015 80) 100%)", border: "2px solid var(--napoli-red)" }}
                  >
                    <div className="text-5xl">🍔</div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>100% Angus Beef Burgers</h3>
                      <p className="text-sm mt-0.5" style={{ color: "oklch(0.45 0.03 30)", fontFamily: "'Lato', sans-serif" }}>Choose your burger, size, doneness, sauces &amp; extras — step by step</p>
                      <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>½ lb from $11.49 · 1 lb from $14.49 · Gluten Free Bread available</p>
                    </div>
                  </div>

                  {/* One card per burger type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {BURGERS.items.map((b) => (
                      <button
                        key={b.name}
                        onClick={() => onBurgerCustomize({ open: true, preselectedBurger: b.name })}
                        className="flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] hover:border-red-600"
                        style={{ borderColor: "oklch(0.88 0.015 80)", background: "white" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold leading-tight" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>{b.name}</p>
                            {b.desc && (
                              <p className="text-xs mt-0.5 leading-tight" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>{b.desc}</p>
                            )}
                          </div>
                          <span className="text-xl shrink-0">🍔</span>
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <div>
                            <span className="text-xs font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>{b.half}</span>
                            <span className="text-xs" style={{ color: "oklch(0.65 0.015 80)", fontFamily: "'Lato', sans-serif" }}> / {b.single}</span>
                          </div>
                          <div
                            className="px-3 py-1 rounded-lg text-xs font-bold"
                            style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                          >
                            Order
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Included toppings note */}
                  <div
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.90 0.015 80)" }}
                  >
                    <span className="text-base shrink-0">ℹ️</span>
                    <p className="text-xs" style={{ color: "oklch(0.45 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                      All burgers include: <strong>Cheese, Lettuce, Tomatoes, Onions, Pickles &amp; Mayo</strong>. You can remove any ingredient during checkout. Add Cheese +$1 · Add Bacon +$1 · Add Avocado +$1.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ borderTop: "1px solid oklch(0.93 0.012 80)", display: (cat === "pizza" || cat === "wings" || cat === "burger") ? "none" : undefined }}>
                {catItems.map((item, itemIdx) => {
                  const price = parseFloat(item.price);
                  const photo = item.imageUrl ?? (cat === "burger" ? getBurgerPhoto(item.name) : getMenuPhoto(item.name));
                  const isLunchOpen = !isLunch || lunchTimer.isOpen;

                  // ── Determine if this item needs a customizer modal ──
                  const needsCustomizer = (() => {
                    if (cat === "pizza") return true;
                    if (cat === "wings") return true;
                    if (cat === "burger") return true;
                    if (cat === "sandwich") return true;
                    if (cat === "appetizer") return APPETIZER_MODAL_ITEMS.includes(item.name);
                    if (cat === "salad") return SALAD_MODAL_ITEMS.includes(item.name);
                    if (cat === "pasta") return PASTA_MODAL_ITEMS.includes(item.name);
                    if (cat === "special" || cat === "lunch") {
                      const num = parseSpecialNum(item.name);
                      if (num === null) return false;
                      // Anytime Special: name contains a pizza size like 16", 28"
                      if (isAnytimeSpecial(item.name)) {
                        return SPECIAL_CONFIGS.some((s) => s.num === num);
                      }
                      // Lunch Special: needs customizer for certain numbers
                      return LUNCH_NEEDS_CUSTOMIZER.has(num);
                    }
                    return false;
                  })();

                  // ── Handler: route to correct customizer or direct add ──
                  const handleAdd = () => {
                    if (!isLunchOpen) return;
                    if (!needsCustomizer || price <= 0) {
                      addItem({ id: `clover-${item.id}-${Date.now()}`, name: item.name, price, quantity: 1, category: cat, cloverItemId: item.cloverItemId ?? undefined });
                      toast.success(`${item.name} added to cart!`);
                      return;
                    }
                    // Route to the appropriate customizer
                    if (cat === "pizza") {
                      onPizzaCustomize({ pizzaName: item.name, isSpecialty: false, freeToppings: 0, allowHalfAndHalf: true });
                      return;
                    }
                    if (cat === "wings") {
                      // Parse type and qty from name, e.g. "10pc Bone-In Wings"
                      const nameLower = item.name.toLowerCase();
                      const type: WingsSelection["type"] = nameLower.includes("boneless") ? "Boneless" : nameLower.includes("finger") ? "Chicken Fingers" : "Bone-In";
                      const qtyMatch = item.name.match(/(\d+)\s*pc/i);
                      const qty = qtyMatch ? `${qtyMatch[1]}pc` : "6pc";
                      const friesAddon = price >= 50 ? 4 : 2;
                      onWingsCustomize({ type, qty, basePrice: price, friesAddonPrice: friesAddon });
                      return;
                    }
                    if (cat === "burger") {
                      onBurgerCustomize({ open: true, preselectedBurger: item.name });
                      return;
                    }
                    if (cat === "sandwich") {
                      const nameLower = item.name.toLowerCase();
                      if (nameLower.includes("wrap")) {
                        onWrapCustomize({ basePrice: price });
                      } else {
                        const isTripleDecker = nameLower.includes("triple decker");
                        onSubsCustomize({ subName: item.name, basePrice: price, showAddons: !isTripleDecker });
                      }
                      return;
                    }
                    if (cat === "appetizer") {
                      onAppetizersCustomize({ itemName: item.name });
                      return;
                    }
                    if (cat === "salad") {
                      onSaladsCustomize({ itemName: item.name });
                      return;
                    }
                    if (cat === "pasta") {
                      onPastaCustomize({ itemName: item.name });
                      return;
                    }
                    if (cat === "special" || cat === "lunch") {
                      const num = parseSpecialNum(item.name);
                      if (num === null) {
                        addItem({ id: `clover-${item.id}-${Date.now()}`, name: item.name, price, quantity: 1, category: cat, cloverItemId: item.cloverItemId ?? undefined });
                        toast.success(`${item.name} added to cart!`);
                        return;
                      }
                      if (isAnytimeSpecial(item.name)) {
                        onSpecialCustomize(num);
                      } else {
                        // Lunch special — find the matching LUNCH_SPECIALS entry
                        const lunchEntry = LUNCH_SPECIALS.items.find((ls) => ls.num === num);
                        if (lunchEntry) {
                          onLunchCustomize({ num: lunchEntry.num, name: lunchEntry.name, price: `$${price.toFixed(2)}` });
                        } else {
                          addItem({ id: `clover-${item.id}-${Date.now()}`, name: item.name, price, quantity: 1, category: cat, cloverItemId: item.cloverItemId ?? undefined });
                          toast.success(`${item.name} added to cart!`);
                        }
                      }
                      return;
                    }
                    // Fallback: direct add
                    addItem({ id: `clover-${item.id}-${Date.now()}`, name: item.name, price, quantity: 1, category: cat, cloverItemId: item.cloverItemId ?? undefined });
                    toast.success(`${item.name} added to cart!`);
                  };

                  return (
                    <div
                      key={item.id}
                      className="napoli-menu-item flex items-center gap-3 px-4 py-3 border-b border-r"
                      style={{ borderColor: "oklch(0.93 0.012 80)", opacity: isLunchOpen ? 1 : 0.5 }}
                    >
                      {photo ? (
                        <div
                          className="shrink-0 rounded overflow-hidden relative group cursor-zoom-in"
                          style={{ width: 56, height: 56 }}
                          onClick={() => setLightboxState({ items: sectionLightboxItems, catKey: cat, index: itemIdx })}
                          title="Click to enlarge"
                        >
                          <img src={photo} alt={item.name} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ background: "rgba(0,0,0,0.35)" }}>
                            <ZoomIn size={16} color="white" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-2xl shrink-0">{meta.emoji}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="napoli-body text-sm font-bold leading-tight" style={{ color: "var(--napoli-dark)" }}>{item.name}</p>
                        {item.description && (
                          <p className="text-xs napoli-body mt-0.5 line-clamp-2" style={{ color: "oklch(0.52 0.03 30)" }}>{item.description}</p>
                        )}
                        {price === 0 && (
                          <p className="text-xs napoli-body mt-0.5 italic" style={{ color: "oklch(0.52 0.03 30)" }}>See options</p>
                        )}
                        <NutritionBadges itemName={item.name} compact />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {price > 0 && (
                          <span className="napoli-price text-sm font-bold" style={{ color: isLunchOpen ? "var(--napoli-red)" : "oklch(0.55 0.02 30)" }}>${price.toFixed(2)}</span>
                        )}
                        {price > 0 && (
                          <button
                            disabled={!isLunchOpen}
                            onClick={handleAdd}
                            className={needsCustomizer
                              ? "flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold transition-all active:scale-95 hover:opacity-90 shrink-0"
                              : "w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"}
                            style={{ background: isLunchOpen ? "var(--napoli-red)" : "oklch(0.55 0.02 30)", color: "white", cursor: isLunchOpen ? "pointer" : "not-allowed", fontFamily: needsCustomizer ? "'Oswald', sans-serif" : undefined }}
                          >
                            <Plus size={needsCustomizer ? 11 : 13} />
                            {needsCustomizer && <span>Order</span>}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
}

export default function Menu() {
  const { addItem, openCart } = useCart();
  const { lang, t } = useLanguage();
  const lunchTimer = useLunchTimer();
  const [activeCategory, setActiveCategory] = useState("appetizers");
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [showAllToppings, setShowAllToppings] = useState(false);
  const [wingsSelection, setWingsSelection] = useState<WingsSelection | null>(null);
  const [wingsModalKey, setWingsModalKey] = useState(0);
  const [pizzaSelection, setPizzaSelection] = useState<PizzaSelection | null>(null);
  const [pizzaModalKey, setPizzaModalKey] = useState(0);
  const [wrapTrigger, setWrapTrigger] = useState<WrapTrigger | null>(null);
  const [wrapModalKey, setWrapModalKey] = useState(0);
  const [subsTrigger, setSubsTrigger] = useState<SubsTrigger | null>(null);
  const [subsModalKey, setSubsModalKey] = useState(0);
  const [calzoneTrigger, setCalzoneTrigger] = useState<CalzoneTrigger | null>(null);
  const [burgerTrigger, setBurgerTrigger] = useState<BurgerTrigger | null>(null);
  const [burgerModalKey, setBurgerModalKey] = useState(0);
  const [calzoneModalKey, setCalzoneModalKey] = useState(0);
  const [appetizersModalTrigger, setAppetizersModalTrigger] = useState<AppetizersModalTrigger | null>(null);
  const [saladsModalTrigger, setSaladsModalTrigger] = useState<SaladsModalTrigger | null>(null);
  const [pastaModalTrigger, setPastaModalTrigger] = useState<PastaModalTrigger | null>(null);
  const [glutenFreeModalOpen, setGlutenFreeModalOpen] = useState(false);
  const [specialNum, setSpecialNum] = useState<number | null>(null);
  const [lunchItem, setLunchItem] = useState<LunchItem | null>(null);

  // Auto-scroll the sticky nav bar to center the active category button
  const scrollNavToActive = (id: string) => {
    const nav = navScrollRef.current;
    if (!nav) return;
    const btn = nav.querySelector<HTMLElement>(`[data-cat-id="${id}"]`);
    if (!btn) return;
    const navWidth = nav.offsetWidth;
    const btnLeft = btn.offsetLeft;
    const btnWidth = btn.offsetWidth;
    nav.scrollTo({ left: btnLeft - navWidth / 2 + btnWidth / 2, behavior: "smooth" });
  };

  const scrollTo = (id: string) => {
    setActiveCategory(id);
    scrollNavToActive(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Update active category as user scrolls through the menu
  useEffect(() => {
    const sectionIds = Object.keys(CATEGORY_META);
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveCategory(id);
            scrollNavToActive(id);
          }
        },
        { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Scroll to hash section on mount (e.g. /menu#pizza)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    setActiveCategory(hash);
    // Use two attempts: quick (for fast loads) and delayed (for lazy images)
    const scrollToHash = () => {
      const el = document.getElementById(hash);
      if (!el) return;
      // Calculate offset accounting for sticky navbar (~80px) + extra breathing room
      const navbarHeight = 90;
      const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    };
    setTimeout(scrollToHash, 200);
    setTimeout(scrollToHash, 700); // second attempt for lazy-loaded content
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-napoli-cream">
      <NapoliNavbar />

      {/* Menu Hero Banner */}
      <div className="relative overflow-hidden" style={{ minHeight: "260px" }}>
        <img
          src="/manus-storage/napoli-hero_d5bd2478.jpg"
          alt="Napoli Pizzeria — Our Menu"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 40%" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(110deg, oklch(0.14 0.03 27 / 0.92) 0%, oklch(0.14 0.03 27 / 0.72) 55%, oklch(0.14 0.03 27 / 0.30) 100%)" }}
        />
        <div className="relative container py-14 md:py-20">
          <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-gold)", letterSpacing: "0.2em" }}>
            The Original Napoli Pizzeria
          </p>
          <h1 className="napoli-display text-4xl md:text-5xl mb-2" style={{ color: "oklch(0.99 0.015 80)" }}>
            {lang === "es" ? "Nuestro Menú" : "Our Menu"}
          </h1>
          <p className="napoli-body text-sm" style={{ color: "oklch(0.72 0.015 80)" }}>
            {lang === "es" ? "Impuestos no incluidos · Precios sujetos a cambio sin previo aviso" : "Taxes not included · Prices subject to change without notice"}
          </p>
        </div>
      </div>

      {/* Sticky category tabs */}
      <div
        ref={navScrollRef}
        className="sticky top-[72px] z-40 border-b shadow-sm overflow-x-auto"
        style={{ background: "oklch(0.99 0.015 80)", borderColor: "oklch(0.88 0.015 80)" }}
      >
        <div className="container">
          <div className="flex gap-0.5 py-2 min-w-max">
            {Object.entries(CATEGORY_META)
              .sort((a, b) => a[1].order - b[1].order)
              .map(([id, meta]) => (
              <button
                key={id}
                data-cat-id={id}
                onClick={() => scrollTo(id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded text-xs napoli-label whitespace-nowrap transition-colors"
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  background: activeCategory === id ? "var(--napoli-red)" : "transparent",
                  color: activeCategory === id ? "white" : "var(--napoli-dark)",
                }}
              >
                <span>{meta.emoji}</span>
                {translateCategory(meta.label, lang)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8 flex-1">
        {/* ── ALL MENU ITEMS (Clover-synced) ─────────────────── */}
        {/* Pizza Customizer Modal — rendered at top level so it overlays everything */}
        <PizzaCustomizerModal
          key={pizzaModalKey}
          selection={pizzaSelection}
          onClose={() => setPizzaSelection(null)}
        />

        {/* Wrap Customizer Modal */}
        <WrapCustomizerModal
          key={wrapModalKey}
          trigger={wrapTrigger}
          onClose={() => setWrapTrigger(null)}
        />

        {/* Subs Customizer Modal */}
        <SubsCustomizerModal
          key={subsModalKey}
          trigger={subsTrigger}
          onClose={() => setSubsTrigger(null)}
        />

        {/* Calzone & Stromboli Customizer Modal */}
        <CalzoneCustomizerModal
          key={calzoneModalKey}
          trigger={calzoneTrigger}
          modalKey={calzoneModalKey}
          onClose={() => setCalzoneTrigger(null)}
        />
        {/* Burger Customizer Modal */}
        <BurgerCustomizerModal
          key={burgerModalKey}
          trigger={burgerTrigger}
          onClose={() => setBurgerTrigger(null)}
        />

        {/* Appetizers Customizer Modal */}
        <AppetizersCustomizerModal
          trigger={appetizersModalTrigger}
          onClose={() => setAppetizersModalTrigger(null)}
        />

        {/* Salads Customizer Modal */}
        <SaladsCustomizerModal
          trigger={saladsModalTrigger}
          onClose={() => setSaladsModalTrigger(null)}
        />

        {/* Pasta Customizer Modal */}
        <PastaCustomizerModal
          trigger={pastaModalTrigger}
          onClose={() => setPastaModalTrigger(null)}
        />

        {/* Gluten Free Pizza Modal */}
        <GlutenFreePizzaModal
          isOpen={glutenFreeModalOpen}
          onClose={() => setGlutenFreeModalOpen(false)}
        />

        {/* Anytime Specials Customizer Modal */}
        <SpecialCustomizerModal
          key={specialNum}
          specialNum={specialNum}
          onClose={() => setSpecialNum(null)}
        />

        {/* Wings Customizer Modal */}
        <WingsCustomizerModal
          key={wingsModalKey}
          selection={wingsSelection}
          onClose={() => setWingsSelection(null)}
        />

        {/* Lunch Customizer Modal */}
        {lunchItem && (
          <LunchCustomizerModal
            item={lunchItem}
            onClose={() => setLunchItem(null)}
          />
        )}

        <CloverSyncedItems
          addItem={addItem}
          onPizzaCustomize={(sel) => { setPizzaModalKey((k) => k + 1); setPizzaSelection(sel); }}
          onWingsCustomize={(sel) => { setWingsModalKey((k) => k + 1); setWingsSelection(sel); }}
          onBurgerCustomize={(trigger) => { setBurgerModalKey((k) => k + 1); setBurgerTrigger(trigger); }}
          onWrapCustomize={(trigger) => { setWrapModalKey((k) => k + 1); setWrapTrigger(trigger); }}
          onSubsCustomize={(trigger) => { setSubsModalKey((k) => k + 1); setSubsTrigger(trigger); }}
          onCalzoneCustomize={(trigger) => { setCalzoneModalKey((k) => k + 1); setCalzoneTrigger(trigger); }}
          onAppetizersCustomize={(trigger) => setAppetizersModalTrigger(trigger)}
          onSaladsCustomize={(trigger) => setSaladsModalTrigger(trigger)}
          onPastaCustomize={(trigger) => setPastaModalTrigger(trigger)}
          onSpecialCustomize={(num) => setSpecialNum(num)}
          onLunchCustomize={(item) => setLunchItem(item)}
          onGlutenFreeOpen={() => setGlutenFreeModalOpen(true)}
        />

      </div>

      {/* ── NUTRITIONAL & ALLERGY DISCLAIMER ─────────────────── */}
      <div
        className="mx-auto max-w-4xl px-4 py-5 mb-6"
        style={{ borderTop: "1px solid oklch(0.90 0.012 80)" }}
      >
        <p
          className="text-center text-xs leading-relaxed napoli-body"
          style={{ color: "oklch(0.58 0.03 30)" }}
        >
          <span className="font-semibold" style={{ color: "oklch(0.45 0.05 30)" }}>⚠️ Allergy & Nutritional Notice:</span>{" "}
          Calorie counts and nutritional values shown are <em>approximate estimates</em> based on standard recipes and may vary depending on portion size, preparation method, and ingredient substitutions.{" "}
          Menu items may contain or come into contact with common allergens including{" "}
          <strong>milk, eggs, wheat, soy, peanuts, tree nuts, fish, shellfish, and sesame</strong>.{" "}
          If you have a food allergy or dietary restriction, please inform our staff before placing your order.{" "}
          We cannot guarantee that any item is completely free of allergens due to shared kitchen equipment and preparation areas.{" "}
          For detailed nutritional information or allergen inquiries, please contact us at{" "}
          <a
            href="tel:+17027038777"
            className="underline hover:opacity-80 transition-opacity"
            style={{ color: "var(--napoli-red)" }}
          >
            (702) 703-8777
          </a>.
        </p>
      </div>

      <NapoliFooter />
    </div>
  );
}
