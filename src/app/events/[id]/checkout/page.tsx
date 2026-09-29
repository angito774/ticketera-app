import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PurchaseHeader } from "@/components/purchase-header";
import { CheckoutView } from "@/modules/checkout/components/checkout-view";
import { getAllEvents, getEventById } from "@/modules/events/services/events.service";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";

export function generateStaticParams() {
  return getAllEvents().map((event) => ({ id: event.id }));
}

export async function generateMetadata({ params }: PageProps<"/events/[id]/checkout">): Promise<Metadata> {
  const { id } = await params;
  const event = getEventById(id);
  return { title: event ? `Datos y pago · ${event.title} · Ticketera` : "Ticketera" };
}

export default async function CheckoutPage({ params }: PageProps<"/events/[id]/checkout">) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <PurchaseHeader currentStep={2} backHref={`/events/${event.id}/tickets`} backLabel="Volver a entradas" />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-4 pb-36 md:px-6 lg:px-8 lg:pt-8 lg:pb-20">
        <CheckoutView event={event} layout={getVenueLayout(event.layoutId, event.price)} />
      </main>
    </div>
  );
}
