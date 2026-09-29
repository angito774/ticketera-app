import Form from "next/form"
import Image from "next/image"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface HeroProps {
  headline?: string
  subtitle?: string
  className?: string
}

interface HeroBentoTile {
  title: string
  imageUrl: string
  span: "large" | "small"
}

const BENTO_TILES: HeroBentoTile[] = [
  {
    title: "Bad Bunny en Lima",
    imageUrl:
      "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80",
    span: "large",
  },
  {
    title: "Festival Vivo por el Rock",
    imageUrl:
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
    span: "small",
  },
  {
    title: "El Fantasma de la Ópera",
    imageUrl:
      "https://images.unsplash.com/photo-1580809361436-42a7ec204889?w=800&q=80",
    span: "small",
  },
  {
    title: "Gian Marco — Concierto Sinfónico",
    imageUrl:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    span: "small",
  },
  {
    title: "Hamlet — Compañía Nacional de Teatro",
    imageUrl:
      "https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800&q=80",
    span: "small",
  },
]

function BentoTile({
  tile,
  className,
}: {
  tile: HeroBentoTile
  className?: string
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <Image
        src={tile.imageUrl}
        alt={tile.title}
        fill
        sizes="(min-width: 640px) 25vw, 50vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <span className="font-semibold text-white">{tile.title}</span>
      </div>
    </div>
  )
}

function Hero({
  headline = "Encuentra los mejores eventos cerca de ti",
  subtitle = "Conciertos, teatro y espectáculos en las principales ciudades del Perú. Compra tus entradas en minutos.",
  className,
}: HeroProps) {
  return (
    <section
      className={cn("py-16 text-center md:py-24", className)}
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
        <div className="grid w-full grid-cols-2 grid-rows-[repeat(3,8rem)] gap-3 sm:grid-cols-4 sm:grid-rows-[repeat(2,9rem)] sm:gap-4">
          {BENTO_TILES.map((tile) => (
            <BentoTile
              key={tile.title}
              tile={tile}
              className={
                tile.span === "large" ? "col-span-2 sm:row-span-2" : undefined
              }
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export { Hero }
export type { HeroProps }
