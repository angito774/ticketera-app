import { describe, expect, it } from "vitest";

import {
  addMemberSchema,
  changeRoleSchema,
  createOrganizationSchema,
  slugify,
} from "@/modules/admin/schemas/admin.schema";

describe("slugify", () => {
  it("lowercases, strips accents and joins with dashes", () => {
    expect(slugify("  Teatro Municipal — Lima! ")).toBe("teatro-municipal-lima");
    expect(slugify("Música Ñandú")).toBe("musica-nandu");
  });
});

describe("addMemberSchema", () => {
  const valid = { organizationId: "org_1", email: "Ana@Example.com", fullName: "Ana", role: "organizer" };

  it("normalizes the email", () => {
    expect(addMemberSchema.parse(valid).email).toBe("ana@example.com");
  });

  it("rejects the super admin role and bad emails", () => {
    expect(addMemberSchema.safeParse({ ...valid, role: "super_admin" }).success).toBe(false);
    expect(addMemberSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });
});

describe("other schemas", () => {
  it("validates organization name and role changes", () => {
    expect(createOrganizationSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(createOrganizationSchema.safeParse({ name: "Mi Productora" }).success).toBe(true);
    expect(changeRoleSchema.safeParse({ memberId: "m", role: "admin" }).success).toBe(true);
    expect(changeRoleSchema.safeParse({ memberId: "m", role: "customer" }).success).toBe(false);
  });
});
