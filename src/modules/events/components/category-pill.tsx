"use client";

import { cn } from "@/lib/utils";
import type { EventCategory } from "@/modules/events/types/event.types";

interface CategoryPillProps {
  label: string;
  value: EventCategory;
  active?: boolean;
  onSelect?: (value: EventCategory) => void;
}

export function CategoryPill({
  label,
  value,
  active = false,
  onSelect,
}: CategoryPillProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect?.(value)}
      className={cn(
        "cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
