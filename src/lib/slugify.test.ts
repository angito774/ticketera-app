import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slugify";

describe("slugify", () => {
  it("lowercases, strips accents and joins with dashes", () => {
    expect(slugify("  Teatro Municipal — Lima! ")).toBe("teatro-municipal-lima");
    expect(slugify("Música Ñandú")).toBe("musica-nandu");
  });
});
