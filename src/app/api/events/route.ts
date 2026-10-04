import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/modules/auth/services/current-user.service";
import { parseEventListParams } from "@/modules/events/schemas/event-list.schema";
import {
  EventsAccessError,
  listOrganizerEvents,
  listPublicEvents,
} from "@/modules/events/services/event-list.service";

const PUBLIC_CACHE = "public, s-maxage=60, stale-while-revalidate=300";
const PRIVATE_CACHE = "no-store";

function toRawParams(searchParams: URLSearchParams): Record<string, string | string[]> {
  const raw: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    raw[key] = values.length === 1 ? values[0] : values;
  }
  return raw;
}

function json(body: unknown, status: number, cacheControl: string) {
  return Response.json(body, { status, headers: { "Cache-Control": cacheControl } });
}

export async function GET(request: NextRequest) {
  try {
    const params = parseEventListParams(toRawParams(request.nextUrl.searchParams));

    if (params.scope === "organizer") {
      const actor = await getCurrentUser();
      return json(await listOrganizerEvents(actor, params), 200, PRIVATE_CACHE);
    }

    return json(await listPublicEvents(params), 200, PUBLIC_CACHE);
  } catch (error) {
    if (error instanceof EventsAccessError) {
      return json({ error: error.message }, error.status, PRIVATE_CACHE);
    }
    console.error("GET /api/events failed", error);
    return json({ error: "Error interno del servidor" }, 500, PRIVATE_CACHE);
  }
}
