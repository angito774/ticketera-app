import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateBadge,
  formatLongDate,
  formatPrice,
  formatShortDate,
  formatTime,
} from "@/lib/format";

// Intl puede usar espacios no separables; se normalizan para comparar.
const normalize = (value: string) => value.replace(/\s/g, " ");

// 20:00 en Lima = 01:00 UTC del día siguiente: detecta formateos en la zona equivocada.
const LATE_EVENT = "2026-11-14T20:00:00-05:00";

describe("formatPrice", () => {
  it("formats soles without decimals for whole amounts", () => {
    expect(normalize(formatPrice(350))).toBe("S/ 350");
  });

  it("uses thousands separators", () => {
    expect(normalize(formatPrice(1450))).toBe("S/ 1,450");
  });

  it("keeps decimals when present", () => {
    expect(normalize(formatPrice(99.5))).toBe("S/ 99.5");
  });
});

describe("date formatters (America/Lima)", () => {
  it("formats the full date in Lima time, not UTC", () => {
    expect(formatDate(LATE_EVENT)).toBe("14 de noviembre de 2026");
  });

  it("formats the long date with weekday", () => {
    expect(formatLongDate(LATE_EVENT)).toBe("sábado, 14 de noviembre");
  });

  it("formats the short date", () => {
    expect(normalize(formatShortDate(LATE_EVENT))).toBe("sáb, 14 nov.");
  });

  it("formats the time in 24h", () => {
    expect(formatTime(LATE_EVENT)).toBe("20:00");
  });

  it("returns month and day for the calendar badge", () => {
    expect(formatDateBadge(LATE_EVENT)).toEqual({ month: "NOV", day: "14" });
  });
});
