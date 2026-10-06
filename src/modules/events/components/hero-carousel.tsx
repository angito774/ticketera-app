"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { formatDate, formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Event } from "@/modules/events/types/event.types"

const AUTOPLAY_MS = 6000

const ARROW_CLASSES =
  "top-auto bottom-4 left-auto my-0 size-11 border-white/30 bg-black/40 text-white hover:bg-black/60 hover:text-white lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2"

interface HeroCarouselProps {
  events: Event[]
  className?: string
}

function HeroCarousel({ events, className }: HeroCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const [reducedMotion, setReducedMotion] = React.useState(true)
  const total = events.length
  const multiple = total > 1

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  React.useEffect(() => {
    if (!api) return
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    onSelect()
    api.on("select", onSelect)
    api.on("reInit", onSelect)
    return () => {
      api.off("select", onSelect)
      api.off("reInit", onSelect)
    }
  }, [api])

  React.useEffect(() => {
    if (!api || !multiple || paused || reducedMotion) return
    const id = setInterval(() => api.scrollNext(), AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [api, multiple, paused, reducedMotion])

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: multiple, watchDrag: multiple }}
      aria-label="Eventos destacados"
      className={cn("w-full", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <CarouselContent className="ml-0">
        {events.map((event, index) => (
          <CarouselItem
            key={event.id}
            className="pl-0"
            aria-label={`${index + 1} de ${total}`}
          >
            <div className="relative h-80 w-full overflow-hidden bg-muted sm:h-96 lg:h-[28rem]">
              <Image
                src={event.imageUrl}
                alt=""
                fill
                sizes="100vw"
                priority={index === 0}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl flex-col items-start gap-2 px-4 pb-16 text-left text-white md:px-6 lg:px-8 lg:pb-10">
                <h2 className="line-clamp-2 text-2xl font-bold sm:text-3xl lg:text-4xl">
                  {event.title}
                </h2>
                <p className="text-sm text-gray-200 sm:text-base">
                  {formatDate(event.date)} · {formatTime(event.date)}
                </p>
                <p className="text-sm text-gray-200 sm:text-base">
                  {event.venue}, {event.city}
                </p>
                <Link
                  href={`/events/${event.id}`}
                  className="mt-2 inline-flex h-11 cursor-pointer items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring"
                >
                  Comprar entradas
                </Link>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {multiple && (
        <>
          <CarouselPrevious
            aria-label="Evento anterior"
            className={cn(ARROW_CLASSES, "right-18 lg:right-auto lg:left-4")}
          />
          <CarouselNext
            aria-label="Evento siguiente"
            className={cn(ARROW_CLASSES, "right-4")}
          />
          <div
            className="absolute bottom-4 left-4 flex items-center gap-1 md:left-6 lg:left-8"
            role="group"
            aria-label="Elegir evento destacado"
          >
            {events.map((event, index) => (
              <button
                key={event.id}
                type="button"
                aria-label={`Ir al evento ${index + 1} de ${total}`}
                aria-current={index === current ? "true" : undefined}
                onClick={() => api?.scrollTo(index)}
                className="group flex size-6 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "h-2 rounded-full bg-white transition-all motion-reduce:transition-none",
                    index === current ? "w-6" : "w-2 opacity-50 group-hover:opacity-80"
                  )}
                />
              </button>
            ))}
            <span className="sr-only" aria-live="polite">
              {current + 1} de {total}
            </span>
          </div>
        </>
      )}
    </Carousel>
  )
}

export { HeroCarousel }
export type { HeroCarouselProps }
