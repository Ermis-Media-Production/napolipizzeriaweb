/**
 * Napoli Pizzeria — Full Menu Page
 * All categories: Appetizers, Lunch Specials, Pizzeria, Wings, Pasta, Subs, Burgers, Salads, Desserts, Specials
 */
import React, { useState, useEffect } from "react";
import { useLunchTimer } from "@/hooks/useLunchTimer";
import LunchTimerBadge from "@/components/LunchTimerBadge";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";
import WingsCustomizerModal, { type WingsSelection } from "@/components/WingsCustomizerModal";
import PizzaCustomizerModal, { type PizzaSelection } from "@/components/PizzaCustomizerModal";
import WrapCustomizerModal, { type WrapTrigger } from "@/components/WrapCustomizerModal";
import SubsCustomizerModal, { type SubsTrigger } from "@/components/SubsCustomizerModal";
import { CalzoneCustomizerModal, type CalzoneTrigger } from "@/components/CalzoneCustomizerModal";
import BurgerCustomizerModal, { type BurgerTrigger } from "@/components/BurgerCustomizerModal";
import AppetizersCustomizerModal, { type AppetizersModalTrigger, APPETIZER_MODAL_ITEMS } from "@/components/AppetizersCustomizerModal";
import SpecialCustomizerModal from "@/components/SpecialCustomizerModal";
import LunchCustomizerModal from "@/components/LunchCustomizerModal";
import SaladsCustomizerModal, { type SaladsModalTrigger, SALAD_MODAL_ITEMS } from "@/components/SaladsCustomizerModal";
import PastaCustomizerModal, { type PastaModalTrigger, PASTA_MODAL_ITEMS } from "@/components/PastaCustomizerModal";
import GlutenFreePizzaModal from "@/components/GlutenFreePizzaModal";
import {
  MENU_CATEGORIES, APPETIZERS, LUNCH_SPECIALS, PIZZA_SIZES, PIZZA_BASE_PRICES,
  PIZZA_SPECIALS, PIZZA_30_TOPPINGS, STUFFED_DOUGH, WINGS, PASTA, SUBS,
  BURGERS, TRIPLE_DECKERS, SALADS, DESSERTS, CHILDRENS_MENU, BEVERAGES,
  ANYTIME_SPECIALS, SOUPS, WRAPS, SIDES, CHICAGO_DEEP_DISH, SICILIAN_PIZZA,
} from "@/lib/napoliData";
import { getMenuPhoto, getBurgerPhoto } from "@/lib/napoliPhotos";

