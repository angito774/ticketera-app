import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatDate } from "@/lib/format";
import type { LegalDocument } from "@/modules/legal/types/legal.types";

import { LegalPage } from "./legal-page";

const UPDATED_AT = "2026-10-07T12:00:00-05:00";

const baseDocument: LegalDocument = {
  title: "Documento de prueba",
  intro: "Introducción de prueba.",
  notice: "Ticketera es una marca de TicketYa.com",
  updatedAt: UPDATED_AT,
  sections: [
    { id: "uno", title: "Primera", paragraphs: ["Párrafo A", "Párrafo B"] },
    {
      id: "dos",
      title: "Segunda",
      paragraphs: ["Párrafo C"],
      items: ["Ítem 1", "Ítem 2"],
      links: [{ label: "Ver privacidad", href: "/privacidad" }],
    },
    { id: "tres", title: "Tercera", paragraphs: ["Párrafo D"] },
  ],
};

describe("LegalPage", () => {
  it("renders a single h1 and numbered h2 headings by position", () => {
    render(<LegalPage {...baseDocument} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Documento de prueba" })).toBeInTheDocument();

    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s.map((h) => h.textContent)).toEqual(["1. Primera", "2. Segunda", "3. Tercera"]);
  });

  it("labels each section with its heading", () => {
    render(<LegalPage {...baseDocument} />);

    const section = screen.getByRole("region", { name: "2. Segunda" });
    expect(within(section).getByRole("heading", { level: 2 })).toHaveTextContent("2. Segunda");
  });

  it("shows the draft notice before the sections and the intro", () => {
    render(<LegalPage {...baseDocument} />);

    const notice = screen.getByText(
      "Este documento es un borrador informativo y no ha sido revisado por un profesional legal.",
    );
    expect(notice).toBeInTheDocument();
    expect(screen.getByText("Introducción de prueba.")).toBeInTheDocument();
    expect(
      notice.compareDocumentPosition(screen.getByRole("region", { name: "1. Primera" })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders paragraphs, bullet items and optional links", () => {
    render(<LegalPage {...baseDocument} />);

    expect(screen.getByText("Párrafo A").tagName).toBe("P");
    expect(screen.getAllByRole("listitem").some((li) => li.textContent === "Ítem 2")).toBe(true);
    expect(screen.getByRole("link", { name: "Ver privacidad" })).toHaveAttribute("href", "/privacidad");
  });

  it("renders the formatted update date and the notice in the footer", () => {
    render(<LegalPage {...baseDocument} />);

    expect(screen.getByText(`Última actualización: ${formatDate(UPDATED_AT)}`)).toBeInTheDocument();
    expect(screen.getByText("Ticketera es una marca de TicketYa.com")).toBeInTheDocument();
  });

  it("omits the intro and the notice when they are not provided", () => {
    render(<LegalPage {...baseDocument} intro={undefined} notice={undefined} />);

    expect(screen.queryByText("Introducción de prueba.")).not.toBeInTheDocument();
    expect(screen.queryByText(/marca de/)).not.toBeInTheDocument();
  });

  it("renumbers the remaining sections when one is omitted", () => {
    const sections = baseDocument.sections.filter((s) => s.id !== "dos");
    render(<LegalPage {...baseDocument} sections={sections} />);

    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s.map((h) => h.textContent)).toEqual(["1. Primera", "2. Tercera"]);
  });
});
