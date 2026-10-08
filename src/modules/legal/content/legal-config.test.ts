import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CLAIMS_PROVIDER } from "@/modules/claims/config/claims-provider";
import { LEGAL_CONFIG } from "@/modules/legal/content/legal-config";

describe("LEGAL_CONFIG", () => {
  it("points the complaints book to an internal route that exists", () => {
    const url = LEGAL_CONFIG.complaintsBookUrl;
    expect(url).toBe("/libro-de-reclamaciones");
    expect(url?.startsWith("/")).toBe(true);
    expect(existsSync(join(process.cwd(), "src/app", `.${url}`, "page.tsx"))).toBe(true);
  });

  it("takes the provider data from the same source as the complaints book", () => {
    expect(LEGAL_CONFIG.legalName).toBe(CLAIMS_PROVIDER.legalName);
    expect(LEGAL_CONFIG.ruc).toBe(CLAIMS_PROVIDER.ruc);
    expect(LEGAL_CONFIG.address).toBe(CLAIMS_PROVIDER.address);
    expect(LEGAL_CONFIG.customerServiceEmail).toBe(CLAIMS_PROVIDER.email);
    expect(LEGAL_CONFIG.rightsEmail).toBe(CLAIMS_PROVIDER.email);
  });
});
