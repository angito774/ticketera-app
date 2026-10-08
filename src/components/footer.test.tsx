import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "./footer";

describe("Footer", () => {
  it("renders column titles as uppercase small h3 headings", () => {
    render(<Footer />);

    for (const title of ["Empresa", "Ayuda", "Legal"]) {
      const heading = screen.getByRole("heading", { level: 3, name: title });
      expect(heading).toHaveClass("text-xs", "uppercase", "tracking-wider", "text-foreground");
    }
  });

  it("renders social networks as non-interactive images", () => {
    render(<Footer />);

    for (const label of ["Facebook", "Instagram", "Twitter"]) {
      const social = screen.getByRole("img", { name: label });
      expect(social).not.toHaveAttribute("href");
      expect(social.closest("a")).toBeNull();
      expect(social.closest("button")).toBeNull();
    }
  });

  it("renders only Política de privacidad as a link", () => {
    render(<Footer />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute(
      "href",
      "/privacidad",
    );
  });

  it("renders the copyright with the current year and no cookie banner text", () => {
    render(<Footer />);

    const year = new Date().getFullYear();
    expect(
      screen.getByText(`© ${year} Ticketera. Todos los derechos reservados.`),
    ).toBeInTheDocument();
    expect(screen.queryByText(/solo usamos cookies/i)).toBeNull();
  });

  it("keeps the original light muted background", () => {
    render(<Footer className="extra" />);

    expect(screen.getByRole("contentinfo")).toHaveClass("bg-muted/30", "extra");
  });
});
