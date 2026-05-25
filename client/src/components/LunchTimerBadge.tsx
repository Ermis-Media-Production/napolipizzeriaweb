/**
 * LunchTimerBadge — Digital clock + countdown for Lunch Special (10am–3pm Las Vegas time)
 *
 * LunchDigitalClock  → full-width bar that goes inside the SectionHeader area
 * LunchTimerBadge    → compact pill for the info bar below the header (unchanged API)
 */
import { useLunchTimer } from "@/hooks/useLunchTimer";
import { Lock, Utensils } from "lucide-react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// ─────────────────────────────────────────────────────────────────────────────
// Digital clock segment display (7-segment style using CSS)
// ─────────────────────────────────────────────────────────────────────────────
function DigitBlock({ value, label }: { value: string; label?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex gap-0.5"
        style={{ fontFamily: "'Courier New', 'Lucida Console', monospace" }}
      >
        {value.split("").map((ch, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontSize: "1.45rem",
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "oklch(0.95 0.02 80)",
              textShadow: "0 0 8px oklch(0.85 0.18 75 / 0.7), 0 0 2px oklch(0.95 0.02 80)",
              fontFamily: "'Courier New', monospace",
            }}
          >
            {ch}
          </span>
        ))}
      </div>
      {label && (
        <span
          style={{
            fontSize: "0.5rem",
            letterSpacing: "0.12em",
            color: "oklch(0.70 0.04 80)",
            fontFamily: "'Oswald', sans-serif",
            marginTop: "1px",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function Colon({ blink }: { blink?: boolean }) {
  return (
    <span
      style={{
        fontSize: "1.3rem",
        fontWeight: 900,
        color: "oklch(0.85 0.12 75)",
        lineHeight: 1,
        marginBottom: "4px",
        animation: blink ? "blink-colon 1s step-end infinite" : undefined,
        fontFamily: "'Courier New', monospace",
      }}
    >
      :
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export: digital clock bar that sits INSIDE the section header
// ─────────────────────────────────────────────────────────────────────────────
export function LunchDigitalClock() {
  const {
    isOpen,
    hasStarted,
    hoursLeft,
    minutesLeft,
    secondsLeft,
    openingInSeconds,
    urgency,
    lvHours,
    lvMinutes,
    lvSeconds,
    lvAmPm,
  } = useLunchTimer();

  // Countdown colours
  const countdownColor =
    urgency === "critical"
      ? "oklch(0.65 0.28 25)"
      : urgency === "warning"
      ? "oklch(0.78 0.22 75)"
      : "oklch(0.55 0.22 145)";

  const countdownLabel =
    urgency === "critical"
      ? "⚡ HURRY — CLOSES SOON"
      : urgency === "warning"
      ? "⏳ CLOSING SOON"
      : "⏱ TIME LEFT TODAY";

  return (
    <div
      className="flex items-center gap-4 px-4 py-2 select-none"
      style={{
        background: "oklch(0.12 0.03 250 / 0.85)",
        backdropFilter: "blur(4px)",
        borderTop: "1px solid oklch(0.30 0.04 250 / 0.5)",
      }}
    >
      {/* ── Las Vegas local time ── */}
      <div className="flex flex-col items-start">
        <span
          style={{
            fontSize: "0.5rem",
            letterSpacing: "0.14em",
            color: "oklch(0.60 0.04 80)",
            fontFamily: "'Oswald', sans-serif",
            marginBottom: "2px",
          }}
        >
          LAS VEGAS TIME
        </span>
        <div className="flex items-end gap-1">
          <DigitBlock value={pad(lvHours)} />
          <Colon blink />
          <DigitBlock value={pad(lvMinutes)} />
          <Colon blink />
          <DigitBlock value={pad(lvSeconds)} />
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "oklch(0.75 0.08 80)",
              fontFamily: "'Oswald', sans-serif",
              marginBottom: "3px",
              marginLeft: "2px",
            }}
          >
            {lvAmPm}
          </span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ width: "1px", height: "36px", background: "oklch(0.30 0.04 250 / 0.6)" }} />

      {/* ── Status / countdown ── */}
      {hasStarted && !isOpen ? (
        /* CLOSED */
        <div className="flex items-center gap-2">
          <Lock size={14} style={{ color: "oklch(0.55 0.06 30)" }} />
          <div className="flex flex-col">
            <span
              style={{
                fontSize: "0.5rem",
                letterSpacing: "0.14em",
                color: "oklch(0.55 0.06 30)",
                fontFamily: "'Oswald', sans-serif",
              }}
            >
              LUNCH SPECIAL
            </span>
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 800,
                color: "oklch(0.55 0.06 30)",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.06em",
              }}
            >
              CLOSED · OPENS 10AM
            </span>
          </div>
        </div>
      ) : !hasStarted ? (
        /* OPENS IN */
        <div className="flex flex-col items-start">
          <span
            style={{
              fontSize: "0.5rem",
              letterSpacing: "0.14em",
              color: "oklch(0.60 0.10 240)",
              fontFamily: "'Oswald', sans-serif",
              marginBottom: "2px",
            }}
          >
            <Utensils size={9} style={{ display: "inline", marginRight: "3px" }} />
            OPENS IN
          </span>
          <div className="flex items-end gap-1">
            {Math.floor(openingInSeconds / 3600) > 0 && (
              <>
                <DigitBlock value={pad(Math.floor(openingInSeconds / 3600))} label="HR" />
                <Colon />
              </>
            )}
            <DigitBlock value={pad(Math.floor((openingInSeconds % 3600) / 60))} label="MIN" />
            <Colon blink />
            <DigitBlock value={pad(openingInSeconds % 60)} label="SEC" />
          </div>
        </div>
      ) : (
        /* COUNTDOWN */
        <div className="flex flex-col items-start">
          <span
            style={{
              fontSize: "0.5rem",
              letterSpacing: "0.14em",
              color: countdownColor,
              fontFamily: "'Oswald', sans-serif",
              marginBottom: "2px",
            }}
          >
            {countdownLabel}
          </span>
          <div className="flex items-end gap-1">
            {hoursLeft > 0 && (
              <>
                <DigitBlock value={pad(hoursLeft)} label="HR" />
                <Colon />
              </>
            )}
            <DigitBlock value={pad(minutesLeft)} label="MIN" />
            <Colon blink />
            <DigitBlock value={pad(secondsLeft)} label="SEC" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact pill badge (kept for backward compat, used in the info bar)
// ─────────────────────────────────────────────────────────────────────────────
export default function LunchTimerBadge() {
  const { isOpen, hasStarted, hoursLeft, minutesLeft, secondsLeft, openingInSeconds, urgency } =
    useLunchTimer();

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

  const colours = {
    normal: { bg: "oklch(0.20 0.08 145)", text: "oklch(0.85 0.18 145)", border: "oklch(0.38 0.14 145)", dot: "oklch(0.65 0.22 145)" },
    warning: { bg: "oklch(0.22 0.10 75)", text: "oklch(0.90 0.18 75)", border: "oklch(0.42 0.16 75)", dot: "oklch(0.78 0.22 75)" },
    critical: { bg: "oklch(0.22 0.10 25)", text: "oklch(0.90 0.20 25)", border: "oklch(0.45 0.18 25)", dot: "oklch(0.65 0.28 25)" },
  };
  const c = colours[urgency];

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
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          background: c.dot,
          animation: urgency === "critical" ? "pulse 1s ease-in-out infinite" : "pulse 2.5s ease-in-out infinite",
        }}
      />
      {urgency === "critical" ? (
        <span>HURRY! Closes in {pad(minutesLeft)}:{pad(secondsLeft)}</span>
      ) : urgency === "warning" ? (
        <span>Closing soon — {pad(minutesLeft)}:{pad(secondsLeft)} left</span>
      ) : (
        <span>
          Closes at 3 PM &nbsp;
          <span style={{ opacity: 0.75 }}>
            ({hoursLeft > 0 ? `${pad(hoursLeft)}:` : ""}{pad(minutesLeft)}:{pad(secondsLeft)} left)
          </span>
        </span>
      )}
    </div>
  );
}
