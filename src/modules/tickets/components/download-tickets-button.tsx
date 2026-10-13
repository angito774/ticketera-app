"use client";

import { Download, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTicketPdfDownload } from "@/modules/tickets/hooks/use-ticket-pdf-download";

interface DownloadTicketsButtonProps {
  orderId: string;
  orderNumber: string;
  className?: string;
}

export function DownloadTicketsButton({ orderId, orderNumber, className }: DownloadTicketsButtonProps) {
  const { download, isPending, error } = useTicketPdfDownload(orderId, orderNumber);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={download}
        disabled={isPending}
        aria-busy={isPending}
        className={cn(className, "disabled:cursor-not-allowed disabled:opacity-60")}
      >
        {isPending ? (
          <Loader2 className="size-4.5 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4.5" aria-hidden="true" />
        )}
        {isPending ? "Generando PDF…" : "Descargar PDF"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
