import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PurchaseHeader } from "@/components/purchase-header";
import { getCurrentUser } from "@/modules/auth/services/current-user.service";
import { ConfirmationView } from "@/modules/checkout/components/confirmation-view";
import { getOrderForUser } from "@/modules/checkout/services/order-read.service";
import { getEventById } from "@/modules/events/services/events.service";

export async function generateMetadata({ params }: PageProps<"/events/[id]/confirmation">): Promise<Metadata> {
  const { id } = await params;
  const event = getEventById(id);
  return { title: event ? `Compra confirmada · ${event.title} · Ticketera` : "Ticketera" };
}

export default async function ConfirmationPage({
  params,
  searchParams,
}: PageProps<"/events/[id]/confirmation">) {
  const { id } = await params;
  const { order: orderParam } = await searchParams;
  const orderId = typeof orderParam === "string" ? orderParam : undefined;

  const user = await getCurrentUser();
  if (!user) {
    const target = `/events/${id}/confirmation${orderId ? `?order=${encodeURIComponent(orderId)}` : ""}`;
    redirect(`/sign-in?redirect_url=${encodeURIComponent(target)}`);
  }

  if (!orderId) notFound();
  const order = await getOrderForUser(user, orderId);
  if (!order || order.eventSlug !== id) notFound();

  const event = getEventById(order.eventSlug);
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
        <ConfirmationView order={order} event={event} />
      </main>
    </div>
  );
}
