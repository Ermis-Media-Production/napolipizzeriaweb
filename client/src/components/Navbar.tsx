/**
 * TradeVault Navbar
 * Design: Merchant Heritage — navy background, amber accents, Nunito Sans
 * Two-tier: top utility bar + main nav with category strip
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Search,
  Menu,
  X,
  ChevronDown,
  Globe,
  ShieldCheck,
  Building2,
  Package,
  LayoutGrid,
  Cpu,
  Shirt,
  Coffee,
  Sparkles,
  Sofa,
  Factory,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <LayoutGrid size={14} />,
  electronics: <Cpu size={14} />,
  textiles: <Shirt size={14} />,
  packaging: <Package size={14} />,
  industrial: <Factory size={14} />,
  food: <Coffee size={14} />,
  beauty: <Sparkles size={14} />,
  furniture: <Sofa size={14} />,
};

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "electronics", label: "Electronics" },
  { id: "textiles", label: "Textiles" },
  { id: "packaging", label: "Packaging" },
  { id: "industrial", label: "Industrial" },
  { id: "food", label: "Food & Bev" },
  { id: "beauty", label: "Beauty" },
  { id: "furniture", label: "Furniture" },
];

interface NavbarProps {
  onCategoryChange?: (cat: string) => void;
  activeCategory?: string;
}

export default function Navbar({ onCategoryChange, activeCategory = "all" }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate("/products");
      toast.info(`Searching for "${searchQuery}"…`, { description: "Search feature coming soon." });
    }
  };

  const handlePlaceholder = () => toast.info("Feature coming soon.");

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Top utility bar */}
      <div style={{ background: "oklch(0.16 0.05 248)" }} className="hidden md:block">
        <div className="container flex items-center justify-between py-1.5 text-xs" style={{ color: "oklch(0.80 0.02 248)" }}>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Globe size={12} />
              Global Sourcing — 50+ Countries
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} />
              Verified Suppliers Only
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handlePlaceholder} className="hover:text-white transition-colors">Become a Supplier</button>
            <span className="opacity-30">|</span>
            <button onClick={handlePlaceholder} className="hover:text-white transition-colors">Help Center</button>
            <span className="opacity-30">|</span>
            <button onClick={handlePlaceholder} className="hover:text-white transition-colors">Sign In</button>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav style={{ background: "oklch(0.22 0.06 248)" }} className="shadow-lg">
        <div className="container flex items-center gap-4 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm"
              style={{ background: "oklch(0.75 0.16 65)", color: "oklch(0.18 0.04 248)" }}
            >
              TV
            </div>
            <span
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "'Libre Baskerville', serif", color: "oklch(0.99 0.003 90)" }}
            >
              Trade<span style={{ color: "oklch(0.75 0.16 65)" }}>Vault</span>
            </span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 hidden md:flex items-center gap-0 max-w-xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" style={{ color: "oklch(0.60 0.03 248)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, suppliers, categories…"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-l-md border-0 outline-none"
                style={{
                  background: "oklch(0.97 0.003 90)",
                  color: "oklch(0.18 0.04 248)",
                  fontFamily: "'Nunito Sans', sans-serif",
                }}
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-bold rounded-r-md transition-colors"
              style={{
                background: "oklch(0.75 0.16 65)",
                color: "oklch(0.18 0.04 248)",
                fontFamily: "'Nunito Sans', sans-serif",
              }}
            >
              Search
            </button>
          </form>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <button
              onClick={handlePlaceholder}
              className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
              style={{ color: "oklch(0.80 0.02 248)", fontFamily: "'Nunito Sans', sans-serif" }}
            >
              <Building2 size={16} />
              Suppliers
              <ChevronDown size={14} />
            </button>
            <button
              onClick={handlePlaceholder}
              className="px-4 py-2 text-sm font-bold rounded transition-colors"
              style={{
                background: "oklch(0.75 0.16 65)",
                color: "oklch(0.18 0.04 248)",
                fontFamily: "'Nunito Sans', sans-serif",
              }}
            >
              Request Quote
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden ml-auto"
            style={{ color: "oklch(0.99 0.003 90)" }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Category strip */}
        <div
          className="hidden md:block border-t"
          style={{ borderColor: "oklch(0.30 0.07 248)" }}
        >
          <div className="container flex items-center gap-1 py-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange?.(cat.id)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-all rounded-sm"
                style={{
                  fontFamily: "'Nunito Sans', sans-serif",
                  color: activeCategory === cat.id ? "oklch(0.18 0.04 248)" : "oklch(0.75 0.02 248)",
                  background: activeCategory === cat.id ? "oklch(0.75 0.16 65)" : "transparent",
                  letterSpacing: "0.04em",
                }}
              >
                {CATEGORY_ICONS[cat.id]}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden shadow-xl"
          style={{ background: "oklch(0.22 0.06 248)" }}
        >
          <div className="container py-4 flex flex-col gap-3">
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products…"
                className="flex-1 px-3 py-2 text-sm rounded-l-md border-0 outline-none"
                style={{ background: "oklch(0.97 0.003 90)", color: "oklch(0.18 0.04 248)" }}
              />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-bold rounded-r-md"
                style={{ background: "oklch(0.75 0.16 65)", color: "oklch(0.18 0.04 248)" }}
              >
                Go
              </button>
            </form>
            <div className="grid grid-cols-4 gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { onCategoryChange?.(cat.id); setMobileOpen(false); }}
                  className="flex flex-col items-center gap-1 px-2 py-2 text-xs font-semibold rounded"
                  style={{
                    color: activeCategory === cat.id ? "oklch(0.18 0.04 248)" : "oklch(0.75 0.02 248)",
                    background: activeCategory === cat.id ? "oklch(0.75 0.16 65)" : "oklch(0.28 0.07 248)",
                  }}
                >
                  {CATEGORY_ICONS[cat.id]}
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handlePlaceholder} className="flex-1 py-2 text-sm font-bold rounded" style={{ background: "oklch(0.28 0.07 248)", color: "oklch(0.99 0.003 90)" }}>Sign In</button>
              <button onClick={handlePlaceholder} className="flex-1 py-2 text-sm font-bold rounded" style={{ background: "oklch(0.75 0.16 65)", color: "oklch(0.18 0.04 248)" }}>Request Quote</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
