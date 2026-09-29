"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";
import {
  PRICE_RANGES,
  type EventFilters,
  type FilterGroup,
  type PriceRangeKey,
} from "@/modules/events/schemas/event-filters.schema";
import type { EventFacets, FacetOption } from "@/modules/events/services/events.service";

interface EventFiltersFormProps {
  filters: EventFilters;
  facets: EventFacets;
  groups: FilterGroup[];
  onChange: (next: EventFilters) => void;
  className?: string;
}

const LEGEND_CLASSES = "mb-2 text-sm font-semibold";
const OPTION_CLASSES =
  "flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-1 text-[0.9375rem] transition-colors hover:bg-muted has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring";
const INPUT_CLASSES = "size-4.5 shrink-0 cursor-pointer accent-primary";

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

function CheckboxGroup<T extends string>({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: FacetOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className={LEGEND_CLASSES}>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={OPTION_CLASSES}>
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={() => onToggle(option.value)}
            className={INPUT_CLASSES}
          />
          <span className="flex-1">{option.label}</span>
          <span className="text-[0.8125rem] text-muted-foreground tabular-nums">{option.count}</span>
        </label>
      ))}
    </fieldset>
  );
}

function RadioGroup<T extends string>({
  legend,
  name,
  anyLabel,
  options,
  selected,
  onSelect,
}: {
  legend: string;
  name: string;
  anyLabel: string;
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (value: T | null) => void;
}) {
  return (
    <fieldset>
      <legend className={LEGEND_CLASSES}>{legend}</legend>
      {[{ value: null, label: anyLabel }, ...options].map((option) => (
        <label key={option.value ?? "any"} className={OPTION_CLASSES}>
          <input
            type="radio"
            name={name}
            checked={selected === option.value}
            onChange={() => onSelect(option.value)}
            className={INPUT_CLASSES}
          />
          <span className="flex-1">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

const PRICE_OPTIONS = (Object.keys(PRICE_RANGES) as PriceRangeKey[]).map((key) => ({
  value: key,
  label: PRICE_RANGES[key].label,
}));

/** Grupos de filtros (categoría, ciudad, mes, precio); se reutiliza en la barra lateral y en el panel móvil. */
export function EventFiltersForm({ filters, facets, groups, onChange, className }: EventFiltersFormProps) {
  // Los radios necesitan un `name` único: el formulario puede estar dos veces en la página.
  const id = useId();

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {groups.includes("categories") && (
        <CheckboxGroup
          legend="Categoría"
          options={facets.categories}
          selected={filters.categories}
          onToggle={(category) => onChange({ ...filters, categories: toggle(filters.categories, category) })}
        />
      )}
      {groups.includes("cities") && (
        <CheckboxGroup
          legend="Ciudad"
          options={facets.cities}
          selected={filters.cities}
          onToggle={(city) => onChange({ ...filters, cities: toggle(filters.cities, city) })}
        />
      )}
      {groups.includes("month") && (
        <RadioGroup
          legend="Fecha"
          name={`${id}-month`}
          anyLabel="Cualquier fecha"
          options={facets.months}
          selected={filters.month}
          onSelect={(month) => onChange({ ...filters, month })}
        />
      )}
      {groups.includes("price") && (
        <RadioGroup
          legend="Precio desde"
          name={`${id}-price`}
          anyLabel="Cualquier precio"
          options={PRICE_OPTIONS}
          selected={filters.price}
          onSelect={(price) => onChange({ ...filters, price })}
        />
      )}
    </div>
  );
}
