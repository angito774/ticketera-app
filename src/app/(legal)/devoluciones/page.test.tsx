import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ReturnsPage, { metadata } from "./page";

describe("ReturnsPage", () => {
  it("renders a single h1 with the page title", () => {
    render(<ReturnsPage />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Garantía y devoluciones");
  });

  it("sets the metadata title", () => {
    expect(metadata.title).toBe("Garantía y devoluciones · Ticketera");
  });

  it("links the complaints book now that it is configured", () => {
    render(<ReturnsPage />);
    expect(screen.getByRole("link", { name: /libro de reclamaciones/i })).toHaveAttribute(
      "href",
      "/libro-de-reclamaciones",
    );
  });
});
