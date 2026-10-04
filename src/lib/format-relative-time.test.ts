import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "@/lib/format-relative-time";

const now = new Date(Date.UTC(2026, 9, 15, 12, 0, 0));
const daysAgo = (n: number) => new Date(Date.UTC(2026, 9, 15 - n, 23, 0, 0)).toISOString();

describe("formatRelativeTime", () => {
  it("returns Nunca for null", () => {
    expect(formatRelativeTime(null, now)).toBe("Nunca");
  });

  it("returns Hoy for the same calendar day", () => {
    expect(formatRelativeTime("2026-10-15T00:05:00.000Z", now)).toBe("Hoy");
  });

  it("uses UTC calendar days near midnight", () => {
    const justAfterMidnight = new Date("2026-10-15T00:01:00.000Z");
    expect(formatRelativeTime("2026-10-14T23:59:00.000Z", justAfterMidnight)).toBe("Ayer");
    expect(formatRelativeTime("2026-10-15T00:00:00.000Z", justAfterMidnight)).toBe("Hoy");
  });

  it("returns Ayer for the previous calendar day", () => {
    expect(formatRelativeTime(daysAgo(1), now)).toBe("Ayer");
  });

  it("returns days under a week", () => {
    expect(formatRelativeTime(daysAgo(2), now)).toBe("Hace 2 días");
    expect(formatRelativeTime(daysAgo(6), now)).toBe("Hace 6 días");
  });

  it("returns weeks with correct plural", () => {
    expect(formatRelativeTime(daysAgo(7), now)).toBe("Hace 1 semana");
    expect(formatRelativeTime(daysAgo(14), now)).toBe("Hace 2 semanas");
    expect(formatRelativeTime(daysAgo(29), now)).toBe("Hace 4 semanas");
  });

  it("returns months with correct plural", () => {
    expect(formatRelativeTime(daysAgo(30), now)).toBe("Hace 1 mes");
    expect(formatRelativeTime(daysAgo(65), now)).toBe("Hace 2 meses");
  });
});
