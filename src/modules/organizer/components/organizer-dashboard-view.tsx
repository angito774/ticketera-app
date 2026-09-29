"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, CheckCircle2, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { OrganizerEventsList } from "@/modules/organizer/components/organizer-events-list";
import { SummaryKpis } from "@/modules/organizer/components/summary-kpis";
import {
  ORGANIZER_EVENTS,
  filterOrganizerEvents,
  getOrganizerSummary,
  mergeOrganizerEvents,
} from "@/modules/organizer/services/organizer.service";
import { useOrganizerStore } from "@/modules/organizer/store/organizer.store";
import type { OrganizerEventFilter } from "@/modules/organizer/types/organizer.types";

export type SaveNotice = "draft" | "published" | null;

interface OrganizerDashboardViewProps {
  notice: SaveNotice;
}

const FILTERS: { key: OrganizerEventFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "published", label: "Publicados" },
  { key: "draft", label: "Borradores" },
];

const NOTICE_TEXT: Record<Exclude<SaveNotice, null>, string> = {
  draft: "Borrador guardado.",
  published: "Evento publicado.",
};

const CREATE_CLASSES = "h-11 gap-2 rounded-xl px-4 text-[0.9375rem] font-semibold";

/** Resumen del organizador: KPIs y eventos (mock + guardados en el navegador). */
export function OrganizerDashboardView({ notice }: OrganizerDashboardViewProps) {
  const hydrated = useHydrated();
  const savedEvents = useOrganizerStore((state) => state.savedEvents);
  const [filter, setFilter] = useState<OrganizerEventFilter>("all");

  // Antes de hidratar solo se muestran los mock, igual que el HTML del servidor.
  const events = useMemo(
    () => mergeOrganizerEvents(ORGANIZER_EVENTS, hydrated ? savedEvents : []),
    [hydrated, savedEvents]
  );
  const summary = getOrganizerSummary(events);
  const visible = filterOrganizerEvents(events, filter);

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

      <SummaryKpis {...summary} />

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
                  "h-9 cursor-pointer rounded-lg px-3 text-sm transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring",
                  filter === item.key ? "bg-background font-semibold shadow-sm lg:bg-foreground lg:text-background" : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
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
          <OrganizerEventsList events={visible} />
        )}
      </section>
    </div>
  );
}
