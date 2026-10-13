import { useEffect, useRef, useState } from "react";

export const PENDING_POLL_MS = 3000;
export const PENDING_POLL_MAX = 10;

interface PendingOrderRefresh {
  /** true cuando se agotaron los intentos sin que la orden dejara de estar pendiente. */
  exhausted: boolean;
}

/** Llama a `refresh` cada `PENDING_POLL_MS`, hasta `PENDING_POLL_MAX` veces, mientras `active`. */
export function usePendingOrderRefresh(active: boolean, refresh: () => void): PendingOrderRefresh {
  const [exhausted, setExhausted] = useState(false);
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!active) return;
    let attempts = 0;
    const interval = setInterval(() => {
      refreshRef.current();
      attempts += 1;
      if (attempts >= PENDING_POLL_MAX) {
        clearInterval(interval);
        setExhausted(true);
      }
    }, PENDING_POLL_MS);
    return () => clearInterval(interval);
  }, [active]);

  return { exhausted: active && exhausted };
}
