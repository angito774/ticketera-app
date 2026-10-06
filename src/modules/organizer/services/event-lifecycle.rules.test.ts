import { describe, expect, it } from "vitest";

import {
  canCancelEvent,
  canDeleteEvent,
  type LifecycleEventStatus,
} from "@/modules/organizer/services/event-lifecycle.rules";

const STATUSES: LifecycleEventStatus[] = ["draft", "published", "cancelled"];

describe("canDeleteEvent", () => {
  it.each(STATUSES)("permite eliminar un evento %s sin órdenes", (status) => {
    expect(canDeleteEvent({ status, orderCount: 0 })).toBe(true);
  });

  it.each(STATUSES)("bloquea eliminar un evento %s con órdenes", (status) => {
    expect(canDeleteEvent({ status, orderCount: 3 })).toBe(false);
  });
});

describe("canCancelEvent", () => {
  it("solo permite cancelar eventos publicados", () => {
    expect(canCancelEvent({ status: "published" })).toBe(true);
    expect(canCancelEvent({ status: "draft" })).toBe(false);
    expect(canCancelEvent({ status: "cancelled" })).toBe(false);
  });
});
