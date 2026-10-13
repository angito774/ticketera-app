import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/header", () => ({ Header: () => <div data-testid="header" /> }));
vi.mock("@/components/footer", () => ({ Footer: () => <div data-testid="footer" /> }));
vi.mock("@/modules/claims/components/claim-form", () => ({ ClaimForm: () => <form aria-label="Hoja de reclamación" /> }));

import { CLAIMS_PROVIDER } from "@/modules/claims/config/claims-provider";

import ComplaintsBookPage, { metadata } from "./page";

describe("ComplaintsBookPage", () => {
  it("sets the page title", () => {
    expect(metadata.title).toBe("Libro de Reclamaciones · Ticketera");
  });

  it("renders a single h1 and the form", () => {
    render(<ComplaintsBookPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Libro de Reclamaciones" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Hoja de reclamación" })).toBeInTheDocument();
  });

  it("shows the provider data from CLAIMS_PROVIDER", () => {
    render(<ComplaintsBookPage />);

    expect(screen.getByText(CLAIMS_PROVIDER.legalName)).toBeInTheDocument();
    expect(screen.getByText(CLAIMS_PROVIDER.ruc)).toBeInTheDocument();
    expect(screen.getByText(CLAIMS_PROVIDER.address)).toBeInTheDocument();
    expect(screen.getByText(CLAIMS_PROVIDER.email)).toBeInTheDocument();
  });

  it("states the response deadline without promising email or online tracking", () => {
    render(<ComplaintsBookPage />);

    expect(screen.getByText(/plazo máximo de 15 días hábiles/)).toBeInTheDocument();
    expect(screen.getByText(/no enviamos copia por correo electrónico/)).toBeInTheDocument();
  });
});
