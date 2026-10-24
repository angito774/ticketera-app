import { describe, expect, it } from "vitest";

import type { CurrentUser } from "@/modules/auth/services/current-user.service";

import { checkoutBlockReason } from "./checkout-guard";

function user(impersonatedBy: unknown): CurrentUser {
  return { id: "u1", impersonatedBy } as unknown as CurrentUser;
}

describe("checkoutBlockReason", () => {
  it("devuelve impersonating cuando hay impersonación", () => {
    expect(checkoutBlockReason(user({ id: "admin" }))).toBe("impersonating");
  });

  it("devuelve null sin impersonación", () => {
    expect(checkoutBlockReason(user(null))).toBeNull();
  });

  it("devuelve null sin usuario", () => {
    expect(checkoutBlockReason(null)).toBeNull();
  });
});
