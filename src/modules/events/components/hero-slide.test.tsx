import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { Event } from "@/modules/events/types/event.types"

import { HeroSlide } from "./hero-slide"

vi.mock("@/components/ui/carousel", () => ({
  CarouselItem: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div role="group" aria-roledescription="slide" {...props}>
      {children}
    </div>
  ),
}))

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

const event: Event = {
  id: "rock-fest",
  title: "Rock Fest",
  category: "concert",
  date: "2026-11-14T20:00:00-05:00",
  venue: "Estadio",
  city: "Lima",
  price: 120,
  imageUrl: "https://images.unsplash.com/photo-1",
  featured: true,
}

describe("HeroSlide", () => {
  it("muestra un único enlace a /events/{id} y alt vacío en la imagen", () => {
    const { container } = render(
      <HeroSlide event={event} index={0} total={3} active />
    )
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute("href", "/events/rock-fest")
    expect(container.querySelector("img")).toHaveAttribute("alt", "")
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Rock Fest")
    expect(screen.getByText("Concierto")).toBeInTheDocument()
    expect(screen.getByText("Desde")).toBeInTheDocument()
  })

  it("no renderiza el bloque de precio si price <= 0", () => {
    render(<HeroSlide event={{ ...event, price: 0 }} index={0} total={3} active />)
    expect(screen.queryByText("Desde")).toBeNull()
  })

  it("activa: sin inert ni aria-hidden", () => {
    render(<HeroSlide event={event} index={1} total={3} active />)
    const slide = screen.getByRole("group")
    expect(slide).not.toHaveAttribute("inert")
    expect(slide).not.toHaveAttribute("aria-hidden")
    expect(slide).toHaveAttribute("aria-label", "2 de 3")
  })

  it("usa alto fijo de 463px en desktop y título hasta lg:text-6xl", () => {
    const { container } = render(
      <HeroSlide event={event} index={0} total={3} active />
    )
    expect(container.querySelector(".min-\\[860px\\]\\:h-\\[463px\\]")).not.toBeNull()
    // El título se limita a 2 líneas: con más, el bloque anclado abajo se recorta por arriba en 463px.
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("lg:text-6xl", "line-clamp-2")
    expect(screen.getByText("Concierto")).toHaveClass("text-xs")
  })

  it("inactiva: inert y aria-hidden", () => {
    const { container } = render(
      <HeroSlide event={event} index={1} total={3} active={false} />
    )
    const slide = container.firstElementChild!
    expect(slide).toHaveAttribute("inert")
    expect(slide).toHaveAttribute("aria-hidden", "true")
  })
})
