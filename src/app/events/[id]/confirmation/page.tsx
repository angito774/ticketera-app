import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PurchaseHeader } from "@/components/purchase-header";
import { ConfirmationView } from "@/modules/checkout/components/confirmation-view";
import { getAllEvents, getEventById } from "@/modules/events/services/events.service";

export function generateStaticParams() {
  return getAllEvents().map((event) => ({ id: event.id }));
}

export async function generateMetadata({ params }: PageProps<"/events/[id]/confirmation">): Promise<Metadata> {
  const { id } = await params;
  const event = getEventById(id);
  return { title: event ? `Compra confirmada · ${event.title} · Ticketera` : "Ticketera" };
}

export default async function ConfirmationPage({ params }: PageProps<"/events/[id]/confirmation">) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <PurchaseHeader
        currentStep={3}
        backHref={`/events/${event.id}`}
        backLabel="Volver al evento"
        className="print:hidden"
      />

      <main className="flex-1 px-4 pt-8 pb-16 md:px-6 lg:px-8 lg:pt-12 lg:pb-20">
        <ConfirmationView event={event} />
      </main>
    </div>
  );
}
