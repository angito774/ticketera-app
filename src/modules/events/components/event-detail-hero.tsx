"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, Heart, MapPin, Share2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { formatLongDate, formatPrice, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  EVENT_CATEGORY_LABELS,
  type EventDetail,
} from "@/modules/events/types/event.types";

interface EventDetailHeroProps {
  event: EventDetail;
  ticketsHref: string;
  className?: string;
}

const ICON_BUTTON_CLASSES =
  "flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl border-[1.5px] border-white/40 text-white transition-colors outline-none hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-ring lg:size-13.5";

export function EventDetailHero({
  event,
  ticketsHref,
  className,
}: EventDetailHeroProps) {
  // Solo estado visual: no hay cuentas ni persistencia en esta etapa.
  const [isSaved, setIsSaved] = useState(false);
  const categoryLabel = EVENT_CATEGORY_LABELS[event.category].plural;

  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <nav aria-label="Ruta" className="text-sm text-muted-foreground">
        <ol className="flex min-w-0 items-center gap-2">
          <li>
            <Link href="/" className="cursor-pointer hover:text-primary">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="shrink-0">{categoryLabel}</li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="truncate font-medium text-foreground">
            {event.title}
          </li>
        </ol>
      </nav>

      <div className="grid overflow-hidden rounded-3xl bg-brand-deep lg:min-h-115 lg:grid-cols-[540px_minmax(0,1fr)] lg:rounded-[2rem]">
        <div className="relative aspect-[16/10] lg:order-2 lg:aspect-auto">
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-5 p-6 text-white lg:order-1 lg:p-12">
          <span className="flex h-8 w-fit items-center rounded-full border border-white/30 px-3.5 text-[0.8125rem] font-medium">
            {categoryLabel}
          </span>
          <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance lg:text-5xl lg:leading-[1.08]">
            {event.title}
          </h1>
          <ul className="flex flex-col gap-2.5 text-brand-deep-foreground">
            <li className="flex items-center gap-2.5">
              <CalendarDays className="size-5 shrink-0" aria-hidden="true" />
              {formatLongDate(event.date)}
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="size-5 shrink-0" aria-hidden="true" />
              {formatTime(event.date)} h
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="size-5 shrink-0" aria-hidden="true" />
              {event.venue}, {event.city}
            </li>
          </ul>

          <div className="flex items-center gap-2.5 lg:mt-auto">
            <Link
              href={ticketsHref}
              className={cn(
                buttonVariants({ variant: "cta" }),
                "hidden h-13.5 flex-1 rounded-2xl text-base lg:flex"
              )}
            >
              Comprar entradas · desde {formatPrice(event.price)}
            </Link>
            <button
              type="button"
              aria-label="Guardar evento"
              aria-pressed={isSaved}
              onClick={() => setIsSaved((saved) => !saved)}
              className={cn(ICON_BUTTON_CLASSES, isSaved && "bg-white/15")}
            >
              <Heart
                className={cn("size-5", isSaved && "fill-current")}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              aria-label="Compartir evento"
              className={ICON_BUTTON_CLASSES}
            >
              <Share2 className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
