import { describe, expect, it } from "vitest";

import {
  EMPTY_CHECKOUT_VALUES,
  checkoutSchema,
  getFieldErrors,
  type CheckoutFormValues,
} from "@/modules/checkout/schemas/checkout.schema";

const VALID: CheckoutFormValues = {
  fullName: "Ana Quispe",
  email: "ana@correo.pe",
  documentType: "DNI",
  documentNumber: "45678912",
  phone: "987 654 321",
  acceptedTerms: true,
};

const errorsFor = (patch: Partial<CheckoutFormValues>) => getFieldErrors({ ...VALID, ...patch });

describe("checkout schema", () => {
  it("accepts valid values", () => {
    expect(getFieldErrors(VALID)).toEqual({});
    expect(checkoutSchema.safeParse(VALID).success).toBe(true);
  });

  it("reports every required field for an empty form", () => {
    const errors = getFieldErrors(EMPTY_CHECKOUT_VALUES);
    expect(Object.keys(errors).sort()).toEqual(
      ["acceptedTerms", "documentNumber", "email", "fullName", "phone"].sort()
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

  it("requires accepting the terms", () => {
    expect(errorsFor({ acceptedTerms: false }).acceptedTerms).toBeDefined();
  });
});
