import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PromotionsPage, { metadata } from "./page";

describe("PromotionsPage", () => {
  it("renders a single h1 with the page title", () => {
    render(<PromotionsPage />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Términos de campañas comerciales");
  });

  it("sets the metadata title", () => {
    expect(metadata.title).toBe("Términos de campañas comerciales · Ticketera");
  });
});
