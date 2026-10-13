import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { getOrderForUser } from "@/modules/checkout/services/order-read.service";
import { getEventById } from "@/modules/events/services/events.service";
import {
  buildTicketPdfData,
  canDownloadTicketPdf,
} from "@/modules/tickets/services/ticket-pdf.mapping";
import { renderTicketPdf } from "@/modules/tickets/services/ticket-pdf.service";
import { ticketQrDataUrl } from "@/modules/tickets/services/ticket-qr.service";
import type {
  TicketPdfFailure,
  TicketPdfResult,
} from "@/modules/tickets/types/ticket-pdf.types";

const STATUS_BY_FAILURE = {
  unauthenticated: 401,
  not_found: 404,
  not_downloadable: 409,
} as const satisfies Record<TicketPdfFailure, 401 | 404 | 409>;

function fail(reason: TicketPdfFailure): TicketPdfResult {
  return { ok: false, reason, status: STATUS_BY_FAILURE[reason] };
}

export async function generateTicketPdfForUser(
  actor: CurrentUser | null,
  orderId: string
): Promise<TicketPdfResult> {
  if (!actor) return fail("unauthenticated");

  const order = await getOrderForUser(actor, orderId);
  if (!order) return fail("not_found");
  if (!canDownloadTicketPdf(order)) return fail("not_downloadable");

  const event = getEventById(order.eventSlug);
  if (!event) return fail("not_found");

  const data = buildTicketPdfData(order, event);
  const entries = await Promise.all(
    data.pages.map(async (page) => [page.ticketId, await ticketQrDataUrl(page.qrPayload)] as const)
  );
  const buffer = await renderTicketPdf({ data, qrDataUrls: Object.fromEntries(entries) });

  return { ok: true, buffer, fileName: data.fileName };
}
