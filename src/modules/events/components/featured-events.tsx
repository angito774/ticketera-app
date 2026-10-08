"use client";

import { EventsQuery } from "@/modules/events/components/category-events";
import { EventCarousel } from "@/modules/events/components/event-carousel";
import type { EventListParams } from "@/modules/events/schemas/event-list.schema";

export function FeaturedEvents({ params }: { params: EventListParams & { scope: "public" } }) {
  return (
    <EventsQuery params={params}>
      {(events) => <EventCarousel events={events} viewAllHref="/events" />}
    </EventsQuery>
  );
}
