"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { EventCard } from "@/modules/events/components/event-card";
import { EventSection } from "@/modules/events/components/event-section";
import { useEvents } from "@/modules/events/hooks/use-events";
import type { EventListParams } from "@/modules/events/schemas/event-list.schema";
import type { Event } from "@/modules/events/types/event.types";

type PublicParams = EventListParams & { scope: "public" };

export function EventsListSkeleton({ className = "h-64" }: { className?: string }) {
  return <div aria-hidden className={`w-full animate-pulse rounded-xl bg-muted ${className}`} />;
}

export function EventsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">No se pudieron cargar los eventos.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

interface EventsQueryProps {
  /** Los mismos parámetros que el servidor usó para precargar la consulta. */
  params: PublicParams;
  skeletonClassName?: string;
  children: (events: Event[]) => ReactNode;
}

/** Carga los eventos públicos con `useEvents` y resuelve los estados de carga y error. */
export function EventsQuery({ params, skeletonClassName = "h-64", children }: EventsQueryProps) {
  const { data, isPending, isError, refetch } = useEvents(params);

  if (isPending) return <EventsListSkeleton className={skeletonClassName} />;
  if (isError) return <EventsError onRetry={() => refetch()} />;

  return <>{children(data.events)}</>;
}

interface CategoryEventsProps {
  params: PublicParams;
  title: string;
  viewAllHref?: string;
}

export function CategoryEvents({ params, title, viewAllHref }: CategoryEventsProps) {
  return (
    <EventsQuery params={params}>
      {(events) => <EventSection title={title} events={events} viewAllHref={viewAllHref} />}
    </EventsQuery>
  );
}

export function AllEvents({ params }: { params: PublicParams }) {
  return (
    <EventsQuery params={params}>
      {(events) => (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </EventsQuery>
  );
}
