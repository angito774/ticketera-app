import Link from "next/link";

import { cn } from "@/lib/utils";
import type { EventCategory } from "@/modules/events/types/event.types";

interface CategoryPillProps {
  label: string;
  value: EventCategory;
  className?: string;
}

/** Acceso rápido a la búsqueda filtrada por categoría. */
export function CategoryPill({ label, value, className }: CategoryPillProps) {
  return (
    <Link
      href={`/events?category=${value}`}
      className={cn(
        "cursor-pointer rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {label}
    </Link>
  );
}
