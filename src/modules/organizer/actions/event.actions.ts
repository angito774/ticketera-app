"use server";

import { revalidatePath } from "next/cache";

import { run, type ActionResult } from "@/modules/admin/actions/run-action";
import {
  eventSaveSchema,
  eventUpdateSchema,
} from "@/modules/organizer/schemas/event-form.schema";
import { createEvent, updateEvent } from "@/modules/organizer/services/event-write.service";

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
