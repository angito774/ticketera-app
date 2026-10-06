import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getQueryClient } from "@/lib/query-client";
import { Hero } from "@/modules/events/components/hero";
import { CategoryPill } from "@/modules/events/components/category-pill";
import { AllEvents, CategoryEvents } from "@/modules/events/components/category-events";
import { FeaturedEvents } from "@/modules/events/components/featured-events";
import { EventFilterBar } from "@/modules/events/components/event-filter-bar";
import { PromoBanner } from "@/modules/events/components/promo-banner";
import {
  eventListKey,
  parseEventListParams,
  type EventListParams,
} from "@/modules/events/schemas/event-list.schema";
import { listHeroEvents, listPublicEvents } from "@/modules/events/services/event-list.service";

type PublicParams = EventListParams & { scope: "public" };

// Los eventos salen de la base: sin esto Next la prerenderiza en el build y la lista queda obsoleta (y el build exigiría DATABASE_URL).
export const dynamic = "force-dynamic";

const publicParams = (raw: Record<string, string>): PublicParams =>
  ({ ...parseEventListParams({ ...raw, scope: "public" }), scope: "public" });

// Estos mismos objetos se usan para precargar en el servidor y se pasan a los componentes
// cliente: `eventListKey(params)` es idéntico en ambos lados, así que la hidratación acierta.
const FEATURED_PARAMS = publicParams({ featured: "true" });
const CONCERT_PARAMS = publicParams({ category: "concert" });
const THEATER_PARAMS = publicParams({ category: "theater" });
const ALL_PARAMS = publicParams({});

export default async function Home() {
  const queryClient = getQueryClient();
  const [heroEvents] = await Promise.all([
    listHeroEvents(),
    ...[FEATURED_PARAMS, CONCERT_PARAMS, THEATER_PARAMS, ALL_PARAMS].map((params) =>
      queryClient.prefetchQuery({
        queryKey: eventListKey(params),
        queryFn: () => listPublicEvents(params),
      }),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="flex flex-1 flex-col">
          <Hero featuredEvents={heroEvents} />

          <div className="flex flex-wrap justify-center gap-3 px-4 py-8 md:px-6 lg:px-8">
            <CategoryPill label="Conciertos" value="concert" />
            <CategoryPill label="Teatro y espectáculos" value="theater" />
          </div>

          <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-8 md:px-6 lg:px-8">
            <FeaturedEvents params={FEATURED_PARAMS} />

            <CategoryEvents
              title="Conciertos"
              params={CONCERT_PARAMS}
              viewAllHref="/events?category=concert"
            />

            <CategoryEvents
              title="Teatro y espectáculos"
              params={THEATER_PARAMS}
              viewAllHref="/events?category=theater"
            />

            <section className="flex flex-col gap-6">
              <h2 className="text-2xl font-bold md:text-3xl">
                Todos los eventos
              </h2>

              <EventFilterBar />

              <AllEvents params={ALL_PARAMS} />
            </section>
          </div>

          <PromoBanner />
        </main>

        <Footer />
      </div>
    </HydrationBoundary>
  );
}
