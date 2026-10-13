import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExploreCategories } from "@/modules/events/components/explore-categories";

describe("ExploreCategories", () => {
  it("renders a labelled section with an h2", () => {
    render(<ExploreCategories />);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Explora por categoría",
    });
    expect(screen.getByRole("region", { name: "Explora por categoría" })).toBe(
      heading.closest("section")
    );
  });

  it("renders one link per category with the right href and plural name", () => {
    render(<ExploreCategories />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Conciertos" })).toHaveAttribute(
      "href",
      "/events?category=concert"
    );
    expect(
      screen.getByRole("link", { name: "Teatro y espectáculos" })
    ).toHaveAttribute("href", "/events?category=theater");
  });

  it("renders a decorative icon inside each link", () => {
    render(<ExploreCategories />);

    for (const link of screen.getAllByRole("link")) {
      const icon = link.querySelector("svg");
      expect(icon).not.toBeNull();
      expect(icon).toHaveAttribute("aria-hidden", "true");
    }
  });
});
