/**
 * Napoli Pizzeria Navbar
 * Design: Italian trattoria — red top bar, cream body, green accents
 */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Phone, MapPin, Clock, Menu, X, ShoppingCart,
  UtensilsCrossed, ShoppingBag, Truck, CalendarClock, ChevronDown
} from "lucide-react";
import { RESTAURANT_INFO } from "@/lib/napoliData";
import { useCart, type OrderType } from "@/contexts/CartContext";

const ORDER_TYPES: {
  type: OrderType;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    type: "dine-in",
    label: "Dine-In",
    sublabel: "Enjoy at our restaurant",
    icon: <UtensilsCrossed size={22} />,
    color: "oklch(0.38 0.12 145)",
    bg: "oklch(0.96 0.04 145)",
    border: "oklch(0.75 0.12 145)",
  },
  {
    type: "pickup",
    label: "To Go / Pick Up",
    sublabel: "Ready in 15–20 min",
    icon: <ShoppingBag size={22} />,
    color: "oklch(0.42 0.18 25)",
    bg: "oklch(0.97 0.04 25)",
    border: "oklch(0.75 0.15 25)",
  },
  {
    type: "delivery",
    label: "Delivery",
    sublabel: "We bring it to your door",
    icon: <Truck size={22} />,
    color: "oklch(0.46 0.18 264)",
    bg: "oklch(0.97 0.03 264)",
    border: "oklch(0.75 0.15 264)",
  },
  {
    type: "scheduled",
    label: "Schedule Order",
    sublabel: "Pick a future date & time",
    icon: <CalendarClock size={22} />,
    color: "oklch(0.48 0.18 310)",
    bg: "oklch(0.97 0.03 310)",
    border: "oklch(0.75 0.15 310)",
  },
];

export default function NapoliNavbar() {
  const [open, setOpen] = useState(false);
  const [orderPopupOpen, setOrderPopupOpen] = useState(false);
  const [location] = useLocation();
  const { totalItems, openCartWithType } = useCart();
  const popupRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
    { href: "/specials", label: "Specials" },
    { href: "/catering", label: "Catering" },
  ];

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOrderPopupOpen(false);
      }
    }
    if (orderPopupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [orderPopupOpen]);

  // Close popup on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOrderPopupOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function handleSelectOrderType(type: OrderType) {
    setOrderPopupOpen(false);
    setOpen(false);
    openCartWithType(type);
  }

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
            <a
              href="https://www.google.com/maps/search/3131+W+Craig+Rd+North+Las+Vegas+NV+89032"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs napoli-body hover:opacity-75 transition-opacity"
              style={{ color: "oklch(0.85 0.015 80)" }}
            >
              <MapPin size={11} style={{ color: "var(--napoli-gold)" }} />
              {RESTAURANT_INFO.address}, {RESTAURANT_INFO.city}
            </a>
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
              <img
                src="/manus-storage/RogoRecortadotransparente_2498d8db.png"
                alt="Napoli Pizzeria Logo"
                className="w-14 h-14 object-contain shrink-0"
              />
              <div>
                <div
                  className="napoli-label text-xs"
                  style={{ color: "var(--napoli-green)", letterSpacing: "0.15em" }}
                >
                  North Las Vegas
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
              const isCatering = link.href === "/catering";
              return (
                <Link key={link.href} href={link.href}>
                  <span
                    className={`px-4 py-2 rounded text-sm font-semibold napoli-label transition-colors ${
                      isCatering
                        ? "px-5 py-2 rounded"
                        : isActive
                        ? "bg-napoli-red text-white"
                        : "hover:bg-napoli-cream-dark"
                    }`}
                    style={{
                      color: isCatering ? "white" : isActive ? "white" : "var(--napoli-dark)",
                      background: isCatering ? "oklch(0.45 0.15 145)" : undefined,
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
              onClick={() => openCartWithType("pickup")}
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
              onClick={() => setOrderPopupOpen((v) => !v)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold"
              style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
            >
              <ShoppingBag size={13} />
              Order
              <ChevronDown size={11} style={{ transform: orderPopupOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
            </button>
            <button
              onClick={() => openCartWithType("pickup")}
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

        {/* Mobile order type popup (full-width) */}
        {orderPopupOpen && (
          <div
            className="md:hidden border-t"
            style={{ borderColor: "oklch(0.88 0.015 80)", background: "white" }}
          >
            <div className="container py-3">
              <p
                className="text-xs font-bold mb-2 px-1"
                style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}
              >
                HOW WOULD YOU LIKE TO ORDER?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ORDER_TYPES.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => handleSelectOrderType(opt.type)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all active:scale-95"
                    style={{
                      background: opt.bg,
                      border: `1px solid ${opt.border}`,
                    }}
                  >
                    <span style={{ color: opt.color, flexShrink: 0 }}>{opt.icon}</span>
                    <div>
                      <p
                        className="text-xs font-bold leading-tight"
                        style={{ color: opt.color, fontFamily: "'Oswald', sans-serif" }}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontSize: "0.65rem" }}>
                        {opt.sublabel}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile nav links */}
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
                      color: link.href === "/catering" ? "white" : "var(--napoli-dark)",
                      background: link.href === "/catering" ? "oklch(0.45 0.15 145)" : "transparent",
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

      {/* Popup animation keyframe */}
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </header>
  );
}
