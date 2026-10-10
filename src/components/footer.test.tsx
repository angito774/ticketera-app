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

    for (const label of ["Facebook", "Instagram", "TikTok", "YouTube"]) {
      const social = screen.getByRole("img", { name: label });
      expect(social).not.toHaveAttribute("href");
      expect(social.closest("a")).toBeNull();
      expect(social.closest("button")).toBeNull();
    }
  });

  it("renders the six links with their hrefs", () => {
    render(<Footer />);

    expect(screen.getAllByRole("link")).toHaveLength(6);
    const expected = {
      "Términos y condiciones": "/terminos",
      "Política de privacidad": "/privacidad",
      "Política de cookies": "/cookies",
      "Garantía y devoluciones": "/devoluciones",
      "Campañas comerciales": "/campanas-comerciales",
      "Libro de Reclamaciones": "/libro-de-reclamaciones",
    };
    for (const [name, href] of Object.entries(expected)) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("renders the complaints book link with a hidden icon and a 44px target", () => {
    render(<Footer />);

    const link = screen.getByRole("link", { name: "Libro de Reclamaciones" });
    expect(link).toHaveClass("min-h-11");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps Centro de ayuda and social networks out of the links", () => {
    render(<Footer />);

    expect(screen.queryByRole("link", { name: "Centro de ayuda" })).toBeNull();
    expect(screen.getByText("Centro de ayuda")).toBeInTheDocument();
    for (const label of ["Facebook", "Instagram", "TikTok", "YouTube"]) {
      expect(screen.queryByRole("link", { name: label })).toBeNull();
    }
  });

  it("renders the copyright with the current year and no cookie banner text", () => {
    render(<Footer />);

    const year = new Date().getFullYear();
    expect(
      screen.getByText(`© ${year} Ticketera. Todos los derechos reservados.`),
    ).toBeInTheDocument();
    expect(screen.queryByText(/solo usamos cookies/i)).toBeNull();
  });

  it("uses the light indigo accent background", () => {
    render(<Footer className="extra" />);

    expect(screen.getByRole("contentinfo")).toHaveClass("bg-accent", "border-indigo-200", "extra");
  });
});
