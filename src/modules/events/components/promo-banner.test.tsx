import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PromoBanner } from "./promo-banner"

const actionMock = vi.hoisted(() => vi.fn())

vi.mock("@/modules/events/actions/newsletter.actions", () => ({
  subscribeToNewsletterAction: actionMock,
}))

const getInput = () => screen.getByLabelText("Correo electrónico")
const submit = () => fireEvent.click(screen.getByRole("button"))

describe("PromoBanner", () => {
  beforeEach(() => {
    actionMock.mockReset()
  })

  it("tiene label real, región de estado vacía y enlace a la política", () => {
    render(<PromoBanner />)
    expect(getInput()).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
    expect(screen.getByRole("button", { name: "Suscribirse" })).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "política de privacidad" })
    ).toHaveAttribute("href", "/privacidad")
    expect(screen.queryByText(/todavía no están disponibles/)).toBeNull()
  })

  it("no llama al servidor con correo vacío y marca el campo inválido", () => {
    render(<PromoBanner />)
    submit()
    expect(actionMock).not.toHaveBeenCalled()
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Ingresa tu correo.")
    expect(getInput()).toHaveAttribute("aria-invalid", "true")
    expect(getInput()).toHaveAttribute("aria-describedby", alert.id)
    expect(getInput()).toHaveFocus()
  })

  it("no llama al servidor con correo con formato inválido", () => {
    render(<PromoBanner />)
    fireEvent.change(getInput(), { target: { value: "no-es-correo" } })
    submit()
    expect(actionMock).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa un correo válido.")
  })

  it("muestra estado de envío, evita doble envío y luego el éxito", async () => {
    let resolve!: (value: { ok: true }) => void
    actionMock.mockReturnValue(new Promise((r) => (resolve = r)))
    render(<PromoBanner />)
    fireEvent.change(getInput(), { target: { value: "Ana@Mail.COM" } })
    submit()

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Enviando tu suscripción…")
    )
    const button = screen.getByRole("button", { name: "Suscribiendo…" })
    expect(button).toHaveAttribute("aria-disabled", "true")
    expect(getInput()).toHaveValue("Ana@Mail.COM")
    fireEvent.click(button)
    expect(actionMock).toHaveBeenCalledTimes(1)
    expect(actionMock).toHaveBeenCalledWith({ email: "ana@mail.com" })

    resolve({ ok: true })
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "¡Listo! Te suscribiste a nuestras novedades."
      )
    )
    expect(getInput()).toHaveValue("")
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("conserva lo escrito y permite reintentar ante error de servidor", async () => {
    actionMock.mockResolvedValueOnce({ ok: false, error: "Falló el servidor." })
    render(<PromoBanner />)
    fireEvent.change(getInput(), { target: { value: "ana@mail.com" } })
    submit()

    expect(await screen.findByRole("alert")).toHaveTextContent("Falló el servidor.")
    expect(getInput()).toHaveValue("ana@mail.com")

    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "false")
    )
    actionMock.mockResolvedValueOnce({ ok: true })
    submit()
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("¡Listo!")
    )
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("muestra error genérico si la acción lanza", async () => {
    actionMock.mockRejectedValueOnce(new Error("boom"))
    render(<PromoBanner />)
    fireEvent.change(getInput(), { target: { value: "ana@mail.com" } })
    submit()
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos completar tu suscripción."
    )
  })
})
