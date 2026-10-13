import { cn } from "@/lib/utils"
import { HeroCarousel } from "@/modules/events/components/hero-carousel"
import { HeroSearchBar } from "@/modules/events/components/hero-search-bar"
import { buildMonthOptions } from "@/modules/events/services/event-month-options"
import type { FacetOption } from "@/modules/events/services/events.service"
import type { Event } from "@/modules/events/types/event.types"

interface HeroProps {
  headline?: string
  headlineAccent?: string
  subtitle?: string
  className?: string
  featuredEvents?: Event[]
  /** facets.months de getPublicEventFacets(); Hero los pasa por buildMonthOptions. */
  facetMonths?: Pick<FacetOption, "value" | "label">[]
}

function Hero({
  headline = "Encuentra los mejores eventos",
  headlineAccent = "cerca de ti",
  subtitle = "Conciertos, teatro y espectáculos en las principales ciudades del Perú. Compra tus entradas en minutos.",
  className,
  featuredEvents = [],
  facetMonths,
}: HeroProps) {
  return (
    <section
      className={cn(
        "overflow-x-clip",
        featuredEvents.length === 0 && "pb-16 md:pb-24",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6 md:pt-12 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          {headline} <span className="text-primary">{headlineAccent}</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground md:text-lg">
          {subtitle}
        </p>
        {featuredEvents.length > 0 && (
          <HeroCarousel
            events={featuredEvents}
            className="mt-8 overflow-hidden rounded-2xl"
          />
        )}
        <HeroSearchBar
          monthOptions={buildMonthOptions(facetMonths, new Date())}
          className="mt-4"
        />
      </div>
    </section>
  )
}

export { Hero }
export type { HeroProps }
