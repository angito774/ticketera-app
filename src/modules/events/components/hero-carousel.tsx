"use client"

import * as React from "react"

import { Carousel, CarouselContent } from "@/components/ui/carousel"
import { useCarouselAutoplay } from "@/hooks/use-carousel-autoplay"
import { cn } from "@/lib/utils"
import { HeroCarouselControls } from "@/modules/events/components/hero-carousel-controls"
import { HeroRail } from "@/modules/events/components/hero-rail"
import { HeroSlide } from "@/modules/events/components/hero-slide"
import type { Event } from "@/modules/events/types/event.types"

const AUTOPLAY_MS = 6000

interface HeroCarouselProps {
  events: Event[]
  className?: string
}

function HeroCarousel({ events, className }: HeroCarouselProps) {
  const total = events.length
  const multiple = total > 1
  const [current, setCurrent] = React.useState(0)
  const [announcement, setAnnouncement] = React.useState("")

  const {
    plugin,
    setApi,
    api,
    canAutoplay,
    userPaused,
    isRunning,
    runId,
    toggle,
    containerProps,
  } = useCarouselAutoplay({ delay: AUTOPLAY_MS, enabled: multiple })

  const isRunningRef = React.useRef(isRunning)
  React.useEffect(() => {
    isRunningRef.current = isRunning
  }, [isRunning])

  React.useEffect(() => {
    if (!api) return
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    const onUserSelect = () => {
      const index = api.selectedScrollSnap()
      setAnnouncement(
        isRunningRef.current
          ? ""
          : `${events[index]?.title}, ${index + 1} de ${total}`
      )
    }
    onSelect()
    api.on("select", onSelect)
    api.on("reInit", onSelect)
    api.on("select", onUserSelect)
    return () => {
      api.off("select", onSelect)
      api.off("reInit", onSelect)
      api.off("select", onUserSelect)
    }
  }, [api, events, total])

  const goTo = (index: number) => api?.scrollTo(index)

  return (
    <Carousel
      setApi={setApi}
      plugins={[plugin]}
      opts={{ loop: multiple, watchDrag: multiple }}
      aria-label="Eventos destacados"
      className={cn("w-full", className)}
      {...containerProps}
    >
      <CarouselContent className="ml-0">
        {events.map((event, index) => (
          <HeroSlide
            key={event.id}
            event={event}
            index={index}
            total={total}
            active={index === current}
          />
        ))}
      </CarouselContent>

      {multiple && (
        <>
          <HeroRail
            events={events}
            current={current}
            isRunning={isRunning}
            runId={runId}
            delay={AUTOPLAY_MS}
            onSelect={goTo}
          />
          <HeroCarouselControls
            total={total}
            current={current}
            canAutoplay={canAutoplay}
            userPaused={userPaused}
            onToggle={toggle}
            onSelect={goTo}
          />
          <span className="sr-only" aria-live="polite">
            {announcement}
          </span>
        </>
      )}
    </Carousel>
  )
}

export { HeroCarousel }
export type { HeroCarouselProps }
