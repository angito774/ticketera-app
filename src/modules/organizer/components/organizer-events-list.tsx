import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";

import { formatPrice, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrganizerEventRow } from "@/modules/events/types/event-list.types";

interface OrganizerEventsListProps {
  events: OrganizerEventRow[];
  className?: string;
}

const numberFormatter = new Intl.NumberFormat("es-PE");

const STATUS: Record<OrganizerEventRow["status"], { label: string; className: string }> = {
  published: { label: "Publicado", className: "bg-success text-success-foreground" },
  draft: { label: "Borrador", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
};

function StatusBadge({ status }: { status: OrganizerEventRow["status"] }) {
  const { label, className } = STATUS[status];
  return (
    <span className={cn("inline-flex h-6 w-fit items-center rounded-full px-2.5 text-xs font-semibold", className)}>
      {label}
    </span>
  );
}

function Thumbnail({ imageUrl }: { imageUrl: string | null }) {
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-primary">
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes="56px" className="object-cover" />
      ) : (
        <ImageIcon className="size-5" aria-hidden="true" />
      )}
    </span>
  );
}

function SoldProgress({ event }: { event: OrganizerEventRow }) {
  const { sold, capacity } = event;
  const percent = capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0;
  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-sm">
        <strong className="font-semibold tabular-nums">{numberFormatter.format(sold)}</strong>{" "}
        <span className="text-muted-foreground">/ {numberFormatter.format(capacity)} vendidas</span>
      </span>
      <span
        role="progressbar"
        aria-label={`Entradas vendidas de ${event.title}`}
        aria-valuemin={0}
        aria-valuemax={Math.max(capacity, 1)}
        aria-valuenow={sold}
        aria-valuetext={`${percent}%`}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </span>
    </span>
  );
}

const ACTION_CLASSES =
  "inline-flex h-11 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring lg:h-9";

function Action({ event }: { event: OrganizerEventRow }) {
  if (event.status === "published") {
    return (
      <Link href={`/events/${event.slug}`} className={ACTION_CLASSES}>
        Ver evento
      </Link>
    );
  }
  if (event.status === "draft") {
    return (
      <Link href={`/organizer/events/${event.id}/edit`} className={ACTION_CLASSES}>
        Editar
      </Link>
    );
  }
  return null;
}

/** Eventos del organizador: tabla en escritorio, tarjetas en móvil. */
export function OrganizerEventsList({ events, className }: OrganizerEventsListProps) {
  return (
    <div className={className}>
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(0,2.2fr)_110px_minmax(0,1.3fr)_120px_120px] gap-4 border-b px-5 pb-3 text-[0.8125rem] font-medium text-muted-foreground lg:grid"
      >
        <span>Evento</span>
        <span>Estado</span>
        <span>Vendidas</span>
        <span>Ingresos</span>
        <span />
      </div>
      <ul className="flex flex-col gap-3 lg:gap-0">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex flex-col gap-3 rounded-2xl border bg-card p-4 lg:grid lg:grid-cols-[minmax(0,2.2fr)_110px_minmax(0,1.3fr)_120px_120px] lg:items-center lg:gap-4 lg:rounded-none lg:border-0 lg:border-b lg:bg-transparent lg:px-5 lg:py-4"
          >
            <span className="flex min-w-0 items-center gap-3">
              <Thumbnail imageUrl={event.imageUrl} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-semibold">{event.title}</span>
                <span className="text-[0.8125rem] text-muted-foreground">
                  {formatShortDate(event.startsAt)} · {event.city}
                </span>
              </span>
              <span className="ml-auto lg:hidden">
                <StatusBadge status={event.status} />
              </span>
            </span>
            <span className="hidden lg:block">
              <StatusBadge status={event.status} />
            </span>
            <SoldProgress event={event} />
            <span className="flex items-center justify-between gap-3 lg:contents">
              <span className="text-sm font-semibold tabular-nums">
                <span className="text-muted-foreground lg:hidden">Ingresos: </span>
                {event.status === "published" ? formatPrice(event.revenue) : "—"}
              </span>
              <span className="lg:justify-self-end">
                <Action event={event} />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
