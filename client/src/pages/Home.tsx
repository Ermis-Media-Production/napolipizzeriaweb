/**
 * TradeVault Home Page
 * Design: Merchant Heritage — editorial hero, curated finds, product grid, supplier showcase
 * Colors: Navy (#0D2545), Warm White (#FAFAF8), Amber (#F5A623)
 * Typography: Libre Baskerville (display) + Nunito Sans (body)
 */
import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Star, ShieldCheck, TrendingUp, Package, Globe, ChevronRight, Award, Zap } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { PRODUCTS, SUPPLIERS, CATEGORIES } from "@/lib/data";

const handlePlaceholder = () => toast.info("Feature coming soon.");

const STATS = [
  { value: "12,400+", label: "Verified Suppliers" },
  { value: "850K+", label: "Products Listed" },
  { value: "50+", label: "Countries" },
  { value: "$2.4B", label: "Trade Volume" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Browse & Discover", desc: "Search thousands of verified suppliers and products across 200+ categories with powerful MOQ and price filters." },
  { step: "02", title: "Compare & Evaluate", desc: "Review bulk pricing tiers, supplier ratings, certifications, and lead times side by side." },
  { step: "03", title: "Request & Negotiate", desc: "Send RFQs directly to suppliers, negotiate terms, and request product samples before committing." },
  { step: "04", title: "Order & Scale", desc: "Place secure bulk orders with trade assurance protection and integrated logistics support." },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("all");

  const featuredProducts = PRODUCTS.filter((p) => p.featured).slice(0, 3);
  const filteredProducts = activeCategory === "all"
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.99 0.003 90)" }}>
      <Navbar onCategoryChange={setActiveCategory} activeCategory={activeCategory} />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: "560px" }}>
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663690084073/brxvWsWYfwFxoqeFg9Rbqu/tradevault-hero-FUDmFhjoGUHF5YPCnYUKZ2.webp"
            alt="TradeVault warehouse hero"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(105deg, oklch(0.16 0.05 248 / 0.92) 0%, oklch(0.16 0.05 248 / 0.75) 55%, oklch(0.16 0.05 248 / 0.30) 100%)",
            }}
          />
        </div>

        <div className="relative container py-20 md:py-28">
          <div className="max-w-2xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-5 animate-fade-up" style={{ animationDelay: "0ms" }}>
              <span className="tv-badge-amber">B2B Wholesale Marketplace</span>
              <span
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: "oklch(0.80 0.02 248)", fontFamily: "'Nunito Sans', sans-serif" }}
              >
                <ShieldCheck size={12} style={{ color: "oklch(0.75 0.16 65)" }} />
                Verified Suppliers Only
              </span>
            </div>

            {/* Headline */}
            <h1
              className="tv-display text-4xl md:text-5xl lg:text-6xl mb-5 animate-fade-up"
              style={{ color: "oklch(0.99 0.003 90)", animationDelay: "60ms" }}
            >
              Source Smarter.<br />
              <span style={{ color: "oklch(0.75 0.16 65)" }}>Buy in Bulk.</span><br />
              Grow Faster.
            </h1>

            {/* Subheadline */}
            <p
              className="text-lg mb-8 leading-relaxed animate-fade-up"
              style={{ color: "oklch(0.80 0.02 248)", fontFamily: "'Nunito Sans', sans-serif", animationDelay: "120ms" }}
            >
              Connect with 12,400+ verified global suppliers. Compare bulk pricing, request samples, and place wholesale orders — all in one trusted platform.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: "180ms" }}>
              <Link href="/products">
                <button
                  className="tv-btn-amber flex items-center gap-2 px-6 py-3 rounded text-sm"
                >
                  Browse Products
                  <ArrowRight size={16} />
                </button>
              </Link>
              <button
                onClick={handlePlaceholder}
                className="flex items-center gap-2 px-6 py-3 rounded text-sm font-bold border transition-colors"
                style={{
                  borderColor: "oklch(0.75 0.02 248)",
                  color: "oklch(0.99 0.003 90)",
                  fontFamily: "'Nunito Sans', sans-serif",
                }}
              >
                Find Suppliers
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Mini stats */}
            <div className="flex flex-wrap gap-6 mt-10 animate-fade-up" style={{ animationDelay: "240ms" }}>
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <div
                    className="text-2xl font-bold tv-number"
                    style={{ color: "oklch(0.75 0.16 65)", fontFamily: "'Nunito Sans', sans-serif" }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs" style={{ color: "oklch(0.70 0.02 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CURATED SUPPLIER FINDS BANNER ───────────────────── */}
      <section
        className="py-10 border-b"
        style={{ background: "oklch(0.22 0.06 248)", borderColor: "oklch(0.28 0.07 248)" }}
      >
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Zap size={18} style={{ color: "oklch(0.75 0.16 65)" }} />
              <h2
                className="text-lg font-bold"
                style={{ color: "oklch(0.99 0.003 90)", fontFamily: "'Libre Baskerville', serif" }}
              >
                Curated Supplier Finds
              </h2>
              <span className="tv-badge-amber">This Week</span>
            </div>
            <Link href="/products">
              <button
                className="flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
                style={{ color: "oklch(0.75 0.16 65)", fontFamily: "'Nunito Sans', sans-serif" }}
              >
                View All <ChevronRight size={14} />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredProducts.map((product, i) => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <div
                  className="relative rounded-md overflow-hidden cursor-pointer group"
                  style={{
                    background: "oklch(0.28 0.07 248)",
                    animationDelay: `${i * 60}ms`,
                  }}
                >
                  <div className="flex gap-4 p-4">
                    <div className="shrink-0 w-20 h-20 rounded overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "oklch(0.75 0.16 65)", fontFamily: "'Nunito Sans', sans-serif" }}
                      >
                        {product.subcategory}
                      </span>
                      <h3
                        className="text-sm font-bold mt-0.5 mb-1 line-clamp-2"
                        style={{ color: "oklch(0.99 0.003 90)", fontFamily: "'Nunito Sans', sans-serif" }}
                      >
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-base font-bold tv-number"
                          style={{ color: "oklch(0.75 0.16 65)", fontFamily: "'Nunito Sans', sans-serif" }}
                        >
                          ${product.priceRange.min.toFixed(2)}
                        </span>
                        <span className="text-xs" style={{ color: "oklch(0.62 0.03 248)" }}>
                          MOQ {product.moq} {product.moqUnit}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"
                    style={{ background: "oklch(0.75 0.16 65)" }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT GRID ─────────────────────────────────────── */}
      <section className="py-14">
        <div className="container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: "oklch(0.75 0.16 65)", fontFamily: "'Nunito Sans', sans-serif" }}
              >
                Wholesale Catalog
              </p>
              <h2 className="tv-display text-3xl" style={{ color: "oklch(0.18 0.04 248)" }}>
                {activeCategory === "all"
                  ? "All Products"
                  : CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "Products"}
              </h2>
            </div>
            <Link href="/products">
              <button
                className="hidden md:flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
              >
                View full catalog <ArrowRight size={14} />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <Package size={40} className="mx-auto mb-3 opacity-30" style={{ color: "oklch(0.52 0.03 248)" }} />
              <p className="text-sm" style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                No products found in this category yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section
        className="py-16 border-t border-b"
        style={{ background: "oklch(0.96 0.004 90)", borderColor: "oklch(0.90 0.006 248)" }}
      >
        <div className="container">
          <div className="text-center mb-12">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "oklch(0.75 0.16 65)", fontFamily: "'Nunito Sans', sans-serif" }}
            >
              The TradeVault Process
            </p>
            <h2 className="tv-display text-3xl md:text-4xl" style={{ color: "oklch(0.18 0.04 248)" }}>
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div
                    className="hidden md:block absolute top-6 left-[calc(100%-1rem)] w-8 h-px"
                    style={{ background: "oklch(0.75 0.16 65)" }}
                  />
                )}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm mb-4 tv-number"
                  style={{
                    background: "oklch(0.22 0.06 248)",
                    color: "oklch(0.75 0.16 65)",
                    fontFamily: "'Nunito Sans', sans-serif",
                  }}
                >
                  {step.step}
                </div>
                <h3
                  className="font-bold text-base mb-2"
                  style={{ color: "oklch(0.18 0.04 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUPPLIER SHOWCASE ────────────────────────────────── */}
      <section className="py-14">
        <div className="container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: "oklch(0.75 0.16 65)", fontFamily: "'Nunito Sans', sans-serif" }}
              >
                Top-Rated Suppliers
              </p>
              <h2 className="tv-display text-3xl" style={{ color: "oklch(0.18 0.04 248)" }}>
                Featured Suppliers
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SUPPLIERS.map((supplier) => (
              <Link key={supplier.id} href={`/supplier/${supplier.id}`}>
                <div
                  className="tv-card-hover tv-amber-border-hover bg-white rounded-md overflow-hidden border cursor-pointer group"
                  style={{ borderColor: "oklch(0.90 0.006 248)" }}
                >
                  {/* Supplier banner */}
                  <div className="relative h-28 overflow-hidden">
                    <img
                      src={supplier.banner}
                      alt={supplier.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, oklch(0.18 0.04 248 / 0.6), transparent)" }}
                    />
                    {supplier.goldSupplier && (
                      <div className="absolute top-2 right-2">
                        <span className="tv-badge-amber flex items-center gap-1">
                          <Award size={10} /> Gold Supplier
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded shrink-0 overflow-hidden border-2"
                        style={{ borderColor: "oklch(0.75 0.16 65)" }}
                      >
                        <img src={supplier.logo} alt={supplier.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-bold text-sm leading-tight mb-0.5"
                          style={{ color: "oklch(0.18 0.04 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                        >
                          {supplier.name}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <Globe size={11} style={{ color: "oklch(0.52 0.03 248)" }} />
                          <span className="text-xs" style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                            {supplier.location}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: "Rating", value: `${supplier.rating}★` },
                        { label: "Products", value: supplier.totalProducts },
                        { label: "Response", value: supplier.responseTime },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="text-center py-2 rounded"
                          style={{ background: "oklch(0.96 0.004 90)" }}
                        >
                          <div
                            className="font-bold text-sm tv-number"
                            style={{ color: "oklch(0.22 0.06 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                          >
                            {stat.value}
                          </div>
                          <div className="text-xs" style={{ color: "oklch(0.62 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {supplier.specialties.slice(0, 3).map((spec) => (
                        <span
                          key={spec}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            background: "oklch(0.96 0.004 90)",
                            color: "oklch(0.35 0.04 248)",
                            fontFamily: "'Nunito Sans', sans-serif",
                          }}
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section
        className="py-16"
        style={{ background: "oklch(0.22 0.06 248)" }}
      >
        <div className="container text-center">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "oklch(0.75 0.16 65)", fontFamily: "'Nunito Sans', sans-serif" }}
          >
            Ready to Scale Your Business?
          </p>
          <h2
            className="tv-display text-3xl md:text-4xl mb-4"
            style={{ color: "oklch(0.99 0.003 90)" }}
          >
            Join 80,000+ Business Buyers
          </h2>
          <p
            className="text-base mb-8 max-w-xl mx-auto leading-relaxed"
            style={{ color: "oklch(0.75 0.02 248)", fontFamily: "'Nunito Sans', sans-serif" }}
          >
            Get access to exclusive wholesale pricing, verified supplier contacts, and dedicated trade support — all free for registered buyers.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={handlePlaceholder}
              className="tv-btn-amber flex items-center gap-2 px-8 py-3 rounded text-sm"
            >
              Create Free Account
              <ArrowRight size={16} />
            </button>
            <button
              onClick={handlePlaceholder}
              className="flex items-center gap-2 px-8 py-3 rounded text-sm font-bold border transition-colors"
              style={{
                borderColor: "oklch(0.50 0.04 248)",
                color: "oklch(0.80 0.02 248)",
                fontFamily: "'Nunito Sans', sans-serif",
              }}
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
