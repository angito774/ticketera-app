import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { EventDetailHero } from "@/modules/events/components/event-detail-hero";
import { EventInfo } from "@/modules/events/components/event-info";
import { EventSection } from "@/modules/events/components/event-section";
import {
  getAllEvents,
  getEventById,
  getRelatedEvents,
} from "@/modules/events/services/events.service";
import { TicketPricesCard } from "@/modules/tickets/components/ticket-prices-card";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";

export function generateStaticParams() {
  return getAllEvents().map((event) => ({ id: event.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/events/[id]">): Promise<Metadata> {
  const { id } = await params;
  const event = getEventById(id);
  return { title: event ? `${event.title} · Ticketera` : "Ticketera" };
}

export default async function EventDetailPage({
  params,
}: PageProps<"/events/[id]">) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();

  const { zones } = getVenueLayout(event.layoutId, event.price);
  const ticketsHref = `/events/${event.id}/tickets`;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 pt-6 pb-28 md:px-6 lg:gap-14 lg:px-8 lg:pb-18">
        <EventDetailHero event={event} ticketsHref={ticketsHref} />

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
          <EventInfo event={event} />
          <TicketPricesCard
            zones={zones}
            fromPrice={event.price}
            ticketsHref={ticketsHref}
          />
        </div>

        <EventSection
          title="También te puede interesar"
          events={getRelatedEvents(event)}
        />
      </main>

      <Footer />
    </div>
  );
}
