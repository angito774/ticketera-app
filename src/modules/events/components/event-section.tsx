import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { EventCard } from "@/modules/events/components/event-card";
import { cn } from "@/lib/utils";
import type { Event } from "@/modules/events/types/event.types";

interface EventSectionProps {
  title: string;
  events: Event[];
  viewAllHref?: string;
  className?: string;
}

export function EventSection({
  title,
  events,
  viewAllHref,
  className,
}: EventSectionProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
        {viewAllHref ? (
          <Link href={viewAllHref} className={buttonVariants({ variant: "link" })}>
            Ver todos
          </Link>
        ) : null}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            className="w-[260px] shrink-0 sm:w-[300px]"
          />
        ))}
      </div>
    </section>
  );
}
