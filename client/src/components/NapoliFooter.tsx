/**
 * Napoli Pizzeria Footer
 * Design: Dark background, Italian tricolor accents
 */
import { useState } from "react";
import { Link } from "wouter";
import { Phone, MapPin, Clock, Instagram, Facebook, Globe, ArrowRight } from "lucide-react";
import { RESTAURANT_INFO } from "@/lib/napoliData";
import PickUpSpecialModal from "@/components/PickUpSpecialModal";

export default function NapoliFooter() {
  const [pickupModalOpen, setPickupModalOpen] = useState(false);

  return (
    <footer>
      <PickUpSpecialModal open={pickupModalOpen} onClose={() => setPickupModalOpen(false)} />
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
                <img
                  src="/manus-storage/RogoRecortadotransparente_2498d8db.png"
                  alt="Napoli Pizzeria Logo"
                  className="w-16 h-16 object-contain shrink-0"
                />
                <div>
                  <div className="napoli-label text-xs" style={{ color: "var(--napoli-gold)", letterSpacing: "0.15em" }}>
                    North Las Vegas
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
                <a href="https://www.instagram.com/napolipizzeriacraig" target="_blank" rel="noopener noreferrer" className="p-2 rounded transition-colors hover:bg-napoli-red" style={{ color: "oklch(0.65 0.015 80)" }}>
                  <Instagram size={16} />
                </a>
                <a href="https://www.facebook.com/napolipizzeriacraig" target="_blank" rel="noopener noreferrer" className="p-2 rounded transition-colors hover:bg-napoli-red" style={{ color: "oklch(0.65 0.015 80)" }}>
                  <Facebook size={16} />
                </a>
                <a href={`https://${RESTAURANT_INFO.website}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded transition-colors hover:bg-napoli-red" style={{ color: "oklch(0.65 0.015 80)" }}>
                  <Globe size={16} />
                </a>
                <a
                  href="https://www.doordash.com/en/store/napoli-pizzeria-craig-north-las-vegas-43074369/109691748/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Order on DoorDash"
                  className="p-2 rounded transition-colors hover:bg-napoli-red"
                  style={{ color: "oklch(0.65 0.015 80)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.004 0C5.374 0 0 5.373 0 12.004 0 18.63 5.374 24 12.004 24 18.63 24 24 18.63 24 12.004 24 5.373 18.63 0 12.004 0zm5.578 7.26c1.967 0 3.56 1.594 3.56 3.56 0 1.967-1.593 3.56-3.56 3.56H7.26v-2.373h10.322c.655 0 1.187-.532 1.187-1.187 0-.655-.532-1.187-1.187-1.187H7.26V7.26h10.322z"/>
                  </svg>
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
                {([
                  { label: "Delivery", href: "/order" },
                  { label: "Dine-In", href: "/order" },
                  { label: "Pick Up", href: "/order" },
                  { label: "Catering", href: "/catering" },
                ] as const).map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-napoli-red shrink-0" />
                    <Link href={s.href}>
                      <span className="text-sm napoli-body cursor-pointer hover:text-napoli-red transition-colors" style={{ color: "oklch(0.75 0.015 80)" }}>{s.label}</span>
                    </Link>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <h4 className="napoli-label text-xs mb-3" style={{ color: "var(--napoli-gold)" }}>
                  Menu
                </h4>
                {([
                  { label: "Appetizers", anchor: "appetizers" },
                  { label: "Lunch Specials", anchor: "lunch" },
                  { label: "Pizzeria", anchor: "pizza" },
                  { label: "Wings", anchor: "wings" },
                  { label: "Pasta", anchor: "pasta" },
                  { label: "Burgers", anchor: "burgers" },
                ] as const).map((item) => (
                  <Link key={item.label} href={`/menu#${item.anchor}`}>
                    <div className="text-sm napoli-body mb-1.5 cursor-pointer hover:text-napoli-red transition-colors" style={{ color: "oklch(0.65 0.015 80)" }}>
                      {item.label}
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
                <a
                  href="https://www.google.com/maps/search/3131+W+Craig+Rd+North+Las+Vegas+NV+89032"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 group"
                >
                  <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: "var(--napoli-gold)" }} />
                  <div>
                    <div className="text-sm napoli-body group-hover:text-napoli-red transition-colors" style={{ color: "oklch(0.75 0.015 80)" }}>
                      {RESTAURANT_INFO.address}
                    </div>
                    <div className="text-sm napoli-body group-hover:text-napoli-red transition-colors" style={{ color: "oklch(0.75 0.015 80)" }}>
                      {RESTAURANT_INFO.city}
                    </div>
                  </div>
                </a>
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
                <div className="napoli-price text-2xl mb-2" style={{ color: "var(--napoli-gold)" }}>
                  {RESTAURANT_INFO.pickupSpecial.price}
                </div>
                <button
                  onClick={() => setPickupModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-bold napoli-label transition-all active:scale-95"
                  style={{ background: "var(--napoli-red)", color: "white" }}
                >
                  Order Now <ArrowRight size={13} />
                </button>
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
