import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Building2,
  PartyPopper,
  Trophy,
  CheckCircle2,
  Phone,
  Mail,
  Users,
  CalendarDays,
  ChevronRight,
  Star,
  Pizza,
} from "lucide-react";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";

// ── Catering Packages ────────────────────────────────────────
const PACKAGES = [
  {
    id: "corporate",
    icon: Building2,
    badge: "Most Popular",
    badgeColor: "var(--napoli-red)",
    name: "Corporate Office Package",
    tagline: "Feed your team, fuel productivity",
    description:
      "Perfect for office meetings, product launches, employee appreciation days, and corporate luncheons. North Las Vegas is home to a booming industrial corridor — let us keep your team energized.",
    serves: "20–200 guests",
    price: "From $12 / person",
    includes: [
      "Choice of 3 pizza varieties (10 slices each)",
      "Garden salad & Caesar salad",
      "Garlic bread & breadsticks",
      "Soft drinks & water",
      "Disposable plates, napkins & utensils",
      "On-time delivery to your office",
    ],
    addons: ["Wings trays", "Pasta dishes", "Dessert trays", "Hot sub platters"],
    highlight: "80% of companies order catering monthly — be the office hero.",
    gradient: "linear-gradient(135deg, oklch(0.18 0.04 30) 0%, oklch(0.22 0.06 20) 100%)",
  },
  {
    id: "private",
    icon: PartyPopper,
    badge: "Family Favorite",
    badgeColor: "oklch(0.55 0.18 145)",
    name: "Private Events & Celebrations",
    tagline: "Birthdays, quinceañeras, graduations & more",
    description:
      "North Las Vegas has one of the fastest-growing Latino communities in Nevada. We celebrate with you — authentic Italian flavors with the warmth of family tradition for your most important moments.",
    serves: "15–150 guests",
    price: "From $14 / person",
    includes: [
      "Custom pizza selection (up to 5 varieties)",
      "Calzone & stromboli platters",
      "Wings (bone-in or boneless)",
      "Pasta family-style trays",
      "Salads & garlic bread",
      "Dessert options available",
    ],
    addons: ["Custom birthday cake coordination", "Themed decorations", "Full setup & cleanup", "Dedicated server"],
    highlight: "Make your celebration unforgettable with authentic Italian food.",
    gradient: "linear-gradient(135deg, oklch(0.18 0.06 145) 0%, oklch(0.22 0.08 130) 100%)",
  },
  {
    id: "gameday",
    icon: Trophy,
    badge: "Game Day Special",
    badgeColor: "oklch(0.65 0.18 55)",
    name: "Sports & Game Day Party",
    tagline: "Raiders, Golden Knights & Aces fans unite",
    description:
      "Las Vegas is now a major sports city. Whether it's a Raiders watch party, Golden Knights playoff game, or UFC fight night — nothing brings fans together like great pizza and wings.",
    serves: "10–100 guests",
    price: "From $10 / person",
    includes: [
      "Pizza party pack (choice of sizes & toppings)",
      "Wings platter — bone-in or boneless (choice of 4 flavors)",
      "Mozzarella sticks & appetizers",
      "Ranch & blue cheese dipping sauces",
      "Soft drinks & sports energy drinks",
      "Easy pickup or delivery to your venue",
    ],
    addons: ["Extra wing trays", "Sub & wrap platters", "Late-night delivery available", "Bulk pizza deals"],
    highlight: "Las Vegas sports fans spend 40% more on food during game nights.",
    gradient: "linear-gradient(135deg, oklch(0.18 0.06 55) 0%, oklch(0.22 0.08 45) 100%)",
  },
];

// ── Market Research Stats ────────────────────────────────────
const STATS = [
  { value: "60%", label: "of catering market is corporate events" },
  { value: "$124B", label: "catering industry by 2032 (6.2% CAGR)" },
  { value: "80%", label: "of companies order catering monthly" },
  { value: "#1", label: "fastest-growing metro in Nevada: North Las Vegas" },
];

