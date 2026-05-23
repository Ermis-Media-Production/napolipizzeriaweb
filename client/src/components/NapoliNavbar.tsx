/**
 * Napoli Pizzeria Navbar
 * Design: Italian trattoria — red top bar, cream body, green accents
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Phone, MapPin, Clock, Menu, X, ShoppingCart } from "lucide-react";
import { RESTAURANT_INFO } from "@/lib/napoliData";
import { useCart } from "@/contexts/CartContext";

export default function NapoliNavbar() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { totalItems, openCart } = useCart();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
    { href: "/specials", label: "Specials" },
    { href: "/order", label: "Order Online" },
  ];

  return (
    <header>
      {/* Top info bar */}
      <div className="bg-napoli-dark py-2 border-b" style={{ borderColor: "oklch(0.30 0.04 27)" }}>
        <div className="container flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <a
              href={`tel:${RESTAURANT_INFO.phone}`}
              className="flex items-center gap-1.5 text-xs napoli-body transition-opacity hover:opacity-80"
              style={{ color: "oklch(0.85 0.015 80)" }}
            >
              <Phone size={11} style={{ color: "var(--napoli-gold)" }} />
              {RESTAURANT_INFO.phone}
            </a>
            <span className="flex items-center gap-1.5 text-xs napoli-body" style={{ color: "oklch(0.85 0.015 80)" }}>
              <MapPin size={11} style={{ color: "var(--napoli-gold)" }} />
              {RESTAURANT_INFO.address}, {RESTAURANT_INFO.city}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {RESTAURANT_INFO.hours.map((h) => (
              <span key={h.days} className="flex items-center gap-1.5 text-xs napoli-body" style={{ color: "oklch(0.75 0.015 80)" }}>
                <Clock size={10} style={{ color: "var(--napoli-gold)" }} />
                <span style={{ color: "oklch(0.65 0.015 80)" }}>{h.days}:</span>
                <strong style={{ color: "oklch(0.85 0.015 80)" }}>{h.time}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav
        className="sticky top-0 z-50 border-b shadow-sm"
        style={{ background: "oklch(0.99 0.015 80)", borderColor: "oklch(0.88 0.015 80)" }}
      >
        <div className="container flex items-center justify-between py-3">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg shrink-0"
                style={{
                  background: "var(--napoli-red)",
                  fontFamily: "'Playfair Display', serif",
                  border: "2px solid var(--napoli-green)",
                }}
              >
                N
              </div>
              <div>
                <div
                  className="napoli-label text-xs"
                  style={{ color: "var(--napoli-green)", letterSpacing: "0.15em" }}
                >
                  The Original
                </div>
                <div
                  className="napoli-display text-xl leading-tight"
                  style={{ color: "var(--napoli-red)" }}
                >
                  Napoli Pizzeria
                </div>
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location === link.href;
              const isOrder = link.href === "/order";
              return (
                <Link key={link.href} href={link.href}>
                  <span
                    className={`px-4 py-2 rounded text-sm font-semibold napoli-label transition-colors ${
                      isOrder
                        ? "napoli-btn-red px-5 py-2 rounded"
                        : isActive
                        ? "bg-napoli-red text-white"
                        : "hover:bg-napoli-cream-dark"
                    }`}
                    style={{
                      color: isOrder ? "white" : isActive ? "white" : "var(--napoli-dark)",
                      fontFamily: "'Oswald', sans-serif",
                      fontSize: "0.8rem",
                    }}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}

            {/* Cart button */}
            <button
              onClick={openCart}
              className="relative ml-2 p-2.5 rounded-full transition-colors hover:bg-red-50"
              style={{ color: "var(--napoli-red)" }}
              aria-label={`Cart with ${totalItems} items`}
            >
              <ShoppingCart size={22} />
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "var(--napoli-red)", color: "white", fontSize: "0.65rem" }}
                >
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </button>
          </div>

          {/* Mobile: cart + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={openCart}
              className="relative p-2 rounded"
              style={{ color: "var(--napoli-red)" }}
            >
              <ShoppingCart size={22} />
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "var(--napoli-red)", color: "white", fontSize: "0.6rem" }}
                >
                  {totalItems}
                </span>
              )}
            </button>
            <button
              className="p-2 rounded"
              onClick={() => setOpen(!open)}
              style={{ color: "var(--napoli-red)" }}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div
            className="md:hidden border-t py-3"
            style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.99 0.015 80)" }}
          >
            <div className="container flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <span
                    className="block px-4 py-3 rounded text-sm font-semibold napoli-label"
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      color: link.href === "/order" ? "white" : "var(--napoli-dark)",
                      background: link.href === "/order" ? "var(--napoli-red)" : "transparent",
                    }}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
