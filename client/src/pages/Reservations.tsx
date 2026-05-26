/**
 * Reservations.tsx
 *
 * Two-tab page:
 *  1. "Order Today"  — same-day scheduled order (cutoff 9:30 PM Las Vegas time)
 *  2. "Reservations" — future date/time reservation (next day up to 30 days out)
 *
 * Both flows collect: service type, date/time, party size (dine-in), contact info, notes.
 */
import { useState, useMemo, useEffect } from "react";
import {
  CalendarDays, Clock, Users, Phone, Mail, MapPin,
  ShoppingBag, UtensilsCrossed, Truck, CheckCircle2,
  ChevronRight, Info, AlertCircle,
} from "lucide-react";
import NapoliNavbar from "@/components/NapoliNavbar";
import NapoliFooter from "@/components/NapoliFooter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { RESTAURANT_INFO } from "@/lib/napoliData";

// ── Las Vegas timezone helpers (client-side) ──────────────────────────────────

const LV_TZ = "America/Los_Angeles";

function getLVNow(): Date {
  const now = new Date();
  const lvStr = now.toLocaleString("en-US", { timeZone: LV_TZ });
  return new Date(lvStr);
}

function toLVDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: LV_TZ });
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatTime12(time24: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Service type options ──────────────────────────────────────────────────────

const SERVICE_TYPES = [
  {
    id: "dine-in" as const,
    label: "Dine-In",
    desc: "Eat at our restaurant",
    icon: UtensilsCrossed,
    emoji: "🍽️",
  },
  {
    id: "pickup" as const,
    label: "Pick Up",
    desc: "Order ahead, skip the wait",
    icon: ShoppingBag,
    emoji: "🛍️",
  },
  {
    id: "delivery" as const,
    label: "Delivery",
    desc: "We deliver to your door",
    icon: Truck,
    emoji: "🚚",
  },
];

// ── Shared form state type ────────────────────────────────────────────────────

interface FormState {
  serviceType: "dine-in" | "pickup" | "delivery";
  scheduledDate: string;
  scheduledTime: string;
  partySize: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  notes: string;
}

function emptyForm(defaultDate: string): FormState {
  return {
    serviceType: "dine-in",
    scheduledDate: defaultDate,
    scheduledTime: "",
    partySize: "2",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    deliveryAddress: "",
    notes: "",
  };
}

// ── Shared form field components ──────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
      {children}
    </label>
  );
}

function Input({
  value, onChange, placeholder, type = "text", required, min, max,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      min={min}
      max={max}
      className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
      style={{
        borderColor: "oklch(0.85 0.015 80)",
        background: "white",
        color: "oklch(0.28 0.04 30)",
        fontFamily: "'Lato', sans-serif",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--napoli-red)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "oklch(0.85 0.015 80)")}
    />
  );
}

function Textarea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all resize-none"
      style={{
        borderColor: "oklch(0.85 0.015 80)",
        background: "white",
        color: "oklch(0.28 0.04 30)",
        fontFamily: "'Lato', sans-serif",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--napoli-red)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "oklch(0.85 0.015 80)")}
    />
  );
}

// ── Service Type Selector ─────────────────────────────────────────────────────

