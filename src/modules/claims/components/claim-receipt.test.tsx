import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ClaimReceipt as ClaimReceiptData } from "../types/claim.types";
import { ClaimReceipt } from "./claim-receipt";

const receipt: ClaimReceiptData = {
  code: "LR-2026-000123",
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
  claimedAmountCents: 15050,
  orderReference: "ORD-1",
  detail: "No pude ingresar al evento.",
  consumerRequest: "Quiero la devolución.",
};

describe("ClaimReceipt", () => {
  afterEach(() => vi.restoreAllMocks());

  it("muestra código, fechas, datos y proveedor", () => {
    render(<ClaimReceipt receipt={receipt} />);
    expect(screen.getAllByText("LR-2026-000123").length).toBeGreaterThan(0);
    expect(screen.getByText(/26 de octubre de 2026/)).toBeInTheDocument();
    expect(screen.getByText(/5 de octubre de 2026/)).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("No pude ingresar al evento.")).toBeInTheDocument();
    expect(screen.getByText("TicketYa.com")).toBeInTheDocument();
    expect(screen.getByText("20513249510")).toBeInTheDocument();
    expect(screen.getByText("atencion@inkasign.com")).toBeInTheDocument();
  });

  it("avisa con honestidad que no se envía copia por correo", () => {
    render(<ClaimReceipt receipt={receipt} />);
    expect(screen.getByText(/No enviamos copia por correo electrónico/)).toBeInTheDocument();
  });

  it("mueve el foco al encabezado", () => {
    render(<ClaimReceipt receipt={receipt} />);
    expect(screen.getByRole("heading", { name: "Constancia de registro" })).toHaveFocus();
  });

  it("muestra al apoderado solo si es menor", () => {
    const { rerender } = render(<ClaimReceipt receipt={receipt} />);
    expect(screen.queryByText("Apoderado")).toBeNull();
    rerender(<ClaimReceipt receipt={{ ...receipt, isMinor: true, guardianFullName: "Luis Gómez", guardianDocumentNumber: "87654321" }} />);
    expect(screen.getByText("Luis Gómez")).toBeInTheDocument();
  });

  it("imprime con window.print", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<ClaimReceipt receipt={receipt} />);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir o guardar como PDF" }));
    expect(print).toHaveBeenCalledTimes(1);
  });
});
