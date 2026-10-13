import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { EventCategory } from "@/modules/events/types/event.types";

interface CategoryPillProps {
  label: string;
  value: EventCategory;
  className?: string;
  /** Icono decorativo (lucide). */
  icon?: LucideIcon;
  /** "pill" (default) o "tile" (tarjeta de categoría). */
  variant?: "pill" | "tile";
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const VARIANT_CLASSES = {
  pill: `cursor-pointer rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground ${FOCUS_RING}`,
  tile: `flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-card px-5 py-4 text-base font-semibold text-card-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground ${FOCUS_RING}`,
} as const;

/** Acceso rápido a la búsqueda filtrada por categoría. */
export function CategoryPill({
  label,
  value,
  className,
  icon: Icon,
  variant = "pill",
}: CategoryPillProps) {
  return (
    <Link
      href={`/events?category=${value}`}
      className={cn(VARIANT_CLASSES[variant], className)}
    >
      {Icon && (
        <Icon
          aria-hidden="true"
          className={cn(variant === "tile" ? "size-6" : "size-4")}
        />
      )}
      {label}
    </Link>
  );
}
