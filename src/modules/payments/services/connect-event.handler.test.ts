import { describe, expect, it, vi } from "vitest";

import {
  type ConnectEventDeps,
  handleConnectEvent,
} from "./connect-event.handler";

function makeDeps(overrides: Partial<ConnectEventDeps> = {}): ConnectEventDeps {
  return {
    hasProcessedEvent: vi.fn().mockResolvedValue(false),
    recordEvent: vi.fn().mockResolvedValue(undefined),
    findOrganizationIdByAccount: vi.fn().mockResolvedValue("org_1"),
    syncConnectStatus: vi.fn().mockResolvedValue("active"),
    logError: vi.fn(),
    ...overrides,
  };
}

const event = {
  id: "evt_1",
  type: "v2.core.account[requirements].updated",
  related_object: { id: "acct_1" },
};

describe("handleConnectEvent", () => {
  it("syncs the organization of a known account and records the event", async () => {
    const deps = makeDeps();
    await handleConnectEvent(event, deps);
    expect(deps.findOrganizationIdByAccount).toHaveBeenCalledWith("acct_1");
    expect(deps.syncConnectStatus).toHaveBeenCalledWith("org_1");
    expect(deps.recordEvent).toHaveBeenCalledWith({ id: "evt_1", type: event.type });
  });

  it("does nothing for an already processed event", async () => {
    const deps = makeDeps({ hasProcessedEvent: vi.fn().mockResolvedValue(true) });
    await handleConnectEvent(event, deps);
    expect(deps.syncConnectStatus).not.toHaveBeenCalled();
    expect(deps.recordEvent).not.toHaveBeenCalled();
  });

  it("ignores an unknown account without syncing", async () => {
    const deps = makeDeps({ findOrganizationIdByAccount: vi.fn().mockResolvedValue(null) });
    await handleConnectEvent(event, deps);
    expect(deps.syncConnectStatus).not.toHaveBeenCalled();
    expect(deps.recordEvent).toHaveBeenCalled();
  });

  it("ignores irrelevant event types", async () => {
    const deps = makeDeps();
    await handleConnectEvent({ ...event, type: "v2.core.account_person.updated" }, deps);
    expect(deps.findOrganizationIdByAccount).not.toHaveBeenCalled();
    expect(deps.syncConnectStatus).not.toHaveBeenCalled();
    expect(deps.recordEvent).toHaveBeenCalled();
  });

  it("ignores relevant events without related object", async () => {
    const deps = makeDeps();
    await handleConnectEvent({ ...event, related_object: null }, deps);
    expect(deps.syncConnectStatus).not.toHaveBeenCalled();
  });

  it("propagates sync failures without recording the event", async () => {
    const deps = makeDeps({ syncConnectStatus: vi.fn().mockRejectedValue(new Error("boom")) });
    await expect(handleConnectEvent(event, deps)).rejects.toThrow("boom");
    expect(deps.recordEvent).not.toHaveBeenCalled();
  });
});
