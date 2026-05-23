/**
 * Napoli Pizzeria — Full Menu Page
 * All categories: Appetizers, Lunch Specials, Pizzeria, Wings, Pasta, Subs, Burgers, Salads, Desserts, Specials
 */
import { useState, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";
import {
  MENU_CATEGORIES, APPETIZERS, LUNCH_SPECIALS, PIZZA_SIZES, PIZZA_BASE_PRICES,
  PIZZA_SPECIALS, PIZZA_30_TOPPINGS, STUFFED_DOUGH, WINGS, PASTA, SUBS,
  BURGERS, TRIPLE_DECKERS, SALADS, DESSERTS, CHILDRENS_MENU, BEVERAGES,
  ANYTIME_SPECIALS, SOUPS, WRAPS, SIDES,
} from "@/lib/napoliData";

function SectionHeader({ id, title, emoji }: { id: string; title: string; emoji: string }) {
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

function ItemRow({ name, desc, price, highlight }: { name: string; desc?: string; price?: string; highlight?: boolean }) {
  return (
    <div
      className="napoli-menu-item flex items-start justify-between gap-4 px-5 py-3 border-b last:border-b-0"
      style={{
        borderColor: "oklch(0.93 0.012 80)",
        background: highlight ? "oklch(0.99 0.02 65 / 0.4)" : "transparent",
      }}
    >
      <div className="flex-1 min-w-0">
        <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{name}</span>
        {desc && <p className="text-xs napoli-body mt-0.5 leading-relaxed" style={{ color: "oklch(0.52 0.03 30)" }}>{desc}</p>}
      </div>
      {price && (
        <span className="napoli-price text-sm shrink-0" style={{ color: "var(--napoli-red)" }}>{price}</span>
      )}
    </div>
  );
}

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState("appetizers");
  const [showAllToppings, setShowAllToppings] = useState(false);

  const scrollTo = (id: string) => {
    setActiveCategory(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-napoli-cream">
      <NapoliNavbar />

      {/* Page header */}
      <div
        className="py-10 border-b"
        style={{ background: "var(--napoli-dark)", borderColor: "oklch(0.28 0.04 30)" }}
      >
        <div className="container text-center">
          <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-gold)", letterSpacing: "0.2em" }}>
            The Original Napoli Pizzeria
          </p>
          <h1 className="napoli-display text-4xl md:text-5xl mb-2" style={{ color: "oklch(0.99 0.015 80)" }}>
            Our Menu
          </h1>
          <p className="napoli-body text-sm" style={{ color: "oklch(0.65 0.015 80)" }}>
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
        <SectionHeader id="appetizers" title="Appetizers" emoji="🧅" />
        <MenuCard>
          {APPETIZERS.map((item) => (
            <div key={item.name}>
              {(item as any).prices ? (
                <div
                  className="napoli-menu-item flex items-start justify-between gap-4 px-5 py-3 border-b last:border-b-0"
                  style={{ borderColor: "oklch(0.93 0.012 80)" }}
                >
                  <div className="flex-1">
                    <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{item.name}</span>
                    {item.desc && <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>{item.desc}</p>}
                  </div>
                  <div className="flex gap-3 shrink-0">
                    {(item as any).prices.map((p: any) => (
                      <div key={p.size} className="text-center">
                        <div className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{p.size}</div>
                        <div className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{p.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <ItemRow name={item.name} desc={item.desc} price={(item as any).price} highlight={(item as any).highlight} />
              )}
            </div>
          ))}
          {/* Sides */}
          <div className="px-5 py-3 border-t" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-red)" }}>Sides</p>
            {SIDES.map((item) => (
              <div key={item.name} className="flex items-start justify-between gap-4 py-2 border-b last:border-b-0" style={{ borderColor: "oklch(0.93 0.012 80)" }}>
                <span className="text-sm napoli-body" style={{ color: "var(--napoli-dark)" }}>{item.name}</span>
                <div className="flex gap-3 shrink-0">
                  {(item as any).prices ? (item as any).prices.map((p: any) => (
                    <div key={p.size} className="text-center">
                      <div className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{p.size}</div>
                      <div className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{p.price}</div>
                    </div>
                  )) : <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{(item as any).price}</span>}
                </div>
              </div>
            ))}
          </div>
          {/* Soups */}
          <div className="px-5 py-3 border-t" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-red)" }}>Soups</p>
            {SOUPS.map((s) => (
              <div key={s.name} className="flex justify-between items-center py-2">
                <span className="text-sm napoli-body" style={{ color: "var(--napoli-dark)" }}>{s.name}</span>
                <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{s.price}</span>
              </div>
            ))}
          </div>
        </MenuCard>

        {/* ── LUNCH SPECIALS ─────────────────────────────────── */}
        <SectionHeader id="lunch" title="Lunch Specials" emoji="🕙" />
        <MenuCard>
          <div
            className="px-5 py-3 border-b flex flex-col md:flex-row items-start md:items-center gap-2"
            style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}
          >
            <span className="napoli-badge-green">Mon–Fri 9AM–3PM Only</span>
            <span className="napoli-label text-xs font-bold" style={{ color: "var(--napoli-green)" }}>
              🥤 FREE Can of Soda with any Lunch Special!
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            {LUNCH_SPECIALS.items.map((item, i) => (
              <div
                key={item.num}
                className="napoli-menu-item flex items-start gap-3 px-5 py-3 border-b border-r"
                style={{
                  borderColor: "oklch(0.93 0.012 80)",
                  borderRight: i % 2 === 0 ? "1px solid oklch(0.93 0.012 80)" : "none",
                }}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 napoli-price"
                  style={{ background: "var(--napoli-red)", color: "white" }}
                >
                  {item.num}
                </span>
                <div className="flex-1">
                  <span className="text-sm napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{item.name}</span>
                </div>
                <span className="napoli-price text-sm shrink-0" style={{ color: "var(--napoli-red)" }}>{item.price}</span>
              </div>
            ))}
          </div>
        </MenuCard>

        {/* ── PIZZERIA ───────────────────────────────────────── */}
        <SectionHeader id="pizza" title="Pizzeria — Hand Tossed New York Style" emoji="🍕" />
        <MenuCard>
          {/* Size/price table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.97 0.012 80)" }}>
                  <th className="text-left px-5 py-3 napoli-label text-xs" style={{ color: "oklch(0.52 0.03 30)" }}>Item</th>
                  {PIZZA_SIZES.map((s) => (
                    <th key={s} className="text-center px-2 py-3 napoli-label text-xs" style={{ color: "oklch(0.52 0.03 30)" }}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(PIZZA_BASE_PRICES).map(([name, prices]) => (
                  <tr key={name} className="border-t" style={{ borderColor: "oklch(0.93 0.012 80)" }}>
                    <td className="px-5 py-3 napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{name}</td>
                    {prices.map((p, i) => (
                      <td key={i} className="text-center px-2 py-3 napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{p}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gluten free note */}
          <div className="px-5 py-2 border-t flex flex-wrap gap-4" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <span className="napoli-badge-green text-xs">Gluten Free Pizza 14" — $12.75</span>
            <span className="napoli-badge-red text-xs">Sicilian 12x8 — 4 Topping Combo $37.99 · Add Topping $3.50</span>
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
          <div className="px-5 py-4 border-t" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            <p className="napoli-label text-xs mb-4" style={{ color: "var(--napoli-red)" }}>
              Napoli's Special Creations — Available in 10" · 14" · 16" · 18" · 24" · 28" · 30" · 36"
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {PIZZA_SPECIALS.map((pizza) => (
                <div
                  key={pizza.name}
                  className="napoli-menu-item flex items-start gap-3 py-3 px-3 border-b border-r"
                  style={{ borderColor: "oklch(0.93 0.012 80)" }}
                >
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-napoli-red" />
                  <div>
                    <span className="text-sm napoli-body font-bold" style={{ color: "var(--napoli-dark)" }}>{pizza.name}</span>
                    <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>{pizza.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stuffed Dough */}
          <div className="px-5 py-4 border-t" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="napoli-label text-xs mb-3" style={{ color: "var(--napoli-red)" }}>Stuffed Dough</p>
            {STUFFED_DOUGH.map((item) => (
              <div key={item.name} className="mb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-sm napoli-body font-bold" style={{ color: "var(--napoli-dark)" }}>{item.name}</span>
                    {item.desc && <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>{item.desc}</p>}
                  </div>
                  {(item as any).price && (
                    <span className="napoli-price text-sm shrink-0" style={{ color: "var(--napoli-red)" }}>{(item as any).price}</span>
                  )}
                </div>
                {(item as any).sizes && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {(item as any).sizes.map((s: string, i: number) => (
                      <div key={s} className="text-center">
                        <div className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{s}</div>
                        <div className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{(item as any).prices[i]}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Wraps */}
          <div className="px-5 py-4 border-t" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-red)" }}>Wraps <span className="napoli-badge-green ml-2">Gluten Free Bread Available</span></p>
            <p className="text-xs napoli-body mb-3" style={{ color: "oklch(0.52 0.03 30)" }}>{WRAPS.note}</p>
            <div className="flex flex-wrap gap-3">
              {WRAPS.items.map((w) => (
                <div key={w} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-napoli-red" />
                  <span className="text-sm napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{w}</span>
                  <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{WRAPS.price}</span>
                </div>
              ))}
            </div>
          </div>
        </MenuCard>

        {/* ── WINGS ──────────────────────────────────────────── */}
        <SectionHeader id="wings" title="Wings, Wing Dings & Fingers" emoji="🍗" />
        <MenuCard>
          <div className="px-5 py-3 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="text-xs napoli-body mb-1" style={{ color: "oklch(0.52 0.03 30)" }}>{WINGS.note}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="napoli-label text-xs" style={{ color: "var(--napoli-red)" }}>Flavors:</span>
              {WINGS.flavors.map((f) => (
                <span key={f} className="text-xs px-2 py-0.5 rounded border napoli-body" style={{ borderColor: "oklch(0.88 0.015 80)", color: "oklch(0.42 0.03 30)" }}>{f}</span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.97 0.012 80)" }}>
                  <th className="text-left px-5 py-3 napoli-label text-xs" style={{ color: "oklch(0.52 0.03 30)" }}>Qty</th>
                  <th className="text-center px-4 py-3 napoli-label text-xs" style={{ color: "oklch(0.52 0.03 30)" }}>Bone-In</th>
                  <th className="text-center px-4 py-3 napoli-label text-xs" style={{ color: "oklch(0.52 0.03 30)" }}>Boneless</th>
                  <th className="text-center px-4 py-3 napoli-label text-xs" style={{ color: "oklch(0.52 0.03 30)" }}>Chicken Fingers</th>
                </tr>
              </thead>
              <tbody>
                {WINGS.boneIn.map((row, i) => (
                  <tr key={row.qty} className="border-t" style={{ borderColor: "oklch(0.93 0.012 80)" }}>
                    <td className="px-5 py-3 napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{row.qty}</td>
                    <td className="text-center px-4 py-3">
                      <div className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{row.price}</div>
                      <div className="text-xs napoli-body" style={{ color: "oklch(0.62 0.03 30)" }}>+Fries {row.addFries}</div>
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{WINGS.boneless[i].price}</div>
                      <div className="text-xs napoli-body" style={{ color: "oklch(0.62 0.03 30)" }}>+Fries {WINGS.boneless[i].addFries}</div>
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{WINGS.chickenFingers[i].price}</div>
                      <div className="text-xs napoli-body" style={{ color: "oklch(0.62 0.03 30)" }}>+Fries {WINGS.chickenFingers[i].addFries}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MenuCard>

        {/* ── PASTA ──────────────────────────────────────────── */}
        <SectionHeader id="pasta" title="Pasta" emoji="🍝" />
        <MenuCard>
          <div className="px-5 py-3 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>Served w/ Garlic Bread & House Salad</p>
          </div>
          {/* Whole Lotta Pasta */}
          <div className="px-5 py-4 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.99 0.02 65 / 0.3)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="napoli-badge-gold mb-1 inline-block">Best Value</span>
                <h4 className="napoli-heading text-base" style={{ color: "var(--napoli-dark)" }}>Napoli's Whole Lotta Pasta</h4>
                <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>
                  {PASTA.wholeLottaItems.join(", ")}
                </p>
              </div>
              <span className="napoli-price text-xl shrink-0" style={{ color: "var(--napoli-red)" }}>{PASTA.wholeLottaPrice}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            <div>
              <p className="napoli-label text-xs px-5 py-2 border-b" style={{ color: "var(--napoli-red)", borderColor: "oklch(0.88 0.015 80)" }}>Classic Pasta</p>
              {PASTA.classic.map((item) => <ItemRow key={item.name} name={item.name} price={item.price} />)}
            </div>
            <div>
              <p className="napoli-label text-xs px-5 py-2 border-b" style={{ color: "var(--napoli-red)", borderColor: "oklch(0.88 0.015 80)" }}>Ravioli</p>
              {PASTA.ravioli.map((item) => <ItemRow key={item.name} name={item.name} price={item.price} />)}
            </div>
            <div>
              <p className="napoli-label text-xs px-5 py-2 border-b" style={{ color: "var(--napoli-red)", borderColor: "oklch(0.88 0.015 80)" }}>Tortellini & Parmigiana</p>
              {PASTA.tortellini.map((item) => <ItemRow key={item.name} name={item.name} price={item.price} />)}
              {PASTA.parmigiana.map((item) => <ItemRow key={item.name} name={item.name} price={item.price} />)}
            </div>
          </div>
        </MenuCard>

        {/* ── SUBS & SANDWICHES ──────────────────────────────── */}
        <SectionHeader id="subs" title="Sub Sandwiches" emoji="🥖" />
        <MenuCard>
          <div className="px-5 py-3 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{SUBS.note}</p>
            <span className="napoli-price text-lg mt-1 block" style={{ color: "var(--napoli-red)" }}>{SUBS.price}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            <div>
              <p className="napoli-label text-xs px-5 py-2 border-b" style={{ color: "var(--napoli-red)", borderColor: "oklch(0.88 0.015 80)" }}>Served Cold</p>
              {SUBS.cold.map((s) => <ItemRow key={s} name={s} />)}
            </div>
            <div>
              <p className="napoli-label text-xs px-5 py-2 border-b" style={{ color: "var(--napoli-red)", borderColor: "oklch(0.88 0.015 80)" }}>Served Hot</p>
              {SUBS.hotDetailed.map((s) => (
                <ItemRow key={s.name} name={s.name + (s.add ? ` +${s.add}` : "")} desc={(s as any).desc} />
              ))}
            </div>
          </div>
          {/* Triple Deckers */}
          <div className="px-5 py-4 border-t" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-red)" }}>Triple Deckers <span className="napoli-badge-green ml-2">Gluten Free Bread Available</span></p>
            <p className="text-xs napoli-body mb-3" style={{ color: "oklch(0.52 0.03 30)" }}>{TRIPLE_DECKERS.note}</p>
            <div className="flex flex-wrap gap-4">
              {TRIPLE_DECKERS.items.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="text-sm napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{item.name}</span>
                  <span className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{item.price}</span>
                </div>
              ))}
            </div>
          </div>
        </MenuCard>

        {/* ── BURGERS ────────────────────────────────────────── */}
        <SectionHeader id="burgers" title="100% Angus Beef Burgers" emoji="🍔" />
        <MenuCard>
          <div className="px-5 py-3 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{BURGERS.note}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.97 0.012 80)" }}>
                  <th className="text-left px-5 py-3 napoli-label text-xs" style={{ color: "oklch(0.52 0.03 30)" }}>Burger</th>
                  <th className="text-center px-4 py-3 napoli-label text-xs" style={{ color: "oklch(0.52 0.03 30)" }}>½ lb Single</th>
                  <th className="text-center px-4 py-3 napoli-label text-xs" style={{ color: "oklch(0.52 0.03 30)" }}>1 lb Single</th>
                </tr>
              </thead>
              <tbody>
                {BURGERS.items.map((item) => (
                  <tr key={item.name} className="border-t" style={{ borderColor: "oklch(0.93 0.012 80)" }}>
                    <td className="px-5 py-3">
                      <div className="napoli-body font-semibold text-sm" style={{ color: "var(--napoli-dark)" }}>{item.name}</div>
                      {item.desc && <div className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{item.desc}</div>}
                    </td>
                    <td className="text-center px-4 py-3 napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{item.half}</td>
                    <td className="text-center px-4 py-3 napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{item.single}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MenuCard>

        {/* ── SALADS ─────────────────────────────────────────── */}
        <SectionHeader id="salads" title="Salads" emoji="🥗" />
        <MenuCard>
          <div className="px-5 py-2 border-b text-xs napoli-body" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)", color: "oklch(0.52 0.03 30)" }}>
            Add Chicken $7.49 or Steak $9.49
          </div>
          {SALADS.map((item) => (
            <div key={item.name}>
              {(item as any).prices ? (
                <div className="napoli-menu-item flex items-start justify-between gap-4 px-5 py-3 border-b last:border-b-0" style={{ borderColor: "oklch(0.93 0.012 80)", background: (item as any).highlight ? "oklch(0.99 0.02 65 / 0.4)" : "transparent" }}>
                  <div className="flex-1">
                    <span className="napoli-body text-sm font-bold" style={{ color: "var(--napoli-dark)" }}>{item.name}</span>
                    {item.desc && <p className="text-xs napoli-body mt-0.5" style={{ color: "oklch(0.52 0.03 30)" }}>{item.desc}</p>}
                  </div>
                  <div className="flex gap-3 shrink-0">
                    {(item as any).prices.map((p: any) => (
                      <div key={p.size} className="text-center">
                        <div className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{p.size}</div>
                        <div className="napoli-price text-sm" style={{ color: "var(--napoli-red)" }}>{p.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <ItemRow name={item.name} desc={item.desc} price={(item as any).price} highlight={(item as any).highlight} />
              )}
            </div>
          ))}
        </MenuCard>

        {/* ── DESSERTS ───────────────────────────────────────── */}
        <SectionHeader id="desserts" title="Desserts" emoji="🍰" />
        <MenuCard>
          <div className="px-5 py-3 border-b" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <span className="napoli-price text-lg" style={{ color: "var(--napoli-red)" }}>{DESSERTS.price}</span>
            <span className="text-xs napoli-body ml-2" style={{ color: "oklch(0.52 0.03 30)" }}>each</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-0">
            {DESSERTS.items.map((item) => (
              <div
                key={item}
                className="napoli-menu-item px-5 py-3 border-b border-r"
                style={{ borderColor: "oklch(0.93 0.012 80)" }}
              >
                <span className="text-sm napoli-body" style={{ color: "var(--napoli-dark)" }}>{item}</span>
              </div>
            ))}
          </div>
          {/* Children's Menu */}
          <div className="px-5 py-4 border-t" style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.97 0.012 80)" }}>
            <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-red)" }}>Children's Menu — {CHILDRENS_MENU.price}</p>
            <div className="flex flex-wrap gap-3">
              {CHILDRENS_MENU.items.map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-napoli-green shrink-0" />
                  <span className="text-xs napoli-body" style={{ color: "oklch(0.42 0.03 30)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Beverages */}
          <div className="px-5 py-4 border-t" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
            <p className="napoli-label text-xs mb-3" style={{ color: "var(--napoli-red)" }}>Beverages</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {BEVERAGES.map((bev) => (
                <div key={bev.name} className="flex items-start justify-between gap-4 py-2 px-2 border-b" style={{ borderColor: "oklch(0.93 0.012 80)" }}>
                  <div className="flex-1">
                    <span className="text-xs napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{bev.name}</span>
                    {(bev as any).note && <span className="text-xs napoli-body ml-1" style={{ color: "oklch(0.52 0.03 30)" }}>({(bev as any).note})</span>}
                  </div>
                  {(bev as any).price && <span className="napoli-price text-xs shrink-0" style={{ color: "var(--napoli-red)" }}>{(bev as any).price}</span>}
                  {(bev as any).prices && (
                    <div className="flex gap-2 shrink-0">
                      {(bev as any).prices.map((p: any) => (
                        <div key={p.size} className="text-right">
                          <div className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{p.size}</div>
                          <div className="napoli-price text-xs" style={{ color: "var(--napoli-red)" }}>{p.price}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </MenuCard>

        {/* ── ANYTIME SPECIALS ───────────────────────────────── */}
        <SectionHeader id="specials" title="Anytime Specials" emoji="⭐" />
        <MenuCard>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
            {ANYTIME_SPECIALS.map((item, i) => (
              <div
                key={item.num}
                className="napoli-menu-item flex items-start gap-3 px-5 py-4 border-b border-r"
                style={{ borderColor: "oklch(0.93 0.012 80)" }}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 napoli-price"
                  style={{ background: "var(--napoli-green)", color: "white" }}
                >
                  {item.num}
                </span>
                <div className="flex-1">
                  <span className="text-sm napoli-body font-semibold" style={{ color: "var(--napoli-dark)" }}>{item.name}</span>
                </div>
                <span className="napoli-price text-sm shrink-0" style={{ color: "var(--napoli-red)" }}>{item.price}</span>
              </div>
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
