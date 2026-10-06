import { beforeEach, describe, expect, it, vi } from "vitest";

const { onConflictDoNothing, values, insert } = vi.hoisted(() => {
  const onConflictDoNothing = vi.fn();
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));
  return { onConflictDoNothing, values, insert };
});

vi.mock("@/db", () => ({ db: { insert } }));

import { newsletterSubscribers } from "@/db/schema";
import { subscribeToNewsletter } from "./newsletter.service";

describe("subscribeToNewsletter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onConflictDoNothing.mockResolvedValue(undefined);
  });

  it("inserts the email ignoring conflicts on email", async () => {
    await subscribeToNewsletter("ana@mail.com");

    expect(insert).toHaveBeenCalledWith(newsletterSubscribers);
    expect(values).toHaveBeenCalledWith({ email: "ana@mail.com" });
    expect(onConflictDoNothing).toHaveBeenCalledWith({
      target: newsletterSubscribers.email,
    });
  });

  it("resolves without a value, also when called twice with the same email", async () => {
    await expect(subscribeToNewsletter("ana@mail.com")).resolves.toBeUndefined();
    await expect(subscribeToNewsletter("ana@mail.com")).resolves.toBeUndefined();
    expect(onConflictDoNothing).toHaveBeenCalledTimes(2);
  });

  it("propagates database errors", async () => {
    onConflictDoNothing.mockRejectedValue(new Error("db down"));

    await expect(subscribeToNewsletter("ana@mail.com")).rejects.toThrow("db down");
  });
});
