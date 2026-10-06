"use client";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { cancelEventAction } from "@/modules/organizer/actions/event.actions";

interface CancelEventDialogProps {
  id: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string, tone: "ok" | "error") => void;
}

export function CancelEventDialog({ id, title, open, onOpenChange, onResult }: CancelEventDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Cancelar evento ${title}`}
      description="El evento dejará de estar disponible para la venta. Las entradas ya vendidas NO se reembolsan ni se anulan. Esta acción no se puede deshacer."
      confirmLabel="Cancelar evento"
      pendingLabel="Cancelando…"
      cancelLabel="Volver"
      onConfirm={() => cancelEventAction({ id })}
      onSuccess={() => onResult(`Evento ${title} cancelado.`, "ok")}
    />
  );
}
