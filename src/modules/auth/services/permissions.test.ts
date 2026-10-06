import { describe, expect, it } from "vitest";

import {
  ASSIGNABLE_PERMISSIONS,
  assignableRoles,
  can,
  highestRole,
  type AuthSubject,
  type Permission,
  type RoleDef,
} from "@/modules/auth/services/permissions";

const member = (
  organizationId: string,
  roleId: string,
  permissions: Permission[],
) => ({ organizationId, roleId, permissions });

const superAdmin: AuthSubject = { isSuperAdmin: true, memberships: [] };
const admin: AuthSubject = {
  isSuperAdmin: false,
  memberships: [
    member("org_a", "admin", ["members:manage", "events:manage", "tickets:redeem"]),
  ],
};
const organizer: AuthSubject = {
  isSuperAdmin: false,
  memberships: [member("org_a", "organizer", ["events:manage", "tickets:redeem"])],
};
const customer: AuthSubject = { isSuperAdmin: false, memberships: [] };

const adminRole: RoleDef = {
  id: "admin",
  name: "Administrador",
  permissions: ["members:manage", "events:manage", "tickets:redeem"],
  isSystem: true,
};
const organizerRole: RoleDef = {
  id: "organizer",
  name: "Organizador",
  permissions: ["events:manage", "tickets:redeem"],
  isSystem: true,
};
const scannerRole: RoleDef = {
  id: "scanner",
  name: "Validador",
  permissions: ["tickets:redeem"],
  isSystem: false,
};
const noPermsRole: RoleDef = {
  id: "viewer",
  name: "Observador",
  permissions: [],
  isSystem: false,
};
const roles = [adminRole, organizerRole, scannerRole, noPermsRole];

describe("can", () => {
  it("lets the super admin do everything", () => {
    expect(can(superAdmin, "organizations:manage")).toBe(true);
    expect(can(superAdmin, "roles:manage")).toBe(true);
    expect(can(superAdmin, "members:manage", "org_x")).toBe(true);
  });

  it("restricts organization and role management to the super admin", () => {
    expect(can(admin, "organizations:manage")).toBe(false);
    expect(can(admin, "roles:manage")).toBe(false);
  });

  it("restricts events:feature to the super admin", () => {
    expect(can(superAdmin, "events:feature")).toBe(true);
    expect(can(admin, "events:feature", "org_a")).toBe(false);
    expect(can(organizer, "events:feature")).toBe(false);
    const sneaky: AuthSubject = {
      isSuperAdmin: false,
      memberships: [member("org_a", "x", ["events:feature"])],
    };
    expect(can(sneaky, "events:feature", "org_a")).toBe(false);
    expect(ASSIGNABLE_PERMISSIONS).not.toContain("events:feature");
  });

  it("ignores non-assignable permissions even if a role carries them", () => {
    const sneaky: AuthSubject = {
      isSuperAdmin: false,
      memberships: [member("org_a", "x", ["roles:manage", "organizations:manage"])],
    };
    expect(can(sneaky, "roles:manage")).toBe(false);
    expect(can(sneaky, "organizations:manage", "org_a")).toBe(false);
  });

  it("scopes permissions to their organization", () => {
    expect(can(admin, "members:manage", "org_a")).toBe(true);
    expect(can(admin, "members:manage", "org_b")).toBe(false);
    expect(can(organizer, "events:manage", "org_a")).toBe(true);
    expect(can(organizer, "members:manage", "org_a")).toBe(false);
  });

  it("checks any membership when no organization is given", () => {
    expect(can(organizer, "events:manage")).toBe(true);
    expect(can(customer, "events:manage")).toBe(false);
  });

  it("evaluates the permissions of custom roles", () => {
    const scanner: AuthSubject = {
      isSuperAdmin: false,
      memberships: [member("org_a", "scanner", ["tickets:redeem"])],
    };
    expect(can(scanner, "tickets:redeem", "org_a")).toBe(true);
    expect(can(scanner, "events:manage", "org_a")).toBe(false);
  });
});

describe("assignableRoles", () => {
  it("gives the super admin every role", () => {
    expect(assignableRoles(superAdmin, "org_a", roles)).toEqual(roles);
  });

  it("limits an admin to roles without members:manage in their organization", () => {
    expect(assignableRoles(admin, "org_a", roles)).toEqual([
      organizerRole,
      scannerRole,
      noPermsRole,
    ]);
    expect(assignableRoles(admin, "org_b", roles)).toEqual([]);
  });

  it("never lets a members:manage role be assigned by a non-super admin", () => {
    expect(assignableRoles(admin, "org_a", [adminRole])).toEqual([]);
  });

  it("prevents escalation beyond the assigner's own permissions", () => {
    const limitedAdmin: AuthSubject = {
      isSuperAdmin: false,
      memberships: [member("org_a", "custom", ["members:manage", "tickets:redeem"])],
    };
    expect(assignableRoles(limitedAdmin, "org_a", roles)).toEqual([
      scannerRole,
      noPermsRole,
    ]);
  });

  it("ignores non-assignable permissions held by a hand-built subject", () => {
    const forged: AuthSubject = {
      isSuperAdmin: false,
      memberships: [member("org_a", "x", ["members:manage", "roles:manage"])],
    };
    const rolesRole: RoleDef = {
      id: "roles_role",
      name: "Roles",
      permissions: ["roles:manage"],
      isSystem: false,
    };
    expect(assignableRoles(forged, "org_a", [rolesRole])).toEqual([]);
  });

  it("gives organizers and customers nothing", () => {
    expect(assignableRoles(organizer, "org_a", roles)).toEqual([]);
    expect(assignableRoles(customer, "org_a", roles)).toEqual([]);
  });
});

describe("highestRole", () => {
  it("derives the top role from permissions", () => {
    expect(highestRole(superAdmin)).toBe("super_admin");
    expect(highestRole(admin)).toBe("admin");
    expect(highestRole(organizer)).toBe("organizer");
    expect(highestRole(customer)).toBe("customer");
  });

  it("treats memberships without management permissions as customer", () => {
    const scanner: AuthSubject = {
      isSuperAdmin: false,
      memberships: [member("org_a", "scanner", ["tickets:redeem"])],
    };
    expect(highestRole(scanner)).toBe("customer");
  });

  it("takes the highest across memberships and custom roles", () => {
    const mixed: AuthSubject = {
      isSuperAdmin: false,
      memberships: [
        member("org_a", "organizer", ["events:manage"]),
        member("org_b", "custom", ["members:manage"]),
      ],
    };
    expect(highestRole(mixed)).toBe("admin");
  });
});
