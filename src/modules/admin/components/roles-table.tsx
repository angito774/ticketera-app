"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { ResultBanner } from "@/components/result-banner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteRoleDialog } from "@/modules/admin/components/delete-role-dialog";
import { RoleFormDialog } from "@/modules/admin/components/role-form-dialog";
import { PERMISSION_INFO } from "@/modules/admin/schemas/role.schema";
import type { RoleRow } from "@/modules/admin/services/role.service";

interface RolesTableProps {
  rows: RoleRow[];
}

type DialogState =
  | { type: "create" }
  | { type: "edit"; row: RoleRow }
  | { type: "delete"; row: RoleRow }
  | null;

function deleteBlockedReason(row: RoleRow): string | undefined {
  if (row.isSystem) return "Los roles de sistema no se pueden eliminar";
  if (row.memberCount > 0) return "No se puede eliminar: hay miembros con este rol";
  return undefined;
}

function SystemBadge() {
  return (
    <span className="rounded-md border px-1.5 py-0.5 text-xs font-medium text-muted-foreground">Sistema</span>
  );
}

function PermissionTags({ row }: { row: RoleRow }) {
  if (row.permissions.length === 0) return <span className="text-xs text-muted-foreground">Sin permisos</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {row.permissions.map((permission) => (
        <li key={permission} className="rounded-md bg-muted px-2 py-0.5 text-xs">
          {permission in PERMISSION_INFO
            ? PERMISSION_INFO[permission as keyof typeof PERMISSION_INFO].label
            : permission}
        </li>
      ))}
    </ul>
  );
}

interface RowActionsProps {
  row: RoleRow;
  onEdit: () => void;
  onDelete: () => void;
}

function RowActions({ row, onEdit, onDelete }: RowActionsProps) {
  const blocked = deleteBlockedReason(row);
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 md:size-10"
        aria-label={`Editar rol ${row.name}`}
        title={`Editar rol ${row.name}`}
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 text-destructive hover:text-destructive md:size-10"
        aria-label={`Eliminar rol ${row.name}`}
        title={blocked ?? `Eliminar rol ${row.name}`}
        disabled={Boolean(blocked)}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

export function RolesTable({ rows }: RolesTableProps) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const close = () => setDialog(null);
  const handleResult = (text: string, tone: "ok" | "error") => setMessage({ text, tone });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" className="h-11 gap-2 md:h-9" onClick={() => setDialog({ type: "create" })}>
          <Plus />
          Nuevo rol
        </Button>
      </div>

      {message && <ResultBanner text={message.text} tone={message.tone} />}

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Rol</TableHead>
              <TableHead scope="col">Descripción</TableHead>
              <TableHead scope="col">Permisos</TableHead>
              <TableHead scope="col">Miembros</TableHead>
              <TableHead scope="col">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2 font-medium">
                      {row.name}
                      {row.isSystem && <SystemBadge />}
                    </span>
                    <span className="text-xs text-muted-foreground">{row.id}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                  {row.description ?? "—"}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <PermissionTags row={row} />
                </TableCell>
                <TableCell>{row.memberCount}</TableCell>
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
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium break-words">
                  {row.name}
                  {row.isSystem && <SystemBadge />}
                </p>
                <p className="text-xs break-all text-muted-foreground">{row.id}</p>
              </div>
              <RowActions
                row={row}
                onEdit={() => setDialog({ type: "edit", row })}
                onDelete={() => setDialog({ type: "delete", row })}
              />
            </div>
            {row.description && <p className="text-sm break-words text-muted-foreground">{row.description}</p>}
            <PermissionTags row={row} />
            <dl className="text-xs">
              <dt className="text-muted-foreground">Miembros</dt>
              <dd className="font-medium">{row.memberCount}</dd>
            </dl>
          </li>
        ))}
      </ul>

      {dialog?.type === "create" && (
        <RoleFormDialog mode="create" open onOpenChange={(open) => !open && close()} onResult={handleResult} />
      )}
      {dialog?.type === "edit" && (
        <RoleFormDialog
          mode="edit"
          row={dialog.row}
          open
          onOpenChange={(open) => !open && close()}
          onResult={handleResult}
        />
      )}
      {dialog?.type === "delete" && (
        <DeleteRoleDialog row={dialog.row} open onOpenChange={(open) => !open && close()} onResult={handleResult} />
      )}
    </div>
  );
}
