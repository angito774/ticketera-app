import Form from "next/form"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { HeroCarousel } from "@/modules/events/components/hero-carousel"
import type { Event } from "@/modules/events/types/event.types"

interface HeroProps {
  headline?: string
  subtitle?: string
  className?: string
  featuredEvents?: Event[]
}

function Hero({
  headline = "Encuentra los mejores eventos cerca de ti",
  subtitle = "Conciertos, teatro y espectáculos en las principales ciudades del Perú. Compra tus entradas en minutos.",
  className,
  featuredEvents = [],
}: HeroProps) {
  return (
    <section
      className={cn("overflow-x-clip pt-16 text-center md:pt-24", featuredEvents.length === 0 && "pb-16 md:pb-24", className)}
      style={{
        background:
          "radial-gradient(ellipse at top, #1a2332 0%, #0a0e1a 45%, #000000 100%)",
      }}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4">
        <h1 className="text-4xl font-bold text-white md:text-5xl">
          {headline}
        </h1>
        <p className="text-base text-gray-300 md:text-lg">{subtitle}</p>
        <div className="w-full max-w-xl rounded-2xl bg-card p-3 shadow-lg">
          <Form action="/events" role="search" className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                name="q"
                placeholder="Busca conciertos, teatro, artistas..."
                className="h-11 pl-9"
                aria-label="Buscar eventos"
              />
            </div>
            <Button
              type="submit"
              variant="default"
              size="lg"
              className="h-11 cursor-pointer"
            >
              Buscar
            </Button>
          </Form>
        </div>
      </div>
      {featuredEvents.length > 0 && (
        <HeroCarousel events={featuredEvents} className="mt-12 md:mt-16" />
      )}
    </section>
  )
}

export { Hero }
export type { HeroProps }
