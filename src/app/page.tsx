import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Hero } from "@/modules/events/components/hero";
import { CategoryPill } from "@/modules/events/components/category-pill";
import { EventCarousel } from "@/modules/events/components/event-carousel";
import { EventSection } from "@/modules/events/components/event-section";
import { EventCard } from "@/modules/events/components/event-card";
import { EventFilterBar } from "@/modules/events/components/event-filter-bar";
import { PromoBanner } from "@/modules/events/components/promo-banner";
import {
  getAllEvents,
  getEventsByCategory,
  getFeaturedEvents,
} from "@/modules/events/services/events.service";

export default function Home() {
  const featuredEvents = getFeaturedEvents();
  const concertEvents = getEventsByCategory("concert");
  const theaterEvents = getEventsByCategory("theater");
  const allEvents = getAllEvents();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col">
        <Hero />

        <div className="flex flex-wrap justify-center gap-3 px-4 py-8 md:px-6 lg:px-8">
          <CategoryPill label="Conciertos" value="concert" />
          <CategoryPill label="Teatro y espectáculos" value="theater" />
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-8 md:px-6 lg:px-8">
          <EventCarousel events={featuredEvents} title="Eventos destacados" />

          <EventSection
            title="Conciertos"
            events={concertEvents}
            viewAllHref="/events?category=concert"
          />

          <EventSection
            title="Teatro y espectáculos"
            events={theaterEvents}
            viewAllHref="/events?category=theater"
          />

          <section className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold md:text-3xl">
              Todos los eventos
            </h2>

            <EventFilterBar />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {allEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        </div>

        <PromoBanner />
      </main>

      <Footer />
    </div>
  );
}
