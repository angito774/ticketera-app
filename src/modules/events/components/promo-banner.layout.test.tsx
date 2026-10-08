import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PAGE_SECTION_CLASSES } from "@/components/page-section"

import { PromoBanner } from "./promo-banner"

vi.mock("@/modules/events/actions/newsletter.actions", () => ({
  subscribeToNewsletterAction: vi.fn(),
}))

describe("PromoBanner layout", () => {
  it("nombra la sección por su h2 mediante aria-labelledby", () => {
    render(<PromoBanner />)
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "¿Quieres enterarte antes que nadie?",
    })
    expect(heading.id).not.toBe("")
    const region = screen.getByRole("region", {
      name: "¿Quieres enterarte antes que nadie?",
    })
    expect(region).toHaveAttribute("aria-labelledby", heading.id)
  })

  it("usa el contenedor compartido y una tarjeta contenida", () => {
    render(<PromoBanner className="extra" />)
    const region = screen.getByRole("region")
    expect(region).toHaveClass(...PAGE_SECTION_CLASSES.split(" "), "extra")
    const card = region.firstElementChild
    expect(card).toHaveClass("rounded-3xl", "bg-surface-warm", "md:px-12")
  })

  it("conserva los selectores del formulario", () => {
    render(<PromoBanner />)
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Suscribirse" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "política de privacidad" })
    ).toHaveAttribute("href", "/privacidad")
  })
})
