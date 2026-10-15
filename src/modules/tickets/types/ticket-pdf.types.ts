export interface TicketPdfPage {
  ticketId: string;
  zoneName: string;
  seatLabel: string | null;
  shortCode: string;
  qrPayload: string;
  statusLabel: string | null;
  position: { index: number; total: number };
}

export interface TicketPdfData {
  orderNumber: string;
  fileName: string;
  title: string;
  eventTitle: string;
  dateLine: string;
  doorsLine: string | null;
  venueLine: string;
  addressLine: string;
  holderName: string;
  holderDocument: string | null;
  totalLabel: string;
  minAgeLabel: string | null;
  pages: TicketPdfPage[];
}

export type TicketPdfFailure = "unauthenticated" | "not_found" | "not_downloadable";

export type TicketPdfResult =
  | { ok: true; buffer: Buffer; fileName: string }
  | { ok: false; reason: TicketPdfFailure; status: 401 | 404 | 409 };
