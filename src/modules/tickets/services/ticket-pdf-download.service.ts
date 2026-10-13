import axios from "axios";

import { ticketPdfFileName } from "@/modules/tickets/services/ticket-pdf.mapping";

export interface TicketPdfDownload {
  blob: Blob;
  fileName: string;
}

export class TicketPdfDownloadError extends Error {
  constructor(public readonly status: number | undefined) {
    super("No se pudo descargar el PDF de entradas");
    this.name = "TicketPdfDownloadError";
  }
}

function fileNameFromDisposition(header: unknown): string | null {
  if (typeof header !== "string") return null;
  const match = /filename="([^"\\/]+)"/i.exec(header);
  return match ? match[1] : null;
}

export async function downloadTicketPdf(
  orderId: string,
  orderNumber: string
): Promise<TicketPdfDownload> {
  try {
    const response = await axios.get<Blob>(
      `/api/orders/${encodeURIComponent(orderId)}/tickets/pdf`,
      { responseType: "blob" }
    );
    return {
      blob: response.data,
      fileName:
        fileNameFromDisposition(response.headers?.["content-disposition"]) ??
        ticketPdfFileName(orderNumber),
    };
  } catch (error) {
    throw new TicketPdfDownloadError(
      axios.isAxiosError(error) ? error.response?.status : undefined
    );
  }
}
