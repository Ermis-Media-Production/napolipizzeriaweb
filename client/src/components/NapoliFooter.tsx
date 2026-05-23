/**
 * Napoli Pizzeria Footer
 * Design: Dark background, Italian tricolor accents
 */
import { Link } from "wouter";
import { Phone, MapPin, Clock, Instagram, Facebook, Globe } from "lucide-react";
import { RESTAURANT_INFO } from "@/lib/napoliData";

export default function NapoliFooter() {
  return (
    <footer>
      {/* Italian flag divider */}
      <div className="h-1.5 flex">
        <div className="flex-1 bg-napoli-green" />
        <div className="flex-1" style={{ background: "white" }} />
        <div className="flex-1 bg-napoli-red" />
      </div>

      <div className="bg-napoli-dark py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-xl shrink-0"
                  style={{
                    background: "var(--napoli-red)",
                    fontFamily: "'Playfair Display', serif",
                    border: "2px solid var(--napoli-green)",
                  }}
                >
                  N
                </div>
                <div>
                  <div className="napoli-label text-xs" style={{ color: "var(--napoli-gold)", letterSpacing: "0.15em" }}>
                    The Original
                  </div>
                  <div className="napoli-display text-lg" style={{ color: "oklch(0.95 0.015 80)" }}>
                    Napoli Pizzeria
                  </div>
                </div>
              </div>
              <p className="text-sm napoli-body leading-relaxed mb-4" style={{ color: "oklch(0.65 0.015 80)" }}>
                {RESTAURANT_INFO.tagline}<br />
                {RESTAURANT_INFO.subtitle}
              </p>
              <div className="flex gap-3">
                <a href="#" className="p-2 rounded transition-colors hover:bg-napoli-red" style={{ color: "oklch(0.65 0.015 80)" }}>
                  <Instagram size={16} />
                </a>
                <a href="#" className="p-2 rounded transition-colors hover:bg-napoli-red" style={{ color: "oklch(0.65 0.015 80)" }}>
                  <Facebook size={16} />
                </a>
                <a href={`https://${RESTAURANT_INFO.website}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded transition-colors hover:bg-napoli-red" style={{ color: "oklch(0.65 0.015 80)" }}>
                  <Globe size={16} />
                </a>
              </div>
            </div>

            {/* Hours */}
            <div>
              <h4 className="napoli-label text-xs mb-4" style={{ color: "var(--napoli-gold)" }}>
                Hours
              </h4>
              <div className="space-y-2">
                {RESTAURANT_INFO.hours.map((h) => (
                  <div key={h.days}>
                    <div className="text-xs napoli-body" style={{ color: "oklch(0.60 0.015 80)" }}>{h.days}</div>
                    <div className="text-sm font-bold napoli-body" style={{ color: "oklch(0.85 0.015 80)" }}>{h.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="napoli-label text-xs mb-4" style={{ color: "var(--napoli-gold)" }}>
                Services
              </h4>
              <div className="space-y-2">
                {RESTAURANT_INFO.services.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-napoli-red shrink-0" />
                    <span className="text-sm napoli-body" style={{ color: "oklch(0.75 0.015 80)" }}>{s}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <h4 className="napoli-label text-xs mb-3" style={{ color: "var(--napoli-gold)" }}>
                  Menu
                </h4>
                {["Appetizers", "Lunch Specials", "Pizzeria", "Wings", "Pasta", "Burgers"].map((item) => (
                  <Link key={item} href="/menu">
                    <div className="text-sm napoli-body mb-1.5 cursor-pointer hover:text-napoli-red transition-colors" style={{ color: "oklch(0.65 0.015 80)" }}>
                      {item}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="napoli-label text-xs mb-4" style={{ color: "var(--napoli-gold)" }}>
                Contact & Location
              </h4>
              <div className="space-y-3">
                <a
                  href={`tel:${RESTAURANT_INFO.phone}`}
                  className="flex items-start gap-2.5 group"
                >
                  <Phone size={14} className="mt-0.5 shrink-0" style={{ color: "var(--napoli-gold)" }} />
                  <span className="text-sm napoli-body group-hover:text-napoli-red transition-colors" style={{ color: "oklch(0.75 0.015 80)" }}>
                    {RESTAURANT_INFO.phone}
                  </span>
                </a>
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: "var(--napoli-gold)" }} />
                  <div>
                    <div className="text-sm napoli-body" style={{ color: "oklch(0.75 0.015 80)" }}>
                      {RESTAURANT_INFO.address}
                    </div>
                    <div className="text-sm napoli-body" style={{ color: "oklch(0.75 0.015 80)" }}>
                      {RESTAURANT_INFO.city}
                    </div>
                  </div>
                </div>
                <a
                  href={`https://${RESTAURANT_INFO.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 group"
                >
                  <Globe size={14} style={{ color: "var(--napoli-gold)" }} />
                  <span className="text-sm napoli-body group-hover:text-napoli-red transition-colors" style={{ color: "oklch(0.75 0.015 80)" }}>
                    {RESTAURANT_INFO.website}
                  </span>
                </a>
              </div>

              {/* Pick-up special */}
              <div
                className="mt-5 p-3 rounded border-2 border-dashed"
                style={{ borderColor: "var(--napoli-gold)", background: "oklch(0.22 0.03 30)" }}
              >
                <div className="napoli-label text-xs mb-1" style={{ color: "var(--napoli-gold)" }}>
                  Pick Up Special
                </div>
                <div className="napoli-heading text-base" style={{ color: "oklch(0.95 0.015 80)" }}>
                  {RESTAURANT_INFO.pickupSpecial.label}
                </div>
                <div className="napoli-price text-2xl" style={{ color: "var(--napoli-gold)" }}>
                  {RESTAURANT_INFO.pickupSpecial.price}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-3"
            style={{ borderColor: "oklch(0.28 0.02 30)" }}
          >
            <p className="text-xs napoli-body" style={{ color: "oklch(0.45 0.015 80)" }}>
              © {new Date().getFullYear()} The Original Napoli Pizzeria. All rights reserved.
            </p>
            <p className="text-xs napoli-body" style={{ color: "oklch(0.40 0.015 80)" }}>
              Taxes not included. Prices subject to change without notice. $1.99 Starting delivery charge. $1.00 Credit Card Charge.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
