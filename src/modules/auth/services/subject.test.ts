import { describe, expect, it } from "vitest";

import { toAuthSubject } from "@/modules/auth/services/subject";

describe("toAuthSubject", () => {
  it("maps memberships and keeps only assignable permissions", () => {
    const subject = toAuthSubject({
      isSuperAdmin: false,
      memberships: [
        {
          organizationId: "org1",
          roleId: "admin",
          role: {
            permissions: ["members:manage", "roles:manage", "bogus", "events:manage"],
          },
        },
      ],
    });
    expect(subject).toEqual({
      isSuperAdmin: false,
      memberships: [
        {
          organizationId: "org1",
          roleId: "admin",
          permissions: ["members:manage", "events:manage"],
        },
      ],
    });
  });
});
