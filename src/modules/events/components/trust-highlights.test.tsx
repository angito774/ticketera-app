import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TrustHighlights } from "./trust-highlights"

const FORBIDDEN =
  /pago seguro|cifrad|yape|tarjeta|(env[ií]\w*|por) (tus entradas )?(a |por )?(tu )?correo|\bqr\b|24\/7|soporte|reembols/i

describe("TrustHighlights", () => {
  it("names the section by its h2", () => {
    render(<TrustHighlights />)
    expect(
      screen.getByRole("heading", { level: 2, name: "Compra con confianza" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("region", { name: "Compra con confianza" })
    ).toBeInTheDocument()
  })

  it("renders the three verified highlights as h3 with their text", () => {
    render(<TrustHighlights />)
    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent)
    expect(titles).toEqual([
      "Tu cuenta, protegida",
      "Entradas digitales",
      "Tu lugar asegurado",
    ])
    expect(
      screen.getByText(
        "Inicia sesión con tu correo o con Google. Solo tú ves tus compras."
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Cada entrada queda en Mis entradas con su código único, siempre a la mano."
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Reservamos tus asientos o cupos al comprar, sin sobreventa."
      )
    ).toBeInTheDocument()
  })

  it("hides decorative icons from assistive tech", () => {
    const { container } = render(<TrustHighlights />)
    const icons = container.querySelectorAll("svg")
    expect(icons).toHaveLength(3)
    icons.forEach((icon) =>
      expect(icon).toHaveAttribute("aria-hidden", "true")
    )
  })

  it("does not make unverified promises", () => {
    const { container } = render(<TrustHighlights />)
    expect(container.textContent).not.toMatch(FORBIDDEN)
  })
})
