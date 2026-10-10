import { describe, expect, it } from "vitest";
import { checkoutMetadataSchema } from "./checkout-metadata.schema";

describe("checkoutMetadataSchema", () => {
  it("accepts a uuid orderId", () => {
    const orderId = "0f8fad5b-d9cb-469f-a165-70867728950e";
    expect(checkoutMetadataSchema.parse({ orderId })).toEqual({ orderId });
  });

  it("ignores extra keys", () => {
    const orderId = "0f8fad5b-d9cb-469f-a165-70867728950e";
    expect(checkoutMetadataSchema.parse({ orderId, other: "x" })).toEqual({ orderId });
  });

  it("rejects a missing orderId", () => {
    expect(checkoutMetadataSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-uuid orderId", () => {
    expect(checkoutMetadataSchema.safeParse({ orderId: "123" }).success).toBe(false);
  });

  it("rejects null metadata", () => {
    expect(checkoutMetadataSchema.safeParse(null).success).toBe(false);
  });
});
