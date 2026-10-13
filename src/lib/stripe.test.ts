import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getStripe", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws a clear error when STRIPE_SECRET_KEY is missing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const { getStripe } = await import("./stripe");

    expect(() => getStripe()).toThrow("STRIPE_SECRET_KEY");
  });

  it("reuses the same instance across calls", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
    const { getStripe } = await import("./stripe");

    expect(getStripe()).toBe(getStripe());
  });
});
