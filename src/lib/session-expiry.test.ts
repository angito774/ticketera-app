import { describe, expect, it } from "vitest";

import { getSessionExpiryInfo } from "./session-expiry";

const now = new Date(2026, 0, 1, 10, 0, 0);

describe("getSessionExpiryInfo", () => {
  it("formats the local time as HH:MM", () => {
    const info = getSessionExpiryInfo(new Date(2026, 0, 1, 9, 5), now);
    expect(info.label).toBe("09:05");
  });

  it("is not expiring soon with 30 minutes left", () => {
    const info = getSessionExpiryInfo(new Date(2026, 0, 1, 10, 30), now);
    expect(info).toEqual({ label: "10:30", expiringSoon: false });
  });

  it("is not expiring soon at exactly 5 minutes", () => {
    expect(getSessionExpiryInfo(new Date(2026, 0, 1, 10, 5), now).expiringSoon).toBe(false);
  });

  it("is expiring soon under 5 minutes", () => {
    expect(getSessionExpiryInfo(new Date(2026, 0, 1, 10, 4, 59), now).expiringSoon).toBe(true);
  });

  it("is expiring soon when already expired", () => {
    expect(getSessionExpiryInfo(new Date(2026, 0, 1, 9, 0), now).expiringSoon).toBe(true);
  });

  it("tolerates null and undefined", () => {
    expect(getSessionExpiryInfo(null, now)).toEqual({ label: null, expiringSoon: false });
    expect(getSessionExpiryInfo(undefined, now)).toEqual({ label: null, expiringSoon: false });
  });
});