function ServiceTypeSelector({
  value, onChange,
}: {
  value: FormState["serviceType"];
  onChange: (v: FormState["serviceType"]) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {SERVICE_TYPES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all active:scale-[0.97]"
          style={{
            borderColor: value === s.id ? "var(--napoli-red)" : "oklch(0.88 0.015 80)",
            background: value === s.id ? "oklch(0.97 0.04 25)" : "white",
            outline: value === s.id ? "2px solid var(--napoli-red)" : "none",
          }}
        >
          <span className="text-2xl">{s.emoji}</span>
          <span className="text-xs font-bold" style={{ color: value === s.id ? "var(--napoli-red)" : "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif" }}>
            {s.label}
          </span>
          <span className="text-xs text-center leading-tight" style={{ color: "oklch(0.58 0.02 30)", fontFamily: "'Lato', sans-serif" }}>
            {s.desc}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Time Slot Picker ──────────────────────────────────────────────────────────

function TimeSlotPicker({
  date, value, onChange,
}: {
  date: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: slots, isLoading } = trpc.reservations.getAvailableSlots.useQuery(
    { date },
    { enabled: !!date, refetchInterval: 60_000 }
  );

  if (!date) {
    return (
      <div className="text-sm text-center py-4" style={{ color: "oklch(0.58 0.02 30)" }}>
        Please select a date first.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 w-20 rounded-lg animate-pulse" style={{ background: "oklch(0.92 0.01 80)" }} />
        ))}
      </div>
    );
  }

  const available = slots?.filter((s) => s.available) ?? [];

  if (available.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "oklch(0.97 0.04 25)", border: "1px solid oklch(0.88 0.04 25)" }}>
        <AlertCircle size={16} style={{ color: "var(--napoli-red)" }} />
        <span className="text-sm" style={{ color: "var(--napoli-red)", fontFamily: "'Lato', sans-serif" }}>
          No more time slots available for today. Please call us or choose a future date.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {slots?.map((slot) => (
        <button
          key={slot.value}
          type="button"
          disabled={!slot.available}
          onClick={() => slot.available && onChange(slot.value)}
          className="px-3 py-2 rounded-lg border text-sm font-semibold transition-all"
          style={{
            borderColor: value === slot.value ? "var(--napoli-red)" : slot.available ? "oklch(0.85 0.015 80)" : "oklch(0.92 0.01 80)",
            background: value === slot.value ? "var(--napoli-red)" : slot.available ? "white" : "oklch(0.95 0.005 80)",
            color: value === slot.value ? "white" : slot.available ? "oklch(0.28 0.04 30)" : "oklch(0.72 0.01 80)",
            cursor: slot.available ? "pointer" : "not-allowed",
            fontFamily: "'Oswald', sans-serif",
          }}
        >
          {slot.label}
        </button>
      ))}
    </div>
  );
}

// ── Confirmation Card ─────────────────────────────────────────────────────────

function ConfirmationCard({ type, form }: { type: "order" | "reservation"; form: FormState }) {
  const serviceLabel = SERVICE_TYPES.find((s) => s.id === form.serviceType)?.label ?? form.serviceType;
  const typeLabel = type === "order" ? "Same-Day Order" : "Reservation";

  return (
    <div
      className="rounded-2xl p-6 text-center space-y-4"
      style={{ background: "linear-gradient(135deg, oklch(0.15 0.04 30) 0%, oklch(0.20 0.06 20) 100%)" }}
    >
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "var(--napoli-green)" }}>
        <CheckCircle2 size={32} color="white" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Oswald', sans-serif" }}>
          {typeLabel} Confirmed!
        </h3>
        <p className="text-sm" style={{ color: "oklch(0.80 0.015 80)", fontFamily: "'Lato', sans-serif" }}>
          We'll call you to confirm shortly.
        </p>
      </div>
      <div
        className="rounded-xl p-4 text-left space-y-2"
        style={{ background: "oklch(0.22 0.04 30 / 0.6)" }}
      >
        <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.90 0.015 80)" }}>
          <CalendarDays size={14} style={{ color: "var(--napoli-gold)" }} />
          <span style={{ fontFamily: "'Lato', sans-serif" }}>
            {formatDateDisplay(form.scheduledDate)} at {formatTime12(form.scheduledTime)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.90 0.015 80)" }}>
          <span style={{ color: "var(--napoli-gold)" }}>
            {SERVICE_TYPES.find((s) => s.id === form.serviceType)?.emoji}
          </span>
          <span style={{ fontFamily: "'Lato', sans-serif" }}>{serviceLabel}</span>
        </div>
        {form.partySize && form.serviceType === "dine-in" && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.90 0.015 80)" }}>
            <Users size={14} style={{ color: "var(--napoli-gold)" }} />
            <span style={{ fontFamily: "'Lato', sans-serif" }}>Party of {form.partySize}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.90 0.015 80)" }}>
          <Phone size={14} style={{ color: "var(--napoli-gold)" }} />
          <span style={{ fontFamily: "'Lato', sans-serif" }}>{form.customerName} · {form.customerPhone}</span>
        </div>
        {form.deliveryAddress && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.90 0.015 80)" }}>
            <MapPin size={14} style={{ color: "var(--napoli-gold)" }} />
            <span style={{ fontFamily: "'Lato', sans-serif" }}>{form.deliveryAddress}</span>
          </div>
        )}
      </div>
      <p className="text-xs" style={{ color: "oklch(0.65 0.015 80)", fontFamily: "'Lato', sans-serif" }}>
        Questions? Call us at <a href={`tel:${RESTAURANT_INFO.phone}`} className="underline" style={{ color: "var(--napoli-gold)" }}>{RESTAURANT_INFO.phone}</a>
      </p>
    </div>
  );
}

