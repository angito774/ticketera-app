"use client";

import { useCallback, useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  toSearchParams,
  type EventFilters,
} from "@/modules/events/schemas/event-filters.schema";

/**
 * Aplica filtros navegando a la misma ruta con sus query params. Usa `push` para que
 * "atrás" deshaga el último cambio y no mueve el scroll. Devuelve los filtros en forma
 * optimista: los controles reflejan el cambio al instante, mientras `isPending` indica
 * que el servidor todavía está devolviendo los nuevos resultados.
 */
export function useEventFiltersNavigation(currentFilters: EventFilters) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [filters, setOptimisticFilters] = useOptimistic(currentFilters);

  const apply = useCallback(
    (next: EventFilters) => {
      const query = toSearchParams(next).toString();
      startTransition(() => {
        setOptimisticFilters(next);
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, setOptimisticFilters]
  );

  return { filters, isPending, apply };
}
