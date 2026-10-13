"use client"

import { PauseIcon, PlayIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

interface HeroCarouselControlsProps {
  total: number
  current: number
  canAutoplay: boolean
  userPaused: boolean
  onToggle: () => void
  onSelect: (index: number) => void
}

const CONTROL_CLASSES =
  "static my-0 size-11 touch-manipulation rounded-full border-white/30 bg-black/40 text-white hover:bg-black/60 hover:text-white focus-visible:border-white focus-visible:ring-3 focus-visible:ring-ring"

function HeroCarouselControls({
  total,
  current,
  canAutoplay,
  userPaused,
  onToggle,
  onSelect,
}: HeroCarouselControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-stretch gap-1 px-4 pb-4 min-[860px]:inset-x-auto min-[860px]:top-4 min-[860px]:right-4 min-[860px]:bottom-auto min-[860px]:flex-row min-[860px]:items-center min-[860px]:justify-end min-[860px]:gap-2 min-[860px]:p-0">
      <div
        className="pointer-events-auto flex items-center min-[860px]:hidden"
        role="group"
        aria-label="Elegir evento destacado"
      >
        {Array.from({ length: total }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Ir al evento ${index + 1}`}
            aria-current={index === current ? "true" : undefined}
            onClick={() => onSelect(index)}
            className="group flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "h-2 rounded-full bg-white transition-all motion-reduce:transition-none",
                index === current
                  ? "w-6"
                  : "w-2 opacity-50 group-hover:opacity-80"
              )}
            />
          </button>
        ))}
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <span className="mr-auto px-2 text-sm font-medium text-white tabular-nums min-[860px]:mr-0 min-[860px]:rounded-full min-[860px]:bg-black/40 min-[860px]:px-3 min-[860px]:py-1">
          {current + 1} / {total}
        </span>
        {canAutoplay && (
          <Button
            type="button"
            variant="outline"
            aria-label={
              userPaused
                ? "Reanudar rotación automática"
                : "Pausar rotación automática"
            }
            onClick={onToggle}
            className={CONTROL_CLASSES}
          >
            {userPaused ? <PlayIcon /> : <PauseIcon />}
          </Button>
        )}
        <CarouselPrevious
          aria-label="Evento anterior"
          className={CONTROL_CLASSES}
        />
        <CarouselNext
          aria-label="Evento siguiente"
          className={CONTROL_CLASSES}
        />
      </div>
    </div>
  )
}

export { HeroCarouselControls }
export type { HeroCarouselControlsProps }
