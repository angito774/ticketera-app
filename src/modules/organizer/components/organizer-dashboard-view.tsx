"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CalendarPlus, CheckCircle2, Plus } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EventsApiError, useEvents } from "@/modules/events/hooks/use-events";
import { parseEventListParams, type EventListStatus } from "@/modules/events/schemas/event-list.schema";
import { OrganizerEventsList } from "@/modules/organizer/components/organizer-events-list";
import { SummaryKpis } from "@/modules/organizer/components/summary-kpis";

export type SaveNotice = "draft" | "published" | null;

interface OrganizerDashboardViewProps {
  notice: SaveNotice;
}

const FILTERS: { key: EventListStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "published", label: "Publicados" },
  { key: "draft", label: "Borradores" },
];

const NOTICE_TEXT: Record<Exclude<SaveNotice, null>, string> = {
  draft: "Borrador guardado.",
  published: "Evento publicado.",
};

const CREATE_CLASSES = "h-11 gap-2 rounded-xl px-4 text-[0.9375rem] font-semibold";

const BASE_PARAMS = parseEventListParams({});

function errorMessage(error: Error): string {
  if (error instanceof EventsApiError) {
    if (error.status === 401) return "Inicia sesión para ver tus eventos.";
    if (error.status === 403) return "No tienes permiso para ver estos eventos.";
  }
  return "No se pudieron cargar tus eventos. Inténtalo de nuevo.";
}

function ListSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3 lg:px-5">
      <span className="sr-only" role="status">
        Cargando eventos
      </span>
      {[0, 1, 2].map((item) => (
        <div key={item} aria-hidden="true" className="h-24 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

/** Resumen del organizador: KPIs y eventos reales desde la API. */
export function OrganizerDashboardView({ notice }: OrganizerDashboardViewProps) {
  const [filter, setFilter] = useState<EventListStatus>("all");
  const { data, error, isPending, isError, isPlaceholderData, refetch, isRefetching } = useEvents({
    ...BASE_PARAMS,
    scope: "organizer",
    status: filter,
  });

  const events = data?.events ?? [];

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight lg:text-4xl">Resumen</h1>
          <p className="text-muted-foreground">Así van las ventas de tus eventos.</p>
        </div>
        <Link href="/organizer/events/new" className={cn(buttonVariants(), CREATE_CLASSES)}>
          <Plus className="size-4.5" aria-hidden="true" />
          Crear evento
        </Link>
      </div>

      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-success px-4 py-3 text-sm font-semibold text-success-foreground">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {NOTICE_TEXT[notice]}
        </p>
      )}

      <SummaryKpis
        loading={isPending}
        sold={data?.summary.sold}
        revenue={data?.summary.revenue}
        published={data?.summary.published}
      />

      <section className="flex flex-col gap-4 rounded-3xl border-0 bg-transparent lg:border lg:bg-card lg:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 lg:px-5">
          <h2 className="text-lg font-semibold lg:text-xl">Mis eventos</h2>
          <div className="grid w-full grid-cols-3 rounded-xl bg-muted p-1 sm:w-auto lg:bg-background lg:ring-1 lg:ring-border">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
                className={cn(
                  "h-11 cursor-pointer rounded-lg px-3 text-sm transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring lg:h-9",
                  filter === item.key ? "bg-background font-semibold shadow-sm lg:bg-foreground lg:text-background" : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {isPending ? (
          <ListSkeleton />
        ) : isError ? (
          <div
            role="alert"
            className="mx-0 flex flex-col items-center gap-3 rounded-3xl border-[1.5px] border-dashed px-6 py-12 text-center lg:mx-5"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-6" aria-hidden="true" />
            </span>
            <span className="font-semibold">{errorMessage(error)}</span>
            <Button type="button" variant="outline" className="h-11 px-4" disabled={isRefetching} onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : events.length === 0 ? (
          <div className="mx-0 flex flex-col items-center gap-3 rounded-3xl border-[1.5px] border-dashed px-6 py-12 text-center lg:mx-5">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
              <CalendarPlus className="size-6" aria-hidden="true" />
            </span>
            <span className="font-semibold">No hay eventos en este filtro</span>
            <Link href="/organizer/events/new" className={cn(buttonVariants(), CREATE_CLASSES)}>
              Crear evento
            </Link>
          </div>
        ) : (
          <OrganizerEventsList
            events={events}
            className={cn("transition-opacity", isPlaceholderData && "opacity-60")}
          />
        )}
      </section>
    </div>
  );
}
