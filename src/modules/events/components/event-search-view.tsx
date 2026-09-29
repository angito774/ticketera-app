"use client";

import { cn } from "@/lib/utils";
import { ActiveFilterChips } from "@/modules/events/components/active-filter-chips";
import { EventCard } from "@/modules/events/components/event-card";
import { EventFiltersDialog } from "@/modules/events/components/event-filters-dialog";
import { EventFiltersForm } from "@/modules/events/components/event-filters-form";
import { EventResultsEmpty } from "@/modules/events/components/event-results-empty";
import { EventSearchBar } from "@/modules/events/components/event-search-bar";
import { EventSortToggle } from "@/modules/events/components/event-sort-toggle";
import { useEventFiltersNavigation } from "@/modules/events/hooks/use-event-filters-navigation";
import {
  DEFAULT_EVENT_FILTERS,
  countActiveFilters,
  type EventFilters,
} from "@/modules/events/schemas/event-filters.schema";
import type { EventFacets } from "@/modules/events/services/events.service";
import type { Event } from "@/modules/events/types/event.types";

interface EventSearchViewProps {
  filters: EventFilters;
  results: Event[];
  facets: EventFacets;
  className?: string;
}

function countLabel(count: number): string {
  return count === 1 ? "1 evento" : `${count} eventos`;
}

/** Búsqueda de eventos: los filtros viven en la URL y los resultados llegan filtrados desde el servidor. */
export function EventSearchView({ filters: urlFilters, results, facets, className }: EventSearchViewProps) {
  const { filters, isPending, apply } = useEventFiltersNavigation(urlFilters);
  const clearAll = () => apply({ ...DEFAULT_EVENT_FILTERS, sort: filters.sort });
  const hasFilters = filters.q !== "" || countActiveFilters(filters) > 0;

  return (
    <div className={cn("flex flex-col gap-5 lg:gap-8", className)}>
      <div className="flex flex-col gap-4 lg:gap-5">
        <h1 className="text-2xl font-bold tracking-tight lg:text-4xl">Explora eventos</h1>
        <EventSearchBar
          key={filters.q}
          defaultQuery={filters.q}
          onSearch={(q) => apply({ ...filters, q })}
          className="lg:max-w-3xl"
        />

        {/* Móvil: filtros en panel, orden compacto y categorías como chips */}
        <div className="flex gap-2 lg:hidden">
          <EventFiltersDialog filters={filters} facets={facets} resultCount={results.length} onChange={apply} />
          <EventSortToggle
            variant="compact"
            value={filters.sort}
            onChange={(sort) => apply({ ...filters, sort })}
            className="flex-1 justify-center"
          />
        </div>
        <nav aria-label="Categorías" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
          {facets.categories.map((category) => {
            const isActive = filters.categories.includes(category.value);
            return (
              <button
                key={category.value}
                type="button"
                aria-pressed={isActive}
                onClick={() =>
                  apply({
                    ...filters,
                    categories: isActive
                      ? filters.categories.filter((item) => item !== category.value)
                      : [...filters.categories, category.value],
                  })
                }
                className={cn(
                  "h-9 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
                  isActive ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                )}
              >
                {category.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside aria-label="Filtros" className="hidden flex-col gap-5 rounded-3xl border bg-card p-6 lg:sticky lg:top-24 lg:flex">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Filtros</h2>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="cursor-pointer text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
          <EventFiltersForm
            filters={filters}
            facets={facets}
            groups={["categories", "cities", "month", "price"]}
            onChange={apply}
          />
        </aside>

        <section aria-label="Resultados" aria-busy={isPending} className="flex flex-col gap-4 lg:gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p aria-live="polite" className="font-semibold">
                {countLabel(results.length)}
              </p>
              <ActiveFilterChips filters={filters} facets={facets} onChange={apply} />
            </div>
            <EventSortToggle
              value={filters.sort}
              onChange={(sort) => apply({ ...filters, sort })}
              className="hidden lg:flex"
            />
          </div>

          <div className={cn("transition-opacity duration-200", isPending && "opacity-60")}>
            {results.length === 0 ? (
              <EventResultsEmpty onClear={clearAll} />
            ) : (
              <>
                <ul className="hidden grid-cols-2 gap-6 lg:grid xl:grid-cols-3">
                  {results.map((event) => (
                    <li key={event.id}>
                      <EventCard event={event} className="h-full" />
                    </li>
                  ))}
                </ul>
                <ul className="flex flex-col gap-3 lg:hidden">
                  {results.map((event) => (
                    <li key={event.id}>
                      <EventCard event={event} layout="horizontal" />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