function SectionHeader({ id, title, emoji, photo }: { id: string; title: string; emoji: string; photo?: string }) {
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
          <h2 className="napoli-label text-xl text-white tracking-widest drop-shadow-md">{title}</h2>
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
      <h2 className="napoli-label text-base text-white tracking-widest">{title}</h2>
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
        <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{name}</span>
        {desc && <p className="text-xs napoli-body mt-0.5 leading-relaxed" style={{ color: "oklch(0.52 0.03 30)" }}>{desc}</p>}
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

  return (
    <div className="flex flex-col" style={{ borderBottom: "1px solid oklch(0.93 0.012 80)" }}>
      {/* Photo */}
      <div className="relative overflow-hidden" style={{ height: "180px" }}>
        {photo ? (
          <img
            src={photo}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            style={{ transition: "transform 0.4s cubic-bezier(0.23,1,0.32,1)" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "oklch(0.95 0.012 80)" }}>
            <span style={{ fontSize: 48 }}>🍔</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.60) 0%, transparent 55%)" }} />
        <span
          className="absolute bottom-3 left-4 text-white font-bold text-base"
          style={{ fontFamily: "'Oswald', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.7)", maxWidth: "calc(100% - 2rem)" }}
        >
          {item.name}
        </span>
      </div>
      {/* Content */}
      <div className="flex flex-col flex-1 px-4 py-3 gap-2">
        {item.desc && (
          <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{item.desc}</p>
        )}
        <div className="flex items-center gap-2 mt-auto">
          {halfPrice && (
            <button
              onClick={() => onOpenModal(item.name, "half")}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded text-xs font-semibold transition-all active:scale-95 hover:opacity-90"
              style={{ background: "oklch(0.97 0.012 80)", color: "var(--napoli-red)", border: "1px solid oklch(0.88 0.015 80)" }}
            >
              <Plus size={11} />
              <span>½ lb {item.half}</span>
            </button>
          )}
          {singlePrice && (
            <button
              onClick={() => onOpenModal(item.name, "single")}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded text-xs font-semibold transition-all active:scale-95 hover:opacity-90"
              style={{ background: "var(--napoli-red)", color: "white" }}
            >
              <Plus size={11} />
              <span>1 lb {item.single}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AnytimeSpecialRow({
  item,
  onCustomize,
}: {
  item: { num: number; name: string; price: string };
  onCustomize: (num: number) => void;
}) {
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
        <span className="text-sm napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{item.name}</span>
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

function LunchSpecialRow({ item, isLeft, isLunchOpen }: { item: { num: number; name: string; price: string }; isLeft: boolean; isLunchOpen: boolean }) {
  const { addItem, openCart } = useCart();
  const numericPrice = parsePrice(item.price);
  const [showCustomizer, setShowCustomizer] = useState(false);

  // Items that need customization (choice, topping, or wing sauce)
  const NEEDS_CUSTOMIZER = new Set([2, 3, 4, 6, 9, 13, 16, 19, 24]);
  const needsCustomizer = NEEDS_CUSTOMIZER.has(item.num);

  const handleAdd = () => {
    if (!numericPrice || !isLunchOpen) return;
    if (needsCustomizer) {
      setShowCustomizer(true);
      return;
    }
    // Simple items: just add with free soda note
    addItem({
      id: `lunch-${item.num}-${Date.now()}`,
      name: `#${item.num} ${item.name}`,
      price: numericPrice,
      quantity: 1,
      category: "lunch",
      description: "Includes free can of soda",
    });
    toast.success(`#${item.num} ${item.name} added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });
  };

  return (
    <>
      <div
        className="napoli-menu-item flex items-center gap-3 px-5 py-3 border-b"
        style={{
          borderColor: "oklch(0.93 0.012 80)",
          borderRight: isLeft ? "1px solid oklch(0.93 0.012 80)" : "none",
          opacity: isLunchOpen ? 1 : 0.45,
          transition: "opacity 0.3s ease",
        }}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 napoli-price"
          style={{ background: isLunchOpen ? "var(--napoli-red)" : "oklch(0.55 0.02 30)", color: "white" }}
        >
          {item.num}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{item.name}</span>
        </div>
        <span className="napoli-price text-sm shrink-0" style={{ color: isLunchOpen ? "var(--napoli-red)" : "oklch(0.55 0.02 30)" }}>{item.price}</span>
        {numericPrice && (
          <button
            onClick={handleAdd}
            disabled={!isLunchOpen}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0"
            style={{
              background: isLunchOpen ? "var(--napoli-red)" : "oklch(0.55 0.02 30)",
              color: "white",
              cursor: isLunchOpen ? "pointer" : "not-allowed",
            }}
            title={isLunchOpen ? `Add #${item.num} ${item.name} to cart` : "Lunch Special not available after 3 PM"}
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      {showCustomizer && (
        <LunchCustomizerModal
          item={item}
          onClose={() => setShowCustomizer(false)}
        />
      )}
    </>
  );
}

function ItemRow({ name, desc, price, highlight, category }: { name: string; desc?: string; price?: string; highlight?: boolean; category?: string }) {
  const { addItem, openCart } = useCart();
  const numericPrice = parsePrice(price);
  const photo = getMenuPhoto(name);

  const handleAdd = () => {
    if (!numericPrice) return;
    addItem({
      id: `${name}-${Date.now()}`,
      name,
      price: numericPrice,
      quantity: 1,
      category: category ?? "food",
      description: desc,
    });
    toast.success(`${name} added to cart`, {
      action: { label: "View Cart", onClick: openCart },
    });
  };

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
        <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{name}</span>
        {desc && <p className="text-xs napoli-body mt-0.5 leading-relaxed" style={{ color: "oklch(0.52 0.03 30)" }}>{desc}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {price && (
          <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{price}</span>
        )}
        {numericPrice && (
          <button
            onClick={handleAdd}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 hover:opacity-90"
            style={{ background: "var(--napoli-red)", color: "white" }}
            title={`Add ${name} to cart`}
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  );
}



function WholeLottaPastaRow() {
  const { addItem, openCart } = useCart();
  const numericPrice = parsePrice(PASTA.wholeLottaPrice);

  const handleAdd = () => {
    if (!numericPrice) return;
    addItem({
      id: `whole-lotta-pasta-${Date.now()}`,
      name: "Napoli's Whole Lotta Pasta",
      price: numericPrice,
      quantity: 1,
      category: "pasta",
      description: PASTA.wholeLottaItems.join(", "),
    });
    toast.success("Napoli's Whole Lotta Pasta added to cart", {
      action: { label: "View Cart", onClick: openCart },
    });
  };

  return (
    <div className="px-5 py-4 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.99 0.02 65 / 0.3)" }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span className="napoli-badge-gold mb-1 inline-block">Best Value</span>
          <h4 className="napoli-heading text-base" style={{ color: "var(--napoli-dark)" }}>Napoli's Whole Lotta Pasta</h4>
          <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>
            {PASTA.wholeLottaItems.join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="napoli-price text-xl" style={{ color: "var(--napoli-red)" }}>{PASTA.wholeLottaPrice}</span>
          {numericPrice && (
            <button
              onClick={handleAdd}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 hover:opacity-90"
              style={{ background: "var(--napoli-red)", color: "white" }}
              title="Add Napoli's Whole Lotta Pasta to cart"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>
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
  const photo = getMenuPhoto(name);
  return (
    <div
      className="napoli-menu-item flex items-start gap-3 px-4 py-3 border-b last:border-b-0"
      style={{ borderColor: "oklch(0.93 0.012 80)", background: highlight ? "oklch(0.99 0.02 65 / 0.25)" : undefined }}
    >
      {photo && (
        <div className="shrink-0 rounded overflow-hidden" style={{ width: 64, height: 64 }}>
          <img src={photo} alt={name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {highlight && <span className="napoli-badge-gold text-xs">Popular</span>}
          <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{name}</span>
        </div>
        {desc && (
          <p className="text-xs napoli-body mt-0.5 leading-relaxed" style={{ color: "oklch(0.52 0.03 30)" }}>{desc}</p>
        )}
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
  );
}

export default function Menu() {
  const { addItem } = useCart();
  const lunchTimer = useLunchTimer();
  const [activeCategory, setActiveCategory] = useState("appetizers");
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

  const scrollTo = (id: string) => {
    setActiveCategory(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
            Our Menu
          </h1>
          <p className="napoli-body text-sm" style={{ color: "oklch(0.72 0.015 80)" }}>
            Taxes not included · Prices subject to change without notice
          </p>
        </div>
      </div>

      {/* Sticky category tabs */}
      <div
        className="sticky top-[72px] z-40 border-b shadow-sm overflow-x-auto"
        style={{ background: "oklch(0.99 0.015 80)", borderColor: "oklch(0.88 0.015 80)" }}
      >
        <div className="container">
          <div className="flex gap-0.5 py-2 min-w-max">
            {MENU_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollTo(cat.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded text-xs napoli-label whitespace-nowrap transition-colors"
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  background: activeCategory === cat.id ? "var(--napoli-red)" : "transparent",
                  color: activeCategory === cat.id ? "white" : "var(--napoli-dark)",
                }}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8 flex-1">
        {/* ── APPETIZERS ─────────────────────────────────────── */}
        <SectionHeader id="appetizers" title="Appetizers" emoji="🧅" photo="/manus-storage/napoli-appetizers_dc37c73d.jpg" />
        <MenuCard>
          {APPETIZERS.map((item) => (
            <div key={item.name}>
              {APPETIZER_MODAL_ITEMS.includes(item.name) ? (
                <AppetizersItemRow
                  name={item.name}
                  desc={item.desc}
                  price={(item as any).price ?? ((item as any).prices?.[0]?.price)}
                  highlight={(item as any).highlight}
                  onOpen={() => setAppetizersModalTrigger({ itemName: item.name })}
                />
              ) : (
                <ItemRow name={item.name} desc={item.desc} price={(item as any).price} highlight={(item as any).highlight} category="appetizers" />
              )}
            </div>
          ))}

        </MenuCard>

        {/* ── LUNCH SPECIALS ─────────────────────────────────── */}
        {/* Custom section header with digital clock embedded */}
        <div
          id="lunch"
          className="relative overflow-hidden rounded-t-md scroll-mt-24"
          style={{ minHeight: "140px" }}
        >
          <img
            src="/manus-storage/napoli-lunch_94df386a.jpg"
            alt="Lunch Specials"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to right, rgba(180,20,20,0.88) 0%, rgba(180,20,20,0.55) 60%, rgba(0,0,0,0.25) 100%)" }}
          />
          {/* Title row */}
          <div className="relative flex items-center h-full px-5 py-4">
            <span className="text-3xl drop-shadow">🕙</span>
            <h2 className="napoli-label text-xl text-white tracking-widest drop-shadow-md ml-3">Lunch Specials</h2>
          </div>
        </div>
        <MenuCard>
          {/* Info bar */}
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

          {/* Closed overlay message */}
          {!lunchTimer.isOpen && lunchTimer.hasStarted && (
            <div
              className="px-5 py-4 text-center"
              style={{ background: "oklch(0.96 0.01 30)" }}
            >
              <p className="napoli-label text-sm font-bold" style={{ color: "oklch(0.45 0.06 30)" }}>
                🔒 Lunch Specials are only available 10 AM – 3 PM
              </p>
              <p className="napoli-body text-xs mt-1" style={{ color: "oklch(0.55 0.04 30)" }}>
                Come back tomorrow! Our full menu is available all day.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2">
            {LUNCH_SPECIALS.items.map((item, i) => (
              <LunchSpecialRow key={item.num} item={item} isLeft={i % 2 === 0} isLunchOpen={lunchTimer.isOpen} />
            ))}
          </div>
        </MenuCard>

        {/* ── PIZZERIA ───────────────────────────────────────── */}
        <SectionHeader id="pizza" title="Pizzeria — Hand Tossed New York Style" emoji="🍕" photo="/manus-storage/napoli-pizza-hero_66a71a97.jpg" />
        <MenuCard>
          {/* Plain Cheese Pizza */}
          <div className="napoli-menu-item flex items-center gap-3 px-5 py-4">
            <img
              src="/manus-storage/cheese_pizza_00fdae04.webp"
              alt="Plain Cheese Pizza"
              className="w-14 h-14 rounded object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>Plain Cheese</span>
              <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>Classic New York-style hand-tossed crust loaded with mozzarella — the perfect base. Add your own toppings to customize.</p>
              <div className="overflow-x-auto mt-2">
                <table className="text-xs">
                  <thead>
                    <tr>
                      {PIZZA_SIZES.map((s) => (
                        <th key={s} className="text-center pr-3 pb-0.5 napoli-label" style={{ color: "oklch(0.52 0.03 30)" }}>{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {PIZZA_BASE_PRICES["Plain Cheese"].map((p, i) => (
                        <td key={i} className="text-center pr-3 napoli-price font-semibold" style={{ color: "var(--napoli-red)" }}>{p}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <button
              onClick={() => {
                setPizzaModalKey(k => k + 1);
                setPizzaSelection({ pizzaName: "Plain Cheese", isSpecialty: false, freeToppings: 0, allowHalfAndHalf: true });
              }}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded text-sm font-semibold transition-all active:scale-95"
              style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
            >
              <Plus size={13} /> Order
            </button>
          </div>
          {/* 4 Topping Combo */}
          <div className="napoli-menu-item flex items-center gap-3 px-5 py-4 border-t" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            <img
              src="/manus-storage/four_topping_combo_10890069.png"
              alt="4 Topping Combo Pizza"
              className="w-14 h-14 rounded object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>4 Topping Combo</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: "oklch(0.95 0.06 60)", color: "oklch(0.45 0.12 50)", fontFamily: "'Oswald', sans-serif" }}>BEST VALUE</span>
              </div>
              <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>Hand-tossed New York-style crust with cheese — choose any 4 toppings from 30 options. Half &amp; Half available.</p>
              <div className="overflow-x-auto mt-2">
                <table className="text-xs">
                  <thead>
                    <tr>
                      {PIZZA_SIZES.map((s) => (
                        <th key={s} className="text-center pr-3 pb-0.5 napoli-label" style={{ color: "oklch(0.52 0.03 30)" }}>{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {PIZZA_BASE_PRICES["4 Topping Combo"].map((p, i) => (
                        <td key={i} className="text-center pr-3 napoli-price font-semibold" style={{ color: "var(--napoli-red)" }}>{p}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <button
              onClick={() => {
                setPizzaModalKey(k => k + 1);
                setPizzaSelection({ pizzaName: "4 Topping Combo", isSpecialty: false, freeToppings: 4, allowHalfAndHalf: true });
              }}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded text-sm font-semibold transition-all active:scale-95"
              style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
            >
              <Plus size={13} /> Order
            </button>
          </div>

          {/* Gluten Free Pizza */}
          <div
            className="napoli-menu-item flex items-center gap-3 px-5 py-4 border-t"
            style={{ borderColor: "oklch(0.88 0.015 80)" }}
          >
            <img
              src="https://cloverstatic.com/menu-assets/items/Q5P394HBCYWV6.jpeg"
              alt="Gluten Free Pizza 14 inch"
              className="w-14 h-14 rounded object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>Gluten Free Pizza 14"</span>
                <span className="napoli-badge-green text-xs">Gluten Free</span>
              </div>
              <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>Hand-tossed 14" gluten-free crust — includes cheese. Add toppings to customize.</p>
              <p className="napoli-price text-sm mt-1" style={{ color: "var(--napoli-red)" }}>$12.75 · Add Topping $2.75</p>
            </div>
            <button
              onClick={() => {
              setPizzaModalKey(k => k + 1);
              setPizzaSelection({
                pizzaName: "Gluten Free Pizza 14\"",
                isSpecialty: false,
                freeToppings: 0,
                allowHalfAndHalf: false,
              });
            }}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded text-sm font-semibold transition-all active:scale-95"
              style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
            >
              <Plus size={13} /> Order
            </button>
          </div>

          {/* Sicilian */}
          <div
            className="napoli-menu-item flex items-center justify-between gap-4 px-5 py-4 border-t"
            style={{ borderColor: "oklch(0.88 0.015 80)" }}
          >
            <div className="flex-1 min-w-0">
              <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>Sicilian 12x8</span>
              <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>{SICILIAN_PIZZA.desc}</p>
              <p className="napoli-price text-sm mt-1" style={{ color: "var(--napoli-red)" }}>{SICILIAN_PIZZA.baseLabel} · Add Topping ${SICILIAN_PIZZA.extraToppingPrice.toFixed(2)}</p>
            </div>
            <button
              onClick={() => {
                setCalzoneModalKey(k => k + 1);
                setCalzoneTrigger({
                  itemType: "Sicilian",
                  flatPrice: SICILIAN_PIZZA.basePrice,
                  flatPriceLabel: SICILIAN_PIZZA.baseLabel,
                  flatExtraToppingPrice: SICILIAN_PIZZA.extraToppingPrice,
                  freeToppings: SICILIAN_PIZZA.freeToppings,
                  baseDesc: SICILIAN_PIZZA.desc,
                });
              }}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded text-sm font-semibold transition-all active:scale-95"
              style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
            >
              <Plus size={13} /> Order
            </button>
          </div>

          {/* Chicago Deep Dish */}
          <div
            className="napoli-menu-item flex items-center justify-between gap-4 px-5 py-4 border-t"
            style={{ borderColor: "oklch(0.88 0.015 80)" }}
          >
            <div className="flex-1 min-w-0">
              <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>Stuffed Chicago Deep Dish</span>
              <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>{CHICAGO_DEEP_DISH.desc}</p>
              <p className="napoli-price text-sm mt-1" style={{ color: "var(--napoli-red)" }}>
                {CHICAGO_DEEP_DISH.combo4Label} · Add Topping ${CHICAGO_DEEP_DISH.extraToppingPrice.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => {
                setCalzoneModalKey(k => k + 1);
                setCalzoneTrigger({
                  itemType: "Chicago Deep Dish",
                  flatPrice: CHICAGO_DEEP_DISH.combo4Price,
                  flatPriceLabel: CHICAGO_DEEP_DISH.combo4Label,
                  flatExtraToppingPrice: CHICAGO_DEEP_DISH.extraToppingPrice,
                  freeToppings: CHICAGO_DEEP_DISH.freeToppings,
                  baseDesc: CHICAGO_DEEP_DISH.desc,
                });
              }}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded text-sm font-semibold transition-all active:scale-95"
              style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
            >
              <Plus size={13} /> Order
            </button>
          </div>

          {/* 30 Toppings */}
          <div className="px-5 py-4 border-t" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="napoli-label text-xs" style={{ color: "var(--napoli-red)" }}>30 Toppings Available</p>
              <button
                onClick={() => setShowAllToppings(!showAllToppings)}
                className="flex items-center gap-1 text-xs napoli-label"
                style={{ color: "var(--napoli-green)" }}
              >
                {showAllToppings ? "Hide" : "Show All"} {showAllToppings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
            <div className={`flex flex-wrap gap-2 ${!showAllToppings ? "max-h-16 overflow-hidden" : ""}`}>
              {PIZZA_30_TOPPINGS.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2.5 py-1 rounded border napoli-body"
                  style={{ borderColor: "oklch(0.88 0.015 80)", color: "oklch(0.42 0.03 30)" }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Specialty pizzas */}
          <div className="border-t" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            {/* Sub-section header — same dark/red style as SectionHeader */}
            <div
              id="specialty-pizzas"
              className="flex items-center gap-3 px-5 py-3 scroll-mt-24"
              style={{ background: "oklch(0.13 0.04 27)", borderBottom: "3px solid var(--napoli-red)" }}
            >
              <span className="text-xl">⭐</span>
              <div>
                <h3
                  className="napoli-label text-base text-white tracking-widest"
                >
                  Napoli's Special Creations
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "oklch(0.72 0.04 80)", fontFamily: "'Lato', sans-serif" }}>
                  Available in 10" · 14" · 16" · 18" · 24" · 28" · 30" · 36"
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {PIZZA_SPECIALS.map((pizza) => {
                const pizzaPhoto = getMenuPhoto(pizza.name);
                return (
                <div
                  key={pizza.name}
                  className="napoli-menu-item flex items-start justify-between gap-3 py-3 px-3 border-b border-r"
                  style={{ borderColor: "oklch(0.93 0.012 80)" }}
                >
                  <div className="flex items-start gap-3">
                    {pizzaPhoto ? (
                      <div className="shrink-0 rounded overflow-hidden" style={{ width: 56, height: 56 }}>
                        <img src={pizzaPhoto} alt={pizza.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-napoli-red" />
                    )}
                    <div>
                      <span className="text-sm napoli-body font-bold" style={{ color: "var(--napoli-dark)" }}>{pizza.name}</span>
                      <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>{pizza.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setPizzaModalKey(k => k + 1); setPizzaSelection({ pizzaName: pizza.name, isSpecialty: true }); }}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all active:scale-95"
                    style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                  >
                    <Plus size={11} /> Order
                  </button>
                </div>
                );
              })}
            </div>
            </div>
          </div>

          {/* Stuffed Dough — Calzone & Stromboli + Wraps — rich card grid */}
          <div className="border-t" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            <div className="px-5 py-3" style={{ background: "oklch(0.97 0.012 80)" }}>
              <p className="napoli-label text-xs" style={{ color: "var(--napoli-red)" }}>Stuffed Dough &amp; Wraps</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "oklch(0.90 0.012 80)" }}>

              {/* Calzone card */}
              {(() => {
                const calzone = STUFFED_DOUGH.find(i => i.name === "Calzone")!;
                return (
                  <div className="flex flex-col">
                    <div className="relative overflow-hidden" style={{ height: "180px" }}>
                      <img
                        src="/manus-storage/calzone_09c781a8.jpeg"
                        alt="Calzone"
                        className="w-full h-full object-cover"
                        style={{ transition: "transform 0.4s cubic-bezier(0.23,1,0.32,1)" }}
                        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                      />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }} />
                      <span className="absolute bottom-3 left-4 text-white font-bold text-lg" style={{ fontFamily: "'Oswald', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>Calzone</span>
                    </div>
                    <div className="flex flex-col flex-1 px-4 py-4 gap-3">
                      <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{calzone.desc}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <p className="napoli-price text-sm font-bold" style={{ color: "var(--napoli-red)" }}>From {(calzone as any).prices?.[0]}</p>
                        <button
                          onClick={() => {
                            setCalzoneModalKey(k => k + 1);
                            setCalzoneTrigger({
                              itemType: "Calzone",
                              sizes: (calzone as any).sizes,
                              prices: (calzone as any).prices,
                              freeToppings: 2,
                              baseDesc: calzone.desc ?? "",
                            });
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold transition-all active:scale-95"
                          style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                        >
                          <Plus size={12} /> Order
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Stromboli card */}
              {(() => {
                const stromboli = STUFFED_DOUGH.find(i => i.name === "Stromboli")!;
                return (
                  <div className="flex flex-col">
                    <div className="relative overflow-hidden" style={{ height: "180px" }}>
                      <img
                        src="/manus-storage/stromboli_5764df6f.jpeg"
                        alt="Stromboli"
                        className="w-full h-full object-cover"
                        style={{ transition: "transform 0.4s cubic-bezier(0.23,1,0.32,1)" }}
                        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                      />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }} />
                      <span className="absolute bottom-3 left-4 text-white font-bold text-lg" style={{ fontFamily: "'Oswald', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>Stromboli</span>
                    </div>
                    <div className="flex flex-col flex-1 px-4 py-4 gap-3">
                      <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{stromboli.desc}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <p className="napoli-price text-sm font-bold" style={{ color: "var(--napoli-red)" }}>From {(stromboli as any).prices?.[0]}</p>
                        <button
                          onClick={() => {
                            setCalzoneModalKey(k => k + 1);
                            setCalzoneTrigger({
                              itemType: "Stromboli",
                              sizes: (stromboli as any).sizes,
                              prices: (stromboli as any).prices,
                              freeToppings: 4,
                              baseDesc: stromboli.desc ?? "",
                            });
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold transition-all active:scale-95"
                          style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                        >
                          <Plus size={12} /> Order
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Wraps card */}
              <div className="flex flex-col">
                <div className="relative overflow-hidden" style={{ height: "180px" }}>
                  <img
                    src="/manus-storage/wraps_a9dc4567.jpeg"
                    alt="Wraps"
                    className="w-full h-full object-cover"
                    style={{ transition: "transform 0.4s cubic-bezier(0.23,1,0.32,1)" }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                  />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }} />
                  <span className="absolute bottom-3 left-4 text-white font-bold text-lg" style={{ fontFamily: "'Oswald', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>Wraps</span>
                </div>
                <div className="flex flex-col flex-1 px-4 py-4 gap-3">
                  <span className="napoli-badge-green text-xs self-start">Gluten Free Bread Available</span>
                  <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{WRAPS.note}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <p className="napoli-price text-sm font-bold" style={{ color: "var(--napoli-red)" }}>From ${(parsePrice(WRAPS.price) ?? 0).toFixed(2)}</p>
                    <button
                      onClick={() => { setWrapModalKey(k => k + 1); setWrapTrigger({ basePrice: parsePrice(WRAPS.price) ?? 0 }); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold transition-all active:scale-95"
                      style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                    >
                      <Plus size={12} /> Order
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
                </MenuCard>

        {/* ── WINGS ──────────────────────────────────────────── */}
        <SectionHeader id="wings" title="Wings, Wing Dings & Fingers" emoji="🍗" photo="/manus-storage/napoli-wings_5305444c.jpg" />
        <MenuCard>
          {/* Note + Flavors */}
          <div className="px-5 py-3 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="text-xs napoli-body mb-2" style={{ color: "oklch(0.52 0.03 30)" }}>{WINGS.note}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="napoli-label text-xs shrink-0" style={{ color: "var(--napoli-red)" }}>Flavors:</span>
              {WINGS.flavors.map((f) => (
                <span key={f} className="text-xs px-2 py-0.5 rounded border napoli-body" style={{ borderColor: "oklch(0.88 0.015 80)", color: "oklch(0.42 0.03 30)" }}>{f}</span>
              ))}
            </div>
          </div>
          {/* 3-column card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
            <WingsTypeCard
              type="Bone-In"
              label="Bone-In Wings"
              description="Traditional bone-in chicken wings — crispy outside, juicy inside. Tossed in your choice of sauce."
              photo="/manus-storage/chicken_wings_07165612.webp"
              accentColor="var(--napoli-red)"
              rows={WINGS.boneIn}
              onSelect={(sel) => { setWingsModalKey(k => k + 1); setWingsSelection(sel); }}
            />
            <WingsTypeCard
              type="Boneless"
              label="Boneless Wings"
              description="All-white meat boneless bites — same great flavors, no bones. Perfect for sharing."
              photo="/manus-storage/boneless_wings_d47c8973.webp"
              accentColor="oklch(0.52 0.12 250)"
              rows={WINGS.boneless}
              onSelect={(sel) => { setWingsModalKey(k => k + 1); setWingsSelection(sel); }}
            />
            <WingsTypeCard
              type="Chicken Fingers"
              label="Chicken Fingers"
              description="Golden-fried chicken tenders — crispy, tender strips served with your choice of dipping sauce."
              photo="/manus-storage/chicken_tenders_850105df.webp"
              accentColor="oklch(0.26 0.10 145)"
              rows={WINGS.chickenFingers}
              onSelect={(sel) => { setWingsModalKey(k => k + 1); setWingsSelection(sel); }}
            />
          </div>
          {/* Wings Customizer Modal */}
          <WingsCustomizerModal
            key={wingsModalKey}
            selection={wingsSelection}
            onClose={() => setWingsSelection(null)}
          />
        </MenuCard>

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

        {/* ── PASTA ──────────────────────────────────────────── */}
        <SectionHeader id="pasta" title="Pasta" emoji="🍝" photo="/manus-storage/napoli-lunch_94df386a.jpg" />
        <MenuCard>
          <div className="px-5 py-3 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Served w/ Garlic Bread & House Salad</p>
          </div>
          {/* Whole Lotta Pasta */}
          <WholeLottaPastaRow />
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            <div>
              <p className="napoli-label text-xs px-5 py-2 border-b" style={{ color: "var(--napoli-red)", borderColor: "oklch(0.88 0.015 80)" }}>Classic Pasta</p>
              {PASTA.classic.map((item) => PASTA_MODAL_ITEMS.includes(item.name) ? (
                <AppetizersItemRow key={`classic-${item.name}`} name={item.name} price={item.price} onOpen={() => setPastaModalTrigger({ itemName: item.name })} />
              ) : (
                <ItemRow key={`classic-${item.name}`} name={item.name} price={item.price} />
              ))}
            </div>
            <div>
              <p className="napoli-label text-xs px-5 py-2 border-b" style={{ color: "var(--napoli-red)", borderColor: "oklch(0.88 0.015 80)" }}>Ravioli</p>
              {PASTA.ravioli.map((item) => PASTA_MODAL_ITEMS.includes(item.name) ? (
                <AppetizersItemRow key={`ravioli-${item.name}`} name={item.name} price={item.price} onOpen={() => setPastaModalTrigger({ itemName: item.name })} />
              ) : (
                <ItemRow key={`ravioli-${item.name}`} name={item.name} price={item.price} />
              ))}
            </div>
            <div>
              <p className="napoli-label text-xs px-5 py-2 border-b" style={{ color: "var(--napoli-red)", borderColor: "oklch(0.88 0.015 80)" }}>Tortellini & Parmigiana</p>
              {PASTA.tortellini.map((item) => PASTA_MODAL_ITEMS.includes(item.name) ? (
                <AppetizersItemRow key={`tortellini-${item.name}`} name={item.name} price={item.price} onOpen={() => setPastaModalTrigger({ itemName: item.name })} />
              ) : (
                <ItemRow key={`tortellini-${item.name}`} name={item.name} price={item.price} />
              ))}
              {PASTA.parmigiana.map((item) => PASTA_MODAL_ITEMS.includes(item.name) ? (
                <AppetizersItemRow key={`parmigiana-${item.name}`} name={item.name} price={item.price} onOpen={() => setPastaModalTrigger({ itemName: item.name })} />
              ) : (
                <ItemRow key={`parmigiana-${item.name}`} name={item.name} price={item.price} />
              ))}
            </div>
          </div>
        </MenuCard>

        {/* ── SUBS & SANDWICHES ──────────────────────────────── */}
        <SectionHeader id="subs" title="Sub Sandwiches" emoji="🥖" photo="/manus-storage/napoli-subs_cb6cce6c.jpg" />
        <MenuCard>
          {/* Note */}
          <div className="px-5 py-3 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{SUBS.note}</p>
          </div>

          {/* Cold Subs */}
          <div>
            <p className="napoli-label text-xs px-5 py-2 border-b" style={{ color: "var(--napoli-red)", borderColor: "oklch(0.88 0.015 80)" }}>Served Cold</p>
            {SUBS.cold.map((s) => {
              const basePrice = parsePrice(s.price) ?? 0;
              const subPhoto = getMenuPhoto(s.name);
              return (
                <div
                  key={s.name}
                  className="napoli-menu-item flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                  style={{ borderColor: "oklch(0.93 0.012 80)" }}
                >
                  {subPhoto && (
                    <div className="shrink-0 rounded overflow-hidden" style={{ width: 56, height: 56 }}>
                      <img src={subPhoto} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>${basePrice.toFixed(2)}</span>
                    <button
                      onClick={() => { setSubsModalKey(k => k + 1); setSubsTrigger({ subName: s.name, basePrice, showAddons: true }); }}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all active:scale-95"
                      style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                    >
                      <Plus size={11} /> Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hot Subs */}
          <div className="border-t" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            <p className="napoli-label text-xs px-5 py-2 border-b" style={{ color: "var(--napoli-red)", borderColor: "oklch(0.88 0.015 80)" }}>Served Hot</p>
            {SUBS.hotDetailed.map((s) => {
              const basePrice = parsePrice(s.price) ?? 0;
              const addNote = s.add ? s.add + (s.desc ? " · " + s.desc : "") : s.desc;
              const hotSubPhoto = getMenuPhoto(s.name);
              return (
                <div
                  key={s.name}
                  className="napoli-menu-item flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                  style={{ borderColor: "oklch(0.93 0.012 80)" }}
                >
                  {hotSubPhoto && (
                    <div className="shrink-0 rounded overflow-hidden" style={{ width: 56, height: 56 }}>
                      <img src={hotSubPhoto} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{s.name}</span>
                    {addNote && <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>{addNote}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>${basePrice.toFixed(2)}</span>
                    <button
                      onClick={() => { setSubsModalKey(k => k + 1); setSubsTrigger({ subName: s.name, basePrice, addNote, showAddons: true }); }}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all active:scale-95"
                      style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                    >
                      <Plus size={11} /> Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Triple Deckers */}
          <div className="border-t" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
              <p className="napoli-label text-xs" style={{ color: "var(--napoli-red)" }}>Triple Deckers <span className="napoli-badge-green ml-2">Gluten Free Bread Available</span></p>
              <p className="text-xs napoli-body mt-1" style={{ color: "oklch(0.52 0.03 30)" }}>{TRIPLE_DECKERS.note}</p>
            </div>
            {TRIPLE_DECKERS.items.map((item) => {
              const basePrice = parsePrice(item.price) ?? 0;
              const triplePhoto = getMenuPhoto(item.name);
              return (
                <div
                  key={item.name}
                  className="napoli-menu-item flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                  style={{ borderColor: "oklch(0.93 0.012 80)" }}
                >
                  {triplePhoto && (
                    <div className="shrink-0 rounded overflow-hidden" style={{ width: 56, height: 56 }}>
                      <img src={triplePhoto} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>${basePrice.toFixed(2)}</span>
                    <button
                      onClick={() => { setSubsModalKey(k => k + 1); setSubsTrigger({ subName: item.name, basePrice, showAddons: false }); }}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all active:scale-95"
                      style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                    >
                      <Plus size={11} /> Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </MenuCard>

        {/* ── BURGERS ────────────────────────────────────────── */}
        <SectionHeader id="burgers" title="100% Angus Beef Burgers" emoji="🍔" photo="/manus-storage/napoli-burger_bea110a3.png" />
        <MenuCard>
          <div className="px-5 py-3 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{BURGERS.note}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="napoli-badge-green">🌾 Gluten Free Bread Available</span>
              <span className="text-xs px-2 py-0.5 rounded border napoli-body" style={{ borderColor: "oklch(0.88 0.015 80)", color: "oklch(0.42 0.03 30)" }}>🧀 Add Cheese $1</span>
              <span className="text-xs px-2 py-0.5 rounded border napoli-body" style={{ borderColor: "oklch(0.88 0.015 80)", color: "oklch(0.42 0.03 30)" }}>🥓 Add Bacon $1</span>
              <span className="text-xs px-2 py-0.5 rounded border napoli-body" style={{ borderColor: "oklch(0.88 0.015 80)", color: "oklch(0.42 0.03 30)" }}>🥑 Add Avocado $1</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3">
            {BURGERS.items.map((item) => (
              <BurgerRow
                key={item.name}
                item={item}
                onOpenModal={(burgerName, size) => {
                  setBurgerModalKey(k => k + 1);
                  setBurgerTrigger({ open: true, preselectedBurger: burgerName, preselectedSize: size });
                }}
              />
            ))}
          </div>
        </MenuCard>

        {/* ── SALADS ─────────────────────────────────────────── */}
        <SectionHeader id="salads" title="Salads" emoji="🥗" photo="/manus-storage/napoli-salads_7d324c51.jpg" />
        <MenuCard>
          <div className="px-5 py-2 border-b text-xs napoli-body" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)", color: "oklch(0.52 0.03 30)" }}>
            Add Chicken $7.49 or Steak $9.49
          </div>
          {SALADS.map((item) => (
            <div key={item.name}>
              {SALAD_MODAL_ITEMS.includes(item.name) ? (
                <AppetizersItemRow
                  name={item.name}
                  desc={item.desc}
                  price={(item as any).price ?? ((item as any).prices?.[0]?.price)}
                  highlight={(item as any).highlight}
                  onOpen={() => setSaladsModalTrigger({ itemName: item.name })}
                />
              ) : (
                <ItemRow name={item.name} desc={item.desc} price={(item as any).price} highlight={(item as any).highlight} category="salads" />
              )}
            </div>
          ))}
        </MenuCard>

        {/* ── DESSERTS ───────────────────────────────────────── */}
        <SectionHeader id="desserts" title="Desserts" emoji="🍰" photo="/manus-storage/napoli-desserts_fba7c0ae.png" />
        <MenuCard>
          <div className="px-5 py-3 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <span className="napoli-price text-lg" style={{ color: "var(--napoli-red)" }}>{DESSERTS.price}</span>
            <span className="text-xs napoli-body ml-2" style={{ color: "oklch(0.52 0.03 30)" }}>each</span>
          </div>
          <div className="flex flex-col">
            {DESSERTS.items.map((item) => (
              <ItemRow key={item} name={item} price={DESSERTS.price} category="desserts" />
            ))}
          </div>
        </MenuCard>

        {/* ── CHILDREN'S MENU ────────────────────────────────────── */}
        {/* Custom header — sky blue theme for kids */}
        <div
          id="childrens"
          className="flex items-center gap-3 py-3 px-5 rounded-t-md scroll-mt-24"
          style={{ background: "oklch(0.55 0.18 240)" }}
        >
          <span className="text-xl">🧒</span>
          <h2 className="napoli-label text-base text-white tracking-widest">Children's Menu</h2>
        </div>
        <div
          className="rounded-b-md border border-t-0 mb-8 overflow-hidden"
          style={{ borderColor: "oklch(0.75 0.12 240)", background: "oklch(0.97 0.03 240)" }}
        >
          {/* Banner */}
          <div
            className="px-5 py-3 border-b flex items-center gap-3"
            style={{ borderColor: "oklch(0.85 0.08 240)", background: "oklch(0.93 0.06 240)" }}
          >
            <span className="text-lg">⭐</span>
            <div>
              <span className="napoli-price text-xl font-bold" style={{ color: "oklch(0.35 0.18 240)" }}>{CHILDRENS_MENU.price}</span>
              <span className="text-xs napoli-body ml-2" style={{ color: "oklch(0.45 0.10 240)" }}>each · Includes drink & dessert</span>
            </div>
          </div>
          {/* Items grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
            {CHILDRENS_MENU.items.map((item, i) => {
              return (
                <div
                  key={item}
                  className="flex items-center justify-between px-5 py-3 border-b border-r"
                  style={{ borderColor: "oklch(0.87 0.07 240)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{["🍕","🍝","🍔","🐔","🧆","🥪","🥗","🍟"][i % 8]}</span>
                    <span className="text-sm font-semibold napoli-body" style={{ color: "oklch(0.28 0.12 240)" }}>{item}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="napoli-price text-sm font-bold" style={{ color: "oklch(0.40 0.18 240)" }}>{CHILDRENS_MENU.price}</span>
                    <button
                      onClick={() => { addItem({ id: `kids-${item}-${Date.now()}`, name: item, price: parseFloat(CHILDRENS_MENU.price.replace("$","")), quantity: 1, category: "childrens-menu" }); toast.success(`${item} added to cart!`); }}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                      style={{ background: "oklch(0.55 0.18 240)", color: "white" }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── BEVERAGES ──────────────────────────────────────────────── */}
        {/* Custom header — deep navy theme for drinks */}
        <div
          id="beverages"
          className="flex items-center gap-3 py-3 px-5 rounded-t-md scroll-mt-24"
          style={{ background: "oklch(0.28 0.08 255)" }}
        >
          <span className="text-xl">🥤</span>
          <h2 className="napoli-label text-base text-white tracking-widest">Beverages</h2>
        </div>
        <div
          className="rounded-b-md border border-t-0 mb-8 overflow-hidden"
          style={{ borderColor: "oklch(0.45 0.06 255)", background: "oklch(0.96 0.02 255)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
            {BEVERAGES.map((bev) => {
              const bevPhoto = getMenuPhoto(bev.name);
              if ((bev as any).prices) {
                return <React.Fragment key={bev.name}>{(bev as any).prices.map((p: any) => (
                  <div
                    key={p.size}
                    className="flex items-center gap-3 px-4 py-3 border-b border-r"
                    style={{ borderColor: "oklch(0.87 0.04 255)" }}
                  >
                    {bevPhoto ? (
                      <div className="shrink-0 rounded overflow-hidden" style={{ width: 44, height: 44 }}>
                        <img src={bevPhoto} alt={bev.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ) : <span className="text-base">🥤</span>}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold napoli-body" style={{ color: "oklch(0.22 0.08 255)" }}>{bev.name} <span className="font-normal text-xs" style={{ color: "oklch(0.50 0.05 255)" }}>({p.size})</span></span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="napoli-price text-sm font-bold" style={{ color: "oklch(0.35 0.14 255)" }}>{p.price}</span>
                      <button
                        onClick={() => { const price = parseFloat(p.price.replace("$","")); addItem({ id: `bev-${bev.name}-${p.size}-${Date.now()}`, name: `${bev.name} (${p.size})`, price, quantity: 1, category: "beverages" }); toast.success(`${bev.name} (${p.size}) added to cart!`); }}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                        style={{ background: "oklch(0.38 0.12 255)", color: "white" }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                ))}</React.Fragment>;
              }
              if ((bev as any).price) {
                const price = parseFloat(((bev as any).price as string).replace("$",""));
                const label = bev.name + ((bev as any).size ? ` (${(bev as any).size})` : "");
                return (
                  <div
                    key={bev.name}
                    className="flex items-center gap-3 px-4 py-3 border-b border-r"
                    style={{ borderColor: "oklch(0.87 0.04 255)" }}
                  >
                    {bevPhoto ? (
                      <div className="shrink-0 rounded overflow-hidden" style={{ width: 44, height: 44 }}>
                        <img src={bevPhoto} alt={bev.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ) : <span className="text-base">🍶</span>}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold napoli-body" style={{ color: "oklch(0.22 0.08 255)" }}>{label}</span>
                      {(bev as any).note && <p className="text-xs" style={{ color: "oklch(0.50 0.05 255)" }}>{(bev as any).note}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="napoli-price text-sm font-bold" style={{ color: "oklch(0.35 0.14 255)" }}>{(bev as any).price}</span>
                      <button
                        onClick={() => { addItem({ id: `bev-${bev.name}-${Date.now()}`, name: label, price, quantity: 1, category: "beverages" }); toast.success(`${label} added to cart!`); }}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                        style={{ background: "oklch(0.38 0.12 255)", color: "white" }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={bev.name} className="flex items-center gap-3 px-4 py-3 border-b border-r" style={{ borderColor: "oklch(0.87 0.04 255)" }}>
                  {bevPhoto ? (
                    <div className="shrink-0 rounded overflow-hidden" style={{ width: 44, height: 44 }}>
                      <img src={bevPhoto} alt={bev.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : <span className="text-base">🥤</span>}
                  <span className="napoli-body text-sm flex-1" style={{ color: "oklch(0.22 0.08 255)" }}>{bev.name}</span>
                  {(bev as any).note && <span className="text-xs napoli-body italic" style={{ color: "oklch(0.50 0.05 255)" }}>{(bev as any).note}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ANYTIME SPECIALS ───────────────────────────────── */}
        <SectionHeader id="specials" title="Anytime Specials" emoji="⭐" photo="/manus-storage/napoli-specials-header_30ef5751.jpg" />
        <MenuCard>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
            {ANYTIME_SPECIALS.map((item) => (
              <AnytimeSpecialRow key={item.num} item={item} onCustomize={setSpecialNum} />
            ))}
          </div>
          <div className="px-5 py-3 border-t text-xs napoli-body" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)", color: "oklch(0.52 0.03 30)" }}>
            Taxes not included. Offers cannot be combined. Management reserves all rights. Prices are subject to change without notice. $1.99 Starting delivery charge. No Personal Checks.
          </div>
        </MenuCard>
      </div>

      <NapoliFooter />
    </div>
  );
}
