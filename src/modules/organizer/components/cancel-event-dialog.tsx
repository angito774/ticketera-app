"use client";

import { useId, useState } from "react";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Input } from "@/components/ui/input";
import { cancelEventAction } from "@/modules/organizer/actions/event.actions";
import {
  CANCELLATION_NOTE_MAX,
  CANCELLATION_REASONS,
  CANCELLATION_REASON_LABELS,
  type CancellationReason,
} from "@/modules/organizer/schemas/cancellation.schema";

interface CancelEventDialogProps {
  id: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string, tone: "ok" | "error") => void;
}

export function CancelEventDialog({ id, title, open, onOpenChange, onResult }: CancelEventDialogProps) {
  const fieldId = useId();
  const reasonId = `${fieldId}-reason`;
  const noteId = `${fieldId}-note`;
  const counterId = `${fieldId}-counter`;
  const [reason, setReason] = useState<CancellationReason | "">("");
  const [note, setNote] = useState("");

  function handleOpenChange(next: boolean) {
    setReason("");
    setNote("");
    onOpenChange(next);
  }

  async function handleConfirm() {
    if (!reason) return { ok: false as const, error: "Elige el motivo de la cancelación" };
    if (reason === "other" && note.trim().length === 0) {
      return { ok: false as const, error: "Describe el motivo de la cancelación" };
    }
    return cancelEventAction({ id, reason, note: note.trim() || undefined });
  }

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Cancelar evento ${title}`}
      description="Se reembolsará el 100% a todos los compradores y se les avisará por correo. Esta acción no se puede deshacer."
      confirmLabel="Cancelar evento"
      pendingLabel="Cancelando…"
      cancelLabel="Volver"
      onConfirm={handleConfirm}
      onSuccess={() => onResult(`Evento ${title} cancelado. Los reembolsos están en proceso.`, "ok")}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={reasonId} className="text-sm font-medium">
            Motivo de la cancelación
          </label>
          <select
            id={reasonId}
            value={reason}
            onChange={(event) => setReason(event.target.value as CancellationReason | "")}
            className="h-11 w-full cursor-pointer rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm"
          >
            <option value="">Elige un motivo</option>
            {CANCELLATION_REASONS.map((value) => (
              <option key={value} value={value}>
                {CANCELLATION_REASON_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={noteId} className="text-sm font-medium">
            {reason === "other" ? "Describe el motivo" : "Nota (opcional)"}
          </label>
          <Input
            id={noteId}
            value={note}
            maxLength={CANCELLATION_NOTE_MAX}
            aria-describedby={counterId}
            onChange={(event) => setNote(event.target.value)}
            className="h-11 md:h-9"
          />
          <p id={counterId} aria-live="polite" className="text-xs text-muted-foreground">
            {note.length}/{CANCELLATION_NOTE_MAX}
          </p>
        </div>
      </div>
    </ConfirmDeleteDialog>
  );
}
