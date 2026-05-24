/**
 * Napoli Pizzeria — Home Page
 * Design: Authentic Italian trattoria — red/cream/green, Playfair Display headings
 */
import { Link } from "wouter";
import { ArrowRight, Star, Phone, MapPin, Clock, Truck, UtensilsCrossed, ShoppingBag, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";
import { RESTAURANT_INFO, LUNCH_SPECIALS, PIZZA_SPECIALS, APPETIZERS } from "@/lib/napoliData";

const handleOrder = () => toast.info("Order online at NapoliPizzeria.com or call 725-204-0379!");

const SERVICES = [
  { icon: <Truck size={22} />, label: "Delivery", desc: "Fast delivery to your door" },
  { icon: <UtensilsCrossed size={22} />, label: "Dine-In", desc: "Enjoy the full Italian experience" },
  { icon: <ShoppingBag size={22} />, label: "Pick Up", desc: "Order ahead, skip the wait" },
  { icon: <Phone size={22} />, label: "Catering", desc: "Events big & small" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-napoli-cream">
      <NapoliNavbar />

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
              <button
                onClick={handleOrder}
                className="napoli-btn-red flex items-center gap-2 px-7 py-3.5 rounded text-sm"
              >
                Order Online
                <ArrowRight size={16} />
              </button>
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
          <span className="flex items-center gap-2 napoli-body" style={{ color: "oklch(0.75 0.015 80)" }}>
            <MapPin size={14} style={{ color: "var(--napoli-gold)" }} />
            {RESTAURANT_INFO.address}, {RESTAURANT_INFO.city}
          </span>
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
              <Link href="/menu">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Appetizers */}
            <Link href="/menu">
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
            <Link href="/menu">
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
            <Link href="/menu">
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
              <p className="napoli-label text-xs mb-2" style={{ color: "oklch(0.75 0.08 145)", letterSpacing: "0.2em" }}>
                Monday – Friday · 9AM – 3PM Only
              </p>
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
            <Link href="/menu">
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
            <button
              onClick={handleOrder}
              className="flex items-center gap-2 px-8 py-3.5 rounded text-sm font-semibold napoli-label transition-colors"
              style={{ background: "var(--napoli-gold)", color: "var(--napoli-dark)" }}
            >
              Order Online <ArrowRight size={15} />
            </button>
            <a
              href={`tel:${RESTAURANT_INFO.phone}`}
              className="flex items-center gap-2 px-8 py-3.5 rounded text-sm font-semibold napoli-label border-2 transition-colors"
              style={{ borderColor: "oklch(0.60 0.015 80)", color: "white" }}
            >
              <Phone size={15} /> Call {RESTAURANT_INFO.phone}
            </a>
          </div>
        </div>
      </section>

      <NapoliFooter />
    </div>
  );
}
