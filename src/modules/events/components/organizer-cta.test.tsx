import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { OrganizerCta } from "./organizer-cta"

describe("OrganizerCta", () => {
  it("nombra la sección por su h2", () => {
    render(<OrganizerCta />)
    expect(
      screen.getByRole("region", { name: "Vende tus entradas con Ticketera" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 2 })
    ).toHaveTextContent("Vende tus entradas con Ticketera")
  })

  it("muestra la etiqueta como texto, no como encabezado", () => {
    render(<OrganizerCta />)
    expect(screen.getByText("Para organizadores")).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: /para organizadores/i })
    ).not.toBeInTheDocument()
  })

  it("enlaza Publica tu evento a /organizer por defecto", () => {
    render(<OrganizerCta />)
    expect(
      screen.getByRole("link", { name: "Publica tu evento" })
    ).toHaveAttribute("href", "/organizer")
  })

  it("acepta un href personalizado", () => {
    render(<OrganizerCta href="/otro" />)
    expect(
      screen.getByRole("link", { name: "Publica tu evento" })
    ).toHaveAttribute("href", "/otro")
  })

  it("no incluye Conoce más ni promesas no verificadas", () => {
    const { container } = render(<OrganizerCta />)
    expect(screen.queryByText(/conoce más/i)).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/cobra|pagos automáticos|reportes/i)
  })
})
