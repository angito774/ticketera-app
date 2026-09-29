import { useEffect, useState } from "react";

interface Countdown {
  secondsLeft: number;
  isExpired: boolean;
  /** "09:48" */
  label: string;
}

function secondsUntil(target: string | null, now: number): number {
  if (!target) return 0;
  return Math.max(0, Math.ceil((new Date(target).getTime() - now) / 1000));
}

function formatLabel(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Cuenta regresiva hasta `target` (ISO), actualizada cada segundo. Sin `target`, está expirada. */
export function useCountdown(target: string | null): Countdown {
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = secondsUntil(target, now);

  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (secondsUntil(target, current) === 0) clearInterval(interval);
    };
    // Sincroniza enseguida: `now` puede venir del montaje, anterior a `target`.
    const timeout = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [target]);

  return {
    secondsLeft,
    isExpired: secondsLeft === 0,
    label: formatLabel(secondsLeft),
  };
}
