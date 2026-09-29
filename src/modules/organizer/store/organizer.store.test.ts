import { beforeEach, describe, expect, it } from "vitest";

import { useOrganizerStore } from "@/modules/organizer/store/organizer.store";
import type { OrganizerEvent } from "@/modules/organizer/types/organizer.types";

const EVENT: OrganizerEvent = {
  id: "org-1",
  catalogEventId: null,
  status: "draft",
  title: "Borrador",
  category: null,
  description: "",
  startsAt: null,
  venue: "",
  city: "",
  imageUrl: null,
  tiers: [],
};

const store = () => useOrganizerStore.getState();

beforeEach(() => {
  localStorage.clear();
  useOrganizerStore.setState({ savedEvents: [] });
});

describe("organizer.store", () => {
  it("adds a new event", () => {
    store().saveEvent(EVENT);
    expect(store().savedEvents).toEqual([EVENT]);
  });

  it("replaces an event with the same id instead of duplicating it", () => {
    store().saveEvent(EVENT);
    store().saveEvent({ ...EVENT, title: "Publicado", status: "published" });
    expect(store().savedEvents).toEqual([{ ...EVENT, title: "Publicado", status: "published" }]);
  });

  it("persists in localStorage", () => {
    store().saveEvent(EVENT);
    const saved = JSON.parse(localStorage.getItem("ticketera-organizer") ?? "{}");
    expect(saved.state.savedEvents[0].id).toBe("org-1");
  });
});
