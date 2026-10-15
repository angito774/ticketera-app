import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import type { OrderTicketView, OrderView } from "@/modules/checkout/services/order-read.mapping";
import type { EventDetail } from "@/modules/events/types/event.types";
import {
  buildTicketPdfData,
  canDownloadTicketPdf,
  ticketPdfErrorMessage,
  ticketPdfFileName,
} from "./ticket-pdf.mapping";

function ticket(overrides: Partial<OrderTicketView> = {}): OrderTicketView {
  return {
    id: "t1",
    zoneName: "Platea",
    seatLabel: "Fila A · Asiento 3",
    qrCode: "abcd1234-efghijklmnop",
    status: "valid",
    ...overrides,
  };
}

function order(overrides: Partial<OrderView> = {}): OrderView {
  return {
    id: "o1",
    number: "TK-1A2B3C4D",
    eventSlug: "evento",
    eventTitle: "Concierto Uno",
    eventStatus: "published",
    eventCancellationReason: null,
    refundState: "none",
    refundedAt: null,
    createdAt: "2026-10-01T10:00:00-05:00",
    total: 350,
    status: "paid",
    buyerName: "Ana Pérez",
    buyerEmail: "ana@example.com",
    tickets: [ticket()],
    ...overrides,
  };
}

function event(overrides: Partial<EventDetail> = {}): EventDetail {
  return {
    id: "evento",
    title: "Concierto Uno",
    category: "concert",
    date: "2026-11-14T20:00:00-05:00",
    venue: "Estadio Nacional",
    city: "Lima",
    price: 100,
    imageUrl: "https://images.unsplash.com/x",
    featured: false,
    description: "",
    doorsOpenAt: "2026-11-14T18:00:00-05:00",
    minAge: 18,
    address: "Av. José Díaz s/n",
    layoutId: "stadium" as EventDetail["layoutId"],
    ...overrides,
  };
}

describe("canDownloadTicketPdf", () => {
  it("permite pedido pagado con evento publicado y entradas", () => {
    expect(canDownloadTicketPdf(order())).toBe(true);
  });

  it.each(["pending", "cancelled", "refunded"] as const)("rechaza pedido %s", (status) => {
    expect(canDownloadTicketPdf(order({ status }))).toBe(false);
  });

  it("rechaza evento cancelado", () => {
    expect(canDownloadTicketPdf(order({ eventStatus: "cancelled" }))).toBe(false);
  });

  it("acepta evento en borrador", () => {
    expect(canDownloadTicketPdf(order({ eventStatus: "draft" }))).toBe(true);
  });

  it("rechaza sin entradas o solo canceladas", () => {
    expect(canDownloadTicketPdf(order({ tickets: [] }))).toBe(false);
    expect(canDownloadTicketPdf(order({ tickets: [ticket({ status: "cancelled" })] }))).toBe(false);
  });

  it("acepta si queda al menos una entrada no cancelada", () => {
    const tickets = [ticket({ status: "cancelled" }), ticket({ id: "t2", status: "redeemed" })];
    expect(canDownloadTicketPdf(order({ tickets }))).toBe(true);
  });
});

describe("ticketPdfFileName", () => {
  it("usa el número de pedido", () => {
    expect(ticketPdfFileName("TK-1A2B3C4D")).toBe("entradas-TK-1A2B3C4D.pdf");
  });
});

describe("buildTicketPdfData", () => {
  it("arma las líneas del evento y del pedido", () => {
    const data = buildTicketPdfData(order(), event());
    expect(data.orderNumber).toBe("TK-1A2B3C4D");
    expect(data.fileName).toBe("entradas-TK-1A2B3C4D.pdf");
    expect(data.title).toBe("Entradas · Concierto Uno · TK-1A2B3C4D");
    expect(data.eventTitle).toBe("Concierto Uno");
    expect(data.dateLine).toBe("sábado, 14 de noviembre · 20:00 h");
    expect(data.doorsLine).toBe("Puertas: 18:00 h");
    expect(data.venueLine).toBe("Estadio Nacional");
    expect(data.addressLine).toBe("Av. José Díaz s/n, Lima");
    expect(data.holderName).toBe("Ana Pérez");
    expect(data.totalLabel).toBe(formatPrice(350));
    expect(data.totalLabel.replace(/\s/g, " ")).toBe("S/ 350");
    expect(data.minAgeLabel).toBe("Mayores de 18 años");
  });

  it("muestra 20:00 de Lima aunque el servidor corra en UTC", () => {
    const original = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      expect(buildTicketPdfData(order(), event()).dateLine).toContain("20:00 h");
      expect(
        buildTicketPdfData(order(), event({ date: "2026-11-15T01:00:00Z" })).dateLine
      ).toBe("sábado, 14 de noviembre · 20:00 h");
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it("minAge nulo no genera etiqueta", () => {
    expect(buildTicketPdfData(order(), event({ minAge: null })).minAgeLabel).toBeNull();
  });

  it("puertas ausentes dan null", () => {
    const data = buildTicketPdfData(order(), event({ doorsOpenAt: "" }));
    expect(data.doorsLine).toBeNull();
  });

  it("una página por entrada con asiento, zona general, QR y código corto", () => {
    const tickets = [
      ticket(),
      ticket({ id: "t2", zoneName: "General", seatLabel: null, qrCode: "zzzz-9999-yyyyyy" }),
    ];
    const { pages } = buildTicketPdfData(order({ tickets }), event());
    expect(pages).toHaveLength(2);
    expect(pages[0]).toEqual({
      ticketId: "t1",
      zoneName: "Platea",
      seatLabel: "Fila A · Asiento 3",
      shortCode: "ABCD1234",
      qrPayload: "abcd1234-efghijklmnop",
      statusLabel: null,
      position: { index: 1, total: 2 },
    });
    expect(pages[1].seatLabel).toBeNull();
    expect(pages[1].zoneName).toBe("General");
    expect(pages[1].qrPayload).toBe("zzzz-9999-yyyyyy");
    expect(pages[1].position).toEqual({ index: 2, total: 2 });
  });

  it("marca las usadas y excluye las canceladas", () => {
    const tickets = [
      ticket({ id: "t1", status: "cancelled" }),
      ticket({ id: "t2", status: "redeemed" }),
      ticket({ id: "t3" }),
    ];
    const { pages } = buildTicketPdfData(order({ tickets }), event());
    expect(pages.map((page) => page.ticketId)).toEqual(["t2", "t3"]);
    expect(pages[0].statusLabel).toBe("Usada");
    expect(pages[1].statusLabel).toBeNull();
    expect(pages[1].position).toEqual({ index: 2, total: 2 });
  });

  it("no incluye el correo del comprador", () => {
    expect(JSON.stringify(buildTicketPdfData(order(), event()))).not.toContain("ana@example.com");
  });
});

describe("ticketPdfErrorMessage", () => {
  it("mapea los estados de AC-10", () => {
    expect(ticketPdfErrorMessage(401)).toBe("Inicia sesión para descargar tus entradas");
    expect(ticketPdfErrorMessage(404)).toBe("No encontramos este pedido");
    expect(ticketPdfErrorMessage(409)).toBe("Este pedido no tiene entradas descargables");
  });

  it("usa el mensaje genérico para otros o red", () => {
    const generic = "No pudimos generar tu PDF. Inténtalo de nuevo.";
    expect(ticketPdfErrorMessage(500)).toBe(generic);
    expect(ticketPdfErrorMessage(undefined)).toBe(generic);
  });
});
