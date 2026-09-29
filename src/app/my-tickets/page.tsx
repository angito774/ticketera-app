import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { MyTicketsView } from "@/modules/account/components/my-tickets-view";
import { getAllEvents, getEventById } from "@/modules/events/services/events.service";
import type { EventDetail } from "@/modules/events/types/event.types";

export const metadata: Metadata = {
  title: "Mis entradas · Ticketera",
};

export default function MyTicketsPage() {
  // Los pedidos viven en el navegador: se pasan todos los eventos (10, mock) para resolverlos en el cliente.
  const events: Record<string, EventDetail> = Object.fromEntries(
    getAllEvents().map((event) => [event.id, getEventById(event.id)!])
  );

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-6 pb-16 md:px-6 lg:px-8 lg:pt-10 lg:pb-20">
        <MyTicketsView events={events} />
      </main>

      <Footer />
    </div>
  );
}
