/**
 * TradeVault Product Detail Page
 * Design: Merchant Heritage — bulk pricing table, supplier trust panel, specs
 */
import { useParams, Link } from "wouter";
import {
  Star, ShieldCheck, Award, Globe, Clock, Package, ArrowLeft,
  ChevronRight, MessageSquare, FileText, Truck, CheckCircle2, TrendingDown
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getProductById, getSupplierById, getProductsBySupplier, PRODUCTS } from "@/lib/data";
import ProductCard from "@/components/ProductCard";

const handlePlaceholder = () => toast.info("Feature coming soon.");

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const product = getProductById(id ?? "");
  const supplier = product ? getSupplierById(product.supplierId) : undefined;
  const relatedProducts = product
    ? getProductsBySupplier(product.supplierId).filter((p) => p.id !== product.id).slice(0, 3)
    : [];

  if (!product || !supplier) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.99 0.003 90)" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Package size={48} className="mx-auto mb-4 opacity-20" style={{ color: "oklch(0.52 0.03 248)" }} />
            <h2 className="tv-display text-2xl mb-2" style={{ color: "oklch(0.18 0.04 248)" }}>Product Not Found</h2>
            <Link href="/products">
              <button className="tv-btn-amber px-5 py-2 rounded text-sm mt-3">Browse Products</button>
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
          <Link href="/">
            <span className="hover:underline cursor-pointer">Home</span>
          </Link>
          <ChevronRight size={12} />
          <Link href="/products">
            <span className="hover:underline cursor-pointer">Products</span>
          </Link>
          <ChevronRight size={12} />
          <span style={{ color: "oklch(0.35 0.04 248)" }}>{product.name}</span>
        </div>
      </div>

      <div className="container py-10 flex-1">
        {/* Back link */}
        <Link href="/products">
          <button
            className="flex items-center gap-1.5 text-sm font-semibold mb-6 transition-colors hover:opacity-70"
            style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
          >
            <ArrowLeft size={14} /> Back to Products
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Image + specs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product image */}
            <div className="rounded-md overflow-hidden border" style={{ borderColor: "oklch(0.90 0.006 248)" }}>
              <img
                src={product.image}
                alt={product.name}
                className="w-full object-cover"
                style={{ maxHeight: "420px" }}
              />
            </div>

            {/* Product info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                >
                  {product.subcategory}
                </span>
                {product.featured && <span className="tv-badge-amber">Featured</span>}
                {product.inStock ? (
                  <span
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: "oklch(0.45 0.15 145)", fontFamily: "'Nunito Sans', sans-serif" }}
                  >
                    <CheckCircle2 size={12} /> In Stock
                  </span>
                ) : (
                  <span className="text-xs font-semibold" style={{ color: "oklch(0.577 0.245 27.325)" }}>Out of Stock</span>
                )}
              </div>

              <h1
                className="tv-display text-2xl md:text-3xl mb-3"
                style={{ color: "oklch(0.18 0.04 248)" }}
              >
                {product.name}
              </h1>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      fill={s <= Math.round(product.rating) ? "oklch(0.75 0.16 65)" : "none"}
                      stroke={s <= Math.round(product.rating) ? "none" : "oklch(0.75 0.16 65)"}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold tv-number" style={{ color: "oklch(0.35 0.04 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                  {product.rating}
                </span>
                <span className="text-sm" style={{ color: "oklch(0.62 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                  ({product.reviewCount} reviews)
                </span>
                <span className="text-sm" style={{ color: "oklch(0.62 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                  · Lead time: <strong style={{ color: "oklch(0.35 0.04 248)" }}>{product.leadTime}</strong>
                </span>
              </div>

              <p className="text-sm leading-relaxed mb-4" style={{ color: "oklch(0.42 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                {product.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 rounded border font-semibold"
                    style={{
                      borderColor: "oklch(0.90 0.006 248)",
                      color: "oklch(0.35 0.04 248)",
                      fontFamily: "'Nunito Sans', sans-serif",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Bulk pricing tiers */}
            <div
              className="rounded-md border overflow-hidden"
              style={{ borderColor: "oklch(0.90 0.006 248)" }}
            >
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ background: "oklch(0.22 0.06 248)" }}
              >
                <TrendingDown size={16} style={{ color: "oklch(0.75 0.16 65)" }} />
                <h3
                  className="font-bold text-sm"
                  style={{ color: "oklch(0.99 0.003 90)", fontFamily: "'Nunito Sans', sans-serif" }}
                >
                  Bulk Pricing Tiers
                </h3>
                <span className="text-xs ml-auto" style={{ color: "oklch(0.70 0.02 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                  Price per unit
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "oklch(0.96 0.004 90)" }}>
                    <th className="text-left px-5 py-2.5 text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                      Quantity
                    </th>
                    <th className="text-right px-5 py-2.5 text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                      Unit Price
                    </th>
                    <th className="text-right px-5 py-2.5 text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                      Savings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.priceTiers.map((tier, i) => {
                    const maxPrice = product.priceTiers[0].price;
                    const savings = maxPrice > 0 ? Math.round(((maxPrice - tier.price) / maxPrice) * 100) : 0;
                    return (
                      <tr
                        key={tier.qty}
                        className="border-t"
                        style={{
                          borderColor: "oklch(0.93 0.004 90)",
                          background: i === product.priceTiers.length - 1 ? "oklch(0.99 0.01 65 / 0.3)" : "white",
                        }}
                      >
                        <td className="px-5 py-3 text-sm font-semibold tv-number" style={{ color: "oklch(0.35 0.04 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                          {tier.qty}
                          {i === product.priceTiers.length - 1 && (
                            <span className="ml-2 tv-badge-amber text-xs">Best Value</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-bold tv-number" style={{ color: "oklch(0.22 0.06 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                          ${tier.price.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold tv-number" style={{
                          color: savings > 0 ? "oklch(0.45 0.15 145)" : "oklch(0.62 0.03 248)",
                          fontFamily: "'Nunito Sans', sans-serif"
                        }}>
                          {savings > 0 ? `Save ${savings}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Specifications */}
            <div
              className="rounded-md border overflow-hidden"
              style={{ borderColor: "oklch(0.90 0.006 248)" }}
            >
              <div
                className="px-5 py-3"
                style={{ background: "oklch(0.96 0.004 90)", borderBottom: "1px solid oklch(0.90 0.006 248)" }}
              >
                <h3
                  className="font-bold text-sm"
                  style={{ color: "oklch(0.18 0.04 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                >
                  Product Specifications
                </h3>
              </div>
              <div className="divide-y" style={{ borderColor: "oklch(0.93 0.004 90)" }}>
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="flex px-5 py-3">
                    <span
                      className="w-40 shrink-0 text-sm font-semibold"
                      style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                    >
                      {spec.label}
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "oklch(0.22 0.06 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                    >
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Supplier + actions */}
          <div className="space-y-5">
            {/* Price summary */}
            <div
              className="rounded-md border p-5"
              style={{ borderColor: "oklch(0.90 0.006 248)", background: "white" }}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  className="text-3xl font-bold tv-number"
                  style={{ color: "oklch(0.22 0.06 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                >
                  ${product.priceRange.min.toFixed(2)}
                </span>
                <span className="text-sm" style={{ color: "oklch(0.62 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                  – ${product.priceRange.max.toFixed(2)} / unit
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <Package size={13} style={{ color: "oklch(0.75 0.16 65)" }} />
                <span className="text-sm font-semibold tv-number" style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                  MOQ: {product.moq.toLocaleString()} {product.moqUnit}
                </span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handlePlaceholder}
                  className="tv-btn-amber w-full py-3 rounded text-sm flex items-center justify-center gap-2"
                >
                  <MessageSquare size={15} />
                  Contact Supplier
                </button>
                <button
                  onClick={handlePlaceholder}
                  className="tv-btn-primary w-full py-3 rounded text-sm flex items-center justify-center gap-2"
                >
                  <FileText size={15} />
                  Request Quotation
                </button>
                <button
                  onClick={handlePlaceholder}
                  className="w-full py-3 rounded text-sm font-bold border transition-colors flex items-center justify-center gap-2"
                  style={{
                    borderColor: "oklch(0.90 0.006 248)",
                    color: "oklch(0.35 0.04 248)",
                    fontFamily: "'Nunito Sans', sans-serif",
                  }}
                >
                  <Package size={15} />
                  Request Sample
                </button>
              </div>
            </div>

            {/* Supplier card */}
            <Link href={`/supplier/${supplier.id}`}>
              <div
                className="rounded-md border overflow-hidden cursor-pointer tv-card-hover tv-amber-border-hover"
                style={{ borderColor: "oklch(0.90 0.006 248)", background: "white" }}
              >
                <div className="relative h-24 overflow-hidden">
                  <img src={supplier.banner} alt={supplier.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: "oklch(0.18 0.04 248 / 0.5)" }} />
                  {supplier.goldSupplier && (
                    <div className="absolute top-2 right-2">
                      <span className="tv-badge-amber flex items-center gap-1 text-xs">
                        <Award size={9} /> Gold
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded overflow-hidden border-2" style={{ borderColor: "oklch(0.75 0.16 65)" }}>
                      <img src={supplier.logo} alt={supplier.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "oklch(0.18 0.04 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                        {supplier.name}
                      </p>
                      <p className="text-xs flex items-center gap-1" style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                        <Globe size={10} /> {supplier.location}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: "Rating", value: `${supplier.rating} ★`, icon: <Star size={11} /> },
                      { label: "Response", value: supplier.responseTime, icon: <Clock size={11} /> },
                      { label: "Response Rate", value: `${supplier.responseRate}%`, icon: <CheckCircle2 size={11} /> },
                      { label: "Experience", value: `${supplier.yearsActive} yrs`, icon: <Award size={11} /> },
                    ].map((s) => (
                      <div key={s.label} className="flex items-start gap-1.5 p-2 rounded" style={{ background: "oklch(0.96 0.004 90)" }}>
                        <span style={{ color: "oklch(0.75 0.16 65)", marginTop: "1px" }}>{s.icon}</span>
                        <div>
                          <div className="font-bold text-xs tv-number" style={{ color: "oklch(0.22 0.06 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                            {s.value}
                          </div>
                          <div className="text-xs" style={{ color: "oklch(0.62 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                            {s.label}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: "oklch(0.22 0.06 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                    View Supplier Storefront <ChevronRight size={12} />
                  </div>
                </div>
              </div>
            </Link>

            {/* Trade assurance */}
            <div
              className="rounded-md border p-4 space-y-3"
              style={{ borderColor: "oklch(0.90 0.006 248)", background: "white" }}
            >
              <h4
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
              >
                Trade Assurance
              </h4>
              {[
                { icon: <ShieldCheck size={14} />, text: "Secure payment protection" },
                { icon: <Truck size={14} />, text: "On-time delivery guarantee" },
                { icon: <CheckCircle2 size={14} />, text: "Product quality inspection" },
                { icon: <FileText size={14} />, text: "Dispute resolution support" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2.5">
                  <span style={{ color: "oklch(0.75 0.16 65)" }}>{item.icon}</span>
                  <span className="text-sm" style={{ color: "oklch(0.42 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="mt-14">
            <h2
              className="tv-display text-2xl mb-6"
              style={{ color: "oklch(0.18 0.04 248)" }}
            >
              More from {supplier.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
