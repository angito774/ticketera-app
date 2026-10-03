import { ImageIcon } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface EventPreviewCardProps {
  title: string;
  categoryLabel: string | null;
  date: string;
  time: string;
  venueName: string | null;
  city: string | null;
  coverImageUrl: string | null;
  fromPrice: number | null;
}

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function getDateBadge(date: string): { month: string; day: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  return match && month ? { month, day: match[3] } : { month: "MES", day: "--" };
}

/** Tarjeta de vista previa del evento en edición, con placeholders para lo que falta completar. */
export function EventPreviewCard({
  title,
  categoryLabel,
  date,
  time,
  venueName,
  city,
  coverImageUrl,
  fromPrice,
}: EventPreviewCardProps) {
  const badge = getDateBadge(date);
  const place = [venueName?.trim(), city?.trim()].filter(Boolean).join(" · ");

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="relative flex aspect-video items-center justify-center bg-accent text-primary">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL arbitraria del organizador
          <img src={coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <ImageIcon className="size-8" aria-hidden="true" />
        )}
        <span className="absolute top-3 left-3 flex w-12 flex-col items-center rounded-lg bg-background py-1 leading-none shadow-sm">
          <span className="text-[0.625rem] font-semibold text-primary">{badge.month}</span>
          <span className="text-lg font-bold">{badge.day}</span>
        </span>
      </div>
      <div className="flex flex-col gap-1 p-4">
        <span className="text-xs font-semibold text-primary">{categoryLabel || "Categoría"}</span>
        <span className={cn("line-clamp-2 font-semibold", !title.trim() && "text-muted-foreground")}>
          {title.trim() || "Nombre del evento"}
        </span>
        <span className="text-[0.8125rem] text-muted-foreground">{place || "Lugar · Ciudad"}</span>
        {time && <span className="text-[0.8125rem] text-muted-foreground">{time}</span>}
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
