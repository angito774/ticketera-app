import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { PRICE_RANGES, type EventFilters } from "@/modules/events/schemas/event-filters.schema";
import type { EventFacets } from "@/modules/events/services/events.service";
import { EVENT_CATEGORY_LABELS } from "@/modules/events/types/event.types";

interface ActiveFilterChipsProps {
  filters: EventFilters;
  facets: EventFacets;
  onChange: (next: EventFilters) => void;
  className?: string;
}

interface Chip {
  key: string;
  label: string;
  next: EventFilters;
}

function buildChips(filters: EventFilters, facets: EventFacets): Chip[] {
  const chips: Chip[] = [];
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, next: { ...filters, q: "" } });
  filters.categories.forEach((category) =>
    chips.push({
      key: `category-${category}`,
      label: EVENT_CATEGORY_LABELS[category].plural,
      next: { ...filters, categories: filters.categories.filter((item) => item !== category) },
    })
  );
  filters.cities.forEach((city) =>
    chips.push({
      key: `city-${city}`,
      label: city,
      next: { ...filters, cities: filters.cities.filter((item) => item !== city) },
    })
  );
  if (filters.month) {
    const label = facets.months.find((month) => month.value === filters.month)?.label ?? filters.month;
    chips.push({ key: "month", label, next: { ...filters, month: null } });
  }
  if (filters.price) {
    chips.push({ key: "price", label: PRICE_RANGES[filters.price].label, next: { ...filters, price: null } });
  }
  return chips;
}

/** Un chip por filtro activo (incluida la búsqueda de texto); cada uno quita su filtro. */
export function ActiveFilterChips({ filters, facets, onChange, className }: ActiveFilterChipsProps) {
  const chips = buildChips(filters, facets);
  if (chips.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            aria-label={`Quitar filtro ${chip.label}`}
            onClick={() => onChange(chip.next)}
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-accent pr-2.5 pl-3 text-[0.8125rem] font-medium text-accent-foreground transition-colors outline-none hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring"
          >
            {chip.label}
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
