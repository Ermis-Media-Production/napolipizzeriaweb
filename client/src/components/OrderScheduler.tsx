/**
 * OrderScheduler
 * Shows a store-closed banner when the restaurant is closed and lets the
 * customer pick a scheduled date/time for their order.
 * Also renders the order policies note before payment.
 */

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Clock, Calendar, AlertCircle, Info, CheckCircle2, ChevronDown, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScheduleSelection =
  | { type: "asap" }
  | { type: "scheduled"; scheduledAt: number; label: string };

interface OrderSchedulerProps {
  value: ScheduleSelection | null;
  onChange: (selection: ScheduleSelection) => void;
  /** Order type — affects minimum lead time shown in slot picker */
  orderType?: "pickup" | "delivery" | "dine-in";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getLocalDate(ms: number): Date {
  return new Date(
    new Date(ms).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderScheduler({ value, onChange, orderType = "pickup" }: OrderSchedulerProps) {
  const { data: storeStatus } = trpc.orders.storeStatus.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  // Generate next 30 days starting from today (LA time)
  const availableDays = useMemo(() => {
    const days: { ms: number; label: string; isToday: boolean }[] = [];
    const now = new Date();
    const laToday = getLocalDate(now.getTime());

    for (let i = 0; i < 30; i++) {
      const d = new Date(laToday);
      d.setDate(d.getDate() + i);
      const ms = d.getTime();
      days.push({
        ms,
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatDate(ms),
        isToday: i === 0,
      });
    }
    return days;
  }, []);

  const [selectedDayMs, setSelectedDayMs] = useState<number>(availableDays[0].ms);
  const [showScheduler, setShowScheduler] = useState(false);

  // Auto-show scheduler when store is closed
  useEffect(() => {
    if (storeStatus && !storeStatus.isOpen && value === null) {
      setShowScheduler(true);
    }
  }, [storeStatus, value]);

  const { data: slotsData, isLoading: slotsLoading } = trpc.orders.availableSlots.useQuery(
    { dateMs: selectedDayMs, orderType },
    { enabled: showScheduler }
  );

  const handleAsap = () => {
    onChange({ type: "asap" });
    setShowScheduler(false);
  };

  const handleSlot = (slotMs: number, label: string) => {
    onChange({ type: "scheduled", scheduledAt: slotMs, label });
    setShowScheduler(false);
  };

  // ── Store closed banner ────────────────────────────────────────────────────
  if (storeStatus && !storeStatus.isOpen && !showScheduler && value === null) {
    const nextOpen = storeStatus.nextOpeningMs
      ? new Date(storeStatus.nextOpeningMs).toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "10:00 AM";

    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">We're currently closed</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Our hours are <strong>10:00 AM – 10:00 PM</strong> daily.
              We open at <strong>{nextOpen}</strong>. You can place your order now and schedule it for when we open!
            </p>
          </div>
        </div>
        {/* Primary CTA: schedule for next opening */}
        <Button
          size="sm"
          className="w-full bg-[#c41e3a] hover:bg-[#a01830] text-white"
          onClick={() => setShowScheduler(true)}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule for {nextOpen}
        </Button>
        {/* Secondary: catering for off-hours events */}
        <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            Need service outside our hours?{" "}
            <a
              href="/reservations"
              className="font-semibold underline hover:text-amber-900"
            >
              View our Reservations →
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Selected schedule summary ──────────────────────────────────────────────
  if (value && !showScheduler) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-green-800">
              {value.type === "asap" ? "Order ASAP" : "Scheduled Order"}
            </p>
            <p className="text-xs text-green-700">
              {value.type === "asap"
                ? "We'll start preparing as soon as possible"
                : value.label}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowScheduler(true);
          }}
          className="text-xs text-green-700 underline hover:text-green-900 shrink-0 ml-2"
        >
          Change
        </button>
      </div>
    );
  }

  // ── Scheduler panel ────────────────────────────────────────────────────────
  if (showScheduler) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#c41e3a]" />
          <p className="font-semibold text-sm text-gray-800">When do you want your order?</p>
        </div>

        {/* ASAP option — only when store is open */}
        {storeStatus?.isOpen && (
          <button
            onClick={handleAsap}
            className="w-full text-left rounded-md border-2 border-[#c41e3a] bg-red-50 px-3 py-2 hover:bg-red-100 transition-colors"
          >
            <p className="font-semibold text-[#c41e3a] text-sm">⚡ ASAP</p>
            <p className="text-xs text-gray-500">We'll start preparing right away</p>
          </button>
        )}

