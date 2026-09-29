import { describe, expect, it } from "vitest";

import { DEMO_ACCOUNT } from "@/modules/account/services/auth.service";
import { MOCK_GOOGLE_ACCOUNTS, signInWithGoogle } from "@/modules/account/services/google-auth.service";

describe("MOCK_GOOGLE_ACCOUNTS", () => {
  it("has 3 accounts, one of them the demo account", () => {
    expect(MOCK_GOOGLE_ACCOUNTS).toHaveLength(3);
    expect(MOCK_GOOGLE_ACCOUNTS.some((account) => account.email === DEMO_ACCOUNT.user.email)).toBe(true);
  });
});

describe("signInWithGoogle", () => {
  it("signs in the demo account without creating a new one", () => {
    expect(signInWithGoogle({ name: "Otro nombre", email: "DEMO@ticketera.pe" }, [])).toEqual({
      user: DEMO_ACCOUNT.user,
      isNew: false,
    });
  });

  it("reuses an account created with email and password, keeping its name", () => {
    const registered = [{ name: "María T.", email: "maria.torres@gmail.com" }];
    expect(signInWithGoogle({ name: "María Torres", email: " Maria.Torres@gmail.com " }, registered)).toEqual({
      user: registered[0],
      isNew: false,
    });
  });

  it("creates a new account for an unknown email", () => {
    expect(signInWithGoogle({ name: " Carlos Ruiz ", email: "Carlos.Ruiz@gmail.com" }, [])).toEqual({
      user: { name: "Carlos Ruiz", email: "carlos.ruiz@gmail.com" },
      isNew: true,
    });
  });
});
