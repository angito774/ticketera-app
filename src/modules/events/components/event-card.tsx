import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateBadge, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  EVENT_CATEGORY_LABELS,
  type Event,
} from "@/modules/events/types/event.types";

interface EventCardProps {
  event: Event;
  /** "horizontal": imagen a la izquierda, para listas en móvil. */
  layout?: "vertical" | "horizontal";
  className?: string;
}

const LINK_CLASSES =
  "group/event-card block cursor-pointer rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring";

function HorizontalEventCard({ event, className }: Omit<EventCardProps, "layout">) {
  const badge = formatDateBadge(event.date);

  return (
    <Link href={`/events/${event.id}`} className={cn(LINK_CLASSES, className)}>
      <Card className="flex-row gap-0 overflow-hidden py-0 shadow-sm transition-shadow duration-200 group-hover/event-card:shadow-md">
        <div className="relative w-27 shrink-0 self-stretch bg-muted">
          <Image src={event.imageUrl} alt="" fill sizes="108px" className="object-cover" />
          <span className="absolute top-2 left-2 flex w-11 flex-col items-center rounded-lg bg-background py-1 leading-none shadow-sm">
            <span className="text-[0.625rem] font-semibold text-primary">{badge.month}</span>
            <span className="text-base font-bold">{badge.day}</span>
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 px-3.5 py-3">
          <span className="text-xs font-semibold text-primary">
            {EVENT_CATEGORY_LABELS[event.category].singular}
          </span>
          <span className="line-clamp-2 font-semibold leading-snug">{event.title}</span>
          <span className="truncate text-[0.8125rem] text-muted-foreground">
            {event.venue} · {event.city}
          </span>
          <span className="mt-auto text-sm">
            <span className="text-muted-foreground">Desde </span>
            <span className="font-semibold">{formatPrice(event.price)}</span>
          </span>
        </div>
      </Card>
    </Link>
  );
}

export function EventCard({ event, layout = "vertical", className }: EventCardProps) {
  if (layout === "horizontal") {
    return <HorizontalEventCard event={event} className={className} />;
  }

  return (
    <Link href={`/events/${event.id}`} className={cn(LINK_CLASSES, className)}>
      <Card className="h-full gap-3 py-0 shadow-sm transition-all duration-200 group-hover/event-card:-translate-y-1 group-hover/event-card:shadow-md motion-reduce:transition-none motion-reduce:group-hover/event-card:translate-y-0">
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={event.imageUrl}
            alt=""
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
