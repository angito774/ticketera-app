import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Event, EventCategory } from "@/modules/events/types/event.types";

interface EventCardProps {
  event: Event;
  className?: string;
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  concert: "Concierto",
  theater: "Teatro",
};

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const priceFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function EventCard({ event, className }: EventCardProps) {
  const formattedDate = dateFormatter.format(new Date(event.date));
  const formattedPrice = priceFormatter.format(event.price);

  return (
    <Card
      className={cn(
        "cursor-pointer gap-3 py-0 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={event.imageUrl}
          alt={event.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        <Badge className="absolute top-3 left-3">
          {CATEGORY_LABELS[event.category]}
        </Badge>
      </div>
      <CardContent className="flex flex-col gap-1 pt-3">
        <CardTitle>{event.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{formattedDate}</p>
        <p className="text-sm text-muted-foreground">
          {event.venue}, {event.city}
        </p>
      </CardContent>
      <CardFooter>
        <span className="font-medium text-foreground">{formattedPrice}</span>
      </CardFooter>
    </Card>
  );
}
