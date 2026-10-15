"use client";

import { useState, useTransition } from "react";

import { ResultBanner } from "@/components/result-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatPrice } from "@/lib/format";
import {
  refundEventAction,
  retryPendingRefundsAction,
  retrySettlementAction,
  settleEventAction,
  type PaymentsActionResult,
} from "@/modules/payments/actions/payments-admin.actions";
import { RefundDeadlineBadge } from "@/modules/payments/components/refund-deadline-badge";
import { RefundOrderDialog } from "@/modules/payments/components/refund-order-dialog";
import type { SettlementCandidate, SettlementRow } from "@/modules/payments/services/settlement.service";
import type { CancelledEventRow, PaymentRow } from "@/modules/payments/types/payments-admin.types";

interface SettlementsTableProps {
  payments: PaymentRow[];
  candidates: SettlementCandidate[];
  settlements: SettlementRow[];
  cancelledEvents: CancelledEventRow[];
  pendingRefunds: number;
}

const STATUS_LABEL: Record<SettlementRow["status"], string> = {
  pending: "Pendiente",
  paid: "Pagada",
  failed: "Fallida",
};

const STATUS_VARIANT: Record<SettlementRow["status"], "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  paid: "default",
  failed: "destructive",
};

const money = (cents: number) => formatPrice(cents / 100);

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">{text}</p>
  );
}

