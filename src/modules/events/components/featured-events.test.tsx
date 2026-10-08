import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { Event } from "@/modules/events/types/event.types"

import { FeaturedEvents } from "./featured-events"

const state = vi.hoisted(() => ({ events: [] as unknown[] }))

vi.mock("@/modules/events/components/category-events", () => ({
  EventsQuery: ({ children }: { children: (events: unknown[]) => React.ReactNode }) => (
    <>{children(state.events)}</>
  ),
}))

vi.mock("@/modules/events/components/event-carousel", () => ({
  EventCarousel: ({ events, viewAllHref }: { events: Event[]; viewAllHref?: string }) =>
    events.length === 0 ? null : (
      <section data-testid="carousel" data-href={viewAllHref}>
        {events.map((e) => (
          <span key={e.id}>{e.title}</span>
        ))}
      </section>
    ),
}))

const params = { scope: "public", featured: true } as unknown as Parameters<
  typeof FeaturedEvents
>[0]["params"]

function makeEvent(id: string): Event {
  return {
    id,
    title: `Evento ${id}`,
    category: "theater",
    date: "2026-11-14T20:00:00-05:00",
    venue: "Teatro",
    city: "Lima",
    price: 50,
    imageUrl: "https://images.unsplash.com/photo-1",
    featured: true,
  }
}

describe("FeaturedEvents", () => {
  it("muestra todos los destacados sin excluir ninguno y enlaza a /events", () => {
    state.events = [makeEvent("a"), makeEvent("b"), makeEvent("c")]
    render(<FeaturedEvents params={params} />)
    expect(screen.getByText("Evento a")).toBeInTheDocument()
    expect(screen.getByText("Evento b")).toBeInTheDocument()
    expect(screen.getByText("Evento c")).toBeInTheDocument()
    expect(screen.getByTestId("carousel")).toHaveAttribute("data-href", "/events")
  })

  it("no renderiza la sección con lista vacía", () => {
    state.events = []
    const { container } = render(<FeaturedEvents params={params} />)
    expect(container).toBeEmptyDOMElement()
  })
})
