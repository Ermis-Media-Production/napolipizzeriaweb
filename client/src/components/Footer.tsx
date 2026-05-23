/**
 * TradeVault Footer
 * Design: Merchant Heritage — dark navy, amber accents, editorial layout
 * Sections: Buyer Guide, Support, Company, Categories
 */
import { Link } from "wouter";
import { ShieldCheck, Globe, Award, Truck, MessageSquare, BookOpen, HelpCircle, Mail, Phone, Building2, FileText, Users } from "lucide-react";
import { toast } from "sonner";

const handlePlaceholder = () => toast.info("Feature coming soon.");

export default function Footer() {
  return (
    <footer style={{ background: "oklch(0.16 0.05 248)" }}>
      {/* Trust bar */}
      <div
        className="border-b"
        style={{ borderColor: "oklch(0.22 0.06 248)", background: "oklch(0.18 0.055 248)" }}
      >
        <div className="container py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <ShieldCheck size={22} />, title: "Verified Suppliers", desc: "Every supplier is vetted and certified before listing." },
              { icon: <Award size={22} />, title: "Quality Assurance", desc: "Third-party inspection services available on request." },
              { icon: <Truck size={22} />, title: "Global Logistics", desc: "Freight forwarding and customs support included." },
              { icon: <MessageSquare size={22} />, title: "Dedicated Support", desc: "Trade specialists available Mon–Fri, 9am–6pm EST." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div
                  className="shrink-0 w-10 h-10 rounded flex items-center justify-center mt-0.5"
                  style={{ background: "oklch(0.22 0.06 248)", color: "oklch(0.75 0.16 65)" }}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="font-bold text-sm mb-0.5" style={{ color: "oklch(0.99 0.003 90)", fontFamily: "'Nunito Sans', sans-serif" }}>
                    {item.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "oklch(0.62 0.03 248)" }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer links */}
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm"
                style={{ background: "oklch(0.75 0.16 65)", color: "oklch(0.18 0.04 248)" }}
              >
                TV
              </div>
              <span
                className="text-xl font-bold"
                style={{ fontFamily: "'Libre Baskerville', serif", color: "oklch(0.99 0.003 90)" }}
              >
                Trade<span style={{ color: "oklch(0.75 0.16 65)" }}>Vault</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "oklch(0.62 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
              The trusted B2B wholesale marketplace connecting verified global suppliers with business buyers. Source smarter, buy in bulk, grow faster.
            </p>
            <div className="flex gap-2">
              {["LinkedIn", "Twitter", "YouTube"].map((s) => (
                <button
                  key={s}
                  onClick={handlePlaceholder}
                  className="px-3 py-1.5 text-xs font-semibold rounded transition-colors"
                  style={{
                    background: "oklch(0.22 0.06 248)",
                    color: "oklch(0.75 0.02 248)",
                    fontFamily: "'Nunito Sans', sans-serif",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Buyer Guide */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "oklch(0.75 0.16 65)", fontFamily: "'Nunito Sans', sans-serif" }}
            >
              Buyer Guide
            </h4>
            <ul className="space-y-2.5">
              {[
                { icon: <BookOpen size={13} />, label: "How to Source Wholesale" },
                { icon: <FileText size={13} />, label: "Understanding MOQ" },
                { icon: <ShieldCheck size={13} />, label: "Supplier Verification" },
                { icon: <Truck size={13} />, label: "Shipping & Logistics" },
                { icon: <Award size={13} />, label: "Quality Inspection Guide" },
                { icon: <Globe size={13} />, label: "Import Regulations" },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={handlePlaceholder}
                    className="flex items-center gap-2 text-sm transition-colors hover:text-white"
                    style={{ color: "oklch(0.62 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                  >
                    <span style={{ color: "oklch(0.75 0.16 65)" }}>{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "oklch(0.75 0.16 65)", fontFamily: "'Nunito Sans', sans-serif" }}
            >
              Support
            </h4>
            <ul className="space-y-2.5">
              {[
                { icon: <HelpCircle size={13} />, label: "Help Center" },
                { icon: <MessageSquare size={13} />, label: "Live Chat" },
                { icon: <Mail size={13} />, label: "support@tradevault.com" },
                { icon: <Phone size={13} />, label: "+1 (800) 555-0192" },
                { icon: <FileText size={13} />, label: "Dispute Resolution" },
                { icon: <Users size={13} />, label: "Community Forum" },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={handlePlaceholder}
                    className="flex items-center gap-2 text-sm transition-colors hover:text-white"
                    style={{ color: "oklch(0.62 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                  >
                    <span style={{ color: "oklch(0.75 0.16 65)" }}>{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "oklch(0.75 0.16 65)", fontFamily: "'Nunito Sans', sans-serif" }}
            >
              Company
            </h4>
            <ul className="space-y-2.5">
              {[
                { icon: <Building2 size={13} />, label: "About TradeVault" },
                { icon: <Users size={13} />, label: "Careers" },
                { icon: <Globe size={13} />, label: "Press & Media" },
                { icon: <FileText size={13} />, label: "Terms of Service" },
                { icon: <ShieldCheck size={13} />, label: "Privacy Policy" },
                { icon: <Award size={13} />, label: "Certifications" },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={handlePlaceholder}
                    className="flex items-center gap-2 text-sm transition-colors hover:text-white"
                    style={{ color: "oklch(0.62 0.03 248)", fontFamily: "'Nunito Sans', sans-serif" }}
                  >
                    <span style={{ color: "oklch(0.75 0.16 65)" }}>{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t"
        style={{ borderColor: "oklch(0.22 0.06 248)" }}
      >
        <div className="container flex flex-col md:flex-row items-center justify-between py-5 gap-3">
          <p className="text-xs" style={{ color: "oklch(0.50 0.02 248)", fontFamily: "'Nunito Sans', sans-serif" }}>
            © 2026 TradeVault Inc. All rights reserved. Connecting global trade with trust.
          </p>
          <div className="flex items-center gap-4">
            {["Visa", "Mastercard", "PayPal", "Wire Transfer", "LC"].map((method) => (
              <span
                key={method}
                className="text-xs px-2 py-1 rounded"
                style={{
                  background: "oklch(0.22 0.06 248)",
                  color: "oklch(0.62 0.03 248)",
                  fontFamily: "'Nunito Sans', sans-serif",
                }}
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
