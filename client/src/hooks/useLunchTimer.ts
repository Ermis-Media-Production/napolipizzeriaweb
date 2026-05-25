import { useState, useEffect } from "react";

export interface LunchTimerState {
  isOpen: boolean;           // true between 10am–3pm Las Vegas time
  hasStarted: boolean;       // true after 10am Las Vegas time
  hoursLeft: number;
  minutesLeft: number;
  secondsLeft: number;
  totalSecondsLeft: number;
  openingInSeconds: number;  // seconds until 10am (if before 10am)
  urgency: "normal" | "warning" | "critical";
  // Las Vegas local time parts (for digital clock display)
  lvHours: number;
  lvMinutes: number;
  lvSeconds: number;
  lvAmPm: "AM" | "PM";
}

/** Get current time broken down in Las Vegas (America/Los_Angeles) timezone */
function getLasVegasTimeParts(): { h: number; m: number; s: number; ampm: "AM" | "PM" } {
  const now = new Date();
  // Use Intl to extract Las Vegas local time parts
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const h = parseInt(get("hour"), 10);
  const m = parseInt(get("minute"), 10);
  const s = parseInt(get("second"), 10);
  const ampm = (get("dayPeriod").toUpperCase() === "AM" ? "AM" : "PM") as "AM" | "PM";
  return { h, m, s, ampm };
}

/** Convert Las Vegas 12h parts to 24h hour */
function to24h(h: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

function computeState(): LunchTimerState {
  const { h, m, s, ampm } = getLasVegasTimeParts();
  const hour24 = to24h(h, ampm);

  // Total seconds elapsed in the day (Las Vegas time)
  const nowSecs = hour24 * 3600 + m * 60 + s;
  const openSecs = 10 * 3600;   // 10:00 AM
  const closeSecs = 15 * 3600;  // 3:00 PM

  const hasStarted = nowSecs >= openSecs;
  const isOpen = nowSecs >= openSecs && nowSecs < closeSecs;

  let totalSecondsLeft = 0;
  let openingInSeconds = 0;

  if (isOpen) {
    totalSecondsLeft = Math.max(0, closeSecs - nowSecs);
  } else if (!hasStarted) {
    openingInSeconds = Math.max(0, openSecs - nowSecs);
  }

  const hoursLeft = Math.floor(totalSecondsLeft / 3600);
  const minutesLeft = Math.floor((totalSecondsLeft % 3600) / 60);
  const secondsLeft = totalSecondsLeft % 60;

  let urgency: "normal" | "warning" | "critical" = "normal";
  if (isOpen) {
    if (totalSecondsLeft < 600) urgency = "critical";
    else if (totalSecondsLeft < 1800) urgency = "warning";
  }

  return {
    isOpen,
    hasStarted,
    hoursLeft,
    minutesLeft,
    secondsLeft,
    totalSecondsLeft,
    openingInSeconds,
    urgency,
    lvHours: h,
    lvMinutes: m,
    lvSeconds: s,
    lvAmPm: ampm,
  };
}

export function useLunchTimer(): LunchTimerState {
  const [state, setState] = useState<LunchTimerState>(computeState);

  useEffect(() => {
    const interval = setInterval(() => {
      setState(computeState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return state;
}
