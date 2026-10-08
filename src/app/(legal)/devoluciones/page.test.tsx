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

  it("does not mention the complaints book while it is not configured", () => {
    render(<ReturnsPage />);
    expect(screen.queryByText(/libro de reclamaciones/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /reclamaciones/i })).toBeNull();
  });
});