        {/* Business hours notice */}
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Online orders are accepted daily during restaurant hours: <strong>10:00 AM – 10:00 PM</strong>.
            For events outside these hours, please visit our{" "}
            <a href="/reservations" className="underline font-medium">Reservations</a> page.
          </p>
        </div>

        {/* Day picker */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Select a date</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {availableDays.slice(0, 14).map((day) => (
              <button
                key={day.ms}
                onClick={() => setSelectedDayMs(day.ms)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                  selectedDayMs === day.ms
                    ? "bg-[#c41e3a] text-white border-[#c41e3a]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-[#c41e3a]"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time slots */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Select a time</p>
          {slotsLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-9 rounded-md bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : !slotsData?.slots.length ? (
            <p className="text-xs text-gray-500">No slots available for this day.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {slotsData.slots.map((slot) => {
                const capacityPct = slot.pizzasBooked / slot.pizzasCapacity;
                const nearFull = capacityPct >= 0.75 && capacityPct < 1;
                return (
                  <button
                    key={slot.slotMs}
                    disabled={!slot.available}
                    onClick={() => handleSlot(slot.slotMs, `${formatDate(selectedDayMs)} at ${slot.label}`)}
                    className={`relative rounded-md px-2 py-2 text-xs font-medium border transition-colors ${
                      !slot.available
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through"
                        : nearFull
                        ? "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[#c41e3a] hover:text-[#c41e3a]"
                    }`}
                  >
                    {slot.label}
                    {!slot.available && (
                      <span className="block text-[10px] text-gray-400 leading-none mt-0.5">Full</span>
                    )}
                    {nearFull && slot.available && (
                      <span className="block text-[10px] text-amber-600 leading-none mt-0.5">Almost full</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cancel button */}
        {value !== null && (
          <button
            onClick={() => setShowScheduler(false)}
            className="text-xs text-gray-400 hover:text-gray-600 underline w-full text-center"
          >
            Keep current selection
          </button>
        )}
      </div>
    );
  }

  // ── Default: open store, no selection yet ─────────────────────────────────
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-400" />
        <p className="text-xs text-gray-600">
          {storeStatus?.isOpen ? "Order ASAP or schedule for later" : "Schedule your order"}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="text-xs h-7 border-[#c41e3a] text-[#c41e3a] hover:bg-red-50"
        onClick={() => setShowScheduler(true)}
      >
        <Calendar className="w-3 h-3 mr-1" />
        {storeStatus?.isOpen ? "Schedule" : "Pick time"}
      </Button>
    </div>
  );
}

// ── Order Policies Note (collapsible) ────────────────────────────────────────

export function OrderPoliciesNote() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 overflow-hidden">
      {/* Header row — always visible, click to expand */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-blue-100/60"
      >
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <p className="text-xs font-semibold text-blue-800">Order Policies</p>
        </div>
        <ChevronDown
          className="w-3.5 h-3.5 text-blue-500 shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Expandable body */}
      {expanded && (
        <div className="px-3 pb-3">
          <ul className="text-xs text-blue-700 space-y-1 pl-5 list-disc">
            <li>
              <strong>Cancellations &amp; modifications</strong> are accepted up to{" "}
              <strong>1 hour before</strong> your scheduled time. After that, please call us:
              <a
                href="tel:+17022912025"
                className="inline-flex items-center gap-1 ml-1.5 px-2 py-0.5 rounded-full text-white font-semibold transition-all active:scale-95"
                style={{ background: "var(--napoli-red, #c0392b)", fontSize: "0.65rem" }}
              >
                <Phone size={9} />
                Call Now · Eva AI
              </a>
            </li>
            <li>
              For any <strong>complaints or order issues</strong>, call us immediately:
              <a
                href="tel:+17022912025"
                className="inline-flex items-center gap-1 ml-1.5 px-2 py-0.5 rounded-full text-white font-semibold transition-all active:scale-95"
                style={{ background: "var(--napoli-red, #c0392b)", fontSize: "0.65rem" }}
              >
                <Phone size={9} />
                Call Now · Eva AI
              </a>
            </li>
            <li>
              Refunds for cancelled items are processed to your original payment method within{" "}
              <strong>3–5 business days</strong>.
            </li>
            <li>
              You can track and manage your order using the{" "}
              <strong>order confirmation link</strong> shown after checkout.
            </li>
            <li>
              Scheduled orders are subject to kitchen capacity. Slots showing{" "}
              <span className="text-amber-600 font-medium">&ldquo;Almost full&rdquo;</span> may
              close before your payment is processed.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
