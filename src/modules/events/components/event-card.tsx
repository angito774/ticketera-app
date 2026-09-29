import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  EVENT_CATEGORY_LABELS,
  type Event,
} from "@/modules/events/types/event.types";

interface EventCardProps {
  event: Event;
  className?: string;
}

export function EventCard({ event, className }: EventCardProps) {
  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        "group/event-card block cursor-pointer rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring",
        className
      )}
    >
      <Card className="h-full gap-3 py-0 shadow-sm transition-all duration-200 group-hover/event-card:-translate-y-1 group-hover/event-card:shadow-md motion-reduce:transition-none motion-reduce:group-hover/event-card:translate-y-0">
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
          <Badge className="absolute top-3 left-3">
            {EVENT_CATEGORY_LABELS[event.category].singular}
          </Badge>
        </div>
        <CardContent className="flex flex-col gap-1 pt-3">
          <CardTitle>{event.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatDate(event.date)}
          </p>
          <p className="text-sm text-muted-foreground">
            {event.venue}, {event.city}
          </p>
        </CardContent>
        <CardFooter>
          <span className="font-medium text-foreground">
            Desde {formatPrice(event.price)}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
