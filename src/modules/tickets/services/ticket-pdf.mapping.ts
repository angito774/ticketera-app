import { formatLongDate, formatPrice, formatTime } from "@/lib/format";
import type { EventDetail } from "@/modules/events/types/event.types";
import {
  shortTicketCode,
  type OrderTicketView,
  type OrderView,
} from "@/modules/checkout/services/order-read.mapping";
import type { TicketPdfData, TicketPdfPage } from "@/modules/tickets/types/ticket-pdf.types";

const REDEEMED_LABEL = "Usada";

export function canDownloadTicketPdf(
  order: Pick<OrderView, "status" | "eventStatus" | "tickets">
): boolean {
  return (
    order.status === "paid" &&
    order.eventStatus !== "cancelled" &&
    order.tickets.some((ticket) => ticket.status !== "cancelled")
  );
}

export function ticketPdfFileName(orderNumber: string): string {
  return `entradas-${orderNumber}.pdf`;
}

function statusLabelOf(status: OrderTicketView["status"]): string | null {
  return status === "redeemed" ? REDEEMED_LABEL : null;
}

export function buildTicketPdfData(order: OrderView, event: EventDetail): TicketPdfData {
  const included = order.tickets.filter((ticket) => ticket.status !== "cancelled");
  const pages: TicketPdfPage[] = included.map((ticket, index) => ({
    ticketId: ticket.id,
    zoneName: ticket.zoneName,
    seatLabel: ticket.seatLabel,
    shortCode: shortTicketCode(ticket.qrCode),
    qrPayload: ticket.qrCode,
    statusLabel: statusLabelOf(ticket.status),
    position: { index: index + 1, total: included.length },
  }));

  return {
    orderNumber: order.number,
    fileName: ticketPdfFileName(order.number),
    title: `Entradas · ${order.eventTitle} · ${order.number}`,
    eventTitle: order.eventTitle,
    dateLine: `${formatLongDate(event.date)} · ${formatTime(event.date)} h`,
    doorsLine: event.doorsOpenAt ? `Puertas: ${formatTime(event.doorsOpenAt)} h` : null,
    venueLine: event.venue,
    addressLine: `${event.address}, ${event.city}`,
    holderName: order.buyerName,
    holderDocument: order.buyerDocumentNumber,
    totalLabel: formatPrice(order.total),
    minAgeLabel: event.minAge === null ? null : `Mayores de ${event.minAge} años`,
    pages,
  };
}

export function ticketPdfErrorMessage(status: number | undefined): string {
  if (status === 401) return "Inicia sesión para descargar tus entradas";
  if (status === 404) return "No encontramos este pedido";
  if (status === 409) return "Este pedido no tiene entradas descargables";
  return "No pudimos generar tu PDF. Inténtalo de nuevo.";
}
