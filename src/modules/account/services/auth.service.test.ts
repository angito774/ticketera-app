import { describe, expect, it } from "vitest";

import {
  DEMO_ACCOUNT,
  EMAIL_TAKEN,
  INVALID_CREDENTIALS,
  authenticate,
  getInitials,
  register,
  safeNextPath,
} from "@/modules/account/services/auth.service";

const registered = [{ name: "Luis Rojas", email: "luis@correo.pe" }];

describe("authenticate", () => {
  it("signs in the demo account with its password, ignoring email case and spaces", () => {
    expect(authenticate(" Demo@Ticketera.pe ", "ticketera123", [])).toEqual({
      ok: true,
      user: DEMO_ACCOUNT.user,
    });
  });

  it("rejects the demo account with a wrong password", () => {
    expect(authenticate("demo@ticketera.pe", "otra-clave", [])).toEqual({
      ok: false,
      error: INVALID_CREDENTIALS,
    });
  });

  it("signs in a registered account", () => {
    expect(authenticate("LUIS@correo.pe", "cualquiera1", registered)).toEqual({
      ok: true,
      user: registered[0],
    });
  });

  it("rejects an unknown email", () => {
    expect(authenticate("nadie@correo.pe", "x", registered).ok).toBe(false);
  });
});

describe("register", () => {
  const values = { fullName: " Luz Mamani ", email: "Luz@Correo.pe", password: "clave2026", acceptedTerms: true };

  it("creates a user with a normalized email and no password", () => {
    const result = register(values, registered);
    expect(result).toEqual({ ok: true, user: { name: "Luz Mamani", email: "luz@correo.pe" } });
  });

  it("rejects emails already in use, including the demo account", () => {
    expect(register({ ...values, email: "luis@correo.pe" }, registered)).toEqual({ ok: false, error: EMAIL_TAKEN });
    expect(register({ ...values, email: "DEMO@ticketera.pe" }, registered).ok).toBe(false);
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/events/concert-01", "/events/concert-01"],
    [null, "/my-tickets"],
    ["", "/my-tickets"],
    ["https://evil.com", "/my-tickets"],
    ["//evil.com", "/my-tickets"],
    ["/\\evil.com", "/my-tickets"],
  ])("%s → %s", (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });
});

describe("getInitials", () => {
  it.each([
    ["Ana Quispe", "AQ"],
    ["ana", "A"],
    ["  maría  del carmen  ", "MD"],
  ])("%s → %s", (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});
