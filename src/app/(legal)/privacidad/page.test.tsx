import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrivacyPage, { metadata } from "./page";

describe("PrivacyPage", () => {
  it("renders a single h1 with the policy title", () => {
    render(<PrivacyPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeInTheDocument();
  });

  it("sets the page title", () => {
    expect(metadata.title).toBe("Política de privacidad · Ticketera");
  });
});
