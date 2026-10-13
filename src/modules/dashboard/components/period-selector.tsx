"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { DASHBOARD_PERIODS } from "../types/dashboard.types";
import { useDashboardFiltersContext } from "./dashboard-filters-provider";

export function PeriodSelector() {
  const { filters, isPending, setPeriod } = useDashboardFiltersContext();

  return (
    <ToggleGroup
      aria-label="Periodo"
      aria-busy={isPending}
      disabled={isPending}
      className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}
      variant="outline"
      value={[String(filters.period)]}
      onValueChange={(values) => {
        const next = Number(values[0]);
        const period = DASHBOARD_PERIODS.find((p) => p === next);
        if (period && period !== filters.period) setPeriod(period);
      }}
    >
      {DASHBOARD_PERIODS.map((period) => (
        <ToggleGroupItem
          key={period}
          value={String(period)}
          aria-label={`Últimos ${period} días`}
          className="h-11 px-3 tabular-nums md:h-9"
        >
          {period} d
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
