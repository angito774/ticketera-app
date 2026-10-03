import { afterEach, describe, expect, it, vi } from "vitest";

import { parseEventListParams } from "@/modules/events/schemas/event-list.schema";

import { EventsApiError, fetchEvents, shouldRetryEvents } from "./use-events";

const params = parseEventListParams({ scope: "organizer" });

afterEach(() => vi.unstubAllGlobals());

describe("fetchEvents", () => {
  it("devuelve el JSON en respuestas ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ events: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchEvents(params)).resolves.toEqual({ events: [] });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/events?scope=organizer");
  });

  it("lanza EventsApiError con status y mensaje del servidor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "Sin permiso" }, { status: 403 })));
    await expect(fetchEvents(params)).rejects.toMatchObject({ status: 403, message: "Sin permiso" });
  });

  it("usa un mensaje genérico si el cuerpo no es JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    const error = await fetchEvents(params).catch((e) => e);
    expect(error).toBeInstanceOf(EventsApiError);
    expect(error.status).toBe(500);
  });
});

describe("shouldRetryEvents", () => {
  it("no reintenta 400/401/403", () => {
    for (const status of [400, 401, 403]) {
      expect(shouldRetryEvents(0, new EventsApiError(status, "x"))).toBe(false);
    }
  });

  it("reintenta hasta 3 veces otros errores", () => {
    expect(shouldRetryEvents(2, new EventsApiError(500, "x"))).toBe(true);
    expect(shouldRetryEvents(3, new Error("red"))).toBe(false);
  });
});
