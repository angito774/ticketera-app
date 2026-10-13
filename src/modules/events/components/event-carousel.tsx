import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { PageSection } from "@/components/page-section";
import { EventCard } from "@/modules/events/components/event-card";
import { cn } from "@/lib/utils";
import type { Event } from "@/modules/events/types/event.types";

interface EventCarouselProps {
  events: Event[];
  title?: string;
  viewAllHref?: string;
  className?: string;
}

const CAROUSEL_OPTIONS = {
  breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } },
};

const ARROW_CLASS = "static inset-auto my-0 size-11 shrink-0";

export function EventCarousel({
  events,
  title = "Destacados",
  viewAllHref,
  className,
}: EventCarouselProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <Carousel
      opts={CAROUSEL_OPTIONS}
      aria-label={title}
      className={cn("w-full", className)}
    >
      <PageSection
        id="featured-events-title"
        title={title}
        action={
          <div className="flex items-center gap-2">
            {viewAllHref ? (
              <Link
                href={viewAllHref}
                className={cn(buttonVariants({ variant: "link" }), "min-h-11")}
              >
                Ver todos
              </Link>
            ) : null}
            <CarouselPrevious
              aria-label="Evento anterior"
              className={ARROW_CLASS}
            />
            <CarouselNext
              aria-label="Siguiente evento"
              className={ARROW_CLASS}
            />
          </div>
        }
      >
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
      </PageSection>
    </Carousel>
  );
}
