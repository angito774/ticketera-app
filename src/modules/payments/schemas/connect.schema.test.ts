import { describe, expect, it } from "vitest";
import { connectOrganizationInputSchema } from "./connect.schema";

const uuid = "123e4567-e89b-12d3-a456-426614174000";

describe("connectOrganizationInputSchema", () => {
  it("accepts an org_<uuid> id", () => {
    const result = connectOrganizationInputSchema.safeParse({
      organizationId: `org_${uuid}`,
    });
    expect(result.success).toBe(true);
  });

  it("accepts uppercase hex", () => {
    expect(
      connectOrganizationInputSchema.safeParse({
        organizationId: `org_${uuid.toUpperCase()}`,
      }).success,
    ).toBe(true);
  });

  it.each([
    ["missing prefix", uuid],
    ["wrong prefix", `usr_${uuid}`],
    ["short id", "org_123"],
    ["empty", ""],
    ["non-hex chars", `org_${"z".repeat(36)}`],
    ["a Stripe account id", "acct_1234567890"],
    ["trailing junk", `org_${uuid}x`],
  ])("rejects %s", (_label, organizationId) => {
    expect(connectOrganizationInputSchema.safeParse({ organizationId }).success).toBe(
      false,
    );
  });

  it("rejects a missing field", () => {
    expect(connectOrganizationInputSchema.safeParse({}).success).toBe(false);
  });
});
