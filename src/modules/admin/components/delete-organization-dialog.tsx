"use client";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { deleteOrganizationAction } from "@/modules/admin/actions/admin.actions";
import type { OrganizationCatalogRow } from "@/modules/admin/services/organization-catalog.service";

interface DeleteOrganizationDialogProps {
  row: OrganizationCatalogRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string, tone: "ok" | "error") => void;
}

export function DeleteOrganizationDialog({ row, open, onOpenChange, onResult }: DeleteOrganizationDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar ${row.name}`}
      description="Se eliminará la organización permanentemente. Solo es posible si no tiene miembros, eventos, recintos ni cupones. Esta acción no se puede deshacer."
      confirmLabel="Eliminar organización"
      onConfirm={() => deleteOrganizationAction({ id: row.id })}
      onSuccess={() => onResult(`Organización ${row.name} eliminada.`, "ok")}
    />
  );
}
