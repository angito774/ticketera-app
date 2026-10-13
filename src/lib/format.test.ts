import { describe, expect, it } from "vitest";
import {
  formatCompactPrice,
  formatDate,
  formatDateBadge,
  formatDeltaPct,
  formatLongDate,
  formatPercent,
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

describe("formatCompactPrice", () => {
  it("shows whole soles below one thousand", () => {
    expect(formatCompactPrice(85_000)).toBe("S/ 850");
    expect(formatCompactPrice(0)).toBe("S/ 0");
  });

  it("abbreviates thousands with mil", () => {
    expect(formatCompactPrice(1_200_000)).toBe("S/ 12 mil");
    expect(formatCompactPrice(150_000)).toBe("S/ 1,5 mil");
  });

  it("abbreviates millions with M", () => {
    expect(formatCompactPrice(150_000_000)).toBe("S/ 1,5 M");
    expect(formatCompactPrice(99_999_999)).toBe("S/ 1 M");
  });

  it("keeps the sign of negative amounts", () => {
    expect(formatCompactPrice(-1_200_000)).toBe("-S/ 12 mil");
  });
});

describe("formatPercent", () => {
  it("rounds to whole percent by default", () => {
    expect(formatPercent(0.734)).toBe("73 %");
    expect(formatPercent(1)).toBe("100 %");
    expect(formatPercent(0)).toBe("0 %");
  });

  it("supports fraction digits with decimal comma", () => {
    expect(formatPercent(0.7345, 1)).toBe("73,5 %");
  });
});

describe("formatDeltaPct", () => {
  it("prefixes positive values with plus", () => {
    expect(formatDeltaPct(12.34)).toBe("+12,3 %");
  });

  it("keeps the minus sign and one decimal", () => {
    expect(formatDeltaPct(-4)).toBe("-4,0 %");
    expect(formatDeltaPct(-100)).toBe("-100,0 %");
  });

  it("shows no sign for zero or values that round to zero", () => {
    expect(formatDeltaPct(0)).toBe("0,0 %");
    expect(formatDeltaPct(-0.04)).toBe("0,0 %");
  });

  it("returns a dash when there is no comparison base", () => {
    expect(formatDeltaPct(null)).toBe("—");
    expect(formatDeltaPct(Number.NaN)).toBe("—");
    expect(formatDeltaPct(Infinity)).toBe("—");
  });
});
