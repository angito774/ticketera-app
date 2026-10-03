"use client";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { deleteRoleAction } from "@/modules/admin/actions/role.actions";
import type { RoleRow } from "@/modules/admin/services/role.service";

interface DeleteRoleDialogProps {
  row: RoleRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string, tone: "ok" | "error") => void;
}

export function DeleteRoleDialog({ row, open, onOpenChange, onResult }: DeleteRoleDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar rol ${row.name}`}
      description="Se eliminará el rol permanentemente. Solo es posible si no es un rol de sistema y ningún miembro lo usa. Esta acción no se puede deshacer."
      confirmLabel="Eliminar rol"
      onConfirm={() => deleteRoleAction({ id: row.id })}
      onSuccess={() => onResult(`Rol ${row.name} eliminado.`, "ok")}
    />
  );
}
