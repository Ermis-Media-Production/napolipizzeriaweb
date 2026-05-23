/**
 * TradeVault Products Page
 * Design: Merchant Heritage — filter sidebar, product grid, MOQ/category filters
 */
import { useState, useMemo } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp, X, Package, LayoutGrid, List } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { PRODUCTS, CATEGORIES, MOQ_RANGES } from "@/lib/data";

export default function Products() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeMoq, setActiveMoq] = useState("any");
  const [sortBy, setSortBy] = useState("featured");
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    let result = [...PRODUCTS];

    if (activeCategory !== "all") {
      result = result.filter((p) => p.category === activeCategory);
    }

    if (activeMoq !== "any") {
      const [min, max] = activeMoq.split("-").map(Number);
      if (activeMoq === "500+") {
        result = result.filter((p) => p.moq >= 500);
      } else {
        result = result.filter((p) => p.moq >= min && p.moq <= max);
      }
    }

    if (sortBy === "price-asc") result.sort((a, b) => a.priceRange.min - b.priceRange.min);
    if (sortBy === "price-desc") result.sort((a, b) => b.priceRange.min - a.priceRange.min);
    if (sortBy === "rating") result.sort((a, b) => b.rating - a.rating);
    if (sortBy === "moq-asc") result.sort((a, b) => a.moq - b.moq);
    if (sortBy === "featured") result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    return result;
  }, [activeCategory, activeMoq, sortBy]);

  const activeFiltersCount = [activeCategory !== "all", activeMoq !== "any"].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.99 0.003 90)" }}>
      <Navbar onCategoryChange={setActiveCategory} activeCategory={activeCategory} />

      {/* Page header */}
      <div
        className="border-b py-8"
        style={{ background: "oklch(0.22 0.06 248)", borderColor: "oklch(0.28 0.07 248)" }}
      >
        <div className="container">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "oklch(0.75 0.16 65)", fontFamily: "'Nunito Sans', sans-serif" }}
          >
            Wholesale Catalog
          </p>
          <h1 className="tv-display text-3xl md:text-4xl" style={{ color: "oklch(0.99 0.003 90)" }}>
            Browse Products
          </h1>
          <p className="text-sm mt-2" style={{ color: "oklch(0.70 0.02 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
            {filtered.length} products from verified global suppliers
          </p>
        </div>
      </div>

      <div className="container py-8 flex-1">
        <div className="flex gap-6">
          {/* Filter sidebar */}
          <aside className={`shrink-0 ${showFilters ? "w-56" : "w-0 overflow-hidden"} transition-all duration-200`}>
            {showFilters && (
              <div className="space-y-6">
                {/* Categories */}
                <div>
                  <h3
                    className="text-xs font-bold uppercase tracking-widest mb-3"
                    style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                  >
                    Category
                  </h3>
                  <div className="space-y-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className="w-full text-left px-3 py-2 rounded text-sm font-semibold transition-all"
                        style={{
                          fontFamily: "'Nunito Sans', sans-serif",
                          background: activeCategory === cat.id ? "oklch(0.22 0.06 248)" : "transparent",
                          color: activeCategory === cat.id ? "oklch(0.99 0.003 90)" : "oklch(0.35 0.04 248)",
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MOQ */}
                <div>
                  <h3
                    className="text-xs font-bold uppercase tracking-widest mb-3"
                    style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                  >
                    Min. Order Qty
                  </h3>
                  <div className="space-y-1">
                    {MOQ_RANGES.map((range) => (
                      <button
                        key={range.id}
                        onClick={() => setActiveMoq(range.id)}
                        className="w-full text-left px-3 py-2 rounded text-sm font-semibold transition-all flex items-center gap-2"
                        style={{
                          fontFamily: "'Nunito Sans', sans-serif",
                          background: activeMoq === range.id ? "oklch(0.22 0.06 248)" : "transparent",
                          color: activeMoq === range.id ? "oklch(0.99 0.003 90)" : "oklch(0.35 0.04 248)",
                        }}
                      >
                        <span
                          className="w-3 h-3 rounded-full border-2 shrink-0 transition-colors"
                          style={{
                            borderColor: activeMoq === range.id ? "oklch(0.75 0.16 65)" : "oklch(0.70 0.03 248)",
                            background: activeMoq === range.id ? "oklch(0.75 0.16 65)" : "transparent",
                          }}
                        />
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset */}
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => { setActiveCategory("all"); setActiveMoq("any"); }}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                  >
                    <X size={12} /> Clear filters ({activeFiltersCount})
                  </button>
                )}
              </div>
            )}
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-semibold border transition-colors"
                  style={{
                    borderColor: "oklch(0.90 0.006 248)",
                    color: "oklch(0.35 0.04 248)",
                    fontFamily: "'Nunito Sans', sans-serif",
                    background: showFilters ? "oklch(0.96 0.004 90)" : "white",
                  }}
                >
                  <SlidersHorizontal size={14} />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span
                      className="w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                      style={{ background: "oklch(0.75 0.16 65)", color: "oklch(0.18 0.04 248)" }}
                    >
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                <span className="text-sm" style={{ color: "oklch(0.62 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                  {filtered.length} results
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded text-sm border outline-none"
                  style={{
                    borderColor: "oklch(0.90 0.006 248)",
                    color: "oklch(0.35 0.04 248)",
                    fontFamily: "'Nunito Sans', sans-serif",
                    background: "white",
                  }}
                >
                  <option value="featured">Featured First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="moq-asc">Lowest MOQ</option>
                </select>

                <div className="flex border rounded overflow-hidden" style={{ borderColor: "oklch(0.90 0.006 248)" }}>
                  <button
                    onClick={() => setViewMode("grid")}
                    className="p-2 transition-colors"
                    style={{
                      background: viewMode === "grid" ? "oklch(0.22 0.06 248)" : "white",
                      color: viewMode === "grid" ? "oklch(0.99 0.003 90)" : "oklch(0.52 0.03 248)",
                    }}
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className="p-2 transition-colors"
                    style={{
                      background: viewMode === "list" ? "oklch(0.22 0.06 248)" : "white",
                      color: viewMode === "list" ? "oklch(0.99 0.003 90)" : "oklch(0.52 0.03 248)",
                    }}
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Product grid */}
            {filtered.length > 0 ? (
              <div className={`grid gap-5 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
                {filtered.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-24">
                <Package size={48} className="mx-auto mb-4 opacity-20" style={{ color: "oklch(0.52 0.03 248)" }} />
                <h3
                  className="font-bold text-lg mb-2"
                  style={{ color: "oklch(0.35 0.04 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                >
                  No products match your filters
                </h3>
                <p className="text-sm mb-4" style={{ color: "oklch(0.62 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
                  Try adjusting your category or MOQ range.
                </p>
                <button
                  onClick={() => { setActiveCategory("all"); setActiveMoq("any"); }}
                  className="tv-btn-amber px-5 py-2 rounded text-sm"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
