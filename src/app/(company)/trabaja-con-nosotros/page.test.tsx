import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CareersPage, { metadata } from "./page";

describe("CareersPage", () => {
  it("renders a single h1 and a CTA link", () => {
    render(<CareersPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Trabaja con nosotros");
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("sets the metadata title", () => {
    expect(metadata.title).toBe("Trabaja con nosotros · Ticketera");
  });
});
