"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Star } from "lucide-react";

import { formatPrice, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FeaturedToggle } from "@/modules/organizer/components/featured-toggle";
import { CancelEventDialog } from "@/modules/organizer/components/cancel-event-dialog";
import { DeleteEventDialog } from "@/modules/organizer/components/delete-event-dialog";
import { canCancelEvent, canDeleteEvent } from "@/modules/organizer/services/event-lifecycle.rules";
import type { OrganizerEventRow } from "@/modules/events/types/event-list.types";

interface OrganizerEventsListProps {
  events: OrganizerEventRow[];
  canFeature: boolean;
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
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = imageUrl !== null && imageUrl !== failedUrl;
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-primary">
      {showImage ? (
        <Image src={imageUrl} alt="" fill sizes="56px" className="object-cover" onError={() => setFailedUrl(imageUrl)} />
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
  "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring lg:h-8 lg:px-2.5 lg:text-[0.8125rem]";

const DESTRUCTIVE_CLASSES = "border-destructive/40 text-destructive hover:bg-destructive/10";

type LifecycleKind = "delete" | "cancel";

interface ActionProps {
  event: OrganizerEventRow;
  onRequest: (kind: LifecycleKind, event: OrganizerEventRow) => void;
}

function Action({ event, onRequest }: ActionProps) {
  const showDelete = canDeleteEvent({ status: event.status, orderCount: event.sold });
  const showCancel = canCancelEvent({ status: event.status });
  return (
    <span className="flex flex-wrap items-center gap-2 lg:justify-end">
      {event.status === "published" && (
        <Link href={`/events/${event.slug}`} aria-label={`Ver evento ${event.title}`} className={ACTION_CLASSES}>
          Ver evento
        </Link>
      )}
      {event.status === "draft" && (
        <Link href={`/organizer/events/${event.id}/edit`} aria-label={`Editar ${event.title}`} className={ACTION_CLASSES}>
          Editar
        </Link>
      )}
      {showCancel && (
        <button
          type="button"
          aria-label={`Cancelar evento ${event.title}`}
          onClick={() => onRequest("cancel", event)}
          className={cn(ACTION_CLASSES, DESTRUCTIVE_CLASSES)}
        >
          Cancelar evento
        </button>
      )}
      {showDelete && (
        <button
          type="button"
          aria-label={`Eliminar ${event.title}`}
          onClick={() => onRequest("delete", event)}
          className={cn(ACTION_CLASSES, DESTRUCTIVE_CLASSES)}
        >
          Eliminar
        </button>
      )}
    </span>
  );
}

/** Eventos del organizador: tabla en escritorio, tarjetas en móvil. */
export function OrganizerEventsList({ events, canFeature, className }: OrganizerEventsListProps) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<{ kind: LifecycleKind; event: OrganizerEventRow } | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  function handleRequest(kind: LifecycleKind, event: OrganizerEventRow) {
    setNotice(null);
    setTarget({ kind, event });
  }

  function handleResult(text: string, tone: "ok" | "error") {
    setNotice({ text, tone });
    if (tone === "ok") void queryClient.invalidateQueries({ queryKey: ["events", "organizer"] });
  }

  function handleOpenChange(open: boolean) {
    if (!open) setTarget(null);
  }

  const dialogProps = target && {
    id: target.event.id,
    title: target.event.title,
    open: true,
    onOpenChange: handleOpenChange,
    onResult: handleResult,
  };

  return (
    <div className={className}>
      {notice && (
        <p
          role="status"
          className={cn(
            "mb-3 rounded-lg px-3 py-2 text-sm font-medium",
            notice.tone === "ok" ? "bg-success text-success-foreground" : "bg-destructive/10 text-destructive",
          )}
        >
          {notice.text}
        </p>
      )}
      {target?.kind === "delete" && dialogProps && <DeleteEventDialog {...dialogProps} />}
      {target?.kind === "cancel" && dialogProps && <CancelEventDialog {...dialogProps} />}
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
                {canFeature && event.status !== "cancelled" ? (
                  <FeaturedToggle eventId={event.id} title={event.title} featured={event.featured} />
                ) : (
                  event.featured && (
                    <span className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-muted-foreground">
                      <Star className="size-3.5 fill-current text-primary" aria-hidden="true" />
                      Destacado
                    </span>
                  )
                )}
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
                <Action event={event} onRequest={handleRequest} />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
