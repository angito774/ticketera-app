import { formatPrice, formatShortDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Event } from "@/modules/events/types/event.types"

interface HeroRailProps {
  events: Event[]
  current: number
  isRunning: boolean
  runId: number
  delay: number
  onSelect: (index: number) => void
}

function HeroRail({
  events,
  current,
  isRunning,
  runId,
  delay,
  onSelect,
}: HeroRailProps) {
  return (
    <div className="absolute top-8 right-10 bottom-20 hidden w-72 flex-col justify-end gap-2 min-[860px]:flex">
      {events.map((event, index) => {
        const active = index === current
        return (
          <button
            key={event.id}
            type="button"
            aria-label={`Ir a ${event.title}`}
            aria-current={active ? "true" : undefined}
            onClick={() => onSelect(index)}
            className={cn(
              "relative min-h-11 cursor-pointer overflow-hidden rounded-lg border px-4 py-3 text-left text-white outline-none backdrop-blur-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none",
              active
                ? "border-white/60 bg-black/70"
                : "border-white/20 bg-black/60 hover:bg-black/70"
            )}
          >
            <span className="block text-xs text-white">
              {formatShortDate(event.date)}
              {event.price > 0 && ` · ${formatPrice(event.price)}`}
            </span>
            <span className="block truncate text-sm font-semibold text-white">
              {event.title}
            </span>
            {active && isRunning && (
              <span
                key={`${current}-${runId}`}
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-1 bg-white"
                style={{ animation: `carousel-progress ${delay}ms linear forwards` }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export { HeroRail }
export type { HeroRailProps }
