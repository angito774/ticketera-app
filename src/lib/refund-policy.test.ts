import { describe, expect, it } from "vitest";
import { addBusinessDays } from "./business-days";
import {
  getRefundDeadline,
  REFUND_DEADLINE_TEXT,
  REFUND_MAX_BUSINESS_DAYS,
  REFUND_WARNING_BUSINESS_DAYS,
} from "./refund-policy";

const cancelledAt = new Date("2026-10-05T15:00:00Z");
const nowAfter = (days: number) => new Date(`${addBusinessDays("2026-10-05", days)}T15:00:00Z`);

describe("getRefundDeadline", () => {
  it("sin fecha de cancelación es unknown y sin días", () => {
    expect(getRefundDeadline(null, new Date())).toEqual({ state: "unknown", businessDays: null });
  });

  it.each([
    [0, "on_track"],
    [9, "on_track"],
    [10, "warning"],
    [14, "warning"],
    [15, "overdue"],
    [20, "overdue"],
  ] as const)("%i días hábiles es %s", (days, state) => {
    expect(getRefundDeadline(cancelledAt, nowAfter(days))).toEqual({ state, businessDays: days });
  });
});

describe("constantes", () => {
  it("el texto se deriva de la constante", () => {
    expect(REFUND_MAX_BUSINESS_DAYS).toBe(15);
    expect(REFUND_WARNING_BUSINESS_DAYS).toBe(10);
    expect(REFUND_DEADLINE_TEXT).toBe(`máximo ${REFUND_MAX_BUSINESS_DAYS} días hábiles`);
  });
});
