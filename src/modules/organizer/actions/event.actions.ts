"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { run, type ActionResult } from "@/modules/admin/actions/run-action";
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
  const result = await run(eventIdSchema, raw, async (actor, { id }) => {
    await cancelEvent(actor, id);
  });
  if (result.ok) revalidateEventPaths();
  return result;
}
