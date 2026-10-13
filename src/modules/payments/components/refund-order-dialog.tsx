"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Undo2 } from "lucide-react";

import { FIELD_INPUT_CLASSES, FormField, fieldA11yProps } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import { previewRefundAction, refundOrderAction } from "@/modules/payments/actions/payments-admin.actions";
import { refundOrderInputSchema } from "@/modules/payments/schemas/refund.schema";

interface RefundPreview {
  orderId: string;
  eventTitle: string;
  total: number;
  buyerEmail: string;
  refundable: boolean;
  reason?: string;
}

interface RefundOrderDialogProps {
  onResult: (text: string, tone: "ok" | "error") => void;
}

const ORDER_FIELD_ID = "refund-order-id";

export function RefundOrderDialog({ onResult }: RefundOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [orderId, setOrderId] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RefundPreview | null>(null);

  function reset() {
    setOrderId("");
    setFieldError(undefined);
    setServerError(null);
    setPreview(null);
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    if (!next) reset();
    setOpen(next);
  }

  function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    setPreview(null);
    const parsed = refundOrderInputSchema.safeParse({ orderId: orderId.trim() });
    if (!parsed.success) {
      setFieldError("Ingresa un id de orden válido");
      document.getElementById(ORDER_FIELD_ID)?.focus();
      return;
    }
    setFieldError(undefined);
    startTransition(async () => {
      const result = await previewRefundAction(parsed.data);
      if (!result.ok) return setServerError(result.error);
      if (!result.preview) return setServerError("Orden no encontrada");
      setPreview(result.preview);
    });
  }

  function handleConfirm() {
    if (!preview) return;
    setServerError(null);
    startTransition(async () => {
      const result = await refundOrderAction({ orderId: preview.orderId });
      if (!result.ok) return setServerError(result.error);
      setOpen(false);
      reset();
      onResult(
        result.status === "refunded"
          ? "Orden reembolsada"
          : "Orden marcada como reembolsada; el reembolso en Stripe quedó pendiente y puede reintentarse",
        result.status === "refunded" ? "ok" : "error",
      );
    });
  }

  return (
    <>
      <Button type="button" variant="outline" className="h-11 gap-2 md:h-9" onClick={() => setOpen(true)}>
        <Undo2 />
        Reembolsar orden
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reembolsar orden</DialogTitle>
            <DialogDescription>
              Ingresa el id de la orden. Se devolverá el 100% del pago al comprador y se cancelarán sus entradas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLookup} noValidate className="flex flex-col gap-4">
            <FormField id={ORDER_FIELD_ID} label="Id de la orden" required error={fieldError}>
              <Input
                {...fieldA11yProps(ORDER_FIELD_ID, fieldError, true)}
                name="orderId"
                className={FIELD_INPUT_CLASSES}
                autoComplete="off"
                value={orderId}
                disabled={pending}
                onChange={(event) => {
                  setOrderId(event.target.value);
                  setPreview(null);
                }}
              />
            </FormField>
            <Button type="submit" variant="outline" className="h-11 md:h-9" disabled={pending || !orderId.trim()}>
              {pending && !preview ? "Buscando..." : "Buscar orden"}
            </Button>
          </form>

          {preview && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border p-3 text-sm">
              <dt className="text-muted-foreground">Evento</dt>
              <dd className="font-medium break-words">{preview.eventTitle}</dd>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-medium tabular-nums">{formatPrice(preview.total / 100)}</dd>
              <dt className="text-muted-foreground">Comprador</dt>
              <dd className="font-medium break-all">{preview.buyerEmail}</dd>
            </dl>
          )}

          {preview && !preview.refundable && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {preview.reason ?? "La orden no es reembolsable"}
            </p>
          )}

          {serverError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm break-words text-destructive"
            >
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 md:h-9" disabled={pending} onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11 md:h-9"
              disabled={pending || !preview?.refundable}
              onClick={handleConfirm}
            >
              {pending && preview ? "Reembolsando..." : "Confirmar reembolso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
