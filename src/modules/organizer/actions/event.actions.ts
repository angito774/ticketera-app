"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { run, type ActionResult } from "@/modules/admin/actions/run-action";
import { AdminError } from "@/modules/admin/services/admin.service";
import { getCurrentUser } from "@/modules/auth/services/current-user.service";
import { cancelEventInputSchema } from "@/modules/organizer/schemas/cancellation.schema";
import {
  continueEventRefunds,
  getEventRefundProgress,
} from "@/modules/payments/services/refund.service";
import {
  eventSaveSchema,
  eventUpdateSchema,
} from "@/modules/organizer/schemas/event-form.schema";
import {
  cancelEvent,
  deleteEvent,
} from "@/modules/organizer/services/event-lifecycle.service";
import {
  createEvent,
  setEventFeatured,
  updateEvent,
} from "@/modules/organizer/services/event-write.service";

const setFeaturedSchema = z.object({ id: z.string().uuid(), featured: z.boolean() });
const eventIdSchema = z.object({ id: z.string().uuid() });

// run() solo revalida /admin; el panel del organizador y el listado público también cambian.
function revalidateEventPaths() {
  revalidatePath("/organizer", "layout");
  revalidatePath("/events");
  revalidatePath("/");
}

export async function createEventAction(raw: unknown): Promise<ActionResult> {
  const result = await run(eventSaveSchema, raw, async (actor, input) => {
    await createEvent(actor, input);
  });
  if (result.ok) revalidateEventPaths();
  return result;
}

export async function updateEventAction(raw: unknown): Promise<ActionResult> {
  const result = await run(eventUpdateSchema, raw, async (actor, { id, ...input }) => {
    await updateEvent(actor, id, input);
  });
  if (result.ok) revalidateEventPaths();
  return result;
}

export async function setEventFeaturedAction(raw: unknown): Promise<ActionResult> {
  const result = await run(setFeaturedSchema, raw, async (actor, { id, featured }) => {
    await setEventFeatured(actor, id, featured);
  });
  if (result.ok) revalidateEventPaths();
  return result;
}

export async function deleteEventAction(raw: unknown): Promise<ActionResult> {
  const result = await run(eventIdSchema, raw, async (actor, { id }) => {
    await deleteEvent(actor, id);
  });
  if (result.ok) revalidateEventPaths();
  return result;
}

export async function cancelEventAction(raw: unknown): Promise<ActionResult> {
  const result = await run(cancelEventInputSchema, raw, async (actor, { id, reason, note }) => {
    await cancelEvent(actor, { id, reason, note });
  });
  if (result.ok) revalidateEventPaths();
  return result;
}

export async function continueEventRefundsAction(raw: unknown): Promise<ActionResult> {
  const result = await run(eventIdSchema, raw, async (actor, { id }) => {
    await continueEventRefunds(actor, id);
  });
  if (result.ok) revalidateEventPaths();
  return result;
}

/** Progreso de reembolsos de un evento cancelado; mismo manejo de sesión y errores que `run()`. */
export type EventRefundProgressResult =
  | { ok: true; pending: number; refunded: number }
  | { ok: false; error: string };

export async function getEventRefundProgressAction(raw: unknown): Promise<EventRefundProgressResult> {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false, error: "Inicia sesión para continuar" };
  const parsed = eventIdSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  try {
    const progress = await getEventRefundProgress(actor, parsed.data.id);
    return { ok: true, ...progress };
  } catch (error) {
    if (error instanceof AdminError) return { ok: false, error: error.message };
    throw error;
  }
}
