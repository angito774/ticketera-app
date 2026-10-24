"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResultBanner } from "@/components/result-banner";
import { startImpersonationAction } from "@/modules/admin/actions/impersonation.actions";
import type { MemberListRow } from "@/modules/admin/services/member-list.service";

export interface ImpersonateDialogProps {
  row: Pick<MemberListRow, "userId" | "fullName" | "email">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Pending = "open" | "copy" | null;

const CLIPBOARD_ERROR = "No se pudo copiar el enlace. Usa \"Abrir aquí\" o inténtalo de nuevo";

export function ImpersonateDialog({ row, open, onOpenChange }: ImpersonateDialogProps) {
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const name = row.fullName ?? row.email;
  const busy = pending !== null;

  async function requestUrl(kind: Exclude<Pending, null>): Promise<string | null> {
    setError(null);
    setCopied(false);
    setPending(kind);
    try {
      const result = await startImpersonationAction(row.userId);
      if (result.ok) return result.url;
      setError(result.error);
    } catch {
      setError("Ocurrió un error inesperado. Inténtalo de nuevo");
    }
    setPending(null);
    return null;
  }

  async function handleOpen() {
    const url = await requestUrl("open");
    if (url) window.location.assign(url);
  }

  async function handleCopy() {
    const url = await requestUrl("copy");
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError(CLIPBOARD_ERROR);
    }
    setPending(null);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Impersonar a {name}</DialogTitle>
          <DialogDescription>
            Vas a actuar como {row.fullName ? `${row.fullName} (${row.email})` : row.email}. La sesión actual de este
            navegador será reemplazada y tendrás que volver a iniciar sesión para recuperar tu cuenta. Para no perderla,
            copia el enlace y ábrelo en una ventana privada.
          </DialogDescription>
        </DialogHeader>

        <div aria-live="polite" className="flex flex-col gap-2">
          {busy && <p className="text-sm text-muted-foreground">Generando enlace...</p>}
          {copied && <ResultBanner text="Enlace copiado" tone="ok" />}
          {error && <ResultBanner text={error} tone="error" />}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy} onClick={handleCopy}>
            {pending === "copy" ? "Copiando..." : "Copiar enlace"}
          </Button>
          <Button type="button" className="h-11 md:h-9" disabled={busy} onClick={handleOpen}>
            {pending === "open" ? "Abriendo..." : "Abrir aquí"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
