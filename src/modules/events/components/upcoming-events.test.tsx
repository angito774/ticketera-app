import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Event } from "@/modules/events/types/event.types";

import { UPCOMING_LIMIT, UpcomingEvents } from "./upcoming-events";

const makeEvents = (prefix: string, count: number): Event[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`, title: `${prefix} ${i}` }) as Event);

const data: Record<string, Event[]> = {
  all: makeEvents("all", 10),
  concert: makeEvents("concert", 2),
  theater: [],
};

vi.mock("@/modules/events/hooks/use-events", () => ({
  useEvents: (params: { key: string }) => ({
    data: { events: data[params.key] },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/modules/events/components/event-card", () => ({
  EventCard: ({ event }: { event: Event }) => <article>{event.title}</article>,
}));

const params = (key: string) => ({ key }) as never;

function setup() {
  return render(
    <UpcomingEvents
      allParams={params("all")}
      concertParams={params("concert")}
      theaterParams={params("theater")}
    />,
  );
}

describe("UpcomingEvents", () => {
  it("renders an h2 section with tablist and Todos selected by default", () => {
    setup();

    expect(screen.getByRole("heading", { level: 2, name: "Próximos eventos" })).toBeInTheDocument();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Todos",
      "Conciertos",
      "Teatro y espectáculos",
    ]);
    expect(screen.getByRole("tab", { name: "Todos" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("limits the grid to UPCOMING_LIMIT cards", () => {
    setup();

    expect(UPCOMING_LIMIT).toBe(8);
    expect(within(screen.getByRole("tabpanel")).getAllByRole("article")).toHaveLength(8);
  });

  it("shows the list of the selected tab and updates the view-all link", () => {
    setup();
    const panel = () => screen.getByRole("tabpanel");

    expect(within(panel()).getByRole("link", { name: "Ver todos los eventos" })).toHaveAttribute(
      "href",
      "/events",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Conciertos" }));

    expect(within(panel()).getAllByRole("article")).toHaveLength(2);
    expect(within(panel()).getByRole("link", { name: "Ver todos los eventos" })).toHaveAttribute(
      "href",
      "/events?category=concert",
    );
  });

  it("shows the empty message when a tab has no events", () => {
    setup();

    fireEvent.click(screen.getByRole("tab", { name: "Teatro y espectáculos" }));

    expect(screen.getByText("No hay eventos por ahora.")).toBeInTheDocument();
    expect(within(screen.getByRole("tabpanel")).getByRole("link", { name: "Ver todos los eventos" })).toHaveAttribute(
      "href",
      "/events?category=theater",
    );
  });
});
