/**
 * TradeVault ProductCard
 * Design: Merchant Heritage — amber top-border on hover, editorial info hierarchy
 */
import { Star, ShieldCheck, Package } from "lucide-react";
import { Link } from "wouter";
import type { Product } from "@/lib/data";

interface ProductCardProps {
  product: Product;
  style?: React.CSSProperties;
}

export default function ProductCard({ product, style }: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`}>
      <div
        className="tv-card-hover tv-amber-border-hover bg-white rounded-md overflow-hidden border cursor-pointer group"
        style={{ borderColor: "oklch(0.90 0.006 248)", ...style }}
      >
        {/* Product image */}
        <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {product.featured && (
            <div className="absolute top-2 left-2">
              <span className="tv-badge-amber">Featured</span>
            </div>
          )}
          {!product.inStock && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(13,37,69,0.55)" }}
            >
              <span className="text-white font-bold text-sm" style={{ fontFamily: "'Nunito Sans', sans-serif" }}>
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-4">
          {/* Category + supplier */}
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif", letterSpacing: "0.06em" }}
            >
              {product.subcategory}
            </span>
            <div className="flex items-center gap-1">
              <Star size={11} fill="oklch(0.75 0.16 65)" stroke="none" />
              <span className="text-xs font-bold tv-number" style={{ color: "oklch(0.35 0.04 248)" }}>
                {product.rating}
              </span>
              <span className="text-xs" style={{ color: "oklch(0.62 0.03 248)" }}>
                ({product.reviewCount})
              </span>
            </div>
          </div>

          {/* Product name */}
          <h3
            className="font-bold text-sm leading-snug mb-2 line-clamp-2"
            style={{ color: "oklch(0.18 0.04 248)", fontFamily: "'Nunito Sans', sans-serif" }}
          >
            {product.name}
          </h3>

          {/* Supplier */}
          <div className="flex items-center gap-1.5 mb-3">
            <ShieldCheck size={12} style={{ color: "oklch(0.75 0.16 65)" }} />
            <span className="text-xs" style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
              {product.supplierName}
            </span>
          </div>

          {/* Price + MOQ */}
          <div
            className="flex items-end justify-between pt-3 border-t"
            style={{ borderColor: "oklch(0.93 0.004 90)" }}
          >
            <div>
              <div className="flex items-baseline gap-1">
                <span
                  className="text-lg font-bold tv-number"
                  style={{ color: "oklch(0.22 0.06 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                >
                  ${product.priceRange.min.toFixed(2)}
                </span>
                <span className="text-xs" style={{ color: "oklch(0.62 0.03 248)" }}>
                  – ${product.priceRange.max.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Package size={11} style={{ color: "oklch(0.75 0.16 65)" }} />
                <span
                  className="text-xs font-semibold tv-number"
                  style={{ color: "oklch(0.52 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                >
                  MOQ: {product.moq.toLocaleString()} {product.moqUnit}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
              {product.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: "oklch(0.96 0.004 90)",
                    color: "oklch(0.35 0.04 248)",
                    fontFamily: "'Nunito Sans', sans-serif",
                    fontSize: "0.65rem",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
