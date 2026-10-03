"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { ResultBanner } from "@/components/result-banner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { DeleteMemberDialog } from "@/modules/admin/components/delete-member-dialog";
import { MemberFormDialog } from "@/modules/admin/components/member-form-dialog";
import { displayName, RoleBadge, StatusLabel, UserCell } from "@/modules/admin/components/user-identity";
import type { ManageableOrganization, MemberListRow } from "@/modules/admin/services/member-list.service";

interface MembersTableProps {
  rows: MemberListRow[];
  organizations: ManageableOrganization[];
}

type DialogState =
  | { type: "create" }
  | { type: "edit"; row: MemberListRow }
  | { type: "delete"; row: MemberListRow }
  | null;

const NOT_EDITABLE_TITLE = "No tienes permiso sobre este usuario";

interface RowActionsProps {
  row: MemberListRow;
  onEdit: () => void;
  onDelete: () => void;
}

function RowActions({ row, onEdit, onDelete }: RowActionsProps) {
  const name = displayName(row);
  const title = row.editable ? undefined : NOT_EDITABLE_TITLE;
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 md:size-10"
        aria-label={`Editar a ${name}`}
        title={title ?? `Editar a ${name}`}
        disabled={!row.editable}
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 text-destructive hover:text-destructive md:size-10"
        aria-label={`Eliminar a ${name}`}
        title={title ?? `Eliminar a ${name}`}
        disabled={!row.editable}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

export function MembersTable({ rows, organizations }: MembersTableProps) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const close = () => setDialog(null);
  const handleResult = (text: string, tone: "ok" | "error") => setMessage({ text, tone });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" className="h-11 gap-2 md:h-9" onClick={() => setDialog({ type: "create" })}>
          <Plus />
          Agregar usuario
        </Button>
      </div>

      {message && <ResultBanner text={message.text} tone={message.tone} />}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">No hay usuarios con esos filtros</p>
          <Button variant="outline" className="h-11 md:h-9" nativeButton={false} render={<Link href="/admin/users" />}>
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Usuario</TableHead>
                  <TableHead scope="col">Rol</TableHead>
                  <TableHead scope="col">Organización</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col">Último acceso</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.memberId}>
                    <TableCell className="max-w-64">
                      <UserCell fullName={row.fullName} email={row.email} />
                    </TableCell>
                    <TableCell>
                      <RoleBadge label={row.roleName} />
                    </TableCell>
                    <TableCell>{row.organizationName}</TableCell>
                    <TableCell>
                      <StatusLabel verified={row.emailVerified} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatRelativeTime(row.lastSignInAt)}</TableCell>
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
              <li key={row.memberId} className="flex flex-col gap-3 rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <UserCell fullName={row.fullName} email={row.email} />
                  <RowActions
                    row={row}
                    onEdit={() => setDialog({ type: "edit", row })}
                    onDelete={() => setDialog({ type: "delete", row })}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <RoleBadge label={row.roleName} />
                  <StatusLabel verified={row.emailVerified} />
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Organización</dt>
                    <dd className="font-medium break-words">{row.organizationName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Último acceso</dt>
                    <dd className="font-medium">{formatRelativeTime(row.lastSignInAt)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}

      {dialog?.type === "create" && (
        <MemberFormDialog
          mode="create"
          organizations={organizations}
          open
          onOpenChange={(open) => !open && close()}
          onResult={handleResult}
        />
      )}
      {dialog?.type === "edit" && (
        <MemberFormDialog
          mode="edit"
          row={dialog.row}
          organizations={organizations}
          open
          onOpenChange={(open) => !open && close()}
          onResult={handleResult}
        />
      )}
      {dialog?.type === "delete" && (
        <DeleteMemberDialog
          row={dialog.row}
          open
          onOpenChange={(open) => !open && close()}
          onResult={handleResult}
        />
      )}
    </div>
  );
}
