/**
 * Napoli Pizzeria — Order Page
 */
import { Phone, Globe, MapPin, Clock, Truck, UtensilsCrossed, ShoppingBag, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";
import { RESTAURANT_INFO } from "@/lib/napoliData";

export default function Order() {
  return (
    <div className="min-h-screen flex flex-col bg-napoli-cream">
      <NapoliNavbar />

      <div className="py-10 border-b" style={{ background: "var(--napoli-dark)", borderColor: "oklch(0.28 0.04 30)" }}>
        <div className="container text-center">
          <p className="napoli-label text-xs mb-2" style={{ color: "var(--napoli-gold)", letterSpacing: "0.2em" }}>Fast & Easy</p>
          <h1 className="napoli-display text-4xl md:text-5xl mb-2" style={{ color: "oklch(0.99 0.015 80)" }}>Order Now</h1>
          <p className="napoli-body text-sm" style={{ color: "oklch(0.65 0.015 80)" }}>Delivery · Dine-In · Pick Up · Catering</p>
        </div>
      </div>

      <div className="container py-12 flex-1">
        <div className="max-w-2xl mx-auto">
          {/* Pick-up special */}
          <div
            className="p-5 rounded-md border-2 border-dashed mb-8 text-center"
            style={{ borderColor: "var(--napoli-gold)", background: "white" }}
          >
            <span className="napoli-badge-gold mb-2 inline-block">Pick Up Special</span>
            <div className="napoli-display text-2xl mb-1" style={{ color: "var(--napoli-dark)" }}>
              {RESTAURANT_INFO.pickupSpecial.label}
            </div>
            <div className="napoli-price text-4xl mb-3" style={{ color: "var(--napoli-red)" }}>
              {RESTAURANT_INFO.pickupSpecial.price}
            </div>
            <Link href="/menu">
              <button
                className="napoli-btn-red inline-flex items-center gap-2 px-6 py-3 rounded text-sm font-bold"
                style={{ background: "var(--napoli-red)", color: "white" }}
              >
                Order Now <ArrowRight size={15} />
              </button>
            </Link>
          </div>

          {/* Order options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <a
              href={`https://${RESTAURANT_INFO.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 p-6 rounded-md border-2 bg-white napoli-card-hover text-center"
              style={{ borderColor: "var(--napoli-red)" }}
            >
              <Globe size={32} style={{ color: "var(--napoli-red)" }} />
              <div>
                <div className="napoli-heading text-lg" style={{ color: "var(--napoli-dark)" }}>Order Online</div>
                <div className="text-sm napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{RESTAURANT_INFO.website}</div>
              </div>
            </a>
            <a
              href={`tel:${RESTAURANT_INFO.phone}`}
              className="flex flex-col items-center gap-3 p-6 rounded-md border-2 bg-white napoli-card-hover text-center"
              style={{ borderColor: "var(--napoli-green)" }}
            >
              <Phone size={32} style={{ color: "var(--napoli-green)" }} />
              <div>
                <div className="napoli-heading text-lg" style={{ color: "var(--napoli-dark)" }}>Call to Order</div>
                <div className="text-sm napoli-body font-bold" style={{ color: "var(--napoli-green)" }}>{RESTAURANT_INFO.phone}</div>
              </div>
            </a>
          </div>

          {/* Services */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { icon: <Truck size={20} />, label: "Delivery", note: "$1.99 starting" },
              { icon: <UtensilsCrossed size={20} />, label: "Dine-In", note: "Wine & Beer available" },
              { icon: <ShoppingBag size={20} />, label: "Pick Up", note: "Skip the wait" },
              { icon: <Phone size={20} />, label: "Catering", note: "Call for details" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center gap-2 p-4 rounded border bg-white text-center"
                style={{ borderColor: "oklch(0.88 0.015 80)" }}
              >
                <div style={{ color: "var(--napoli-red)" }}>{s.icon}</div>
                <div className="napoli-label text-xs" style={{ color: "var(--napoli-dark)" }}>{s.label}</div>
                <div className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{s.note}</div>
              </div>
            ))}
          </div>

          {/* Hours & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded border bg-white" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} style={{ color: "var(--napoli-red)" }} />
                <span className="napoli-label text-xs" style={{ color: "var(--napoli-red)" }}>Hours</span>
              </div>
              {RESTAURANT_INFO.hours.map((h) => (
                <div key={h.days} className="mb-2">
                  <div className="text-xs napoli-body" style={{ color: "oklch(0.52 0.03 30)" }}>{h.days}</div>
                  <div className="napoli-body font-bold text-sm" style={{ color: "var(--napoli-dark)" }}>{h.time}</div>
                </div>
              ))}
            </div>
            <div className="p-5 rounded border bg-white" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={16} style={{ color: "var(--napoli-red)" }} />
                <span className="napoli-label text-xs" style={{ color: "var(--napoli-red)" }}>Location</span>
              </div>
              <div className="napoli-body font-bold text-sm mb-1" style={{ color: "var(--napoli-dark)" }}>{RESTAURANT_INFO.address}</div>
              <div className="napoli-body text-sm mb-3" style={{ color: "oklch(0.52 0.03 30)" }}>{RESTAURANT_INFO.city}</div>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(RESTAURANT_INFO.address + " " + RESTAURANT_INFO.city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs napoli-label"
                style={{ color: "var(--napoli-green)" }}
              >
                Get Directions →
              </a>
            </div>
          </div>
        </div>
      </div>

      <NapoliFooter />
    </div>
  );
}
