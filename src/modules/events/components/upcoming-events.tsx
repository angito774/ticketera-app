"use client";

import Link from "next/link";

import { PageSection } from "@/components/page-section";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventsQuery, type PublicParams } from "@/modules/events/components/category-events";
import { EventCard } from "@/modules/events/components/event-card";
import { EVENT_CATEGORY_LABELS } from "@/modules/events/types/event.types";

export const UPCOMING_LIMIT = 8;

interface UpcomingEventsProps {
  /** Mismos objetos que page.tsx precargó en el servidor. */
  allParams: PublicParams;
  concertParams: PublicParams;
  theaterParams: PublicParams;
}

export function UpcomingEvents({ allParams, concertParams, theaterParams }: UpcomingEventsProps) {
  const tabs = [
    { value: "all", label: "Todos", params: allParams, href: "/events" },
    {
      value: "concert",
      label: EVENT_CATEGORY_LABELS.concert.plural,
      params: concertParams,
      href: "/events?category=concert",
    },
    {
      value: "theater",
      label: EVENT_CATEGORY_LABELS.theater.plural,
      params: theaterParams,
      href: "/events?category=theater",
    },
  ];

  return (
    <PageSection id="upcoming-events-title" title="Próximos eventos">
      <Tabs defaultValue="all" className="gap-6">
        <TabsList variant="line" className="h-auto flex-wrap group-data-horizontal/tabs:h-auto">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="h-11 flex-none px-4">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="flex flex-col gap-8 text-base">
            <EventsQuery params={tab.params}>
              {(events) =>
                events.length === 0 ? (
                  <p className="text-muted-foreground">No hay eventos por ahora.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {events.slice(0, UPCOMING_LIMIT).map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )
              }
            </EventsQuery>

            <div className="flex justify-center">
              <Link
                href={tab.href}
                className={buttonVariants({ variant: "outline", className: "h-11 px-6" })}
              >
                Ver todos los eventos
              </Link>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </PageSection>
  );
}
