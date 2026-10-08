import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ClaimReceipt } from "../types/claim.types";
import { ClaimForm } from "./claim-form";

const actionMock = vi.hoisted(() => vi.fn());

vi.mock("../actions/claims.actions", () => ({ submitClaimAction: actionMock }));

const receipt: ClaimReceipt = {
  code: "LR-2026-000001",
  type: "claim",
  createdAt: "2026-10-05T15:00:00.000Z",
  dueDate: "2026-10-26",
  fullName: "Ana Pérez",
  documentType: "DNI",
  documentNumber: "12345678",
  address: "Av. Siempre Viva 123",
  phone: "987654321",
  email: "ana@mail.com",
  isMinor: false,
  itemType: "service",
  itemDescription: "Entrada a concierto",
  claimedAmountCents: null,
  detail: "No pude ingresar al evento.",
  consumerRequest: "Quiero la devolución.",
};

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillValid() {
  fireEvent.click(screen.getByLabelText("Reclamo"));
  type(/^Nombre completo/, "Ana Pérez");
  type(/^Documento de identidad/, "12345678");
  type(/^Teléfono/, "987 654 321");
  type(/^Correo electrónico/, "Ana@Mail.com");
  type(/^Domicilio/, "Av. Siempre Viva 123");
  fireEvent.click(screen.getByLabelText("Servicio"));
  type(/^Descripción del producto/, "Entrada a concierto");
  type(/^Detalle del reclamo/, "No pude ingresar al evento.");
  type(/^Pedido del consumidor/, "Quiero la devolución.");
  fireEvent.click(screen.getByLabelText(/Acepto la/));
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: /Enviar|Enviando/ }));

describe("ClaimForm", () => {
  beforeEach(() => actionMock.mockReset());

  it("no llama a la action con datos inválidos, asocia errores y enfoca el primer campo inválido", () => {
    render(<ClaimForm />);
    submit();
    expect(actionMock).not.toHaveBeenCalled();

    const name = screen.getByLabelText(/^Nombre completo/);
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAttribute("aria-describedby", "claim-fullName-error");
    expect(document.getElementById("claim-fullName-error")).toHaveTextContent("Ingresa al menos 3 caracteres.");
    expect(screen.getByLabelText("Reclamo")).toHaveFocus();
    expect(screen.getByLabelText(/Acepto la/)).toHaveAttribute("aria-invalid", "true");
  });

  it("el error del grupo de radios se asocia solo al fieldset", () => {
    render(<ClaimForm />);
    submit();

    const radio = screen.getByLabelText("Reclamo");
    expect(radio).not.toHaveAttribute("aria-describedby");
    expect(radio.closest("fieldset")).toHaveAttribute("aria-describedby", "claim-type-error");
  });

  it("enfoca el nombre si solo falla desde ahí", () => {
    render(<ClaimForm />);
    fireEvent.click(screen.getByLabelText("Reclamo"));
    submit();
    expect(screen.getByLabelText(/^Nombre completo/)).toHaveFocus();
  });

  it("valida el documento según el tipo", () => {
    render(<ClaimForm />);
    type(/^Documento de identidad/, "123");
    submit();
    expect(document.getElementById("claim-documentNumber-error")).toHaveTextContent("El DNI tiene 8 dígitos.");
  });

  it("el bloque de apoderado solo aparece y se valida si es menor", () => {
    render(<ClaimForm />);
    expect(screen.queryByLabelText(/Nombre completo del apoderado/)).toBeNull();
    fireEvent.click(screen.getByLabelText("Soy menor de edad"));
    expect(screen.getByLabelText(/Nombre completo del apoderado/)).toBeInTheDocument();
    submit();
    expect(screen.getByLabelText(/Nombre completo del apoderado/)).toHaveAttribute("aria-invalid", "true");
    fireEvent.click(screen.getByLabelText("Soy menor de edad"));
    expect(screen.queryByLabelText(/Nombre completo del apoderado/)).toBeNull();
  });

  it("el honeypot no es alcanzable ni anunciado", () => {
    render(<ClaimForm />);
    const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]')!;
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByRole("textbox", { name: "Sitio web" })).toBeNull();
  });

  it("envía datos normalizados, muestra el estado pendiente y luego la constancia", async () => {
    let resolve!: (value: unknown) => void;
    actionMock.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<ClaimForm />);
    fillValid();
    submit();

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Enviando tu reclamo…"));
    const button = screen.getByRole("button", { name: "Enviando…" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(actionMock).toHaveBeenCalledTimes(1);
    expect(actionMock.mock.calls[0][0]).toMatchObject({
      type: "claim",
      email: "ana@mail.com",
      phone: "987654321",
      acceptedPrivacy: true,
    });

    resolve({ ok: true, receipt });
    expect(await screen.findByRole("heading", { name: "Constancia de registro" })).toHaveFocus();
    expect(screen.getAllByText("LR-2026-000001").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Enviar" })).toBeNull();
  });

  it("muestra el error del servidor conservando lo escrito y permite reintentar", async () => {
    actionMock.mockResolvedValue({ ok: false, error: "No pudimos registrar tu reclamo. Inténtalo de nuevo más tarde." });
    render(<ClaimForm />);
    fillValid();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos registrar tu reclamo");
    expect(screen.getByLabelText(/^Nombre completo/)).toHaveValue("Ana Pérez");
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument());

    actionMock.mockResolvedValue({ ok: true, receipt });
    submit();
    expect(await screen.findByRole("heading", { name: "Constancia de registro" })).toBeInTheDocument();
  });

  it("asocia los errores de campo que devuelve la action", async () => {
    actionMock.mockResolvedValue({ ok: false, error: "Ingresa un correo válido.", fieldErrors: { email: "Ingresa un correo válido." } });
    render(<ClaimForm />);
    fillValid();
    submit();
    await waitFor(() => expect(screen.getByLabelText(/^Correo electrónico/)).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByLabelText(/^Correo electrónico/)).toHaveFocus();
    expect(document.getElementById("claim-email-error")).toHaveTextContent("Ingresa un correo válido.");
  });

  it("muestra el mensaje del tope de reclamos", async () => {
    const limit = "Ya registraste varios reclamos hoy con este correo. Inténtalo de nuevo mañana.";
    actionMock.mockResolvedValue({ ok: false, error: limit });
    render(<ClaimForm />);
    fillValid();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(limit);
  });

  it("no promete correo ni seguimiento", () => {
    render(<ClaimForm />);
    expect(document.body.textContent).not.toMatch(/te enviaremos|recibirás un correo|seguimiento/i);
  });
});
