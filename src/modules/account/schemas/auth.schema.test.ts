import { describe, expect, it } from "vitest";

import { getLoginErrors, getRegisterErrors } from "@/modules/account/schemas/auth.schema";

describe("getLoginErrors", () => {
  it("accepts a valid email and any non-empty password", () => {
    expect(getLoginErrors({ email: " demo@ticketera.pe ", password: "x" })).toEqual({});
  });

  it("requires a valid email and a password", () => {
    expect(Object.keys(getLoginErrors({ email: "demo@", password: "" }))).toEqual([
      "email",
      "password",
    ]);
  });
});

describe("getRegisterErrors", () => {
  const valid = {
    fullName: "Ana Quispe",
    email: "ana@correo.pe",
    password: "entradas2026",
    acceptedTerms: true,
  };

  it("accepts valid values", () => {
    expect(getRegisterErrors(valid)).toEqual({});
  });

  it("reports every invalid field of an empty form", () => {
    expect(
      Object.keys(getRegisterErrors({ fullName: "", email: "", password: "", acceptedTerms: false })).sort()
    ).toEqual(["acceptedTerms", "email", "fullName", "password"]);
  });

  it.each([
    ["short1", "Usa al menos 8 caracteres."],
    ["12345678", "Incluye al menos una letra."],
    ["solamenteletras", "Incluye al menos un número."],
  ])("rejects the weak password %s", (password, message) => {
    expect(getRegisterErrors({ ...valid, password }).password).toBe(message);
  });
});