// ── Event Types ──────────────────────────────────────────────
const EVENT_TYPES = [
  "Corporate Lunch / Meeting",
  "Office Party",
  "Birthday Party",
  "Quinceañera",
  "Graduation Party",
  "Wedding Reception",
  "Game Day / Watch Party",
  "School / Church Event",
  "Sports Team Celebration",
  "Other",
];

const GUEST_RANGES = [
  "10–20 guests",
  "20–50 guests",
  "50–100 guests",
  "100–200 guests",
  "200+ guests",
];

// ── Component ────────────────────────────────────────────────
export default function Catering() {
  const [selectedPackage, setSelectedPackage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    eventType: "",
    eventDate: "",
    guestCount: "",
    package: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const submitInquiry = trpc.catering.submitInquiry.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Inquiry sent! We'll contact you within 24 hours.");
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const handlePackageSelect = (pkgId: string, pkgName: string) => {
    setSelectedPackage(pkgId);
    setForm((f) => ({ ...f, package: pkgName }));
    setTimeout(() => {
      document.getElementById("catering-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.eventType || !form.eventDate || !form.guestCount || !form.package) {
      toast.error("Please fill in all required fields.");
      return;
    }
    submitInquiry.mutate(form);
  };

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.97 0.012 80)", fontFamily: "'Lato', sans-serif" }}>
      <NapoliNavbar />

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, oklch(0.12 0.04 20) 0%, oklch(0.18 0.06 15) 60%, oklch(0.22 0.08 10) 100%)",
          paddingTop: "80px",
        }}
      >
        {/* Background pizza texture */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, oklch(0.85 0.18 55) 0%, transparent 50%), radial-gradient(circle at 80% 20%, var(--napoli-red) 0%, transparent 40%)",
          }}
        />

        <div className="relative container mx-auto px-5 py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Pizza size={16} style={{ color: "var(--napoli-red)" }} />
              <span
                className="text-xs font-bold tracking-widest"
                style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}
              >
                NAPOLI PIZZERIA CATERING
              </span>
            </div>
            <h1
              className="text-4xl sm:text-6xl font-bold text-white mb-4 leading-tight"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Authentic Italian
              <br />
              <span style={{ color: "oklch(0.85 0.18 55)" }}>Catering in Las Vegas</span>
            </h1>
            <p className="text-lg text-white/70 mb-8 max-w-xl leading-relaxed" style={{ fontFamily: "'Lato', sans-serif" }}>
              From corporate lunches to quinceañeras and game day parties — we bring the authentic taste of Napoli to your event. Serving North Las Vegas and the greater Las Vegas area.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="#packages"
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all active:scale-95 hover:opacity-90"
                style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
              >
                VIEW PACKAGES <ChevronRight size={16} />
              </a>
              <a
                href="#catering-form"
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", fontFamily: "'Oswald', sans-serif" }}
              >
                GET A QUOTE
              </a>
            </div>

            {/* Contact quick info */}
            <div className="flex flex-wrap gap-4 mt-8">
              <a
                href="tel:7252040379"
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                <Phone size={14} />
                725-204-0379
              </a>
              <a
                href="mailto:info@napolipizzeria.net"
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                <Mail size={14} />
                info@napolipizzeria.net
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Market Stats ── */}
      <section style={{ background: "var(--napoli-red)" }}>
        <div className="container mx-auto px-5 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s) => (
              <div key={s.value} className="text-center">
                <p
                  className="text-2xl sm:text-3xl font-bold text-white"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  {s.value}
                </p>
                <p className="text-xs text-white/70 mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Packages ── */}
      <section id="packages" className="container mx-auto px-5 py-16">
        <div className="text-center mb-12">
          <p
            className="text-xs font-bold tracking-widest mb-2"
            style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}
          >
            CATERING PACKAGES
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ fontFamily: "'Oswald', sans-serif", color: "var(--napoli-dark)" }}
          >
            Choose Your Package
          </h2>
          <p className="text-sm max-w-xl mx-auto" style={{ color: "oklch(0.52 0.03 30)" }}>
            Based on our Las Vegas market research, these are the 3 highest-demand catering niches in the area. All packages are fully customizable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PACKAGES.map((pkg) => {
            const Icon = pkg.icon;
            const isSelected = selectedPackage === pkg.id;
            return (
              <div
                key={pkg.id}
                className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
                style={{
                  boxShadow: isSelected
                    ? "0 0 0 3px var(--napoli-red), 0 8px 32px rgba(0,0,0,0.15)"
                    : "0 2px 16px rgba(0,0,0,0.08)",
                  transform: isSelected ? "translateY(-4px)" : "none",
                }}
              >
                {/* Card header */}
                <div className="px-6 pt-6 pb-5" style={{ background: pkg.gradient }}>
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.12)" }}
                    >
                      <Icon size={22} color="white" />
                    </div>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: pkg.badgeColor, color: "white", fontFamily: "'Oswald', sans-serif" }}
                    >
                      {pkg.badge}
                    </span>
                  </div>
                  <h3
                    className="text-lg font-bold text-white mb-1"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    {pkg.name}
                  </h3>
                  <p className="text-xs text-white/60 italic">{pkg.tagline}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1">
                      <Users size={12} className="text-white/50" />
                      <span className="text-xs text-white/70">{pkg.serves}</span>
                    </div>
                    <span
                      className="text-sm font-bold"
                      style={{ color: "oklch(0.85 0.18 55)", fontFamily: "'Oswald', sans-serif" }}
                    >
                      {pkg.price}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div
                  className="flex-1 px-6 py-5 flex flex-col"
                  style={{ background: "white", border: "1px solid oklch(0.92 0.012 80)", borderTop: "none" }}
                >
                  <p className="text-xs mb-4 leading-relaxed" style={{ color: "oklch(0.52 0.03 30)" }}>
                    {pkg.description}
                  </p>

                  <p
                    className="text-xs font-bold mb-2"
                    style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}
                  >
                    WHAT'S INCLUDED:
                  </p>
                  <ul className="space-y-1.5 mb-4">
                    {pkg.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs" style={{ color: "oklch(0.42 0.03 30)" }}>
                        <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: "oklch(0.55 0.15 145)" }} />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <p
                    className="text-xs font-bold mb-2"
                    style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}
                  >
                    POPULAR ADD-ONS:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {pkg.addons.map((a) => (
                      <span
                        key={a}
                        className="text-xs px-2 py-0.5 rounded border"
                        style={{ borderColor: "oklch(0.88 0.015 80)", color: "oklch(0.52 0.03 30)" }}
                      >
                        + {a}
                      </span>
                    ))}
                  </div>

                  {/* Highlight */}
                  <div
                    className="flex items-start gap-2 px-3 py-2.5 rounded-lg mb-5"
                    style={{ background: "oklch(0.97 0.012 80)", border: "1px solid oklch(0.90 0.012 80)" }}
                  >
                    <Star size={12} className="shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.18 55)" }} />
                    <p className="text-xs italic" style={{ color: "oklch(0.45 0.03 30)" }}>{pkg.highlight}</p>
                  </div>

                  <button
                    onClick={() => handlePackageSelect(pkg.id, pkg.name)}
                    className="mt-auto w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 hover:opacity-90"
                    style={
                      isSelected
                        ? { background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }
                        : { background: "oklch(0.97 0.012 80)", color: "var(--napoli-dark)", border: "2px solid oklch(0.88 0.015 80)", fontFamily: "'Oswald', sans-serif" }
                    }
                  >
                    {isSelected ? "✓ SELECTED — FILL FORM BELOW" : "SELECT THIS PACKAGE"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Contact Form ── */}
      <section
        id="catering-form"
        className="py-16"
        style={{ background: "linear-gradient(180deg, oklch(0.97 0.012 80) 0%, white 100%)" }}
      >
        <div className="container mx-auto px-5">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <p
                className="text-xs font-bold tracking-widest mb-2"
                style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}
              >
                GET A FREE QUOTE
              </p>
              <h2
                className="text-3xl sm:text-4xl font-bold mb-3"
                style={{ fontFamily: "'Oswald', sans-serif", color: "var(--napoli-dark)" }}
              >
                Request Catering Info
              </h2>
              <p className="text-sm" style={{ color: "oklch(0.52 0.03 30)" }}>
                Fill out the form below and we'll get back to you within 24 hours at{" "}
                <a
                  href="mailto:info@napolipizzeria.net"
                  className="font-semibold hover:underline"
                  style={{ color: "var(--napoli-red)" }}
                >
                  info@napolipizzeria.net
                </a>
              </p>
            </div>

            {submitted ? (
              <div
                className="text-center px-8 py-12 rounded-2xl"
                style={{ background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid oklch(0.92 0.012 80)" }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "oklch(0.92 0.08 145)" }}
                >
                  <CheckCircle2 size={32} style={{ color: "oklch(0.40 0.15 145)" }} />
                </div>
                <h3
                  className="text-2xl font-bold mb-2"
                  style={{ fontFamily: "'Oswald', sans-serif", color: "var(--napoli-dark)" }}
                >
                  Inquiry Sent!
                </h3>
                <p className="text-sm mb-6" style={{ color: "oklch(0.52 0.03 30)" }}>
                  Thank you! We've received your catering request and will contact you within 24 hours at <strong>{form.email}</strong>.
                </p>
                <p className="text-sm font-semibold" style={{ color: "var(--napoli-dark)" }}>
                  Questions? Call us directly:
                </p>
                <a
                  href="tel:7252040379"
                  className="text-xl font-bold hover:underline"
                  style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}
                >
                  725-204-0379
                </a>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl px-6 sm:px-8 py-8"
                style={{ background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid oklch(0.92 0.012 80)" }}
              >
                {/* Selected package indicator */}
                {selectedPackage && (
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
                    style={{ background: "oklch(0.97 0.012 80)", border: "2px solid var(--napoli-red)" }}
                  >
                    <CheckCircle2 size={16} style={{ color: "var(--napoli-red)" }} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
                        PACKAGE SELECTED
                      </p>
                      <p className="text-sm font-semibold" style={{ color: "var(--napoli-dark)" }}>
                        {form.package}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedPackage(""); setForm(f => ({ ...f, package: "" })); }}
                      className="ml-auto text-xs underline"
                      style={{ color: "oklch(0.52 0.03 30)" }}
                    >
                      Change
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}>
                      FULL NAME *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="John Smith"
                      required
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{ border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--napoli-red)")}
                      onBlur={(e) => (e.target.style.borderColor = "oklch(0.88 0.015 80)")}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}>
                      PHONE NUMBER *
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="(702) 555-0000"
                      required
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{ border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--napoli-red)")}
                      onBlur={(e) => (e.target.style.borderColor = "oklch(0.88 0.015 80)")}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}>
                    EMAIL ADDRESS *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@company.com"
                    required
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                    style={{ border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--napoli-red)")}
                    onBlur={(e) => (e.target.style.borderColor = "oklch(0.88 0.015 80)")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* Event Type */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}>
                      EVENT TYPE *
                    </label>
                    <select
                      value={form.eventType}
                      onChange={(e) => setForm(f => ({ ...f, eventType: e.target.value }))}
                      required
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all bg-white"
                      style={{ border: "2px solid oklch(0.88 0.015 80)", color: form.eventType ? "var(--napoli-dark)" : "oklch(0.65 0.015 80)" }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--napoli-red)")}
                      onBlur={(e) => (e.target.style.borderColor = "oklch(0.88 0.015 80)")}
                    >
                      <option value="">Select event type</option>
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Guest Count */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}>
                      NUMBER OF GUESTS *
                    </label>
                    <select
                      value={form.guestCount}
                      onChange={(e) => setForm(f => ({ ...f, guestCount: e.target.value }))}
                      required
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all bg-white"
                      style={{ border: "2px solid oklch(0.88 0.015 80)", color: form.guestCount ? "var(--napoli-dark)" : "oklch(0.65 0.015 80)" }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--napoli-red)")}
                      onBlur={(e) => (e.target.style.borderColor = "oklch(0.88 0.015 80)")}
                    >
                      <option value="">Select guest range</option>
                      {GUEST_RANGES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* Event Date */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}>
                      EVENT DATE *
                    </label>
                    <div className="relative">
                      <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "oklch(0.65 0.015 80)" }} />
                      <input
                        type="date"
                        value={form.eventDate}
                        onChange={(e) => setForm(f => ({ ...f, eventDate: e.target.value }))}
                        required
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none transition-all bg-white"
                        style={{ border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--napoli-red)")}
                        onBlur={(e) => (e.target.style.borderColor = "oklch(0.88 0.015 80)")}
                      />
                    </div>
                  </div>

                  {/* Package (if not selected from cards) */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}>
                      PACKAGE *
                    </label>
                    <select
                      value={form.package}
                      onChange={(e) => {
                        setForm(f => ({ ...f, package: e.target.value }));
                        const pkg = PACKAGES.find(p => p.name === e.target.value);
                        setSelectedPackage(pkg?.id || "");
                      }}
                      required
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all bg-white"
                      style={{ border: "2px solid oklch(0.88 0.015 80)", color: form.package ? "var(--napoli-dark)" : "oklch(0.65 0.015 80)" }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--napoli-red)")}
                      onBlur={(e) => (e.target.style.borderColor = "oklch(0.88 0.015 80)")}
                    >
                      <option value="">Select a package</option>
                      {PACKAGES.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                      <option value="Custom / Not Sure">Custom / Not Sure</option>
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div className="mb-6">
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em" }}>
                    ADDITIONAL DETAILS (OPTIONAL)
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us about your event, dietary restrictions, special requests, venue address..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all resize-none"
                    style={{ border: "2px solid oklch(0.88 0.015 80)", color: "var(--napoli-dark)" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--napoli-red)")}
                    onBlur={(e) => (e.target.style.borderColor = "oklch(0.88 0.015 80)")}
                  />
                  <p className="text-right text-xs mt-0.5" style={{ color: "oklch(0.65 0.015 80)" }}>
                    {form.message.length}/500
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitInquiry.isPending}
                  className="w-full py-4 rounded-xl text-base font-bold transition-all active:scale-95 hover:opacity-90 flex items-center justify-center gap-2"
                  style={{
                    background: submitInquiry.isPending ? "oklch(0.88 0.015 80)" : "var(--napoli-red)",
                    color: submitInquiry.isPending ? "oklch(0.65 0.015 80)" : "white",
                    fontFamily: "'Oswald', sans-serif",
                    cursor: submitInquiry.isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {submitInquiry.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      SENDING...
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      SEND CATERING INQUIRY
                    </>
                  )}
                </button>

                <p className="text-center text-xs mt-3" style={{ color: "oklch(0.65 0.015 80)" }}>
                  We'll reply to <strong>info@napolipizzeria.net</strong> within 24 hours · No commitment required
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Why Napoli ── */}
      <section
        className="py-14"
        style={{ background: "linear-gradient(135deg, oklch(0.12 0.04 20) 0%, oklch(0.18 0.06 15) 100%)" }}
      >
        <div className="container mx-auto px-5 text-center">
          <h2
            className="text-2xl sm:text-3xl font-bold text-white mb-8"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Why Choose Napoli Pizzeria Catering?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { emoji: "🍕", title: "Authentic Italian", desc: "Real recipes, real ingredients — not frozen pizza" },
              { emoji: "⚡", title: "On-Time Delivery", desc: "We respect your schedule and your guests" },
              { emoji: "🎯", title: "Fully Customizable", desc: "30+ toppings, dietary options, any size" },
              { emoji: "💰", title: "Best Value in LV", desc: "From $10/person — no hidden fees" },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="text-3xl mb-3">{item.emoji}</div>
                <p className="text-sm font-bold text-white mb-1" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  {item.title}
                </p>
                <p className="text-xs text-white/50">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="tel:7252040379"
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all active:scale-95 hover:opacity-90"
              style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
            >
              <Phone size={16} /> CALL 725-204-0379
            </a>
            <a
              href="mailto:info@napolipizzeria.net"
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", fontFamily: "'Oswald', sans-serif" }}
            >
              <Mail size={16} /> info@napolipizzeria.net
            </a>
          </div>
        </div>
      </section>

      <NapoliFooter />
    </div>
  );
}
