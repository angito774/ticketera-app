import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` en el servidor y en el primer render de hidratación, `true` después.
 * Úsalo antes de mostrar datos de stores persistidos en `sessionStorage`, que el
 * servidor no conoce, para no provocar desajustes de hidratación.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
