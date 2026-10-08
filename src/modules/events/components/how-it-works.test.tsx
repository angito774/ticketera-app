import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { HowItWorks } from "./how-it-works"

describe("HowItWorks", () => {
  it("renders the section named by its h2", () => {
    render(<HowItWorks />)
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Tres pasos y ya estás dentro.",
    })
    expect(heading).toHaveAttribute("id", "how-it-works-title")
    expect(
      screen.getByRole("region", { name: "Tres pasos y ya estás dentro." })
    ).toBeInTheDocument()
  })

  it("renders an ordered list with 3 steps", () => {
    render(<HowItWorks />)
    const list = screen.getByRole("list")
    expect(list.tagName).toBe("OL")
    expect(within(list).getAllByRole("listitem")).toHaveLength(3)
  })

  it("renders the step titles as h3 and step labels", () => {
    render(<HowItWorks />)
    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent)
    expect(titles).toEqual(["Buscar", "Elegir", "Comprar"])
    for (const label of ["Paso 1", "Paso 2", "Paso 3"]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it("renders the exact step texts", () => {
    render(<HowItWorks />)
    expect(
      screen.getByText("Encuentra el evento o artista que quieres ver.")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Selecciona tus entradas y la cantidad.")
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Confirma tu compra y encuentra tus entradas al instante en Mis entradas."
      )
    ).toBeInTheDocument()
  })

  it("does not make forbidden promises", () => {
    const { container } = render(<HowItWorks />)
    expect(container.textContent).not.toMatch(
      /ciudad|pago seguro|cifrad|yape|tarjeta|correo|qr|24\/7|soporte|reembols/i
    )
  })

  it("hides decorative icons from assistive tech", () => {
    const { container } = render(<HowItWorks />)
    const icons = container.querySelectorAll("svg")
    expect(icons).toHaveLength(3)
    icons.forEach((icon) => expect(icon).toHaveAttribute("aria-hidden", "true"))
  })
})
