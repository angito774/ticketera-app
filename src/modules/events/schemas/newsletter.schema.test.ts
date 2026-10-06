import { describe, expect, it } from "vitest";

import { newsletterSubscribeSchema } from "./newsletter.schema";

function firstError(email: unknown) {
  const result = newsletterSubscribeSchema.safeParse({ email });
  return result.success ? null : result.error.issues[0].message;
}

describe("newsletterSubscribeSchema", () => {
  it("trims and lowercases the email", () => {
    const result = newsletterSubscribeSchema.parse({ email: " Ana@Mail.COM " });
    expect(result.email).toBe("ana@mail.com");
  });

  it("rejects an empty email", () => {
    expect(firstError("")).toBe("Ingresa tu correo.");
  });

  it("rejects a whitespace-only email as empty", () => {
    expect(firstError("   ")).toBe("Ingresa tu correo.");
  });

  it("rejects an invalid format", () => {
    expect(firstError("no-es-correo")).toBe("Ingresa un correo válido.");
  });

  it("rejects emails longer than 254 characters", () => {
    const long = `${"a".repeat(250)}@x.co`;
    expect(firstError(long)).toBe("Ingresa un correo válido.");
  });

  it("accepts an email of exactly 254 characters", () => {
    const local = "a".repeat(63);
    const domain = `${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(58)}.com`;
    const email = `${local}@${domain}`;
    expect(email.length).toBe(254);
    expect(newsletterSubscribeSchema.safeParse({ email }).success).toBe(true);
  });

  it("rejects a non-string email", () => {
    expect(newsletterSubscribeSchema.safeParse({ email: 5 }).success).toBe(false);
  });
});
