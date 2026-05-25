import { useState, useEffect } from "react";

export interface LunchTimerState {
  isOpen: boolean;          // true between 10am–3pm
  hasStarted: boolean;      // true after 10am
  hoursLeft: number;
  minutesLeft: number;
  secondsLeft: number;
  totalSecondsLeft: number;
  openingInSeconds: number; // seconds until 10am (if before 10am)
  urgency: "normal" | "warning" | "critical"; // normal >30min, warning 10–30min, critical <10min
}

function computeState(): LunchTimerState {
  const now = new Date();
  const open = new Date(now);
  open.setHours(10, 0, 0, 0);
  const close = new Date(now);
  close.setHours(15, 0, 0, 0); // 3pm

  const nowMs = now.getTime();
  const openMs = open.getTime();
  const closeMs = close.getTime();

  const hasStarted = nowMs >= openMs;
  const isOpen = nowMs >= openMs && nowMs < closeMs;

  let totalSecondsLeft = 0;
  let openingInSeconds = 0;

  if (isOpen) {
    totalSecondsLeft = Math.max(0, Math.floor((closeMs - nowMs) / 1000));
  } else if (!hasStarted) {
    openingInSeconds = Math.max(0, Math.floor((openMs - nowMs) / 1000));
  }

  const hoursLeft = Math.floor(totalSecondsLeft / 3600);
  const minutesLeft = Math.floor((totalSecondsLeft % 3600) / 60);
  const secondsLeft = totalSecondsLeft % 60;

  let urgency: "normal" | "warning" | "critical" = "normal";
  if (isOpen) {
    if (totalSecondsLeft < 600) urgency = "critical";       // < 10 min
    else if (totalSecondsLeft < 1800) urgency = "warning";  // < 30 min
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