export function SettlementsTable({ payments, candidates, settlements, cancelledEvents, pendingRefunds }: SettlementsTableProps) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  function run<T extends object>(
    id: string,
    action: () => Promise<PaymentsActionResult<T>>,
    describe: (result: T) => { text: string; tone: "ok" | "error" },
  ) {
    setMessage(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? describe(result) : { text: result.error, tone: "error" });
      setBusyId(null);
    });
  }

  function settle(eventId: string) {
    run(
      eventId,
      () => settleEventAction({ eventId }),
      (result) =>
        result.status === "paid"
          ? { text: "Liquidación pagada al organizador", tone: "ok" }
          : { text: result.reason ?? "La transferencia falló; puedes reintentarla", tone: "error" },
    );
  }

  function retry(settlementId: string) {
    run(
      settlementId,
      () => retrySettlementAction({ settlementId }),
      (result) =>
        result.status === "paid"
          ? { text: "Liquidación pagada al organizador", tone: "ok" }
          : { text: "La transferencia volvió a fallar", tone: "error" },
    );
  }

  function refundEvent(eventId: string) {
    run(
      eventId,
      () => refundEventAction({ eventId }),
      (result) => ({
        text: `Reembolsadas ${result.processed}, con error ${result.failed}, restantes ${result.remaining}`,
        tone: result.failed > 0 ? "error" : "ok",
      }),
    );
  }

  function retryPendingRefunds() {
    run(
      "pending-refunds",
      () => retryPendingRefundsAction(),
      (result) => ({
        text: `Reembolsos completados ${result.processed}, con error ${result.failed}, restantes ${result.remaining}`,
        tone: result.failed > 0 ? "error" : "ok",
      }),
    );
  }

  const warningCount = cancelledEvents.filter((row) => row.deadline.state === "warning").length;
  const overdueCount = cancelledEvents.filter((row) => row.deadline.state === "overdue").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <RefundOrderDialog onResult={(text, tone) => setMessage({ text, tone })} />
        {pendingRefunds > 0 && (
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            disabled={pending}
            onClick={retryPendingRefunds}
          >
            {busyId === "pending-refunds" ? "Reintentando..." : `Reintentar reembolsos pendientes (${pendingRefunds})`}
          </Button>
        )}
      </div>

      {message && <ResultBanner text={message.text} tone={message.tone} />}

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Pagos recibidos ({payments.length})</TabsTrigger>
          <TabsTrigger value="candidates">Por liquidar ({candidates.length})</TabsTrigger>
          <TabsTrigger value="settlements">Liquidaciones ({settlements.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelados ({cancelledEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          {payments.length === 0 ? (
            <EmptyState text="Aún no hay pagos recibidos" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Evento</TableHead>
                  <TableHead scope="col">Organización</TableHead>
                  <TableHead scope="col">Comprador</TableHead>
                  <TableHead scope="col">Monto</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col">Liquidado</TableHead>
                  <TableHead scope="col">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((row) => (
                  <TableRow key={row.orderId}>
                    <TableCell className="max-w-64 font-medium break-words whitespace-normal">{row.eventTitle}</TableCell>
                    <TableCell>{row.organizationName}</TableCell>
                    <TableCell>{row.buyerEmail}</TableCell>
                    <TableCell className="font-medium tabular-nums">{money(row.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "paid" ? "default" : "secondary"}>
                        {row.status === "paid" ? "Pagado" : "Reembolsado"}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.status === "paid" ? (row.settled ? "Sí" : "No") : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(row.date.toISOString())}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="candidates">
          {candidates.length === 0 ? (
            <EmptyState text="No hay eventos listos para liquidar" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Evento</TableHead>
                  <TableHead scope="col">Organización</TableHead>
                  <TableHead scope="col">Órdenes</TableHead>
                  <TableHead scope="col">Bruto</TableHead>
                  <TableHead scope="col">Comisión</TableHead>
                  <TableHead scope="col">Pago al organizador</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((row) => (
                  <TableRow key={row.eventId}>
                    <TableCell className="max-w-64 font-medium break-words whitespace-normal">{row.eventTitle}</TableCell>
                    <TableCell>{row.organizationName}</TableCell>
                    <TableCell className="tabular-nums">{row.orders}</TableCell>
                    <TableCell className="tabular-nums">{money(row.gross)}</TableCell>
                    <TableCell className="tabular-nums">{money(row.fee)}</TableCell>
                    <TableCell className="font-medium tabular-nums">{money(row.payout)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        className="h-11 md:h-9"
                        disabled={pending}
                        aria-label={`Liquidar ${row.eventTitle}`}
                        onClick={() => settle(row.eventId)}
                      >
                        {busyId === row.eventId ? "Liquidando..." : "Liquidar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="settlements">
          {settlements.length === 0 ? (
            <EmptyState text="Aún no hay liquidaciones" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Evento</TableHead>
                  <TableHead scope="col">Organización</TableHead>
                  <TableHead scope="col">Bruto</TableHead>
                  <TableHead scope="col">Comisión</TableHead>
                  <TableHead scope="col">Pago</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col">Intentos</TableHead>
                  <TableHead scope="col">Fecha</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-64 font-medium break-words whitespace-normal">{row.eventTitle}</TableCell>
                    <TableCell>{row.organizationName}</TableCell>
                    <TableCell className="tabular-nums">{money(row.gross)}</TableCell>
                    <TableCell className="tabular-nums">{money(row.fee)}</TableCell>
                    <TableCell className="font-medium tabular-nums">{money(row.payout)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                      {row.status === "failed" && row.failureCode && (
                        <span className="mt-1 block text-xs text-muted-foreground">{row.failureCode}</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{row.attempts}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate((row.paidAt ?? row.createdAt).toISOString())}
                    </TableCell>
                    <TableCell>
                      {row.status === "failed" && (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 md:h-9"
                          disabled={pending}
                          aria-label={`Reintentar liquidación de ${row.eventTitle}`}
                          onClick={() => retry(row.id)}
                        >
                          {busyId === row.id ? "Reintentando..." : "Reintentar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="cancelled">
          {cancelledEvents.length === 0 ? (
            <EmptyState text="No hay eventos cancelados con reembolsos pendientes" />
          ) : (
            <>
            {(warningCount > 0 || overdueCount > 0) && (
              <p className="mb-3 text-sm text-muted-foreground">
                {[
                  warningCount > 0 && `${warningCount} ${warningCount === 1 ? "evento por vencer" : "eventos por vencer"}`,
                  overdueCount > 0 && `${overdueCount} con plazo vencido`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Evento</TableHead>
                  <TableHead scope="col">Organización</TableHead>
                  <TableHead scope="col">Órdenes pendientes</TableHead>
                  <TableHead scope="col">Plazo de reembolso</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cancelledEvents.map((row) => (
                  <TableRow key={row.eventId}>
                    <TableCell className="max-w-64 font-medium break-words whitespace-normal">{row.eventTitle}</TableCell>
                    <TableCell>{row.organizationName}</TableCell>
                    <TableCell className="tabular-nums">{row.pendingOrders}</TableCell>
                    <TableCell>
                      <RefundDeadlineBadge deadline={row.deadline} />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-11 md:h-9"
                        disabled={pending}
                        aria-label={`Reembolsar evento ${row.eventTitle}`}
                        onClick={() => refundEvent(row.eventId)}
                      >
                        {busyId === row.eventId ? "Reembolsando..." : "Reembolsar evento"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
