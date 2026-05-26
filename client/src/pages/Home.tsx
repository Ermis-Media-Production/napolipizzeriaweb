/**
 * Napoli Pizzeria — Home Page
 * Design: Authentic Italian trattoria — red/cream/green, Playfair Display headings
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Star, Phone, MapPin, Clock, Truck, UtensilsCrossed, ShoppingBag, ChevronRight, Quote, CalendarClock, Flame, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";
import { RESTAURANT_INFO, LUNCH_SPECIALS, PIZZA_SPECIALS, APPETIZERS, ANYTIME_SPECIALS } from "@/lib/napoliData";
import SpecialCustomizerModal from "@/components/SpecialCustomizerModal";
import LunchTimerBadge from "@/components/LunchTimerBadge";

const handleOrder = () => toast.info("Order online at napolipizzerianorthlasvegas.com or call 725-204-0379!");

const GOOGLE_REVIEWS = [
  {
    name: "Maria G.",
    avatar: "MG",
    rating: 5,
    date: "hace 2 semanas",
    text: "Best pizza in North Las Vegas! The 16\" pepperoni is absolutely amazing. The crust is perfectly crispy and the sauce has just the right amount of seasoning. We order every Friday night!",
  },
  {
    name: "James T.",
    avatar: "JT",
    rating: 5,
    date: "hace 1 mes",
    text: "Tried the Meat Lover's Special and it was incredible. Huge portions, great value. The wings with Buffalo sauce were also on point. Definitely our go-to pizza spot!",
  },
  {
    name: "Sandra R.",
    avatar: "SR",
    rating: 5,
    date: "hace 3 semanas",
    text: "The lunch specials are a steal! $9.49 for a full meal with a free soda — you can't beat that. The staff is always friendly and the food comes out fast. Highly recommend!",
  },
  {
    name: "Carlos M.",
    avatar: "CM",
    rating: 5,
    date: "hace 2 meses",
    text: "Ordered the 30\" pizza for a family gathering and everyone was blown away. Great quality, delivered hot and on time. Napoli Pizzeria never disappoints. 5 stars every time!",
  },
  {
    name: "Lisa K.",
    avatar: "LK",
    rating: 5,
    date: "hace 1 semana",
    text: "The BBQ Chicken pizza is out of this world. Crispy crust, generous toppings, and the delivery was super fast. This place is a hidden gem in North Las Vegas. Will keep coming back!",
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={14} fill="#FBBC04" stroke="none" />
      ))}
    </div>
  );
}

// ── FEATURED SPECIALS PICKED FOR HOME ────────────────────────────────────────
const FEATURED_SPECIALS = [
  { num: 1,  name: "Two 16\" Pizzas 1 Topping",                          price: "$32.99",  tag: "Fan Favorite",   badge: "napoli-badge-red" },
  { num: 7,  name: "Two 16\" Pizzas 2 Toppings/ea + (1) 2 Liter Soda",  price: "$39.99",  tag: "Best Value",     badge: "napoli-badge-gold" },
  { num: 9,  name: "16\" Pizza 1 Topping + 20 Wings + (1) 2 Liter Soda",price: "$43.99",  tag: "Pizza + Wings",   badge: "napoli-badge-green" },
  { num: 5,  name: "24\" Cheese Pizza + 20 Wings + (1) 2 Liter Soda",   price: "$52.99",  tag: "Party Size",     badge: "napoli-badge-red" },
  { num: 15, name: "Two 18\" Pizzas 2 Toppings + Two 2 Liter Sodas",    price: "$100.99", tag: "Family Deal",    badge: "napoli-badge-gold" },
  { num: 19, name: "36\" Pizza 4 Toppings + 40 Wings + Garlic Balls + Two 2L Sodas", price: "$129.99", tag: "Ultimate Feast", badge: "napoli-badge-green" },
];

function AnytimeSpecialsFeatured() {
  const [activeSpecial, setActiveSpecial] = useState<number | null>(null);

  return (
    <section
      className="py-14 border-t"
      style={{ background: "oklch(0.14 0.04 27)", borderColor: "oklch(0.22 0.05 27)" }}
    >
      <div className="container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-gold)", letterSpacing: "0.2em" }}>
              Available Any Time
            </p>
            <h2 className="napoli-display text-3xl md:text-4xl" style={{ color: "oklch(0.99 0.015 80)" }}>
              Anytime Specials
            </h2>
            <p className="napoli-body text-sm mt-2" style={{ color: "oklch(0.68 0.015 80)" }}>
              19 combo deals — pizzas, wings, sodas & more at unbeatable prices
            </p>
          </div>
          <Link href="/specials">
            <button
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded text-sm napoli-label transition-colors"
              style={{ background: "var(--napoli-red)", color: "white" }}
            >
              See All 19 Specials <ArrowRight size={14} />
            </button>
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_SPECIALS.map((s) => (
            <div
              key={s.num}
              className="rounded-md border p-5 flex flex-col gap-3 transition-all cursor-pointer"
              style={{
                borderColor: "oklch(0.28 0.06 27)",
                background: "oklch(0.19 0.05 27)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--napoli-gold)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "oklch(0.28 0.06 27)"; }}
            >
              {/* Number + tag */}
              <div className="flex items-center justify-between">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold napoli-price shrink-0"
                  style={{ background: "var(--napoli-red)", color: "white" }}
                >
                  {s.num}
                </span>
                <span className={s.badge} style={{ fontSize: "0.65rem" }}>{s.tag}</span>
              </div>

              {/* Name */}
              <p className="napoli-body text-sm font-semibold flex-1" style={{ color: "oklch(0.90 0.015 80)" }}>
                {s.name}
              </p>

              {/* Price + Order button */}
              <div className="flex items-center justify-between">
                <span className="napoli-price text-xl" style={{ color: "var(--napoli-gold)" }}>
                  {s.price}
                </span>
                <button
                  onClick={() => setActiveSpecial(s.num)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded text-xs napoli-label transition-all active:scale-95"
                  style={{ background: "var(--napoli-red)", color: "white" }}
                >
                  Order <ChevronRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs napoli-body mt-6" style={{ color: "oklch(0.50 0.03 27)" }}>
          Taxes not included · Offers cannot be combined · Prices subject to change
        </p>
      </div>

      {/* Customizer modal */}
      {activeSpecial !== null && (
        <SpecialCustomizerModal
          specialNum={activeSpecial}
          onClose={() => setActiveSpecial(null)}
        />
      )}
    </section>
  );
}

