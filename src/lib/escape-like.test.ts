import { describe, expect, it } from "vitest";

import { escapeLike } from "@/lib/escape-like";

describe("escapeLike", () => {
  it("escapes %, _ and backslash", () => {
    expect(escapeLike("50%_off\\x")).toBe("50\\%\\_off\\\\x");
  });

  it("leaves plain text untouched", () => {
    expect(escapeLike("teatro")).toBe("teatro");
  });
});
