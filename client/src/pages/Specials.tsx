/**
 * Napoli Pizzeria — Specials Page
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Star, Plus, ShoppingCart } from "lucide-react";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";
import { ANYTIME_SPECIALS, LUNCH_SPECIALS, RESTAURANT_INFO } from "@/lib/napoliData";
import LunchTimerBadge from "@/components/LunchTimerBadge";
import SpecialCustomizerModal from "@/components/SpecialCustomizerModal";
import LunchCustomizerModal, { type LunchItem } from "@/components/LunchCustomizerModal";
import PickUpSpecialModal from "@/components/PickUpSpecialModal";
import { useCart } from "@/contexts/CartContext";
import { useLunchTimer } from "@/hooks/useLunchTimer";
import { toast } from "sonner";

function parsePrice(price: string): number | null {
  const n = parseFloat(price.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

// Items that need the customizer modal
const NEEDS_CUSTOMIZER = new Set([2, 3, 4, 6, 9, 13, 16, 19, 24]);

export default function Specials() {
  const [specialNum, setSpecialNum] = useState<number | null>(null);
  const [lunchItem, setLunchItem] = useState<LunchItem | null>(null);
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const { addItem, openCart } = useCart();
  const lunchTimer = useLunchTimer();
  const isLunchOpen = lunchTimer.isOpen;

  // Scroll to hash anchor on mount (e.g. /specials#anytime-specials)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const scrollToHash = () => {
      const el = document.getElementById(hash);
      if (!el) return;
      const navbarHeight = 90;
      const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    };
    setTimeout(scrollToHash, 200);
    setTimeout(scrollToHash, 700);
  }, []);

  const handleLunchAdd = (item: LunchItem) => {
    if (!isLunchOpen) return;
    if (NEEDS_CUSTOMIZER.has(item.num)) {
      setLunchItem(item);
      return;
    }
    const numericPrice = parsePrice(item.price);
    if (!numericPrice) return;
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
    <div className="min-h-screen flex flex-col bg-napoli-cream">
      <NapoliNavbar />
      <PickUpSpecialModal open={pickupModalOpen} onClose={() => setPickupModalOpen(false)} />

      {/* Header */}
      <div className="py-10 border-b" style={{ background: "var(--napoli-dark)", borderColor: "oklch(0.28 0.04 30)" }}>
        <div className="container text-center">
          <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-gold)", letterSpacing: "0.2em" }}>Save Big</p>
          <h1 className="napoli-display text-4xl md:text-5xl mb-2" style={{ color: "oklch(0.99 0.015 80)" }}>Specials & Deals</h1>
          <p className="napoli-body text-sm" style={{ color: "oklch(0.65 0.015 80)" }}>Offers cannot be combined. Taxes not included.</p>
        </div>
      </div>

      <div className="container py-10 flex-1">
        {/* Pick-up special */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-md border-2 border-dashed mb-10"
          style={{ borderColor: "var(--napoli-gold)", background: "white" }}
        >
          <div>
            <span className="napoli-badge-gold mb-2 inline-block">Pick Up Special</span>
            <h2 className="napoli-display text-3xl" style={{ color: "var(--napoli-dark)" }}>
              {RESTAURANT_INFO.pickupSpecial.label}
            </h2>
          </div>
          <div className="text-center">
            <div className="napoli-price text-5xl" style={{ color: "var(--napoli-red)" }}>{RESTAURANT_INFO.pickupSpecial.price}</div>
            <button
              onClick={() => setPickupModalOpen(true)}
              className="napoli-btn-red flex items-center gap-2 px-6 py-3 rounded text-sm mt-3"
              style={{ background: "var(--napoli-red)", color: "white" }}
            >
              Order Now <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Lunch Specials */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="napoli-display text-2xl" style={{ color: "var(--napoli-dark)" }}>Lunch Specials</h2>
            <span className="napoli-badge-green">Mon–Fri 10AM–3PM</span>
            <span className="napoli-badge-gold">FREE Soda!</span>
            <LunchTimerBadge />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {LUNCH_SPECIALS.items.map((item) => (
              <div
                key={item.num}
                className="flex items-center gap-3 p-4 rounded border bg-white napoli-card-hover"
                style={{
                  borderColor: "oklch(0.88 0.015 80)",
                  opacity: isLunchOpen ? 1 : 0.5,
                  transition: "opacity 0.3s ease",
                }}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 napoli-price"
                  style={{ background: isLunchOpen ? "var(--napoli-red)" : "oklch(0.55 0.02 30)", color: "white" }}
                >
                  {item.num}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{item.name}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="napoli-price text-base" style={{ color: isLunchOpen ? "var(--napoli-red)" : "oklch(0.55 0.02 30)" }}>{item.price}</div>
                  <button
                    onClick={() => handleLunchAdd(item)}
                    disabled={!isLunchOpen}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
                    style={{
                      background: isLunchOpen ? "var(--napoli-red)" : "oklch(0.55 0.02 30)",
                      color: "white",
                      cursor: isLunchOpen ? "pointer" : "not-allowed",
                    }}
                    title={isLunchOpen ? `Add #${item.num} ${item.name} to cart` : "Lunch Specials available 10 AM – 3 PM only"}
                  >
                    <ShoppingCart size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Anytime Specials */}
        <div id="anytime-specials">
          <div className="flex items-center gap-3 mb-4">
            <Star size={18} style={{ color: "var(--napoli-gold)" }} fill="var(--napoli-gold)" />
            <h2 className="napoli-display text-2xl" style={{ color: "var(--napoli-dark)" }}>Anytime Specials</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ANYTIME_SPECIALS.map((item) => (
              <div
                key={item.num}
                className="flex items-start gap-3 p-4 rounded border bg-white napoli-card-hover"
                style={{ borderColor: "oklch(0.88 0.015 80)" }}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 napoli-price"
                  style={{ background: "var(--napoli-green)", color: "white" }}
                >
                  {item.num}
                </span>
                <div className="flex-1">
                  <div className="text-sm napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{item.name}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="napoli-price text-base" style={{ color: "var(--napoli-red)" }}>{item.price}</div>
                  <button
                    onClick={() => setSpecialNum(item.num)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold transition-all active:scale-95 hover:opacity-90"
                    style={{ background: "var(--napoli-green)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                    title={`Order #${item.num}`}
                  >
                    <Plus size={11} /> Order
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs napoli-body mt-4 px-1" style={{ color: "oklch(0.52 0.03 30)" }}>
            Taxes not included. Offers cannot be combined. Management reserves all rights. Prices are subject to change without notice. $1.99 Starting delivery charge. No Personal Checks.
          </p>
        </div>
      </div>

      {/* Anytime Specials Customizer Modal */}
      <SpecialCustomizerModal
        key={specialNum}
        specialNum={specialNum}
        onClose={() => setSpecialNum(null)}
      />

      {/* Lunch Customizer Modal */}
      {lunchItem && (
        <LunchCustomizerModal
          item={lunchItem}
          onClose={() => setLunchItem(null)}
        />
      )}

      <NapoliFooter />
    </div>
  );
}