function GoogleReviewsSection() {
  return (
    <section
      className="py-14 overflow-hidden"
      style={{ background: "oklch(0.97 0.010 80)" }}
    >
      <div className="container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-red)", letterSpacing: "0.2em" }}>
              Lo Que Dicen Nuestros Clientes
            </p>
            <h2 className="napoli-display text-3xl md:text-4xl" style={{ color: "var(--napoli-dark)" }}>
              Reseñas de Google
            </h2>
          </div>
          {/* Google badge */}
          <a
            href="https://www.google.com/maps/search/Napoli+Pizzeria+North+Las+Vegas"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-opacity hover:opacity-80 shrink-0"
            style={{ borderColor: "oklch(0.85 0.015 80)", background: "white" }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.7 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" fill="#FFC107"/>
              <path d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.7 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" fill="#FF3D00"/>
              <path d="M24 44c5.4 0 10.3-2 14-5.3l-6.5-5.5C29.5 35.1 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.1C9.4 35.6 16.2 44 24 44z" fill="#4CAF50"/>
              <path d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.5 5.5C37.3 39.4 44 34.5 44 24c0-1.3-.1-2.7-.4-3.9z" fill="#1976D2"/>
            </svg>
            <span className="text-sm font-semibold napoli-label" style={{ color: "oklch(0.35 0.03 30)" }}>
              Ver en Google Maps
            </span>
          </a>
        </div>

        {/* Reviews grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {GOOGLE_REVIEWS.map((review) => (
            <div
              key={review.name}
              className="bg-white rounded-lg p-5 border shadow-sm flex flex-col gap-3 transition-shadow hover:shadow-md"
              style={{ borderColor: "oklch(0.90 0.012 80)" }}
            >
              {/* Top: avatar + name + stars */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
                  >
                    {review.avatar}
                  </div>
                  <div>
                    <div className="napoli-label text-sm font-semibold" style={{ color: "var(--napoli-dark)" }}>
                      {review.name}
                    </div>
                    <div className="text-xs napoli-body" style={{ color: "oklch(0.60 0.015 80)" }}>
                      {review.date}
                    </div>
                  </div>
                </div>
                <StarRating count={review.rating} />
              </div>

              {/* Review text */}
              <div className="relative">
                <Quote size={16} className="absolute -top-1 -left-1 opacity-20" style={{ color: "var(--napoli-red)" }} />
                <p className="napoli-body text-sm leading-relaxed pl-4" style={{ color: "oklch(0.42 0.03 30)" }}>
                  {review.text}
                </p>
              </div>

              {/* Google logo bottom */}
              <div className="flex items-center gap-1.5 mt-auto pt-2 border-t" style={{ borderColor: "oklch(0.93 0.010 80)" }}>
                <svg width="14" height="14" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.7 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" fill="#FFC107"/>
                  <path d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.7 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" fill="#FF3D00"/>
                  <path d="M24 44c5.4 0 10.3-2 14-5.3l-6.5-5.5C29.5 35.1 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.1C9.4 35.6 16.2 44 24 44z" fill="#4CAF50"/>
                  <path d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.5 5.5C37.3 39.4 44 34.5 44 24c0-1.3-.1-2.7-.4-3.9z" fill="#1976D2"/>
                </svg>
                <span className="text-xs napoli-body" style={{ color: "oklch(0.55 0.015 80)" }}>Google Review</span>
              </div>
            </div>
          ))}
        </div>

        {/* Overall rating summary */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 py-5 rounded-lg border" style={{ background: "white", borderColor: "oklch(0.90 0.012 80)" }}>
          <div className="text-center">
            <div className="napoli-price text-4xl" style={{ color: "var(--napoli-dark)" }}>5.0</div>
            <StarRating count={5} />
            <div className="text-xs napoli-body mt-1" style={{ color: "oklch(0.55 0.015 80)" }}>Basado en reseñas de Google</div>
          </div>
          <div className="hidden sm:block w-px h-12" style={{ background: "oklch(0.88 0.015 80)" }} />
          <div className="text-center sm:text-left">
            <div className="napoli-label text-sm font-semibold mb-1" style={{ color: "var(--napoli-dark)" }}>
              Napoli Pizzeria · North Las Vegas
            </div>
            <div className="text-sm napoli-body" style={{ color: "oklch(0.50 0.03 30)" }}>
              3131 W Craig Rd, North Las Vegas, NV 89032
            </div>
            <a
              href="https://www.google.com/maps/search/Napoli+Pizzeria+North+Las+Vegas"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs napoli-label transition-opacity hover:opacity-70"
              style={{ color: "var(--napoli-red)" }}
            >
              Dejar una reseña <ArrowRight size={11} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

const SERVICES = [
  { icon: <Truck size={22} />, label: "Delivery", desc: "Fast delivery to your door", href: null },
  { icon: <UtensilsCrossed size={22} />, label: "Dine-In", desc: "Enjoy the full Italian experience", href: null },
  { icon: <ShoppingBag size={22} />, label: "Pick Up", desc: "Order ahead, skip the wait", href: null },
  { icon: <CalendarClock size={22} />, label: "Reservations", desc: "Book your table or event", href: "/reservations" },
];

// ── DAILY SPECIALS for rotating banner ────────────────────────────────────────
const DAILY_SPECIALS = [
  { num: 1,  name: "Two 16\" Pizzas 1 Topping",                                         price: "$32.99", tag: "🍕 Fan Favorite" },
  { num: 7,  name: "Two 16\" Pizzas 2 Toppings/ea + (1) 2 Liter Soda",                  price: "$39.99", tag: "🔥 Best Value" },
  { num: 9,  name: "16\" Pizza 1 Topping + 20 Wings + (1) 2 Liter Soda",                price: "$43.99", tag: "🍗 Pizza + Wings" },
  { num: 13, name: "16\" Specialty Pizza + 20 Wings + (1) 2 Liter Soda",               price: "$55.99", tag: "⭐ Specialty Combo" },
  { num: 5,  name: "24\" Cheese Pizza + 20 Wings + (1) 2 Liter Soda",                  price: "$52.99", tag: "🎉 Party Size" },
  { num: 15, name: "Two 18\" Pizzas 2 Toppings + Two 2 Liter Sodas",                   price: "$100.99", tag: "👨‍👩‍👧‍👦 Family Deal" },
  { num: 19, name: "36\" Pizza 4 Toppings + 40 Wings + Garlic Balls + Two 2L Sodas",   price: "$129.99", tag: "🏆 Ultimate Feast" },
  { num: 3,  name: "18\" Pizza 2 Toppings",                                              price: "$22.99", tag: "💰 Great Price" },
];

function DailySpecialBanner() {
  const [idx, setIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("left");

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((idx + 1) % DAILY_SPECIALS.length, "left");
    }, 5000);
    return () => clearInterval(timer);
  }, [idx]);

  function goTo(newIdx: number, dir: "left" | "right") {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setIdx(newIdx);
      setAnimating(false);
    }, 220);
  }

  const special = DAILY_SPECIALS[idx];

  return (
    <div
      className="relative overflow-hidden"
      style={{ background: "oklch(0.22 0.06 27)", borderBottom: "2px solid var(--napoli-gold)" }}
    >
      <div className="container py-2.5 flex items-center justify-between gap-3">
        {/* Left: label */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Flame size={15} style={{ color: "var(--napoli-gold)" }} />
          <span
            className="napoli-label text-xs font-bold"
            style={{ color: "var(--napoli-gold)", letterSpacing: "0.15em" }}
          >
            ANYTIME SPECIALS
          </span>
        </div>

        {/* Center: rotating special */}
        <div className="flex-1 flex items-center justify-center gap-3 min-w-0 overflow-hidden">
          <button
            onClick={() => goTo((idx - 1 + DAILY_SPECIALS.length) % DAILY_SPECIALS.length, "right")}
            className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: "oklch(0.65 0.015 80)" }}
            aria-label="Previous special"
          >
            <ChevronLeft size={14} />
          </button>

          <div
            className="flex items-center gap-2 min-w-0 transition-all"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating
                ? `translateX(${direction === "left" ? "-12px" : "12px"})`
                : "translateX(0)",
              transition: "opacity 220ms ease-out, transform 220ms ease-out",
            }}
          >
            <span
              className="napoli-badge-gold shrink-0 hidden md:inline"
              style={{ fontSize: "0.65rem", padding: "2px 8px" }}
            >
              {special.tag}
            </span>
            <span
              className="napoli-label text-xs font-semibold truncate"
              style={{ color: "oklch(0.92 0.015 80)" }}
            >
              #{special.num} · {special.name}
            </span>
            <span
              className="napoli-price text-sm shrink-0"
              style={{ color: "var(--napoli-gold)" }}
            >
              {special.price}
            </span>
          </div>

          <button
            onClick={() => goTo((idx + 1) % DAILY_SPECIALS.length, "left")}
            className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: "oklch(0.65 0.015 80)" }}
            aria-label="Next special"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Right: CTA */}
        <Link href="/specials">
          <span
            className="shrink-0 napoli-label text-xs font-bold px-3 py-1.5 rounded transition-colors hover:opacity-90"
            style={{ background: "var(--napoli-red)", color: "white" }}
          >
            Order Now
          </span>
        </Link>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1 pb-1.5">
        {DAILY_SPECIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > idx ? "left" : "right")}
            className="w-1.5 h-1.5 rounded-full transition-all"
            style={{
              background: i === idx ? "var(--napoli-gold)" : "oklch(0.45 0.04 27)",
              transform: i === idx ? "scale(1.3)" : "scale(1)",
            }}
            aria-label={`Go to special ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-napoli-cream">
      <NapoliNavbar />

      {/* ── DAILY SPECIAL BANNER ─────────────────────────────── */}
      <DailySpecialBanner />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: "580px" }}>
        <div className="absolute inset-0">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/napoli-hero-oMHothV9Si69i2odSCVBya.webp"
            alt="Napoli Pizzeria interior with wood-fired oven"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(110deg, oklch(0.14 0.03 27 / 0.92) 0%, oklch(0.14 0.03 27 / 0.72) 55%, oklch(0.14 0.03 27 / 0.30) 100%)",
            }}
          />
        </div>

        <div className="relative container py-20 md:py-28">
          <div className="max-w-xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-4 animate-fade-up">
              <span className="napoli-badge-gold">North Las Vegas, NV</span>
              <span className="napoli-badge-green">Best Pizzeria</span>
            </div>

            {/* Headline */}
            <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
              <p className="napoli-label text-sm mb-1" style={{ color: "oklch(0.80 0.015 80)", letterSpacing: "0.2em" }}>
                3131 W Craig Rd
              </p>
              <h1 className="napoli-display text-5xl md:text-6xl mb-2" style={{ color: "oklch(0.99 0.015 80)" }}>
                Napoli
              </h1>
              <h1 className="napoli-display text-5xl md:text-6xl mb-4" style={{ color: "var(--napoli-gold)" }}>
                Pizzeria
              </h1>
            </div>

            <p
              className="text-base mb-3 napoli-body leading-relaxed animate-fade-up"
              style={{ color: "oklch(0.80 0.015 80)", animationDelay: "120ms" }}
            >
              {RESTAURANT_INFO.tagline} — {RESTAURANT_INFO.subtitle}
            </p>

            {/* Stars */}
            <div className="flex items-center gap-1.5 mb-6 animate-fade-up" style={{ animationDelay: "150ms" }}>
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={16} fill="var(--napoli-gold)" stroke="none" />
              ))}
              <span className="text-sm napoli-body ml-1" style={{ color: "oklch(0.75 0.015 80)" }}>
                Loved by the community
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: "180ms" }}>
              <a
                href="tel:7252040379"
                className="napoli-btn-red flex items-center gap-2 px-7 py-3.5 rounded text-sm"
              >
                <Phone size={16} />
                Call Us
              </a>
              <Link href="/menu">
                <button
                  className="flex items-center gap-2 px-7 py-3.5 rounded text-sm font-semibold border-2 transition-colors napoli-label"
                  style={{
                    borderColor: "oklch(0.60 0.015 80)",
                    color: "oklch(0.92 0.015 80)",
                  }}
                >
                  View Menu
                  <ChevronRight size={16} />
                </button>
              </Link>
            </div>

            {/* Pick-up special badge */}
            <div
              className="inline-flex items-center gap-3 mt-8 px-4 py-3 rounded border-2 border-dashed animate-fade-up"
              style={{ borderColor: "var(--napoli-gold)", background: "oklch(0.14 0.03 27 / 0.6)", animationDelay: "240ms" }}
            >
              <div>
                <div className="napoli-label text-xs" style={{ color: "var(--napoli-gold)" }}>Pick Up Special</div>
                <div className="napoli-body text-sm" style={{ color: "oklch(0.90 0.015 80)" }}>
                  {RESTAURANT_INFO.pickupSpecial.label}
                </div>
              </div>
              <div className="napoli-price text-2xl" style={{ color: "var(--napoli-gold)" }}>
                {RESTAURANT_INFO.pickupSpecial.price}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES BAR ─────────────────────────────────────── */}
      <div className="bg-napoli-red py-4 shadow-md">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SERVICES.map((s) => (
              s.href ? (
                <Link key={s.label} href={s.href}>
                  <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "oklch(0.35 0.18 27)", color: "white" }}
                    >
                      {s.icon}
                    </div>
                    <div>
                      <div className="napoli-label text-xs text-white">{s.label}</div>
                      <div className="text-xs napoli-body" style={{ color: "oklch(0.85 0.015 80)" }}>{s.desc}</div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div key={s.label} className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.35 0.18 27)", color: "white" }}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <div className="napoli-label text-xs text-white">{s.label}</div>
                    <div className="text-xs napoli-body" style={{ color: "oklch(0.85 0.015 80)" }}>{s.desc}</div>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </div>

      {/* ── INFO STRIP ───────────────────────────────────────── */}
      <div
        className="py-4 border-b"
        style={{ background: "oklch(0.22 0.04 30)", borderColor: "oklch(0.28 0.04 30)" }}
      >
        <div className="container flex flex-wrap items-center justify-center gap-6 text-sm">
          <a href={`tel:${RESTAURANT_INFO.phone}`} className="flex items-center gap-2 napoli-body hover:opacity-80 transition-opacity" style={{ color: "var(--napoli-gold)" }}>
            <Phone size={14} />
            <strong>{RESTAURANT_INFO.phone}</strong>
          </a>
          <a
            href="https://www.google.com/maps/search/3131+W+Craig+Rd+North+Las+Vegas+NV+89032"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 napoli-body hover:opacity-75 transition-opacity"
            style={{ color: "oklch(0.75 0.015 80)" }}
          >
            <MapPin size={14} style={{ color: "var(--napoli-gold)" }} />
            {RESTAURANT_INFO.address}, {RESTAURANT_INFO.city}
          </a>
          {RESTAURANT_INFO.hours.map((h) => (
            <span key={h.days} className="flex items-center gap-2 napoli-body" style={{ color: "oklch(0.75 0.015 80)" }}>
              <Clock size={14} style={{ color: "var(--napoli-gold)" }} />
              <span>{h.days}: <strong style={{ color: "oklch(0.90 0.015 80)" }}>{h.time}</strong></span>
            </span>
          ))}
        </div>
      </div>

      {/* ── PIZZA SHOWCASE ───────────────────────────────────── */}
      <section className="py-14">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-red)", letterSpacing: "0.2em" }}>
                Hand Tossed New York Style
              </p>
              <h2 className="napoli-display text-4xl md:text-5xl mb-4" style={{ color: "var(--napoli-dark)" }}>
                Home of the<br />
                <span style={{ color: "var(--napoli-red)" }}>30" & 36" Pizza</span>
              </h2>
              <p className="napoli-body text-base leading-relaxed mb-6" style={{ color: "oklch(0.42 0.03 30)" }}>
                Our hand-tossed New York style pizzas come in sizes from 10" all the way to a massive 36". With over 30 toppings to choose from and specialty creations like BBQ Chicken, Meat Lover, and our famous Napoli's Special — there's a pizza for every craving.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { label: "Sizes Available", value: "10\" – 36\"" },
                  { label: "Toppings", value: "30+" },
                  { label: "Plain Cheese from", value: "$9.49" },
                  { label: "Gluten Free", value: "14\" Available" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 rounded border"
                    style={{ borderColor: "oklch(0.88 0.015 80)", background: "white" }}
                  >
                    <div className="napoli-price text-lg" style={{ color: "var(--napoli-red)" }}>{stat.value}</div>
                    <div className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              <Link href="/menu#pizza">
                <button className="napoli-btn-red flex items-center gap-2 px-6 py-3 rounded text-sm">
                  See Full Pizza Menu <ArrowRight size={15} />
                </button>
              </Link>
            </div>
            <div className="relative">
              <div className="rounded-md overflow-hidden shadow-xl">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/napoli-pizza-hero-YEnYByvTXcXnaJkADsVxqq.webp"
                  alt="Napoli's signature pizza with multiple toppings"
                  className="w-full object-cover"
                  style={{ maxHeight: "380px" }}
                />
              </div>
              {/* Floating badge */}
              <div
                className="absolute -bottom-4 -left-4 px-4 py-3 rounded shadow-lg border-2"
                style={{
                  background: "var(--napoli-red)",
                  borderColor: "var(--napoli-gold)",
                  color: "white",
                }}
              >
                <div className="napoli-label text-xs" style={{ color: "var(--napoli-gold)" }}>Pick Up Special</div>
                <div className="napoli-price text-xl">$12.99</div>
                <div className="text-xs napoli-body opacity-90">16" 1 Topping</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MENU HIGHLIGHTS ──────────────────────────────────── */}
      <section
        className="py-14 border-t border-b"
        style={{ background: "oklch(0.96 0.012 80)", borderColor: "oklch(0.88 0.015 80)" }}
      >
        <div className="container">
          <div className="text-center mb-10">
            <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-red)", letterSpacing: "0.2em" }}>
              Something for Everyone
            </p>
            <h2 className="napoli-display text-3xl md:text-4xl" style={{ color: "var(--napoli-dark)" }}>
              Explore Our Menu
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* Appetizers */}
            <Link href="/menu#appetizers">
              <div
                className="napoli-card-hover rounded-md overflow-hidden border cursor-pointer bg-white"
                style={{ borderColor: "oklch(0.88 0.015 80)" }}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/napoli-appetizers-YvAsr6L6PifDDkdKLJhf7c.webp"
                    alt="Appetizers"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, oklch(0.14 0.03 27 / 0.7), transparent)" }}
                  />
                  <div className="absolute bottom-3 left-4">
                    <span className="napoli-badge-red">Appetizers</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="napoli-heading text-lg mb-1" style={{ color: "var(--napoli-dark)" }}>
                    Starters & Sides
                  </h3>
                  <p className="text-sm napoli-body mb-3" style={{ color: "oklch(0.50 0.03 30)" }}>
                    Napoli's Combo Platter, Mozzarella Sticks, Bruschetta, Garlic Bread & more
                  </p>
                  <div className="flex items-center gap-1 text-sm font-semibold napoli-label" style={{ color: "var(--napoli-red)", fontSize: "0.75rem" }}>
                    View Menu <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            </Link>

            {/* Lunch Specials */}
            <Link href="/menu#lunch">
              <div
                className="napoli-card-hover rounded-md overflow-hidden border cursor-pointer bg-white"
                style={{ borderColor: "oklch(0.88 0.015 80)" }}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/napoli-lunch-kSRpB84botD33aygyJvCHH.webp"
                    alt="Lunch Specials"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, oklch(0.14 0.03 27 / 0.7), transparent)" }}
                  />
                  <div className="absolute bottom-3 left-4">
                    <span className="napoli-badge-green">Lunch Specials</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="napoli-heading text-lg mb-1" style={{ color: "var(--napoli-dark)" }}>
                    Lunch Specials
                  </h3>
                  <p className="text-sm napoli-body mb-1" style={{ color: "oklch(0.50 0.03 30)" }}>
                    Mon–Fri 9AM–3PM · 24 options starting at $9.49
                  </p>
                  <p className="text-xs font-bold napoli-label mb-3" style={{ color: "var(--napoli-green)" }}>
                    FREE Can of Soda with every order!
                  </p>
                  <div className="flex items-center gap-1 text-sm font-semibold napoli-label" style={{ color: "var(--napoli-red)", fontSize: "0.75rem" }}>
                    View Menu <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            </Link>

            {/* Pizzeria */}
            <Link href="/menu#pizza">
              <div
                className="napoli-card-hover rounded-md overflow-hidden border cursor-pointer bg-white"
                style={{ borderColor: "oklch(0.88 0.015 80)" }}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/napoli-pizza-hero-YEnYByvTXcXnaJkADsVxqq.webp"
                    alt="Pizzeria"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, oklch(0.14 0.03 27 / 0.7), transparent)" }}
                  />
                  <div className="absolute bottom-3 left-4">
                    <span className="napoli-badge-gold">Pizzeria</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="napoli-heading text-lg mb-1" style={{ color: "var(--napoli-dark)" }}>
                    Hand Tossed Pizzas
                  </h3>
                  <p className="text-sm napoli-body mb-3" style={{ color: "oklch(0.50 0.03 30)" }}>
                    17 specialty creations, 30+ toppings, sizes 10"–36", stuffed dough & more
                  </p>
                  <div className="flex items-center gap-1 text-sm font-semibold napoli-label" style={{ color: "var(--napoli-red)", fontSize: "0.75rem" }}>
                    View Menu <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            </Link>

            {/* Wings */}
            <Link href="/menu#wings">
              <div
                className="napoli-card-hover rounded-md overflow-hidden border cursor-pointer bg-white"
                style={{ borderColor: "oklch(0.88 0.015 80)" }}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="/manus-storage/napoli-wings_5305444c.jpg"
                    alt="Wings"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, oklch(0.14 0.03 27 / 0.7), transparent)" }}
                  />
                  <div className="absolute bottom-3 left-4">
                    <span className="napoli-badge-red">Wings</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="napoli-heading text-lg mb-1" style={{ color: "var(--napoli-dark)" }}>
                    Wings & Fingers
                  </h3>
                  <p className="text-sm napoli-body mb-3" style={{ color: "oklch(0.50 0.03 30)" }}>
                    Buffalo, BBQ, Honey Garlic & more — Wings, Wing Dings, Boneless & Chicken Fingers
                  </p>
                  <div className="flex items-center gap-1 text-sm font-semibold napoli-label" style={{ color: "var(--napoli-red)", fontSize: "0.75rem" }}>
                    View Menu <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            </Link>

            {/* Subs */}
            <Link href="/menu#subs">
              <div
                className="napoli-card-hover rounded-md overflow-hidden border cursor-pointer bg-white"
                style={{ borderColor: "oklch(0.88 0.015 80)" }}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="/manus-storage/napoli-subs_cb6cce6c.jpg"
                    alt="Sub Sandwiches"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, oklch(0.14 0.03 27 / 0.7), transparent)" }}
                  />
                  <div className="absolute bottom-3 left-4">
                    <span className="napoli-badge-gold">Subs</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="napoli-heading text-lg mb-1" style={{ color: "var(--napoli-dark)" }}>
                    Sub Sandwiches
                  </h3>
                  <p className="text-sm napoli-body mb-3" style={{ color: "oklch(0.50 0.03 30)" }}>
                    Italian, Meatball, Chicken Parm, Steak & Cheese, Veggie & more on fresh-baked bread
                  </p>
                  <div className="flex items-center gap-1 text-sm font-semibold napoli-label" style={{ color: "var(--napoli-red)", fontSize: "0.75rem" }}>
                    View Menu <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            </Link>

            {/* Burgers */}
            <Link href="/menu#burgers">
              <div
                className="napoli-card-hover rounded-md overflow-hidden border cursor-pointer bg-white"
                style={{ borderColor: "oklch(0.88 0.015 80)" }}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="/manus-storage/napoli-burger_bea110a3.png"
                    alt="Burgers"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, oklch(0.14 0.03 27 / 0.7), transparent)" }}
                  />
                  <div className="absolute bottom-3 left-4">
                    <span className="napoli-badge-green">Burgers</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="napoli-heading text-lg mb-1" style={{ color: "var(--napoli-dark)" }}>
                    100% Angus Beef Burgers
                  </h3>
                  <p className="text-sm napoli-body mb-3" style={{ color: "oklch(0.50 0.03 30)" }}>
                    Classic, BBQ Bacon, Mushroom Swiss, Double Stack & more — all on a brioche bun
                  </p>
                  <div className="flex items-center gap-1 text-sm font-semibold napoli-label" style={{ color: "var(--napoli-red)", fontSize: "0.75rem" }}>
                    View Menu <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── LUNCH SPECIALS PROMO ─────────────────────────────── */}
      <section
        className="py-14"
        style={{ background: "var(--napoli-green)" }}
      >
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <p className="napoli-label text-xs" style={{ color: "oklch(0.75 0.08 145)", letterSpacing: "0.2em" }}>
                  Monday – Friday · 10AM – 3PM Only
                </p>
                <LunchTimerBadge />
              </div>
              <h2 className="napoli-display text-3xl md:text-4xl mb-2" style={{ color: "oklch(0.99 0.015 80)" }}>
                Lunch Specials
              </h2>
              <div
                className="inline-block px-4 py-2 rounded mb-4"
                style={{ background: "var(--napoli-gold)", color: "var(--napoli-dark)" }}
              >
                <span className="napoli-label text-sm">🥤 FREE Can of Soda with any Lunch Special!</span>
              </div>
              <p className="napoli-body text-sm leading-relaxed" style={{ color: "oklch(0.82 0.06 145)" }}>
                24 lunch options to choose from — pasta, pizza, subs, salads & more. All starting at just $9.49.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 shrink-0 w-full md:w-auto">
              {LUNCH_SPECIALS.items.slice(0, 6).map((item) => (
                <div
                  key={item.num}
                  className="flex items-start gap-2 p-3 rounded"
                  style={{ background: "oklch(0.26 0.10 145)" }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 napoli-price"
                    style={{ background: "var(--napoli-red)", color: "white" }}
                  >
                    {item.num}
                  </span>
                  <div>
                    <div className="text-xs font-semibold napoli-body" style={{ color: "oklch(0.92 0.015 80)" }}>
                      {item.name}
                    </div>
                    <div className="napoli-price text-sm" style={{ color: "var(--napoli-gold)" }}>
                      {item.price}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-8">
            <Link href="/menu">
              <button
                className="inline-flex items-center gap-2 px-7 py-3 rounded text-sm font-semibold border-2 napoli-label transition-colors"
                style={{ borderColor: "oklch(0.75 0.08 145)", color: "oklch(0.99 0.015 80)" }}
              >
                See All 24 Lunch Specials <ArrowRight size={15} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── PIZZA SPECIALS GRID ───────────────────────────────── */}
      <section className="py-14">
        <div className="container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-red)", letterSpacing: "0.2em" }}>
                Signature Creations
              </p>
              <h2 className="napoli-display text-3xl" style={{ color: "var(--napoli-dark)" }}>
                Specialty Pizzas
              </h2>
            </div>
            <Link href="/menu#pizza">
              <button className="hidden md:flex items-center gap-1.5 text-sm napoli-label" style={{ color: "var(--napoli-red)", fontSize: "0.75rem" }}>
                Full Pizza Menu <ArrowRight size={13} />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PIZZA_SPECIALS.slice(0, 8).map((pizza) => (
              <div
                key={pizza.name}
                className="napoli-menu-item p-4 rounded border bg-white"
                style={{ borderColor: "oklch(0.88 0.015 80)" }}
              >
                <h4 className="napoli-heading text-sm mb-1" style={{ color: "var(--napoli-dark)" }}>
                  {pizza.name}
                </h4>
                <p className="text-xs napoli-body leading-relaxed" style={{ color: "oklch(0.52 0.03 30)" }}>
                  {pizza.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GOOGLE REVIEWS ───────────────────────────────────── */}
      <GoogleReviewsSection />

      {/* ── ANYTIME SPECIALS FEATURED ─────────────────────── */}
      <AnytimeSpecialsFeatured />

      {/* ── CTA BAND ─────────────────────────────────────────── */}
      <section
        className="py-12"
        style={{ background: "var(--napoli-red)" }}
      >
        <div className="container text-center">
          <h2 className="napoli-display text-3xl mb-3" style={{ color: "oklch(0.99 0.015 80)" }}>
            Ready to Order?
          </h2>
          <p className="napoli-body text-base mb-6" style={{ color: "oklch(0.88 0.015 80)" }}>
            Call us or order online — delivery, pick-up, and dine-in available!
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="tel:7252040379"
              className="flex items-center gap-2 px-8 py-3.5 rounded text-sm font-semibold napoli-label transition-colors"
              style={{ background: "var(--napoli-gold)", color: "var(--napoli-dark)" }}
            >
              <Phone size={15} /> Call Us
            </a>
          </div>
        </div>
      </section>

      <NapoliFooter />
    </div>
  );
}
