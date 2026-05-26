/**
 * Napoli Pizzeria — Specials Page
 */
import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Star, Plus } from "lucide-react";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";
import { ANYTIME_SPECIALS, LUNCH_SPECIALS, RESTAURANT_INFO } from "@/lib/napoliData";
import LunchTimerBadge from "@/components/LunchTimerBadge";
import SpecialCustomizerModal from "@/components/SpecialCustomizerModal";

export default function Specials() {
  const [specialNum, setSpecialNum] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-napoli-cream">
      <NapoliNavbar />

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
            <Link href="/menu">
              <button className="napoli-btn-red flex items-center gap-2 px-6 py-3 rounded text-sm mt-3">
                Order Now <ArrowRight size={15} />
              </button>
            </Link>
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
                style={{ borderColor: "oklch(0.88 0.015 80)" }}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 napoli-price"
                  style={{ background: "var(--napoli-red)", color: "white" }}
                >
                  {item.num}
                </span>
                <div className="flex-1">
                  <div className="text-sm napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{item.name}</div>
                </div>
                <div className="napoli-price text-base shrink-0" style={{ color: "var(--napoli-red)" }}>{item.price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Anytime Specials */}
        <div>
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

      <NapoliFooter />
    </div>
  );
}
