"use client";

import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  eventListKey,
  eventListToSearchParams,
  type EventListParams,
} from "@/modules/events/schemas/event-list.schema";
import type {
  OrganizerEventList,
  PublicEventList,
} from "@/modules/events/types/event-list.types";

export class EventsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "EventsApiError";
  }
}

const NO_RETRY_STATUSES = [400, 401, 403];

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
      return body.error;
    }
  } catch {}
  return "No se pudieron cargar los eventos";
}

export async function fetchEvents(params: EventListParams & { scope: "public" }): Promise<PublicEventList>;
export async function fetchEvents(params: EventListParams & { scope: "organizer" }): Promise<OrganizerEventList>;
export async function fetchEvents(params: EventListParams): Promise<PublicEventList | OrganizerEventList>;
export async function fetchEvents(params: EventListParams): Promise<PublicEventList | OrganizerEventList> {
  const res = await fetch(`/api/events?${eventListToSearchParams(params)}`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new EventsApiError(res.status, await readErrorMessage(res));
  return res.json();
}

export function shouldRetryEvents(failureCount: number, error: Error): boolean {
  if (error instanceof EventsApiError && NO_RETRY_STATUSES.includes(error.status)) return false;
  return failureCount < 3;
}

export function useEvents(
  params: EventListParams & { scope: "public" },
): UseQueryResult<PublicEventList, EventsApiError>;
export function useEvents(
  params: EventListParams & { scope: "organizer" },
): UseQueryResult<OrganizerEventList, EventsApiError>;
export function useEvents(
  params: EventListParams,
): UseQueryResult<PublicEventList | OrganizerEventList, EventsApiError> {
  return useQuery<PublicEventList | OrganizerEventList, EventsApiError>({
    queryKey: eventListKey(params),
    queryFn: () => fetchEvents(params),
    placeholderData: keepPreviousData,
    retry: shouldRetryEvents,
    // Las cifras de ventas cambian: el panel siempre revalida al montar.
    ...(params.scope === "organizer" ? { staleTime: 0 } : {}),
  });
}
