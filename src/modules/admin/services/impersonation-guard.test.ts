import { describe, expect, it } from "vitest";

import { assertCanImpersonate } from "@/modules/admin/services/impersonation-guard";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";

const superAdmin: CurrentUser = {
  id: "u_super",
  email: "super@x.com",
  fullName: "Super",
  role: "super_admin",
  isSuperAdmin: true,
  memberships: [],
  impersonatedBy: null,
};
const plainTarget = { id: "u_target", isSuperAdmin: false };

describe("assertCanImpersonate", () => {
  it("permite a un super admin sobre un usuario normal", () => {
    expect(assertCanImpersonate({ actor: superAdmin, target: plainTarget })).toEqual({ ok: true });
  });

  it("rechaza a un actor que no es super admin aunque gestione miembros", () => {
    const admin = {
      ...superAdmin,
      isSuperAdmin: false,
      memberships: [
        { organizationId: "o1", roleId: "admin", permissions: ["members:manage"] },
      ],
    } as CurrentUser;
    expect(assertCanImpersonate({ actor: admin, target: plainTarget })).toEqual({
      ok: false,
      reason: "not_super_admin",
    });
  });

  it("rechaza al propio usuario", () => {
    expect(
      assertCanImpersonate({ actor: superAdmin, target: { id: "u_super", isSuperAdmin: true } }),
    ).toEqual({ ok: false, reason: "self" });
  });

  it("rechaza a otro super admin", () => {
    expect(
      assertCanImpersonate({ actor: superAdmin, target: { id: "u2", isSuperAdmin: true } }),
    ).toEqual({ ok: false, reason: "target_super_admin" });
  });

  it("rechaza la impersonación anidada", () => {
    const nested: CurrentUser = {
      ...superAdmin,
      impersonatedBy: { id: "u_real", email: "r@x.com", fullName: null },
    };
    expect(assertCanImpersonate({ actor: nested, target: plainTarget })).toEqual({
      ok: false,
      reason: "nested",
    });
  });

  it("rechaza un destino inexistente", () => {
    expect(assertCanImpersonate({ actor: superAdmin, target: null })).toEqual({
      ok: false,
      reason: "target_not_found",
    });
  });

  describe("orden de evaluación", () => {
    it("not_super_admin gana sobre self", () => {
      const actor = { ...superAdmin, isSuperAdmin: false };
      expect(
        assertCanImpersonate({ actor, target: { id: actor.id, isSuperAdmin: false } }),
      ).toEqual({ ok: false, reason: "not_super_admin" });
    });

    it("self gana sobre target_super_admin", () => {
      expect(
        assertCanImpersonate({ actor: superAdmin, target: { id: "u_super", isSuperAdmin: true } }),
      ).toEqual({ ok: false, reason: "self" });
    });

    it("target_super_admin gana sobre nested", () => {
      const nested: CurrentUser = {
        ...superAdmin,
        impersonatedBy: { id: "u_real", email: "r@x.com", fullName: null },
      };
      expect(
        assertCanImpersonate({ actor: nested, target: { id: "u2", isSuperAdmin: true } }),
      ).toEqual({ ok: false, reason: "target_super_admin" });
    });

    it("nested gana sobre target_not_found", () => {
      const nested: CurrentUser = {
        ...superAdmin,
        impersonatedBy: { id: "u_real", email: "r@x.com", fullName: null },
      };
      expect(assertCanImpersonate({ actor: nested, target: null })).toEqual({
        ok: false,
        reason: "nested",
      });
    });
  });
});
