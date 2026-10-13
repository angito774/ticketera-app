import { describe, expect, it } from "vitest";

import {
  refundEventInputSchema,
  refundOrderInputSchema,
  retrySettlementInputSchema,
  settleEventInputSchema,
} from "./refund.schema";

const uuid = "123e4567-e89b-12d3-a456-426614174000";

describe.each([
  ["refundOrderInputSchema", refundOrderInputSchema, "orderId"],
  ["refundEventInputSchema", refundEventInputSchema, "eventId"],
  ["settleEventInputSchema", settleEventInputSchema, "eventId"],
  ["retrySettlementInputSchema", retrySettlementInputSchema, "settlementId"],
] as const)("%s", (_name, schema, key) => {
  it("accepts a uuid", () => {
    expect(schema.safeParse({ [key]: uuid }).success).toBe(true);
  });

  it("rejects a non-uuid, an empty value and a missing key", () => {
    expect(schema.safeParse({ [key]: "abc" }).success).toBe(false);
    expect(schema.safeParse({ [key]: "" }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });
});
