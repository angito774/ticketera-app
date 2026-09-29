import { describe, expect, it } from "vitest";

import {
  EMPTY_CHECKOUT_VALUES,
  getFieldErrors,
  isCardExpiryValid,
  type CheckoutFormValues,
} from "@/modules/checkout/schemas/checkout.schema";

const NOW = new Date("2026-09-29T12:00:00-05:00");

const VALID: CheckoutFormValues = {
  fullName: "Ana Quispe",
  email: "ana@correo.pe",
  documentType: "DNI",
  documentNumber: "45678912",
  phone: "987 654 321",
  paymentMethod: "card",
  card: { number: "4111 1111 1111 1111", expiry: "12/28", cvv: "123", holder: "ANA QUISPE" },
  acceptedTerms: true,
};

const errorsFor = (patch: Partial<CheckoutFormValues>) =>
  getFieldErrors({ ...VALID, ...patch }, NOW);

describe("checkout schema", () => {
  it("accepts valid values", () => {
    expect(getFieldErrors(VALID, NOW)).toEqual({});
  });

  it("reports every required field for an empty form", () => {
    const errors = getFieldErrors(EMPTY_CHECKOUT_VALUES, NOW);
    expect(Object.keys(errors).sort()).toEqual(
      [
        "acceptedTerms",
        "card.cvv",
        "card.expiry",
        "card.holder",
        "card.number",
        "documentNumber",
        "email",
        "fullName",
        "phone",
      ].sort()
    );
  });

  it.each([
    ["DNI", "1234567", true],
    ["DNI", "12345678", false],
    ["CE", "12345678", true],
    ["CE", "123456789", false],
    ["PASSPORT", "AB12", true],
    ["PASSPORT", "AB123456", false],
  ] as const)("validates %s number %s (error: %s)", (documentType, documentNumber, hasError) => {
    expect(Boolean(errorsFor({ documentType, documentNumber }).documentNumber)).toBe(hasError);
  });

  it("requires a 9-digit Peruvian mobile starting with 9", () => {
    expect(errorsFor({ phone: "887654321" }).phone).toBeDefined();
    expect(errorsFor({ phone: "98765432" }).phone).toBeDefined();
    expect(errorsFor({ phone: "987654321" }).phone).toBeUndefined();
  });

  it("rejects an invalid email", () => {
    expect(errorsFor({ email: "ana@" }).email).toBeDefined();
  });

  it("validates card fields only when paying by card", () => {
    const badCard = { number: "4111", expiry: "13/20", cvv: "1", holder: "" };
    expect(Object.keys(errorsFor({ card: badCard }))).toEqual([
      "card.number",
      "card.expiry",
      "card.cvv",
      "card.holder",
    ]);
    expect(errorsFor({ card: badCard, paymentMethod: "yape" })).toEqual({});
    expect(errorsFor({ card: badCard, paymentMethod: "cash" })).toEqual({});
  });

  it("requires accepting the terms", () => {
    expect(errorsFor({ acceptedTerms: false }).acceptedTerms).toBeDefined();
  });
});

describe("isCardExpiryValid", () => {
  it("accepts the current month and future dates", () => {
    expect(isCardExpiryValid("09/26", NOW)).toBe(true);
    expect(isCardExpiryValid("01/30", NOW)).toBe(true);
  });

  it("rejects past dates, invalid months and bad formats", () => {
    expect(isCardExpiryValid("08/26", NOW)).toBe(false);
    expect(isCardExpiryValid("00/28", NOW)).toBe(false);
    expect(isCardExpiryValid("13/28", NOW)).toBe(false);
    expect(isCardExpiryValid("1228", NOW)).toBe(false);
  });
});
