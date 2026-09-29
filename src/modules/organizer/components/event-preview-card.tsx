import { ImageIcon } from "lucide-react";

import { formatDateBadge, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EVENT_CATEGORY_LABELS, type EventCategory } from "@/modules/events/types/event.types";

interface EventPreviewCardProps {
  title: string;
  category: EventCategory | "";
  startsAt: string | null;
  venue: string;
  city: string;
  imageUrl: string | null;
  fromPrice: number | null;
  className?: string;
}

/** Tarjeta de vista previa del evento en edición, con placeholders para lo que falta completar. */
export function EventPreviewCard({
  title,
  category,
  startsAt,
  venue,
  city,
  imageUrl,
  fromPrice,
  className,
}: EventPreviewCardProps) {
  const badge = startsAt ? formatDateBadge(startsAt) : { month: "MES", day: "--" };
  const place = [venue.trim(), city.trim()].filter(Boolean).join(" · ");

  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-sm", className)}>
      <div className="relative flex aspect-video items-center justify-center bg-accent text-primary">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- puede ser un blob local
          <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <ImageIcon className="size-8" aria-hidden="true" />
        )}
        <span className="absolute top-3 left-3 flex w-12 flex-col items-center rounded-lg bg-background py-1 leading-none shadow-sm">
          <span className="text-[0.625rem] font-semibold text-primary">{badge.month}</span>
          <span className="text-lg font-bold">{badge.day}</span>
        </span>
      </div>
      <div className="flex flex-col gap-1 p-4">
        <span className="text-xs font-semibold text-primary">
          {category ? EVENT_CATEGORY_LABELS[category].singular : "Categoría"}
        </span>
        <span className={cn("line-clamp-2 font-semibold", !title.trim() && "text-muted-foreground")}>
          {title.trim() || "Nombre del evento"}
        </span>
        <span className="text-[0.8125rem] text-muted-foreground">{place || "Lugar · Ciudad"}</span>
        <span className="mt-2 flex items-center justify-between border-t pt-3 text-sm">
          <span>
            <span className="text-muted-foreground">Desde </span>
            <strong className="font-semibold">{fromPrice ? formatPrice(fromPrice) : "S/ —"}</strong>
          </span>
          <span className="rounded-lg bg-cta px-3 py-1.5 text-xs font-semibold text-cta-foreground">Ver entradas</span>
        </span>
      </div>
    </div>
  );
}
