import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getQueryClient } from "@/lib/query-client";
import { EventSearchView } from "@/modules/events/components/event-search-view";
import { parseEventFilters } from "@/modules/events/schemas/event-filters.schema";
import { eventListKey, parseEventListParams } from "@/modules/events/schemas/event-list.schema";
import { getPublicEventFacets, listPublicEvents } from "@/modules/events/services/event-list.service";

export const metadata: Metadata = {
  title: "Explora eventos · Ticketera",
};

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const filters = parseEventFilters(await searchParams);
  // El cliente reconstruye estos parámetros desde `filters` (ver EventSearchView).
  const params = { ...parseEventListParams({ scope: "public" }), ...filters, scope: "public" as const };

  const queryClient = getQueryClient();
  const [facets] = await Promise.all([
    getPublicEventFacets(),
    queryClient.prefetchQuery({
      queryKey: eventListKey(params),
      queryFn: () => listPublicEvents(params),
    }),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-6 pb-16 md:px-6 lg:px-8 lg:pt-10 lg:pb-20">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <EventSearchView filters={filters} facets={facets} />
        </HydrationBoundary>
      </main>

      <Footer />
    </div>
  );
}
