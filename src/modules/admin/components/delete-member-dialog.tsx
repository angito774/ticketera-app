"use client";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { removeMemberAction } from "@/modules/admin/actions/admin.actions";
import type { MemberListRow } from "@/modules/admin/services/member-list.service";

interface DeleteMemberDialogProps {
  row: MemberListRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string, tone: "ok" | "error") => void;
}

export function DeleteMemberDialog({ row, open, onOpenChange, onResult }: DeleteMemberDialogProps) {
  const name = row.fullName ?? row.email;

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar a ${name}`}
      description={`Perderá el acceso a ${row.organizationName} y a su panel. Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar usuario"
      onConfirm={() => removeMemberAction({ memberId: row.memberId })}
      onSuccess={() => onResult(`${name} ya no tiene acceso a ${row.organizationName}.`, "ok")}
    />
  );
}
