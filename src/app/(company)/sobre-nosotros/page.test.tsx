import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AboutPage, { metadata } from "./page";

describe("AboutPage", () => {
  it("renders a single h1 and a CTA link", () => {
    render(<AboutPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sobre nosotros");
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("sets the metadata title", () => {
    expect(metadata.title).toBe("Sobre nosotros · Ticketera");
  });
});
