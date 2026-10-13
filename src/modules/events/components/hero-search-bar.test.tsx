import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  PRICE_RANGES,
  parseEventFilters,
} from "@/modules/events/schemas/event-filters.schema"

import { HeroSearchBar } from "./hero-search-bar"

vi.mock("next/form", () => ({
  default: ({ children, action, ...props }: React.ComponentProps<"form"> & { action: string }) => (
    <form action={action} {...props}>
      {children}
    </form>
  ),
}))

const monthOptions = [
  { value: "2026-11", label: "Noviembre 2026" },
  { value: "2026-12", label: "Diciembre 2026" },
]

function formParams(form: HTMLFormElement) {
  const params: Record<string, string> = {}
  new FormData(form).forEach((value, key) => {
    if (typeof value === "string") params[key] = value
  })
  return params
}

function getForm() {
  return screen.getByRole("search") as HTMLFormElement
}

describe("HeroSearchBar", () => {
  it("es un formulario de búsqueda GET a /events con botón submit", () => {
    render(<HeroSearchBar monthOptions={monthOptions} />)
    const form = getForm()
    expect(form).toHaveAttribute("action", "/events")
    expect(form).toHaveAttribute("aria-label", "Buscar eventos")
    const button = screen.getByRole("button", { name: "Buscar" })
    expect(button).toHaveAttribute("type", "submit")
    expect(button).toHaveClass("rounded-full", "bg-primary", "text-white")
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("es una sola píldora responsive", () => {
    render(<HeroSearchBar monthOptions={monthOptions} className="mt-4" />)
    expect(getForm()).toHaveClass(
      "rounded-2xl",
      "md:rounded-full",
      "border",
      "bg-background",
      "shadow-sm",
      "md:divide-x",
      "mt-4"
    )
  })

  it("muestra etiquetas visibles asociadas a sus controles", () => {
    render(<HeroSearchBar monthOptions={monthOptions} />)
    const label = screen.getByText("Qué quieres ver")
    expect(label).toHaveClass("text-xs", "font-semibold")
    const input = screen.getByLabelText("Qué quieres ver")
    expect(input).toHaveAttribute("type", "search")
    expect(input).toHaveAttribute("name", "q")
    expect(input).toHaveAttribute("placeholder", "Artista o evento")
    expect(screen.getByLabelText("Fecha")).toBeInTheDocument()
    expect(screen.getByLabelText("Precio")).toBeInTheDocument()
  })

  it("muestra los valores por defecto de los selects", () => {
    render(<HeroSearchBar monthOptions={monthOptions} />)
    expect(screen.getByLabelText("Fecha")).toHaveTextContent("Cualquier fecha")
    expect(screen.getByLabelText("Precio")).toHaveTextContent("Cualquier precio")
  })

  it("lista los meses recibidos y los rangos de PRICE_RANGES", () => {
    render(<HeroSearchBar monthOptions={monthOptions} />)

    fireEvent.click(screen.getByLabelText("Fecha"))
    const monthLabels = screen.getAllByRole("option").map((option) => option.textContent)
    expect(monthLabels).toEqual(["Cualquier fecha", "Noviembre 2026", "Diciembre 2026"])
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
  })

  it("lista una opción por cada rango de precio", () => {
    render(<HeroSearchBar monthOptions={monthOptions} />)
    fireEvent.click(screen.getByLabelText("Precio"))
    const priceLabels = screen.getAllByRole("option").map((option) => option.textContent)
    expect(priceLabels).toEqual([
      "Cualquier precio",
      ...Object.values(PRICE_RANGES).map((range) => range.label),
    ])
  })

  it("con valores por defecto, parseEventFilters descarta month, price y q", () => {
    render(<HeroSearchBar monthOptions={monthOptions} />)
    const params = formParams(getForm())
    expect(params).toMatchObject({ q: "", month: "all", price: "all" })
    const filters = parseEventFilters(params)
    expect(filters.month).toBeNull()
    expect(filters.price).toBeNull()
    expect(filters.q).toBe("")
  })

  it("expone month y price como campos del formulario y el parseo acepta valores elegidos", () => {
    render(<HeroSearchBar monthOptions={monthOptions} />)
    const form = getForm()
    expect(form.querySelector('input[name="month"]')).not.toBeNull()
    expect(form.querySelector('input[name="price"]')).not.toBeNull()

    fireEvent.change(screen.getByLabelText("Qué quieres ver"), { target: { value: "rock" } })
    const params = { ...formParams(form), month: monthOptions[1].value, price: "100-200" }
    const filters = parseEventFilters(params)
    expect(filters.q).toBe("rock")
    expect(filters.month).toBe("2026-12")
    expect(filters.price).toBe("100-200")
  })
})
