import Image from "next/image"
import Link from "next/link"

import { CarouselItem } from "@/components/ui/carousel"
import { formatPrice, formatShortDate, formatTime } from "@/lib/format"
import {
  EVENT_CATEGORY_LABELS,
  type Event,
} from "@/modules/events/types/event.types"

interface HeroSlideProps {
  event: Event
  index: number
  total: number
  active: boolean
}

function HeroSlide({ event, index, total, active }: HeroSlideProps) {
  return (
    <CarouselItem
      className="pl-0"
      aria-label={`${index + 1} de ${total}`}
      inert={!active}
      aria-hidden={active ? undefined : true}
    >
      <div className="relative h-[560px] w-full overflow-hidden bg-neutral-900 min-[860px]:h-[463px]">
        <Image
          src={event.imageUrl}
          alt=""
          fill
          sizes="(min-width: 1280px) 1280px, 100vw"
          preload={index === 0}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 via-60% to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 px-5 pb-32 text-left text-white min-[860px]:max-w-[60%] min-[860px]:px-10 min-[860px]:pb-14">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold tracking-wide text-primary-foreground uppercase">
            {EVENT_CATEGORY_LABELS[event.category].singular}
          </span>
          <h2 className="line-clamp-2 font-heading text-3xl leading-tight font-bold text-balance min-[860px]:text-5xl lg:text-6xl">
            {event.title}
          </h2>
          <p className="text-sm text-white sm:text-base">
            {formatShortDate(event.date)} · {formatTime(event.date)}
          </p>
          <p className="text-sm text-white sm:text-base">
            {event.venue}, {event.city}
          </p>
          {event.price > 0 && (
            <p className="text-sm text-white sm:text-base">
              <span>Desde</span>{" "}
              <span className="text-lg font-bold">
                {formatPrice(event.price)}
              </span>
            </p>
          )}
          <Link
            href={`/events/${event.id}`}
            className="mt-2 inline-flex h-11 cursor-pointer items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
          >
            Comprar entradas
          </Link>
        </div>
      </div>
    </CarouselItem>
  )
}

export { HeroSlide }
export type { HeroSlideProps }
