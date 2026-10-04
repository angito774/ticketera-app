import { useId } from "react";
import { ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  EVENT_SORT_LABELS,
  EVENT_SORTS,
  type EventSort,
} from "@/modules/events/schemas/event-filters.schema";

interface EventSortToggleProps {
  value: EventSort;
  onChange: (sort: EventSort) => void;
  /** "compact": un solo botón que alterna el orden (móvil). */
  variant?: "segmented" | "compact";
  className?: string;
}

export function EventSortToggle({ value, onChange, variant = "segmented", className }: EventSortToggleProps) {
  const labelId = useId();

  if (variant === "compact") {
    const next = EVENT_SORTS.find((sort) => sort !== value) ?? value;
    return (
      <button
        type="button"
        onClick={() => onChange(next)}
        aria-label={`Orden: ${EVENT_SORT_LABELS[value]}. Cambiar orden`}
        className={cn(
          "flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border bg-background px-3 text-sm whitespace-nowrap transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring",
          className
        )}
      >
        <span className="text-muted-foreground">Orden:</span>
        <strong className="font-semibold">{EVENT_SORT_LABELS[value]}</strong>
        <ArrowUpDown className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span id={labelId} className="text-sm text-muted-foreground">Ordenar por</span>
      <div role="group" aria-labelledby={labelId} className="flex rounded-xl border bg-background p-1">
        {EVENT_SORTS.map((sort) => (
          <button
            key={sort}
            type="button"
            aria-pressed={sort === value}
            onClick={() => onChange(sort)}
            className={cn(
              "h-8 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
              sort === value ? "bg-foreground text-background" : "hover:bg-muted"
            )}
          >
            {EVENT_SORT_LABELS[sort]}
          </button>
        ))}
      </div>
    </div>
  );
}
