import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getQueryClient } from "@/lib/query-client";
import { Hero } from "@/modules/events/components/hero";
import type { PublicParams } from "@/modules/events/components/category-events";
import { ExploreCategories } from "@/modules/events/components/explore-categories";
import { FeaturedEvents } from "@/modules/events/components/featured-events";
import { HowItWorks } from "@/modules/events/components/how-it-works";
import { OrganizerCta } from "@/modules/events/components/organizer-cta";
import { PromoBanner } from "@/modules/events/components/promo-banner";
import { TrustHighlights } from "@/modules/events/components/trust-highlights";
import { UpcomingEvents } from "@/modules/events/components/upcoming-events";
import {
  eventListKey,
  parseEventListParams,
} from "@/modules/events/schemas/event-list.schema";
import {
  getPublicEventFacets,
  listHeroEvents,
  listPublicEvents,
} from "@/modules/events/services/event-list.service";

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
  const [heroEvents, facets] = await Promise.all([
    listHeroEvents(),
    getPublicEventFacets(),
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
          <Hero featuredEvents={heroEvents} facetMonths={facets.months} />

          <ExploreCategories />

          <FeaturedEvents params={FEATURED_PARAMS} />

          <UpcomingEvents
            allParams={ALL_PARAMS}
            concertParams={CONCERT_PARAMS}
            theaterParams={THEATER_PARAMS}
          />

          <HowItWorks />

          <OrganizerCta />

          <TrustHighlights />

          <PromoBanner />
        </main>

        <Footer />
      </div>
    </HydrationBoundary>
  );
}
