import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PurchaseHeader } from "@/components/purchase-header";
import { formatLongDate } from "@/lib/format";
import {
  getAllEvents,
  getEventById,
} from "@/modules/events/services/events.service";
import { TicketSelection } from "@/modules/tickets/components/ticket-selection";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";

export function generateStaticParams() {
  return getAllEvents().map((event) => ({ id: event.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/events/[id]/tickets">): Promise<Metadata> {
  const { id } = await params;
  const event = getEventById(id);
  return {
    title: event ? `Entradas · ${event.title} · Ticketera` : "Ticketera",
  };
}

export default async function TicketsPage({
  params,
}: PageProps<"/events/[id]/tickets">) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();

  const eventHref = `/events/${event.id}`;

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <PurchaseHeader
        currentStep={1}
        backHref={eventHref}
        backLabel="Volver al evento"
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 pt-4 pb-28 md:px-6 lg:gap-7 lg:px-8 lg:pt-6 lg:pb-20">
        <section className="flex flex-col gap-4">
          <Link
            href={eventHref}
            className="hidden h-8 w-fit cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:flex"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al evento
          </Link>
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="relative size-13 shrink-0 overflow-hidden rounded-xl lg:size-16 lg:rounded-2xl">
              <Image
                src={event.imageUrl}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h1 className="truncate text-lg font-bold tracking-tight lg:text-[1.625rem] lg:leading-tight">
                {event.title}
              </h1>
              <p className="truncate text-sm text-muted-foreground lg:text-[0.9375rem]">
                {formatLongDate(event.date)} · {event.venue}, {event.city}
              </p>
            </div>
          </div>
        </section>

        <TicketSelection
          eventId={event.id}
          layout={getVenueLayout(event.layoutId, event.price)}
          checkoutHref={`${eventHref}/checkout`}
        />
      </main>
    </div>
  );
}
