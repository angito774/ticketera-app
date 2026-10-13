import { describe, expect, it } from "vitest";
import type { ConnectAccountSnapshot } from "../types/connect.types";
import { mapConnectStatus } from "./connect-status.mapping";

const base: ConnectAccountSnapshot = {
  hasAccount: true,
  transfersCapability: "active",
  requirementsCurrentlyDue: 0,
  requirementsPastDue: 0,
};

describe("mapConnectStatus", () => {
  it("returns not_started when there is no account", () => {
    expect(
      mapConnectStatus({ ...base, hasAccount: false, transfersCapability: "unknown" }),
    ).toBe("not_started");
  });

  it("returns active with active transfers and no requirements", () => {
    expect(mapConnectStatus(base)).toBe("active");
  });

  it("returns restricted when requirements are past due", () => {
    expect(mapConnectStatus({ ...base, requirementsPastDue: 1 })).toBe("restricted");
  });

  it("returns restricted when the capability is restricted", () => {
    expect(mapConnectStatus({ ...base, transfersCapability: "restricted" })).toBe(
      "restricted",
    );
  });

  it("prioritizes restricted over pending requirements", () => {
    expect(
      mapConnectStatus({
        ...base,
        transfersCapability: "pending",
        requirementsCurrentlyDue: 2,
        requirementsPastDue: 1,
      }),
    ).toBe("restricted");
  });

  it("returns pending when active transfers still have currently due requirements", () => {
    expect(mapConnectStatus({ ...base, requirementsCurrentlyDue: 1 })).toBe("pending");
  });

  it.each(["pending", "inactive", "unknown"] as const)(
    "returns pending when the capability is %s",
    (transfersCapability) => {
      expect(mapConnectStatus({ ...base, transfersCapability })).toBe("pending");
    },
  );
});
