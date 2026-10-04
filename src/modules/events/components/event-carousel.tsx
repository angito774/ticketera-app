import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { EventCard } from "@/modules/events/components/event-card";
import { cn } from "@/lib/utils";
import type { Event } from "@/modules/events/types/event.types";

interface EventCarouselProps {
  events: Event[];
  title?: string;
  className?: string;
}

export function EventCarousel({
  events,
  title = "Eventos destacados",
  className,
}: EventCarouselProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className={cn("relative", className)}>
      <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
      <Carousel className="mt-6" aria-label={title}>
        <CarouselContent>
          {events.map((event, index) => (
            <CarouselItem
              key={event.id}
              aria-label={`${index + 1} de ${events.length}`}
              className="basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <EventCard event={event} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious aria-label="Evento anterior" />
        <CarouselNext aria-label="Siguiente evento" />
      </Carousel>
    </section>
  );
}
