/**
 * TradeVault Supplier Storefront Page
 * Design: Merchant Heritage — editorial banner, trust metrics, product catalog
 */
import { useParams, Link } from "wouter";
import {
  Star, ShieldCheck, Award, Globe, Clock, Package, ArrowLeft,
  ChevronRight, MessageSquare, FileText, CheckCircle2, Building2,
  TrendingUp, Users, Zap
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { getSupplierById, getProductsBySupplier } from "@/lib/data";

const handlePlaceholder = () => toast.info("Feature coming soon.");

export default function SupplierStorefront() {
  const { id } = useParams<{ id: string }>();
  const supplier = getSupplierById(id ?? "");
  const products = supplier ? getProductsBySupplier(supplier.id) : [];

  if (!supplier) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.99 0.003 90)" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Building2 size={48} className="mx-auto mb-4 opacity-20" style={{ color: "oklch(0.52 0.03 248)" }} />
            <h2 className="tv-display text-2xl mb-2" style={{ color: "oklch(0.18 0.04 248)" }}>Supplier Not Found</h2>
            <Link href="/">
              <button className="tv-btn-amber px-5 py-2 rounded text-sm mt-3">Back to Marketplace</button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.99 0.003 90)" }}>
      <Navbar />

      {/* Breadcrumb */}
      <div
        className="border-b py-3"
        style={{ background: "oklch(0.96 0.004 90)", borderColor: "oklch(0.90 0.006 248)" }}
      >
        <div className="container flex items-center gap-2 text-xs" style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
          <Link href="/"><span className="hover:underline cursor-pointer">Home</span></Link>
          <ChevronRight size={12} />
          <span style={{ color: "oklch(0.35 0.04 248)" }}>Suppliers</span>
          <ChevronRight size={12} />
          <span style={{ color: "oklch(0.35 0.04 248)" }}>{supplier.name}</span>
        </div>
      </div>

      {/* Hero banner */}
      <section className="relative overflow-hidden" style={{ height: "280px" }}>
        <img
          src={supplier.banner}
          alt={supplier.name}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, oklch(0.16 0.05 248 / 0.88) 0%, oklch(0.16 0.05 248 / 0.55) 60%, transparent 100%)" }}
        />
        <div className="absolute inset-0 flex items-end">
          <div className="container pb-8">
            <div className="flex items-end gap-5">
              {/* Logo */}
              <div
                className="w-20 h-20 rounded-md overflow-hidden border-3 shrink-0"
                style={{ border: "3px solid oklch(0.75 0.16 65)" }}
              >
                <img src={supplier.logo} alt={supplier.name} className="w-full h-full object-cover" />
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {supplier.goldSupplier && (
                    <span className="tv-badge-amber flex items-center gap-1">
                      <Award size={10} /> Gold Supplier
                    </span>
                  )}
                  {supplier.verified && (
                    <span
                      className="flex items-center gap-1 text-xs font-semibold"
                      style={{ color: "oklch(0.80 0.02 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                    >
                      <ShieldCheck size={12} style={{ color: "oklch(0.75 0.16 65)" }} />
                      Verified Supplier
                    </span>
                  )}
                </div>
                <h1
                  className="tv-display text-2xl md:text-3xl mb-1"
                  style={{ color: "oklch(0.99 0.003 90)" }}
                >
                  {supplier.name}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="flex items-center gap-1 text-sm"
                    style={{ color: "oklch(0.75 0.02 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                  >
                    <Globe size={13} /> {supplier.location}, {supplier.country}
                  </span>
                  <span className="flex items-center gap-1 text-sm" style={{ color: "oklch(0.75 0.02 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                    <Star size={13} fill="oklch(0.75 0.16 65)" stroke="none" />
                    <strong style={{ color: "oklch(0.75 0.16 65)" }}>{supplier.rating}</strong>
                    <span>({supplier.reviewCount} reviews)</span>
                  </span>
                  <span className="flex items-center gap-1 text-sm" style={{ color: "oklch(0.75 0.02 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                    <TrendingUp size={13} /> {supplier.yearsActive} years active
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div className="hidden md:flex gap-2">
                <button
                  onClick={handlePlaceholder}
                  className="tv-btn-amber flex items-center gap-2 px-5 py-2.5 rounded text-sm"
                >
                  <MessageSquare size={14} /> Contact
                </button>
                <button
                  onClick={handlePlaceholder}
                  className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-bold border"
                  style={{
                    borderColor: "oklch(0.60 0.04 248)",
                    color: "oklch(0.99 0.003 90)",
                    fontFamily: "'Nunito Sans', sans-serif",
                  }}
                >
                  <FileText size={14} /> Request Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div
        className="border-b"
        style={{ background: "oklch(0.22 0.06 248)", borderColor: "oklch(0.28 0.07 248)" }}
      >
        <div className="container py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: <Star size={14} />, value: `${supplier.rating}/5.0`, label: "Rating" },
              { icon: <Users size={14} />, value: supplier.reviewCount, label: "Reviews" },
              { icon: <Package size={14} />, value: supplier.totalProducts, label: "Products" },
              { icon: <Clock size={14} />, value: supplier.responseTime, label: "Response Time" },
              { icon: <CheckCircle2 size={14} />, value: `${supplier.responseRate}%`, label: "Response Rate" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2.5">
                <span style={{ color: "oklch(0.75 0.16 65)" }}>{stat.icon}</span>
                <div>
                  <div
                    className="font-bold text-sm tv-number"
                    style={{ color: "oklch(0.99 0.003 90)", fontFamily: "'Nunito Sans', sans-serif" }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs" style={{ color: "oklch(0.65 0.02 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar: About + specialties */}
          <aside className="lg:col-span-1 space-y-5">
            {/* About */}
            <div
              className="rounded-md border p-5"
              style={{ borderColor: "oklch(0.90 0.006 248)", background: "white" }}
            >
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
              >
                About
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "oklch(0.42 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                {supplier.description}
              </p>
            </div>

            {/* Specialties */}
            <div
              className="rounded-md border p-5"
              style={{ borderColor: "oklch(0.90 0.006 248)", background: "white" }}
            >
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
              >
                Specialties
              </h3>
              <div className="flex flex-wrap gap-2">
                {supplier.specialties.map((spec) => (
                  <span
                    key={spec}
                    className="text-xs px-2.5 py-1 rounded border font-semibold"
                    style={{
                      borderColor: "oklch(0.90 0.006 248)",
                      color: "oklch(0.35 0.04 248)",
                      fontFamily: "'Nunito Sans', sans-serif",
                    }}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Key info */}
            <div
              className="rounded-md border p-5 space-y-3"
              style={{ borderColor: "oklch(0.90 0.006 248)", background: "white" }}
            >
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
              >
                Key Details
              </h3>
              {[
                { label: "Min. Order", value: supplier.minOrder },
                { label: "Location", value: `${supplier.location}` },
                { label: "Country", value: supplier.country },
                { label: "Years Active", value: `${supplier.yearsActive} years` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "oklch(0.62 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                    {item.label}
                  </span>
                  <span className="text-xs font-bold" style={{ color: "oklch(0.22 0.06 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile CTA */}
            <div className="md:hidden space-y-2">
              <button
                onClick={handlePlaceholder}
                className="tv-btn-amber w-full py-3 rounded text-sm flex items-center justify-center gap-2"
              >
                <MessageSquare size={14} /> Contact Supplier
              </button>
              <button
                onClick={handlePlaceholder}
                className="tv-btn-primary w-full py-3 rounded text-sm flex items-center justify-center gap-2"
              >
                <FileText size={14} /> Request Quote
              </button>
            </div>
          </aside>

          {/* Main: Products */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-3 mb-6">
              <Zap size={16} style={{ color: "oklch(0.75 0.16 65)" }} />
              <h2
                className="tv-display text-2xl"
                style={{ color: "oklch(0.18 0.04 248)" }}
              >
                Products by {supplier.name}
              </h2>
              <span className="tv-badge-navy">{products.length} items</span>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {products.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    style={{ animationDelay: `${i * 50}ms` }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Package size={40} className="mx-auto mb-3 opacity-20" style={{ color: "oklch(0.52 0.03 248)" }} />
                <p className="text-sm" style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                  No products listed yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
