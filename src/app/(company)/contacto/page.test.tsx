import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ContactPage, { metadata } from "./page";

describe("ContactPage", () => {
  it("renders a single h1 and a CTA link", () => {
    render(<ContactPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Contacto");
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("sets the metadata title", () => {
    expect(metadata.title).toBe("Contacto · Ticketera");
  });
});
