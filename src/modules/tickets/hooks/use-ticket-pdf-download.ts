"use client";

import { useMutation } from "@tanstack/react-query";

import {
  downloadTicketPdf,
  TicketPdfDownloadError,
  type TicketPdfDownload,
} from "@/modules/tickets/services/ticket-pdf-download.service";
import { ticketPdfErrorMessage } from "@/modules/tickets/services/ticket-pdf.mapping";

function saveFile({ blob, fileName }: TicketPdfDownload) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function useTicketPdfDownload(orderId: string, orderNumber: string) {
  const mutation = useMutation({
    mutationFn: () => downloadTicketPdf(orderId, orderNumber),
    onSuccess: saveFile,
  });

  const error = mutation.isError
    ? ticketPdfErrorMessage(
        mutation.error instanceof TicketPdfDownloadError ? mutation.error.status : undefined
      )
    : null;

  return { download: () => mutation.mutate(), isPending: mutation.isPending, error };
}
