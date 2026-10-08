import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TermsPage, { metadata } from "./page";

describe("/terminos page", () => {
  it("sets the metadata title", () => {
    expect(metadata.title).toBe("Términos y condiciones · Ticketera");
  });

  it("renders the h1", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Términos y condiciones" }),
    ).toBeInTheDocument();
  });
});
