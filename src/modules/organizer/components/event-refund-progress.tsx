"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  continueEventRefundsAction,
  getEventRefundProgressAction,
} from "@/modules/organizer/actions/event.actions";

interface EventRefundProgressProps {
  eventId: string;
  title: string;
}

export function EventRefundProgress({ eventId, title }: EventRefundProgressProps) {
  const queryClient = useQueryClient();
  const queryKey = ["events", "organizer", "refund-progress", eventId];
  const [processing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await getEventRefundProgressAction({ id: eventId });
      if (!result.ok) throw new Error(result.error);
      return result;
    },
  });

  function continueRefunds() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await continueEventRefundsAction({ id: eventId });
        if (!result.ok) setError(result.error);
      } catch {
        setError("No se pudo continuar con los reembolsos. Inténtalo de nuevo.");
      }
      await queryClient.invalidateQueries({ queryKey });
    });
  }

  let content: string;
  if (isPending) content = "Cargando reembolsos…";
  else if (isError) content = "No se pudo cargar el estado de los reembolsos";
  else if (data.pending === 0) content = "Reembolsos completados";
  else content = `${data.refunded} reembolsadas · ${data.pending} pendientes`;

  return (
    <span className="flex min-w-0 flex-col items-start gap-1">
      <span aria-live="polite" className="text-[0.8125rem] font-medium text-muted-foreground">
        {content}
      </span>
      {data && data.pending > 0 && (
        <button
          type="button"
          aria-label={`Continuar reembolsos de ${title}`}
          disabled={processing}
          onClick={continueRefunds}
          className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-60 lg:h-8 lg:px-2.5 lg:text-[0.8125rem]"
        >
          {processing ? "Procesando…" : "Continuar reembolsos"}
        </button>
      )}
      {error && (
        <span role="alert" className="text-[0.8125rem] text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