// ── Today Order Form ──────────────────────────────────────────────────────────

function TodayOrderForm() {
  const lvNow = getLVNow();
  const todayStr = toLVDateStr(lvNow);
  const currentHour = lvNow.getHours();
  const currentMin = lvNow.getMinutes();
  const currentMinutes = currentHour * 60 + currentMin;
  const SAME_DAY_CUTOFF = 21 * 60 + 30; // 9:30 PM
  const OPEN_MINUTES = 10 * 60; // 10:00 AM

  const isClosed = currentMinutes < OPEN_MINUTES || currentMinutes >= SAME_DAY_CUTOFF;

  const [form, setForm] = useState<FormState>(() => emptyForm(todayStr));
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const createMutation = trpc.reservations.create.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.scheduledTime) { toast.error("Please select a time slot."); return; }
    if (!form.customerName.trim()) { toast.error("Please enter your name."); return; }
    if (!form.customerPhone.trim()) { toast.error("Please enter your phone number."); return; }
    if (form.serviceType === "delivery" && !form.deliveryAddress.trim()) {
      toast.error("Please enter your delivery address."); return;
    }
    createMutation.mutate({
      type: "order",
      serviceType: form.serviceType,
      scheduledDate: todayStr,
      scheduledTime: form.scheduledTime,
      partySize: form.serviceType === "dine-in" ? parseInt(form.partySize) || 1 : undefined,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail || undefined,
      deliveryAddress: form.deliveryAddress || undefined,
      notes: form.notes || undefined,
    });
  }

  if (submitted) {
    return <ConfirmationCard type="order" form={{ ...form, scheduledDate: todayStr }} />;
  }

  if (isClosed) {
    return (
      <div
        className="rounded-2xl p-6 text-center space-y-3"
        style={{ background: "oklch(0.97 0.04 25)", border: "1px solid oklch(0.88 0.04 25)" }}
      >
        <div className="text-4xl">🕙</div>
        <h3 className="text-lg font-bold" style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}>
          {currentMinutes < OPEN_MINUTES ? "We're Not Open Yet" : "Same-Day Orders Closed"}
        </h3>
        <p className="text-sm" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
          {currentMinutes < OPEN_MINUTES
            ? "We open at 10:00 AM Las Vegas time. Same-day orders are accepted from opening until 9:30 PM."
            : "Same-day orders are no longer accepted after 9:30 PM. We close at 10:00 PM."
          }
        </p>
        <p className="text-sm font-semibold" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
          Want to order for tomorrow or later? Use the <strong>Reservations</strong> tab below.
        </p>
        <a
          href={`tel:${RESTAURANT_INFO.phone}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all hover:opacity-90"
          style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Oswald', sans-serif" }}
        >
          <Phone size={15} /> Call Us: {RESTAURANT_INFO.phone}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Info banner */}
      <div
        className="flex items-start gap-2.5 p-3 rounded-lg text-xs"
        style={{ background: "oklch(0.95 0.06 145 / 0.4)", border: "1px solid oklch(0.82 0.08 145)", color: "oklch(0.30 0.10 145)" }}
      >
        <Info size={14} className="shrink-0 mt-0.5" />
        <span style={{ fontFamily: "'Lato', sans-serif" }}>
          Today's orders must be placed by <strong>9:30 PM</strong> Las Vegas time. We're open <strong>10:00 AM – 10:00 PM</strong> every day.
        </span>
      </div>

      {/* Service type */}
      <div>
        <Label>Service Type</Label>
        <ServiceTypeSelector value={form.serviceType} onChange={set("serviceType")} />
      </div>

      {/* Time slot */}
      <div>
        <Label>Pick-Up / Arrival Time</Label>
        <TimeSlotPicker date={todayStr} value={form.scheduledTime} onChange={set("scheduledTime")} />
      </div>

      {/* Party size (dine-in only) */}
      {form.serviceType === "dine-in" && (
        <div>
          <Label>Number of Guests</Label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => set("partySize")(String(Math.max(1, parseInt(form.partySize) - 1)))}
              className="w-9 h-9 rounded-full border flex items-center justify-center text-lg font-bold transition-all hover:bg-red-50"
              style={{ borderColor: "oklch(0.85 0.015 80)", color: "var(--napoli-red)" }}>−</button>
            <span className="text-xl font-bold w-8 text-center" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif" }}>{form.partySize}</span>
            <button type="button" onClick={() => set("partySize")(String(Math.min(50, parseInt(form.partySize) + 1)))}
              className="w-9 h-9 rounded-full border flex items-center justify-center text-lg font-bold transition-all hover:bg-red-50"
              style={{ borderColor: "oklch(0.85 0.015 80)", color: "var(--napoli-red)" }}>+</button>
            <span className="text-sm" style={{ color: "oklch(0.58 0.02 30)", fontFamily: "'Lato', sans-serif" }}>guests</span>
          </div>
        </div>
      )}

      {/* Delivery address */}
      {form.serviceType === "delivery" && (
        <div>
          <Label>Delivery Address *</Label>
          <Input value={form.deliveryAddress} onChange={set("deliveryAddress")} placeholder="Street address, North Las Vegas, NV" required />
        </div>
      )}

      {/* Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Your Name *</Label>
          <Input value={form.customerName} onChange={set("customerName")} placeholder="Full name" required />
        </div>
        <div>
          <Label>Phone Number *</Label>
          <Input value={form.customerPhone} onChange={set("customerPhone")} placeholder="(702) 000-0000" type="tel" required />
        </div>
      </div>
      <div>
        <Label>Email (optional)</Label>
        <Input value={form.customerEmail} onChange={set("customerEmail")} placeholder="your@email.com" type="email" />
      </div>

      {/* Notes */}
      <div>
        <Label>Special Requests / Notes</Label>
        <Textarea value={form.notes} onChange={set("notes")} placeholder="Allergies, special instructions, anything else you'd like us to know..." />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={createMutation.isPending}
        className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        style={{ background: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}
      >
        {createMutation.isPending ? "Placing Order…" : "Place Order →"}
      </button>
    </form>
  );
}

// ── Future Reservation Form ───────────────────────────────────────────────────

function FutureReservationForm() {
  const lvNow = getLVNow();
  const todayStr = toLVDateStr(lvNow);

  // Min date = tomorrow
  const tomorrow = new Date(lvNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = toLVDateStr(tomorrow);

  // Max date = 30 days from now
  const maxDateObj = new Date(lvNow);
  maxDateObj.setDate(maxDateObj.getDate() + 30);
  const maxDate = toLVDateStr(maxDateObj);

  const [form, setForm] = useState<FormState>(() => emptyForm(minDate));
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const createMutation = trpc.reservations.create.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.scheduledDate) { toast.error("Please select a date."); return; }
    if (!form.scheduledTime) { toast.error("Please select a time slot."); return; }
    if (!form.customerName.trim()) { toast.error("Please enter your name."); return; }
    if (!form.customerPhone.trim()) { toast.error("Please enter your phone number."); return; }
    if (form.serviceType === "delivery" && !form.deliveryAddress.trim()) {
      toast.error("Please enter your delivery address."); return;
    }
    createMutation.mutate({
      type: "reservation",
      serviceType: form.serviceType,
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime,
      partySize: form.serviceType === "dine-in" ? parseInt(form.partySize) || 1 : undefined,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail || undefined,
      deliveryAddress: form.deliveryAddress || undefined,
      notes: form.notes || undefined,
    });
  }

  if (submitted) {
    return <ConfirmationCard type="reservation" form={form} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Info banner */}
      <div
        className="flex items-start gap-2.5 p-3 rounded-lg text-xs"
        style={{ background: "oklch(0.95 0.06 260 / 0.3)", border: "1px solid oklch(0.82 0.08 260)", color: "oklch(0.30 0.10 260)" }}
      >
        <Info size={14} className="shrink-0 mt-0.5" />
        <span style={{ fontFamily: "'Lato', sans-serif" }}>
          Reserve a table or schedule a future order up to <strong>30 days in advance</strong>. We'll call to confirm your reservation.
          Hours: <strong>10:00 AM – 10:00 PM</strong> every day · 3131 W. Craig Rd., North Las Vegas, NV 89032
        </span>
      </div>

      {/* Service type */}
      <div>
        <Label>Service Type</Label>
        <ServiceTypeSelector value={form.serviceType} onChange={set("serviceType")} />
      </div>

      {/* Date picker */}
      <div>
        <Label>Date *</Label>
        <div className="relative">
          <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "oklch(0.60 0.02 30)" }} />
          <input
            type="date"
            value={form.scheduledDate}
            onChange={(e) => {
              set("scheduledDate")(e.target.value);
              set("scheduledTime")(""); // reset time when date changes
            }}
            min={minDate}
            max={maxDate}
            required
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
            style={{
              borderColor: "oklch(0.85 0.015 80)",
              background: "white",
              color: "oklch(0.28 0.04 30)",
              fontFamily: "'Lato', sans-serif",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--napoli-red)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "oklch(0.85 0.015 80)")}
          />
        </div>
        {form.scheduledDate && (
          <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 30)", fontFamily: "'Lato', sans-serif" }}>
            {formatDateDisplay(form.scheduledDate)}
          </p>
        )}
      </div>

      {/* Time slot */}
      <div>
        <Label>Preferred Time *</Label>
        <TimeSlotPicker date={form.scheduledDate} value={form.scheduledTime} onChange={set("scheduledTime")} />
      </div>

      {/* Party size (dine-in) */}
      {form.serviceType === "dine-in" && (
        <div>
          <Label>Number of Guests</Label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => set("partySize")(String(Math.max(1, parseInt(form.partySize) - 1)))}
              className="w-9 h-9 rounded-full border flex items-center justify-center text-lg font-bold transition-all hover:bg-red-50"
              style={{ borderColor: "oklch(0.85 0.015 80)", color: "var(--napoli-red)" }}>−</button>
            <span className="text-xl font-bold w-8 text-center" style={{ color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif" }}>{form.partySize}</span>
            <button type="button" onClick={() => set("partySize")(String(Math.min(500, parseInt(form.partySize) + 1)))}
              className="w-9 h-9 rounded-full border flex items-center justify-center text-lg font-bold transition-all hover:bg-red-50"
              style={{ borderColor: "oklch(0.85 0.015 80)", color: "var(--napoli-red)" }}>+</button>
            <span className="text-sm" style={{ color: "oklch(0.58 0.02 30)", fontFamily: "'Lato', sans-serif" }}>guests</span>
          </div>
          <p className="text-xs mt-1" style={{ color: "oklch(0.58 0.02 30)", fontFamily: "'Lato', sans-serif" }}>
            For large groups (50+), we recommend calling us to ensure availability.
          </p>
        </div>
      )}

      {/* Delivery address */}
      {form.serviceType === "delivery" && (
        <div>
          <Label>Delivery Address *</Label>
          <Input value={form.deliveryAddress} onChange={set("deliveryAddress")} placeholder="Street address, North Las Vegas, NV" required />
        </div>
      )}

      {/* Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Your Name *</Label>
          <Input value={form.customerName} onChange={set("customerName")} placeholder="Full name" required />
        </div>
        <div>
          <Label>Phone Number *</Label>
          <Input value={form.customerPhone} onChange={set("customerPhone")} placeholder="(702) 000-0000" type="tel" required />
        </div>
      </div>
      <div>
        <Label>Email (optional)</Label>
        <Input value={form.customerEmail} onChange={set("customerEmail")} placeholder="your@email.com" type="email" />
      </div>

      {/* Notes */}
      <div>
        <Label>Special Requests / Notes</Label>
        <Textarea
          value={form.notes}
          onChange={set("notes")}
          placeholder="Occasion (birthday, anniversary…), dietary restrictions, seating preferences, anything else…"
          rows={4}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={createMutation.isPending}
        className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        style={{ background: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}
      >
        {createMutation.isPending ? "Submitting…" : "Submit Reservation →"}
      </button>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Reservations() {
  const [activeTab, setActiveTab] = useState<"today" | "future">("today");

  // Auto-switch to future tab if it's after 9:30 PM Las Vegas time
  useEffect(() => {
    const lvNow = getLVNow();
    const currentMinutes = lvNow.getHours() * 60 + lvNow.getMinutes();
    const SAME_DAY_CUTOFF = 21 * 60 + 30;
    const OPEN_MINUTES = 10 * 60;
    if (currentMinutes >= SAME_DAY_CUTOFF || currentMinutes < OPEN_MINUTES) {
      setActiveTab("future");
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.97 0.010 80)" }}>
      <NapoliNavbar />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section
        className="relative py-16 md:py-20 overflow-hidden"
        style={{ background: "linear-gradient(135deg, oklch(0.14 0.04 30) 0%, oklch(0.18 0.06 20) 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5" style={{ background: "var(--napoli-red)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5" style={{ background: "var(--napoli-gold)", transform: "translate(-30%, 30%)" }} />

        <div className="relative container text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
            style={{ background: "oklch(0.22 0.04 30)", color: "var(--napoli-gold)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.15em" }}>
            <CalendarDays size={13} /> RESERVATIONS & ORDERS
          </div>
          <h1 className="napoli-display text-4xl md:text-5xl mb-3" style={{ color: "white" }}>
            Reserve Your Table
          </h1>
          <p className="text-base max-w-lg mx-auto" style={{ color: "oklch(0.75 0.015 80)", fontFamily: "'Lato', sans-serif" }}>
            Order for today or plan ahead — dine-in, pick-up, or delivery. We're open every day from 10:00 AM to 10:00 PM.
          </p>

          {/* Quick info pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ background: "oklch(0.20 0.04 30)", color: "oklch(0.80 0.015 80)", fontFamily: "'Lato', sans-serif" }}>
              <Clock size={12} style={{ color: "var(--napoli-gold)" }} /> 10:00 AM – 10:00 PM Daily
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ background: "oklch(0.20 0.04 30)", color: "oklch(0.80 0.015 80)", fontFamily: "'Lato', sans-serif" }}>
              <MapPin size={12} style={{ color: "var(--napoli-gold)" }} /> 3131 W. Craig Rd., North Las Vegas, NV
            </div>
            <a
              href={`tel:${RESTAURANT_INFO.phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-opacity hover:opacity-80"
              style={{ background: "var(--napoli-red)", color: "white", fontFamily: "'Lato', sans-serif" }}
            >
              <Phone size={12} /> {RESTAURANT_INFO.phone}
            </a>
          </div>
        </div>
      </section>

      {/* ── Tabs + Form ───────────────────────────────────────── */}
      <section className="flex-1 py-10 md:py-14">
        <div className="container max-w-2xl mx-auto px-4">

          {/* Tab switcher */}
          <div
            className="flex rounded-xl p-1 mb-8"
            style={{ background: "oklch(0.92 0.015 80)" }}
          >
            {[
              { id: "today" as const, label: "Order Today", emoji: "🍕", desc: "Same-day, by 9:30 PM" },
              { id: "future" as const, label: "Reservations", emoji: "📅", desc: "Tomorrow & beyond" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-3 rounded-lg transition-all"
                style={{
                  background: activeTab === tab.id ? "white" : "transparent",
                  boxShadow: activeTab === tab.id ? "0 1px 4px oklch(0.50 0.02 30 / 0.15)" : "none",
                }}
              >
                <span className="text-xl">{tab.emoji}</span>
                <span
                  className="text-sm font-bold"
                  style={{
                    color: activeTab === tab.id ? "var(--napoli-red)" : "oklch(0.52 0.02 30)",
                    fontFamily: "'Oswald', sans-serif",
                  }}
                >
                  {tab.label}
                </span>
                <span className="text-xs" style={{ color: "oklch(0.60 0.02 30)", fontFamily: "'Lato', sans-serif" }}>
                  {tab.desc}
                </span>
              </button>
            ))}
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl p-6 md:p-8 shadow-sm"
            style={{ background: "white", border: "1px solid oklch(0.90 0.012 80)" }}
          >
            {activeTab === "today" ? <TodayOrderForm /> : <FutureReservationForm />}
          </div>

          {/* Bottom CTA */}
          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: "oklch(0.55 0.02 30)", fontFamily: "'Lato', sans-serif" }}>
              Prefer to call? We're happy to take your reservation by phone.
            </p>
            <a
              href={`tel:${RESTAURANT_INFO.phone}`}
              className="inline-flex items-center gap-2 mt-2 text-sm font-bold transition-opacity hover:opacity-70"
              style={{ color: "var(--napoli-red)", fontFamily: "'Oswald', sans-serif" }}
            >
              <Phone size={14} /> {RESTAURANT_INFO.phone} <ChevronRight size={14} />
            </a>
          </div>
        </div>
      </section>

      <NapoliFooter />
    </div>
  );
}
