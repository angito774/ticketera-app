import { describe, expect, it } from "vitest";

import {
  getNavSections,
  ROLE_LABEL,
} from "@/modules/auth/services/dashboard-nav";
import type { AuthSubject } from "@/modules/auth/services/permissions";

const superAdmin: AuthSubject = { isSuperAdmin: true, memberships: [] };
const admin: AuthSubject = {
  isSuperAdmin: false,
  memberships: [
    {
      organizationId: "org_a",
      roleId: "admin",
      permissions: ["members:manage", "events:manage", "tickets:redeem"],
    },
  ],
};
const organizer: AuthSubject = {
  isSuperAdmin: false,
  memberships: [
    {
      organizationId: "org_a",
      roleId: "organizer",
      permissions: ["events:manage", "tickets:redeem"],
    },
  ],
};

const labels = (subject: AuthSubject) =>
  getNavSections(subject).flatMap((s) => s.items.map((i) => i.label));

describe("getNavSections", () => {
  it("shows an organizer the events entry only", () => {
    expect(labels(organizer)).toEqual(["Eventos"]);
  });

  it("adds the administration section without Roles for admin", () => {
    const adminSection = getNavSections(admin).at(-1);
    expect(labels(admin)).toEqual([
      "Eventos",
      "Organizaciones",
      "Usuarios",
      "Clientes",
    ]);
    expect(adminSection).toMatchObject({
      title: "Administración",
      items: [
        { href: "/admin", icon: "building" },
        { href: "/admin/users", icon: "users", matchPrefix: "/admin/users" },
        {
          href: "/admin/customers",
          icon: "contact",
          matchPrefix: "/admin/customers",
        },
      ],
    });
    expect(adminSection?.items[0].matchPrefix).toBeUndefined();
  });

  it("adds Roles only for super admin", () => {
    expect(labels(superAdmin)).toEqual([
      "Eventos",
      "Organizaciones",
      "Usuarios",
      "Clientes",
      "Roles",
    ]);
    expect(getNavSections(superAdmin).at(-1)?.items[3]).toEqual({
      href: "/admin/roles",
      label: "Roles",
      icon: "shield",
      matchPrefix: "/admin/roles",
    });
    expect(labels(organizer)).not.toContain("Roles");
    expect(labels(organizer)).not.toContain("Clientes");
  });

  it("keeps Eventos active on the list and on its sub-routes", () => {
    const [events] = getNavSections(organizer);
    expect(events.items[0]).toMatchObject({
      href: "/organizer",
      icon: "dashboard",
      matchPrefix: "/organizer/events",
    });
  });
});

describe("ROLE_LABEL", () => {
  it("labels every role in Spanish", () => {
    expect(ROLE_LABEL).toEqual({
      super_admin: "Super admin",
      admin: "Administrador",
      organizer: "Organizador",
      customer: "Cliente",
    });
  });
});
