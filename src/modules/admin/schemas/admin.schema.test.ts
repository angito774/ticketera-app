import { describe, expect, it } from "vitest";

import {
  addMemberSchema,
  changeRoleSchema,
} from "@/modules/admin/schemas/admin.schema";

describe("addMemberSchema", () => {
  const valid = { organizationId: "org_1", email: "Ana@Example.com", fullName: "Ana", role: "organizer" };

  it("normalizes the email", () => {
    expect(addMemberSchema.parse(valid).email).toBe("ana@example.com");
  });

  it("rejects an empty role and bad emails", () => {
    expect(addMemberSchema.safeParse({ ...valid, role: "  " }).success).toBe(false);
    expect(addMemberSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });
});

describe("other schemas", () => {
  it("validates role changes", () => {
    expect(changeRoleSchema.safeParse({ memberId: "m", role: "gate-staff" }).success).toBe(true);
    expect(changeRoleSchema.safeParse({ memberId: "m", role: "" }).success).toBe(false);
  });
});
