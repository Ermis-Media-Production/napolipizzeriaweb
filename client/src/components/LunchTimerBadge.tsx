/**
 * LunchTimerBadge
 * Shows a live countdown clock for the Lunch Special (10am–3pm).
 * Turns yellow at <30 min, red/pulsing at <10 min, and shows CLOSED after 3pm.
 */
import { useLunchTimer } from "@/hooks/useLunchTimer";
import { Clock, Lock, Utensils } from "lucide-react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function LunchTimerBadge() {
  const { isOpen, hasStarted, hoursLeft, minutesLeft, secondsLeft, openingInSeconds, urgency } =
    useLunchTimer();

  // ── CLOSED (after 3pm) ──────────────────────────────────────────────────────
  if (hasStarted && !isOpen) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
        style={{
          background: "oklch(0.25 0.04 30)",
          color: "oklch(0.70 0.04 30)",
          border: "1px solid oklch(0.35 0.05 30)",
          fontFamily: "'Oswald', sans-serif",
          letterSpacing: "0.05em",
        }}
      >
        <Lock size={11} />
        CLOSED · Lunch ends at 3 PM
      </div>
    );
  }

  // ── NOT YET OPEN (before 10am) ──────────────────────────────────────────────
  if (!hasStarted) {
    const hh = Math.floor(openingInSeconds / 3600);
    const mm = Math.floor((openingInSeconds % 3600) / 60);
    const ss = openingInSeconds % 60;
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
        style={{
          background: "oklch(0.22 0.05 240)",
          color: "oklch(0.75 0.12 240)",
          border: "1px solid oklch(0.35 0.10 240)",
          fontFamily: "'Oswald', sans-serif",
          letterSpacing: "0.05em",
        }}
      >
        <Utensils size={11} />
        Opens in {hh > 0 ? `${pad(hh)}:` : ""}{pad(mm)}:{pad(ss)}
      </div>
    );
  }

  // ── OPEN — colour shifts by urgency ─────────────────────────────────────────
  const colours = {
    normal: {
      bg: "oklch(0.20 0.08 145)",
      text: "oklch(0.85 0.18 145)",
      border: "oklch(0.38 0.14 145)",
      dot: "oklch(0.65 0.22 145)",
    },
    warning: {
      bg: "oklch(0.22 0.10 75)",
      text: "oklch(0.90 0.18 75)",
      border: "oklch(0.42 0.16 75)",
      dot: "oklch(0.78 0.22 75)",
    },
    critical: {
      bg: "oklch(0.22 0.10 25)",
      text: "oklch(0.90 0.20 25)",
      border: "oklch(0.45 0.18 25)",
      dot: "oklch(0.65 0.28 25)",
    },
  };

  const c = colours[urgency];
  const isPulsing = urgency === "critical";

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold select-none"
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        fontFamily: "'Oswald', sans-serif",
        letterSpacing: "0.05em",
      }}
    >
      {/* Live dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          background: c.dot,
          animation: isPulsing ? "pulse 1s ease-in-out infinite" : "pulse 2.5s ease-in-out infinite",
        }}
      />

      <Clock size={11} className="shrink-0" />

      {urgency === "critical" ? (
        <span>HURRY! Closes in {pad(minutesLeft)}:{pad(secondsLeft)}</span>
      ) : urgency === "warning" ? (
        <span>
          Closing soon — {pad(minutesLeft)}:{pad(secondsLeft)} left
        </span>
      ) : (
        <span>
          Lunch Special · Closes at 3 PM &nbsp;
          <span style={{ opacity: 0.75 }}>
            ({hoursLeft > 0 ? `${pad(hoursLeft)}:` : ""}{pad(minutesLeft)}:{pad(secondsLeft)} left)
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * Compact inline version for use inside section headers / tab bars.
 * Same logic, smaller footprint.
 */
export function LunchTimerInline() {
  const { isOpen, hasStarted, hoursLeft, minutesLeft, secondsLeft, urgency } = useLunchTimer();

  if (hasStarted && !isOpen) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
        style={{
          background: "oklch(0.25 0.04 30)",
          color: "oklch(0.65 0.06 30)",
          fontFamily: "'Oswald', sans-serif",
        }}
      >
        <Lock size={10} /> CLOSED
      </span>
    );
  }

  if (!hasStarted) return null;

  const dotColor =
    urgency === "critical"
      ? "oklch(0.65 0.28 25)"
      : urgency === "warning"
      ? "oklch(0.78 0.22 75)"
      : "oklch(0.65 0.22 145)";

  const textColor =
    urgency === "critical"
      ? "oklch(0.90 0.20 25)"
      : urgency === "warning"
      ? "oklch(0.90 0.18 75)"
      : "oklch(0.85 0.18 145)";

  const bgColor =
    urgency === "critical"
      ? "oklch(0.22 0.10 25)"
      : urgency === "warning"
      ? "oklch(0.22 0.10 75)"
      : "oklch(0.20 0.08 145)";

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{
        background: bgColor,
        color: textColor,
        fontFamily: "'Oswald', sans-serif",
        letterSpacing: "0.04em",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: dotColor,
          animation: urgency === "critical" ? "pulse 1s ease-in-out infinite" : "pulse 2.5s ease-in-out infinite",
        }}
      />
      <Clock size={10} />
      {hoursLeft > 0 ? `${pad(hoursLeft)}:` : ""}{pad(minutesLeft)}:{pad(secondsLeft)}
    </span>
  );
}
