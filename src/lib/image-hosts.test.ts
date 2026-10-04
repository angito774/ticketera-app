import { describe, expect, it } from "vitest";

import { ALLOWED_IMAGE_HOSTS, isAllowedImageUrl } from "@/lib/image-hosts";

describe("isAllowedImageUrl", () => {
  it("accepts https urls on an allowed host", () => {
    expect(ALLOWED_IMAGE_HOSTS.length).toBeGreaterThan(0);
    expect(isAllowedImageUrl("https://images.unsplash.com/photo-1?w=800")).toBe(true);
  });

  it("rejects http and other protocols", () => {
    expect(isAllowedImageUrl("http://images.unsplash.com/photo-1")).toBe(false);
    expect(isAllowedImageUrl("ftp://images.unsplash.com/photo-1")).toBe(false);
    expect(isAllowedImageUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects other hosts and subdomains", () => {
    expect(isAllowedImageUrl("https://example.com/a.png")).toBe(false);
    expect(isAllowedImageUrl("https://unsplash.com/a.png")).toBe(false);
    expect(isAllowedImageUrl("https://cdn.images.unsplash.com/a.png")).toBe(false);
  });

  it("rejects confusing hosts", () => {
    expect(isAllowedImageUrl("https://images.unsplash.com.evil.com/a.png")).toBe(false);
    expect(isAllowedImageUrl("https://evil.com/images.unsplash.com")).toBe(false);
    expect(isAllowedImageUrl("https://images.unsplash.com@evil.com/a.png")).toBe(false);
  });

  it("rejects ports and credentials", () => {
    expect(isAllowedImageUrl("https://images.unsplash.com:8443/x.jpg")).toBe(false);
    expect(isAllowedImageUrl("https://user:pass@images.unsplash.com/x.jpg")).toBe(false);
    expect(isAllowedImageUrl("https://user@images.unsplash.com/x.jpg")).toBe(false);
  });

  it("rejects invalid urls", () => {
    expect(isAllowedImageUrl("")).toBe(false);
    expect(isAllowedImageUrl("nope")).toBe(false);
    expect(isAllowedImageUrl("images.unsplash.com/a.png")).toBe(false);
  });
});
