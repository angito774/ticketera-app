"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPercent, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { DashboardOverview } from "../types/dashboard.types";
import { CategoryBarsChart } from "./category-bars-chart";
import { useDashboardFiltersContext } from "./dashboard-filters-provider";
import { KpiCard } from "./kpi-card";
import { SalesTrendChart } from "./sales-trend-chart";
import { TopEventsTable } from "./top-events-table";
import { ZoneDonutChart } from "./zone-donut-chart";

interface DashboardContentProps {
  overview: DashboardOverview;
}

const NUMBER = new Intl.NumberFormat("es-PE");

function centsToPrice(cents: number | null) {
  return cents === null ? "—" : formatPrice(cents / 100);
}

export function DashboardContent({ overview }: DashboardContentProps) {
  const { filters, isPending, setPeriod, setCity, toggleCategory, clearCategory } =
    useDashboardFiltersContext();
  const { kpis } = overview;
  const categoryLabel = overview.selectedCategoryLabel ?? filters.category;

  return (
    <div
      aria-busy={isPending}
      className={cn("flex flex-col gap-4 transition-opacity", isPending && "opacity-60")}
    >
      {filters.category && (
        <div className="flex">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearCategory}
            aria-label={`Quitar filtro de categoría ${categoryLabel}`}
            className="h-11 md:h-8"
          >
            Categoría: {categoryLabel} <span aria-hidden="true">✕</span> Quitar filtro
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Ingresos"
          value={centsToPrice(kpis.revenue.value)}
          deltaPct={kpis.revenue.deltaPct}
        />
        <KpiCard
          label="Entradas vendidas"
          value={NUMBER.format(kpis.tickets.value ?? 0)}
          deltaPct={kpis.tickets.deltaPct}
        />
        <KpiCard
          label="Ticket promedio"
          value={centsToPrice(kpis.averageTicket.value)}
          deltaPct={kpis.averageTicket.deltaPct}
        />
        <KpiCard
          label="Ocupación promedio"
          value={kpis.occupancy === null ? "—" : formatPercent(kpis.occupancy)}
        />
      </div>

      {overview.isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <h2 className="text-lg font-semibold">Sin ventas para este filtro</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              No hay ventas en los últimos {overview.periods.days} días
              {filters.category ? ` para la categoría ${categoryLabel}` : ""}. Amplía el periodo
              o quita el filtro para ver datos.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {filters.period < 90 && (
                <Button type="button" onClick={() => setPeriod(90)} className="h-11 md:h-9">
                  Ver últimos 90 días
                </Button>
              )}
              {filters.category && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearCategory}
                  className="h-11 md:h-9"
                >
                  Quitar filtro de categoría
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="min-w-0 md:col-span-8">
            <SalesTrendChart data={overview.daily} periodDays={overview.periods.days} />
          </div>
          <div className="min-w-0 md:col-span-4">
            <ZoneDonutChart data={overview.zones} />
          </div>
          <div className="min-w-0 md:col-span-5">
            <CategoryBarsChart
              data={overview.categories}
              selectedSlug={filters.category ?? null}
              onSelect={toggleCategory}
            />
          </div>
          <div className="min-w-0 md:col-span-7">
            <TopEventsTable
              rows={overview.topEvents}
              cityOptions={overview.cityOptions}
              city={filters.city}
              onCityChange={setCity}
            />
          </div>
        </div>
      )}
    </div>
  );
}
