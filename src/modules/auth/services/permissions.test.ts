import { describe, expect, it } from "vitest";

import {
  assignableRoles,
  can,
  highestRole,
  type AuthSubject,
} from "@/modules/auth/services/permissions";

const superAdmin: AuthSubject = { isSuperAdmin: true, memberships: [] };
const admin: AuthSubject = {
  isSuperAdmin: false,
  memberships: [{ organizationId: "org_a", role: "admin" }],
};
const organizer: AuthSubject = {
  isSuperAdmin: false,
  memberships: [{ organizationId: "org_a", role: "organizer" }],
};
const customer: AuthSubject = { isSuperAdmin: false, memberships: [] };

describe("can", () => {
  it("lets the super admin do everything", () => {
    expect(can(superAdmin, "organizations:manage")).toBe(true);
    expect(can(superAdmin, "members:manage", "org_x")).toBe(true);
  });

  it("restricts organization management to the super admin", () => {
    expect(can(admin, "organizations:manage")).toBe(false);
  });

  it("scopes admin and organizer permissions to their organization", () => {
    expect(can(admin, "members:manage", "org_a")).toBe(true);
    expect(can(admin, "members:manage", "org_b")).toBe(false);
    expect(can(organizer, "events:manage", "org_a")).toBe(true);
    expect(can(organizer, "members:manage", "org_a")).toBe(false);
  });

  it("checks any membership when no organization is given", () => {
    expect(can(organizer, "events:manage")).toBe(true);
    expect(can(customer, "events:manage")).toBe(false);
  });
});

describe("assignableRoles", () => {
  it("gives the super admin both roles", () => {
    expect(assignableRoles(superAdmin, "org_a")).toEqual(["admin", "organizer"]);
  });

  it("limits an admin to organizers of their own organization", () => {
    expect(assignableRoles(admin, "org_a")).toEqual(["organizer"]);
    expect(assignableRoles(admin, "org_b")).toEqual([]);
  });

  it("gives organizers and customers nothing", () => {
    expect(assignableRoles(organizer, "org_a")).toEqual([]);
    expect(assignableRoles(customer, "org_a")).toEqual([]);
  });
});

describe("highestRole", () => {
  it("returns the top role", () => {
    expect(highestRole(superAdmin)).toBe("super_admin");
    expect(highestRole(admin)).toBe("admin");
    expect(highestRole(organizer)).toBe("organizer");
    expect(highestRole(customer)).toBe("customer");
  });
});
