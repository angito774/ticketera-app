import { describe, expect, it } from "vitest";

import {
  addMemberGuardError,
  memberGuardError,
} from "@/modules/admin/services/member-guard";
import type { RoleDef } from "@/modules/auth/services/permissions";

const roles: RoleDef[] = [
  { id: "admin", name: "Admin", permissions: ["members:manage", "events:manage"], isSystem: true },
  { id: "organizer", name: "Organizer", permissions: ["events:manage"], isSystem: true },
];

const adminActor = {
  id: "u_admin",
  isSuperAdmin: false,
  memberships: [
    { organizationId: "o1", roleId: "admin", permissions: ["members:manage", "events:manage"] as RoleDef["permissions"] },
  ],
};
const superActor = { id: "u_super", isSuperAdmin: true, memberships: [] };

const member = (userId: string, roleId: string) => ({ userId, organizationId: "o1", roleId });

describe("memberGuardError", () => {
  it("rechaza al propio usuario", () => {
    expect(memberGuardError(adminActor, member("u_admin", "organizer"), roles)).toBe(
      "No puedes modificar tu propio rol",
    );
  });
  it("rechaza al propio usuario aun siendo super admin", () => {
    expect(memberGuardError(superActor, member("u_super", "admin"), roles)).not.toBeNull();
  });
  it("rechaza un rol no gestionable", () => {
    expect(memberGuardError(adminActor, member("u2", "admin"), roles)).toBe(
      "Sin permiso sobre este miembro",
    );
  });
  it("permite un rol gestionable", () => {
    expect(memberGuardError(adminActor, member("u2", "organizer"), roles)).toBeNull();
  });
  it("permite al super admin sobre otros", () => {
    expect(memberGuardError(superActor, member("u2", "admin"), roles)).toBeNull();
  });
});

describe("addMemberGuardError", () => {
  const self = "No puedes modificar tu propio rol";

  it("sin membresía y objetivo otra persona: permite", () => {
    expect(addMemberGuardError(adminActor, "u2", null, roles)).toBeNull();
  });
  it("sin membresía y objetivo el propio actor: rechaza", () => {
    expect(addMemberGuardError(adminActor, "u_admin", null, roles)).toBe(self);
  });
  it("sin membresía y objetivo el propio actor super admin: rechaza igual", () => {
    expect(addMemberGuardError(superActor, "u_super", null, roles)).toBe(self);
  });
  it("con membresía gestionable: permite", () => {
    expect(addMemberGuardError(adminActor, "u2", member("u2", "organizer"), roles)).toBeNull();
  });
  it("con membresía no gestionable: rechaza", () => {
    expect(addMemberGuardError(adminActor, "u2", member("u2", "admin"), roles)).toBe(
      "Sin permiso sobre este miembro",
    );
  });
  it("super admin sobre otro con membresía: permite", () => {
    expect(addMemberGuardError(superActor, "u2", member("u2", "admin"), roles)).toBeNull();
  });
});
