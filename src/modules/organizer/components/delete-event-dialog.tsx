"use client";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { deleteEventAction } from "@/modules/organizer/actions/event.actions";

interface DeleteEventDialogProps {
  id: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string, tone: "ok" | "error") => void;
}

export function DeleteEventDialog({ id, title, open, onOpenChange, onResult }: DeleteEventDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar evento ${title}`}
      description="Se eliminará el evento permanentemente. Solo es posible si no tiene órdenes. Esta acción no se puede deshacer."
      confirmLabel="Eliminar evento"
      pendingLabel="Eliminando…"
      onConfirm={() => deleteEventAction({ id })}
      onSuccess={() => onResult(`Evento ${title} eliminado.`, "ok")}
    />
  );
}
