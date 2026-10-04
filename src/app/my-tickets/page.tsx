import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { MyTicketsView } from "@/modules/account/components/my-tickets-view";
import { getCurrentUser } from "@/modules/auth/services/current-user.service";
import { listOrdersForUser } from "@/modules/checkout/services/order-read.service";
import { getEventById } from "@/modules/events/services/events.service";
import type { EventDetail } from "@/modules/events/types/event.types";

export const metadata: Metadata = {
  title: "Mis entradas · Ticketera",
};

export default async function MyTicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?redirect_url=%2Fmy-tickets");

  const orders = await listOrdersForUser(user);
  const events: Record<string, EventDetail> = {};
  for (const { eventSlug } of orders) {
    const event = getEventById(eventSlug);
    if (event) events[eventSlug] = event;
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-6 pb-16 md:px-6 lg:px-8 lg:pt-10 lg:pb-20">
        <MyTicketsView orders={orders} events={events} />
      </main>

      <Footer />
    </div>
  );
}
