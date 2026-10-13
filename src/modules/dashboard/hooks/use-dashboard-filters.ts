"use client";

import { useCallback, useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  toDashboardSearchParams,
  toggleCategory as toggleCategoryFilter,
} from "../schemas/dashboard-filters.schema";
import type { DashboardFilters, DashboardPeriod } from "../types/dashboard.types";

/**
 * Navega a la misma ruta con los filtros en la URL (`push` para que "atrás" deshaga el
 * cambio, sin mover el scroll). Devuelve los filtros en forma optimista e `isPending`
 * mientras el servidor agrega los nuevos datos.
 */
export function useDashboardFilters(current: DashboardFilters) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [filters, setOptimisticFilters] = useOptimistic(current);

  const apply = useCallback(
    (next: DashboardFilters) => {
      const query = toDashboardSearchParams(next).toString();
      startTransition(() => {
        setOptimisticFilters(next);
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, setOptimisticFilters]
  );

  const setPeriod = useCallback(
    (period: DashboardPeriod) => apply({ ...filters, period }),
    [apply, filters]
  );

  const setCity = useCallback(
    (city: string | undefined) => apply({ ...filters, city }),
    [apply, filters]
  );

  const toggleCategory = useCallback(
    (slug: string) => apply(toggleCategoryFilter(filters, slug)),
    [apply, filters]
  );

  const clearCategory = useCallback(
    () => apply({ ...filters, category: undefined }),
    [apply, filters]
  );

  return { filters, isPending, setPeriod, setCity, toggleCategory, clearCategory };
}
