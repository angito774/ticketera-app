"use client";

import { useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { EventFiltersForm } from "@/modules/events/components/event-filters-form";
import {
  countActiveFilters,
  type EventFilters,
  type FilterGroup,
} from "@/modules/events/schemas/event-filters.schema";
import type { EventFacets } from "@/modules/events/services/events.service";

interface EventFiltersDialogProps {
  filters: EventFilters;
  facets: EventFacets;
  resultCount: number;
  onChange: (next: EventFilters) => void;
  className?: string;
}

/** En móvil la categoría se elige con chips; el panel reúne el resto de filtros. */
const DIALOG_GROUPS: FilterGroup[] = ["cities", "month", "price"];

/** Botón "Filtros" + panel a pantalla completa (`<dialog>` nativo: foco atrapado y Escape). */
export function EventFiltersDialog({ filters, facets, resultCount, onChange, className }: EventFiltersDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeCount = countActiveFilters(filters, DIALOG_GROUPS);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={cn(
          "flex h-11 cursor-pointer items-center gap-2 rounded-xl border bg-background px-4 text-sm font-semibold transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring",
          className
        )}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filtros
        {activeCount > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            <span className="sr-only">(</span>
            {activeCount}
            <span className="sr-only"> activos)</span>
          </span>
        )}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="event-filters-title"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-background p-0 text-foreground backdrop:bg-black/40 open:flex open:flex-col"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <h2 id="event-filters-title" className="text-lg font-semibold">
            Filtros
          </h2>
          <button
            type="button"
            aria-label="Cerrar filtros"
            onClick={close}
            className="flex size-10 cursor-pointer items-center justify-center rounded-xl border outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <EventFiltersForm
          filters={filters}
          facets={facets}
          groups={DIALOG_GROUPS}
          onChange={onChange}
          className="flex-1 overflow-y-auto px-4 py-5"
        />

        <div className="flex shrink-0 gap-3 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => onChange({ ...filters, cities: [], month: null, price: null })}
            className="h-12 flex-1 cursor-pointer rounded-xl border font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={close}
            className="h-12 flex-[2] cursor-pointer rounded-xl bg-primary font-semibold text-primary-foreground outline-none hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring"
          >
            Ver {resultCount === 1 ? "1 evento" : `${resultCount} eventos`}
          </button>
        </div>
      </dialog>
    </>
  );
}
