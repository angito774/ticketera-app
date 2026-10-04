"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { ResultBanner } from "@/components/result-banner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DeleteOrganizationDialog } from "@/modules/admin/components/delete-organization-dialog";
import { OrganizationFormDialog } from "@/modules/admin/components/organization-form-dialog";
import type { OrganizationCatalogRow } from "@/modules/admin/services/organization-catalog.service";

interface OrganizationsTableProps {
  rows: OrganizationCatalogRow[];
  canCreate: boolean;
}

type DialogState =
  | { type: "create" }
  | { type: "edit"; row: OrganizationCatalogRow }
  | { type: "delete"; row: OrganizationCatalogRow }
  | null;

const NOT_EDITABLE_TITLE = "No tienes permiso sobre esta organización";

const STRIPE_STATUS: Record<string, { label: string; className: string }> = {
  not_started: { label: "Sin iniciar", className: "text-muted-foreground" },
  pending: { label: "Pendiente", className: "text-amber-700 dark:text-amber-400" },
  active: { label: "Activo", className: "text-emerald-700 dark:text-emerald-400" },
  restricted: { label: "Restringido", className: "text-destructive" },
};

function StripeStatus({ status }: { status: string }) {
  const { label, className } = STRIPE_STATUS[status] ?? { label: status, className: "text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", className)}>
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {label}
    </span>
  );
}

interface RowActionsProps {
  row: OrganizationCatalogRow;
  onEdit: () => void;
  onDelete: () => void;
}

function RowActions({ row, onEdit, onDelete }: RowActionsProps) {
  const title = row.canEdit ? undefined : NOT_EDITABLE_TITLE;
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 md:size-10"
        aria-label={`Editar ${row.name}`}
        title={title ?? `Editar ${row.name}`}
        disabled={!row.canEdit}
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 text-destructive hover:text-destructive md:size-10"
        aria-label={`Eliminar ${row.name}`}
        title={title ?? `Eliminar ${row.name}`}
        disabled={!row.canEdit}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

export function OrganizationsTable({ rows, canCreate }: OrganizationsTableProps) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const hasQuery = Boolean(useSearchParams().get("q"));

  const close = () => setDialog(null);
  const handleResult = (text: string, tone: "ok" | "error") => setMessage({ text, tone });

  return (
    <div className="flex flex-col gap-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button type="button" className="h-11 gap-2 md:h-9" onClick={() => setDialog({ type: "create" })}>
            <Plus />
            Nueva organización
          </Button>
        </div>
      )}

      {message && <ResultBanner text={message.text} tone={message.tone} />}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">No hay organizaciones</p>
          {hasQuery && (
            <Button variant="outline" className="h-11 md:h-9" nativeButton={false} render={<Link href="/admin" />}>
              Limpiar búsqueda
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Nombre</TableHead>
                  <TableHead scope="col">Slug</TableHead>
                  <TableHead scope="col">Miembros</TableHead>
                  <TableHead scope="col">Eventos</TableHead>
                  <TableHead scope="col">Stripe</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-64 truncate font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.slug}</TableCell>
                    <TableCell>{row.memberCount}</TableCell>
                    <TableCell>{row.eventCount}</TableCell>
                    <TableCell>
                      <StripeStatus status={row.stripeConnectStatus} />
                    </TableCell>
                    <TableCell>
                      <RowActions
                        row={row}
                        onEdit={() => setDialog({ type: "edit", row })}
                        onDelete={() => setDialog({ type: "delete", row })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">{row.name}</p>
                    <p className="text-xs break-all text-muted-foreground">{row.slug}</p>
                  </div>
                  <RowActions
                    row={row}
                    onEdit={() => setDialog({ type: "edit", row })}
                    onDelete={() => setDialog({ type: "delete", row })}
                  />
                </div>
                <StripeStatus status={row.stripeConnectStatus} />
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Miembros</dt>
                    <dd className="font-medium">{row.memberCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Eventos</dt>
                    <dd className="font-medium">{row.eventCount}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}

      {dialog?.type === "create" && (
        <OrganizationFormDialog mode="create" open onOpenChange={(open) => !open && close()} onResult={handleResult} />
      )}
      {dialog?.type === "edit" && (
        <OrganizationFormDialog
          mode="edit"
          row={dialog.row}
          open
          onOpenChange={(open) => !open && close()}
          onResult={handleResult}
        />
      )}
      {dialog?.type === "delete" && (
        <DeleteOrganizationDialog
          row={dialog.row}
          open
          onOpenChange={(open) => !open && close()}
          onResult={handleResult}
        />
      )}
    </div>
  );
}
