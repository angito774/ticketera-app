// @vitest-environment node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderTicketPdf } from "@/modules/tickets/services/ticket-pdf.service";
import { ticketQrDataUrl } from "@/modules/tickets/services/ticket-qr.service";
import type { TicketPdfData, TicketPdfPage } from "@/modules/tickets/types/ticket-pdf.types";

function makeData(total: number): TicketPdfData {
  const pages: TicketPdfPage[] = Array.from({ length: total }, (_, i) => ({
    ticketId: `t-${i + 1}`,
    zoneName: "Platea Norte",
    seatLabel: i % 2 === 0 ? "Fila A · Asiento 3" : null,
    shortCode: `ABCD123${i}`,
    qrPayload: `payload-unico-${i + 1}-xxxxxxxxxx`,
    statusLabel: i === 1 ? "Usada" : null,
    position: { index: i + 1, total },
  }));
  return {
    orderNumber: "TK-1A2B3C4D",
    fileName: "entradas-TK-1A2B3C4D.pdf",
    title: "Entradas · Concierto de Prueba · TK-1A2B3C4D",
    eventTitle: "Concierto de Prueba: Gira Nacional",
    dateLine: "sábado, 14 de noviembre · 20:00 h",
    doorsLine: "Puertas: 18:00 h",
    venueLine: "Estadio Nacional",
    addressLine: "Av. José Díaz s/n, Lima",
    holderName: "Ana Núñez Peña",
    totalLabel: "S/ 350",
    minAgeLabel: "Mayores de 18 años",
    pages,
  };
}

async function render(total: number) {
  const data = makeData(total);
  const entries = await Promise.all(
    data.pages.map(async (page) => [page.ticketId, await ticketQrDataUrl(page.qrPayload)] as const)
  );
  return renderTicketPdf({ data, qrDataUrls: Object.fromEntries(entries) });
}

function countPages(buffer: Buffer): number {
  return (buffer.toString("latin1").match(/\/Type \/Page\b(?!s)/g) ?? []).length;
}

describe("renderTicketPdf", () => {
  it("starts with the PDF header", async () => {
    const buffer = await render(2);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("renders one page per ticket", async () => {
    expect(countPages(await render(3))).toBe(3);
  });

  it("keeps a 10-ticket order under 1 MB", async () => {
    const buffer = await render(10);
    expect(buffer.length).toBeLessThan(1024 * 1024);
    const sampleDir = process.env.TICKET_PDF_SAMPLE_DIR;
    if (sampleDir) {
      mkdirSync(sampleDir, { recursive: true });
      writeFileSync(join(sampleDir, "sample.pdf"), buffer);
    }
  });
});
