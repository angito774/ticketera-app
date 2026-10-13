import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { Event } from "@/modules/events/types/event.types"

import { Hero } from "./hero"

vi.mock("@/modules/events/components/hero-search-bar", () => ({
  HeroSearchBar: ({
    monthOptions,
    className,
  }: {
    monthOptions: { value: string; label: string }[]
    className?: string
  }) => (
    <form role="search" data-testid="hero-search-bar" className={className}>
      {monthOptions.map((option) => (
        <span key={option.value} data-testid="month-option" data-value={option.value}>
          {option.label}
        </span>
      ))}
    </form>
  ),
}))

vi.mock("@/modules/events/components/hero-carousel", () => ({
  HeroCarousel: ({ events, className }: { events: Event[]; className?: string }) => (
    <div data-testid="hero-carousel" className={className}>
      {events.length}
    </div>
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

describe("Hero", () => {
  it("no aplica fondo oscuro ni estilo inline en la sección", () => {
    const { container } = render(<Hero />)
    const section = container.querySelector("section")!
    expect(section).not.toHaveAttribute("style")
    expect(section.className).not.toMatch(/bg-black|text-white/)
    expect(screen.getByRole("heading", { level: 1 }).className).not.toMatch(
      /text-white|text-center/
    )
  })

  it("envuelve el contenido en el contenedor max-w-7xl", () => {
    const { container } = render(<Hero featuredEvents={[event]} />)
    const wrapper = container.querySelector("section")!.firstElementChild!
    expect(wrapper).toHaveClass(
      "mx-auto",
      "max-w-7xl",
      "px-4",
      "pt-8",
      "md:px-6",
      "md:pt-12",
      "lg:px-8"
    )
    expect(wrapper).toContainElement(screen.getByTestId("hero-carousel"))
  })

  it("renderiza el h1 con tramo final resaltado", () => {
    render(<Hero />)
    const h1 = screen.getByRole("heading", { level: 1 })
    expect(h1).toHaveTextContent("Encuentra los mejores eventos cerca de ti")
    expect(h1).toHaveClass("text-foreground")
    const accent = screen.getByText("cerca de ti")
    expect(accent.tagName).toBe("SPAN")
    expect(accent).toHaveClass("text-primary")
  })

  it("acepta headline y headlineAccent personalizados", () => {
    render(<Hero headline="Hola" headlineAccent="mundo" />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hola mundo")
  })

  it("muestra el subtítulo con estilos secundarios", () => {
    render(<Hero subtitle="Subtítulo de prueba" />)
    const subtitle = screen.getByText("Subtítulo de prueba")
    expect(subtitle).toHaveClass("text-muted-foreground")
  })

  it("tiene un único buscador, después del subtítulo y el carrusel", () => {
    render(<Hero featuredEvents={[event]} subtitle="Subtítulo de prueba" />)
    expect(screen.getAllByRole("search")).toHaveLength(1)
    const h1 = screen.getByRole("heading", { level: 1 })
    const subtitle = screen.getByText("Subtítulo de prueba")
    const carousel = screen.getByTestId("hero-carousel")
    const bar = screen.getByTestId("hero-search-bar")
    const follows = Node.DOCUMENT_POSITION_FOLLOWING
    expect(h1.compareDocumentPosition(subtitle) & follows).toBeTruthy()
    expect(subtitle.compareDocumentPosition(carousel) & follows).toBeTruthy()
    expect(carousel.compareDocumentPosition(bar) & follows).toBeTruthy()
  })

  it("coloca la barra en el contenedor max-w-7xl con mt-4", () => {
    const { container } = render(<Hero featuredEvents={[event]} />)
    const wrapper = container.querySelector("section")!.firstElementChild!
    const bar = screen.getByTestId("hero-search-bar")
    expect(wrapper).toContainElement(bar)
    expect(bar).toHaveClass("mt-4")
  })

  it("muestra la barra aunque no haya eventos", () => {
    render(<Hero />)
    expect(screen.getByTestId("hero-search-bar")).toBeInTheDocument()
  })

  it("usa el fallback de 6 meses cuando no hay facetMonths", () => {
    render(<Hero />)
    expect(screen.getAllByTestId("month-option")).toHaveLength(6)
  })

  it("pasa los facetMonths futuros a la barra", () => {
    render(
      <Hero
        facetMonths={[
          { value: "2999-01", label: "Enero 2999" },
          { value: "2000-01", label: "Enero 2000" },
        ]}
      />
    )
    const options = screen.getAllByTestId("month-option")
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveAttribute("data-value", "2999-01")
  })

  it("renderiza el carrusel solo si hay eventos y conserva el espaciado inferior si no", () => {
    const { container, rerender } = render(<Hero featuredEvents={[event]} />)
    expect(screen.getByTestId("hero-carousel")).toHaveClass("rounded-2xl", "overflow-hidden")
    expect(container.querySelector("section")).not.toHaveClass("pb-16")

    rerender(<Hero />)
    expect(screen.queryByTestId("hero-carousel")).toBeNull()
    expect(container.querySelector("section")).toHaveClass("pb-16", "md:pb-24")
  })
})
