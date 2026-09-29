import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { EventSearchView } from "@/modules/events/components/event-search-view";
import { parseEventFilters } from "@/modules/events/schemas/event-filters.schema";
import { getEventFacets, searchEvents } from "@/modules/events/services/events.service";

export const metadata: Metadata = {
  title: "Explora eventos · Ticketera",
};

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const filters = parseEventFilters(await searchParams);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-6 pb-16 md:px-6 lg:px-8 lg:pt-10 lg:pb-20">
        <EventSearchView filters={filters} results={searchEvents(filters)} facets={getEventFacets()} />
      </main>

      <Footer />
    </div>
  );
}
