"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parse } from "date-fns";
import { AlertCircle, CalendarPlus, CheckCircle2, Plus } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EventsApiError, useEvents } from "@/modules/events/hooks/use-events";
import { parseEventListParams, type EventListStatus } from "@/modules/events/schemas/event-list.schema";
import { OrganizerEventsList } from "@/modules/organizer/components/organizer-events-list";
import { SummaryKpis } from "@/modules/organizer/components/summary-kpis";
import { ConnectStatusCard } from "@/modules/payments/components/connect-status-card";
import type { OrganizationConnectView } from "@/modules/payments/types/connect.types";

export type SaveNotice = "draft" | "published" | null;

interface OrganizerDashboardViewProps {
  notice: SaveNotice;
  canFeature: boolean;
  connectViews: OrganizationConnectView[];
  connectNotice: "return" | "refresh" | null;
}

const CONNECT_NOTICE_TEXT = {
  return: "Revisamos el estado de tu cuenta de pagos.",
  refresh: "El enlace de configuración expiró. Genera uno nuevo con el botón de tu cuenta de pagos.",
};

const FILTERS: { key: EventListStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "published", label: "Publicados" },
  { key: "draft", label: "Borradores" },
  { key: "cancelled", label: "Cancelados" },
];

const NOTICE_TEXT: Record<Exclude<SaveNotice, null>, string> = {
  draft: "Borrador guardado.",
  published: "Evento publicado.",
};

const CREATE_CLASSES = "h-11 gap-2 md:h-10 rounded-xl px-4 text-[0.9375rem] font-semibold";

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
export function OrganizerDashboardView({ notice, canFeature, connectViews, connectNotice }: OrganizerDashboardViewProps) {
  const [filter, setFilter] = useState<EventListStatus>("all");
  const { data, error, isPending, isError, isPlaceholderData, refetch, isRefetching } = useEvents({
    ...BASE_PARAMS,
    scope: "organizer",
    status: filter,
  });

  const [name, setName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const events = useMemo(() => {
    const term = name.trim().toLowerCase();
    return (data?.events ?? []).filter((event) => {
      const day = new Date(event.startsAt).toLocaleDateString("en-CA");
      return (
        (!term || event.title.toLowerCase().includes(term)) &&
        (!dateFrom || day >= dateFrom) &&
        (!dateTo || day <= dateTo)
      );
    });
  }, [data, name, dateFrom, dateTo]);
  const hasFilters = name.trim() !== "" || dateFrom !== "" || dateTo !== "" || filter !== "all";

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight lg:text-4xl">Eventos</h1>
          <p className="text-muted-foreground">Así van las ventas de tus eventos.</p>
        </div>
      </div>

      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-success px-4 py-3 text-sm font-semibold text-success-foreground">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {NOTICE_TEXT[notice]}
        </p>
      )}

      {connectViews.length > 0 && (
        <section aria-labelledby="connect-heading" className="flex flex-col gap-3">
          <h2 id="connect-heading" className="text-lg font-semibold lg:text-xl">
            Cuenta de pagos
          </h2>
          {connectNotice && (
            <p role="status" className="text-sm text-muted-foreground">
              {CONNECT_NOTICE_TEXT[connectNotice]}
            </p>
          )}
          {connectViews.map((view) => (
            <ConnectStatusCard key={view.organizationId} view={view} />
          ))}
        </section>
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
          <Link href="/organizer/events/new" className={cn(buttonVariants(), CREATE_CLASSES)}>
            <Plus className="size-4.5" aria-hidden="true" />
            Crear evento
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:px-5">
          <Input
            type="search"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Buscar por nombre"
            aria-label="Buscar por nombre"
            className="h-11 sm:max-w-64 md:h-10"
          />
          <DatePicker
            value={dateFrom}
            onChange={(value) => {
              setDateFrom(value);
              if (value && dateTo && value > dateTo) setDateTo("");
            }}
            placeholder="Desde"
            aria-label="Fecha desde"
            className="sm:w-44"
          />
          <DatePicker
            value={dateTo}
            onChange={setDateTo}
            placeholder="Hasta"
            aria-label="Fecha hasta"
            fromDate={dateFrom ? parse(dateFrom, "yyyy-MM-dd", new Date()) : undefined}
            className="sm:w-44"
          />
          <div className="grid w-full grid-cols-2 sm:grid-cols-4 rounded-xl bg-muted p-1 sm:w-auto lg:bg-background lg:ring-1 lg:ring-border">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
                className={cn(
                  "h-9 cursor-pointer rounded-lg px-3 text-sm md:h-8 transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring",
                  filter === item.key ? "bg-background font-semibold shadow-sm lg:bg-foreground lg:text-background" : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              className="h-11 px-3 md:h-10"
              onClick={() => {
                setName("");
                setDateFrom("");
                setDateTo("");
                setFilter("all");
              }}
            >
              Limpiar
            </Button>
          )}
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
            <span className="font-semibold">No hay eventos con estos filtros</span>
          </div>
        ) : (
          <OrganizerEventsList
            events={events}
            canFeature={canFeature}
            className={cn("transition-opacity", isPlaceholderData && "opacity-60")}
          />
        )}
      </section>
    </div>
  );
}
