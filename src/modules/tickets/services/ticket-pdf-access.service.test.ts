// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import type { OrderView } from "@/modules/checkout/services/order-read.mapping";
import type { EventDetail } from "@/modules/events/types/event.types";

const { getOrderForUser, getEventById } = vi.hoisted(() => ({
  getOrderForUser: vi.fn(),
  getEventById: vi.fn(),
}));

vi.mock("@/modules/checkout/services/order-read.service", () => ({ getOrderForUser }));
vi.mock("@/modules/events/services/events.service", () => ({ getEventById }));

import { generateTicketPdfForUser } from "@/modules/tickets/services/ticket-pdf-access.service";

const actor = { id: "user-1", email: "ana@example.com", fullName: "Ana" } as CurrentUser;

const event = {
  date: "2026-11-14T20:00:00-05:00",
  doorsOpenAt: "2026-11-14T18:00:00-05:00",
  venue: "Estadio Nacional",
  city: "Lima",
  address: "Av. José Díaz s/n",
  minAge: null,
} as EventDetail;

function makeOrder(overrides: Partial<OrderView> = {}): OrderView {
  return {
    id: "0b9f5c1e-7a52-4a3e-9f0e-1f1c2d3e4f5a",
    number: "TK-1A2B3C4D",
    eventSlug: "concierto",
    eventTitle: "Concierto",
    eventStatus: "published",
    createdAt: "2026-10-01T10:00:00-05:00",
    total: 200,
    status: "paid",
    buyerName: "Ana Núñez",
    buyerEmail: "ana@example.com",
    tickets: [
      { id: "t-1", zoneName: "General", seatLabel: null, qrCode: "qr-token-uno-xxxxxxxxx", status: "valid" },
      { id: "t-2", zoneName: "General", seatLabel: null, qrCode: "qr-token-dos-xxxxxxxxx", status: "valid" },
    ],
    ...overrides,
  };
}

describe("generateTicketPdfForUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getEventById.mockReturnValue(event);
  });

  it("returns 401 without a session and reads nothing", async () => {
    const result = await generateTicketPdfForUser(null, "any");
    expect(result).toEqual({ ok: false, reason: "unauthenticated", status: 401 });
    expect(getOrderForUser).not.toHaveBeenCalled();
  });

  it("returns 404 when the order is missing or belongs to someone else", async () => {
    getOrderForUser.mockResolvedValue(null);
    const result = await generateTicketPdfForUser(actor, "other-order");
    expect(result).toEqual({ ok: false, reason: "not_found", status: 404 });
    expect(getOrderForUser).toHaveBeenCalledWith(actor, "other-order");
    expect(getEventById).not.toHaveBeenCalled();
  });

  it.each([
    ["pending", { status: "pending" }],
    ["refunded", { status: "refunded" }],
    ["cancelled", { status: "cancelled" }],
    ["event cancelled", { eventStatus: "cancelled" }],
    ["no active tickets", { tickets: [] }],
  ] as const)("returns 409 for %s orders", async (_label, overrides) => {
    getOrderForUser.mockResolvedValue(makeOrder(overrides as Partial<OrderView>));
    const result = await generateTicketPdfForUser(actor, "order");
    expect(result).toEqual({ ok: false, reason: "not_downloadable", status: 409 });
  });

  it("returns 404 when the event is not in the catalog", async () => {
    getOrderForUser.mockResolvedValue(makeOrder());
    getEventById.mockReturnValue(undefined);
    const result = await generateTicketPdfForUser(actor, "order");
    expect(result).toEqual({ ok: false, reason: "not_found", status: 404 });
  });

  it("returns the PDF buffer and file name on success", async () => {
    getOrderForUser.mockResolvedValue(makeOrder());
    const result = await generateTicketPdfForUser(actor, "order");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fileName).toBe("entradas-TK-1A2B3C4D.pdf");
    expect(result.buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
