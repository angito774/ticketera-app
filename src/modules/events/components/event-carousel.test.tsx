import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Event } from "@/modules/events/types/event.types"

import { EventCarousel } from "./event-carousel"

vi.mock("@/modules/events/components/event-card", () => ({
  EventCard: ({ event }: { event: Event }) => <article>{event.title}</article>,
}))

function makeEvent(id: string): Event {
  return {
    id,
    title: `Evento ${id}`,
    category: "concert",
    date: "2026-11-14T20:00:00-05:00",
    venue: "Estadio",
    city: "Lima",
    price: 120,
    imageUrl: "https://images.unsplash.com/photo-1",
    featured: true,
  }
}

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", ObserverStub)
  vi.stubGlobal("ResizeObserver", ObserverStub)
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

describe("EventCarousel", () => {
  it("no renderiza nada con lista vacía", () => {
    const { container } = render(<EventCarousel events={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("muestra el h2 'Destacados' y la sección etiquetada por él", () => {
    render(<EventCarousel events={[makeEvent("a")]} />)
    const heading = screen.getByRole("heading", { level: 2, name: "Destacados" })
    const section = heading.closest("section")!
    expect(section).toHaveAttribute("aria-labelledby", "featured-events-title")
    expect(heading).toHaveAttribute("id", "featured-events-title")
  })

  it("expone la región del carrusel y los items numerados", () => {
    render(<EventCarousel events={[makeEvent("a"), makeEvent("b")]} />)
    const carousel = document.querySelector('[aria-roledescription="carousel"]')!
    expect(carousel).toHaveAttribute("aria-label", "Destacados")
    expect(screen.getByLabelText("1 de 2")).toBeInTheDocument()
    expect(screen.getByLabelText("2 de 2")).toBeInTheDocument()
  })

  it("muestra el enlace 'Ver todos' solo con viewAllHref", () => {
    const { rerender } = render(<EventCarousel events={[makeEvent("a")]} />)
    expect(screen.queryByRole("link", { name: "Ver todos" })).not.toBeInTheDocument()
    rerender(<EventCarousel events={[makeEvent("a")]} viewAllHref="/events" />)
    expect(screen.getByRole("link", { name: "Ver todos" })).toHaveAttribute("href", "/events")
  })

  it("renderiza flechas de 44 px con aria-label, deshabilitadas sin desplazamiento", () => {
    render(<EventCarousel events={[makeEvent("a")]} />)
    const prev = screen.getByRole("button", { name: "Evento anterior" })
    const next = screen.getByRole("button", { name: "Siguiente evento" })
    for (const arrow of [prev, next]) {
      expect(arrow).toHaveClass("size-11")
      expect(arrow.className).not.toContain("-left-12")
      expect(arrow.className).not.toContain("-right-12")
      expect(arrow).toBeDisabled()
    }
  })
})
