import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { TicketPdfDocument } from "@/modules/tickets/components/ticket-pdf-document";
import type { TicketPdfData } from "@/modules/tickets/types/ticket-pdf.types";

export interface TicketPdfRenderInput {
  data: TicketPdfData;
  qrDataUrls: Record<string, string>;
}

export async function renderTicketPdf({ data, qrDataUrls }: TicketPdfRenderInput): Promise<Buffer> {
  const document = createElement(TicketPdfDocument, { data, qrDataUrls }) as ReactElement<DocumentProps>;
  return renderToBuffer(document);
}
