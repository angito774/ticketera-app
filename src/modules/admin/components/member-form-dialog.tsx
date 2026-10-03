"use client";

import { useState, useTransition, type FormEvent } from "react";

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
import { cn } from "@/lib/utils";
import { addMemberAction, changeMemberRoleAction } from "@/modules/admin/actions/admin.actions";
import { addMemberSchema } from "@/modules/admin/schemas/admin.schema";
import type { ManageableOrganization, MemberListRow, RoleOption } from "@/modules/admin/services/member-list.service";

const SELECT_CLASSES = cn(
  FIELD_INPUT_CLASSES,
  "w-full border border-input bg-transparent outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
);

type FieldName = "fullName" | "email" | "organizationId" | "role";
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_ORDER: FieldName[] = ["fullName", "email", "organizationId", "role"];
const FIELD_IDS: Record<FieldName, string> = {
  fullName: "member-full-name",
  email: "member-email",
  organizationId: "member-organization",
  role: "member-role",
};

interface MemberFormDialogProps {
  mode: "create" | "edit";
  row?: MemberListRow;
  organizations: ManageableOrganization[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string, tone: "ok" | "error") => void;
}

function defaultRole(roles: RoleOption[]): string {
  return roles.at(-1)?.id ?? "";
}

export function MemberFormDialog({ mode, row, organizations, open, onOpenChange, onResult }: MemberFormDialogProps) {
  const isEdit = mode === "edit";
  const creatableOrgs = organizations.filter((org) => org.assignableRoles.length > 0);

  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [organizationId, setOrganizationId] = useState(creatableOrgs[0]?.id ?? "");
  const [role, setRole] = useState<string>(() =>
    isEdit && row ? row.roleId : defaultRole(creatableOrgs[0]?.assignableRoles ?? []),
  );

  const roleOptions: RoleOption[] = isEdit
    ? (row?.assignableRoles ?? [])
    : (creatableOrgs.find((org) => org.id === organizationId)?.assignableRoles ?? []);

  function handleOrganizationChange(id: string) {
    setOrganizationId(id);
    const roles = creatableOrgs.find((org) => org.id === id)?.assignableRoles ?? [];
    if (!role || !roles.some((r) => r.id === role)) setRole(defaultRole(roles));
  }

  function finish(text: string) {
    onOpenChange(false);
    onResult(text, "ok");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    if (noRoles) return;

    if (isEdit) {
      if (!row || !role) return;
      startTransition(async () => {
        const result = await changeMemberRoleAction({ memberId: row.memberId, role });
        if (!result.ok) return setServerError(result.error);
        finish("Rol actualizado.");
      });
      return;
    }

    const data = new FormData(event.currentTarget);
    const input = {
      organizationId,
      email: data.get("email"),
      fullName: data.get("fullName"),
      role,
    };
    const parsed = addMemberSchema.safeParse(input);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        if (next[field]) continue;
        next[field] =
          field === "organizationId"
            ? "Selecciona una organización"
            : field === "role"
              ? "Selecciona un rol"
              : issue.message;
      }
      setErrors(next);
      const first = FIELD_ORDER.find((field) => next[field]);
      if (first) document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = await addMemberAction(parsed.data);
      if (!result.ok) return setServerError(result.error);
      finish(
        result.temporaryPassword
          ? `Usuario agregado. Contraseña temporal (compártela por un canal seguro, no se vuelve a mostrar): ${result.temporaryPassword}`
          : "Usuario agregado.",
      );
    });
  }

  const noRoles = roleOptions.length === 0;

  const roleSelect = (
    <FormField id={FIELD_IDS.role} label="Rol" required error={errors.role}>
      <select
        {...fieldA11yProps(FIELD_IDS.role, errors.role, true)}
        name="role"
        className={SELECT_CLASSES}
        value={role}
        disabled={pending || noRoles}
        onChange={(event) => setRole(event.target.value)}
      >
        {!isEdit && <option value="">Selecciona un rol</option>}
        {roleOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {noRoles && <p className="mt-1 text-xs text-muted-foreground">No tienes roles asignables en esta organización</p>}
    </FormField>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar usuario" : "Agregar usuario"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Solo puedes cambiar el rol. Para mover a otra organización, elimina y vuelve a agregar."
              : "Si el correo no tiene cuenta, se crea con una contraseña temporal."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {isEdit && row ? (
            <>
              <FormField id="member-full-name" label="Nombre">
                <Input
                  id="member-full-name"
                  className={FIELD_INPUT_CLASSES}
                  value={row.fullName ?? ""}
                  readOnly
                  disabled
                />
              </FormField>
              <FormField id="member-email" label="Correo">
                <Input id="member-email" className={FIELD_INPUT_CLASSES} value={row.email} readOnly disabled />
              </FormField>
              <FormField id="member-organization" label="Organización">
                <Input
                  id="member-organization"
                  className={FIELD_INPUT_CLASSES}
                  value={row.organizationName}
                  readOnly
                  disabled
                />
              </FormField>
            </>
          ) : (
            <>
              <FormField id={FIELD_IDS.fullName} label="Nombre" required error={errors.fullName}>
                <Input
                  {...fieldA11yProps(FIELD_IDS.fullName, errors.fullName, true)}
                  name="fullName"
                  className={FIELD_INPUT_CLASSES}
                  autoComplete="off"
                  placeholder="Nombre completo"
                  disabled={pending}
                />
              </FormField>
              <FormField id={FIELD_IDS.email} label="Correo" required error={errors.email}>
                <Input
                  {...fieldA11yProps(FIELD_IDS.email, errors.email, true)}
                  name="email"
                  type="email"
                  className={FIELD_INPUT_CLASSES}
                  autoComplete="off"
                  placeholder="correo@ejemplo.com"
                  disabled={pending}
                />
              </FormField>
              <FormField id={FIELD_IDS.organizationId} label="Organización" required error={errors.organizationId}>
                <select
                  {...fieldA11yProps(FIELD_IDS.organizationId, errors.organizationId, true)}
                  name="organizationId"
                  className={SELECT_CLASSES}
                  value={organizationId}
                  disabled={pending}
                  onChange={(event) => handleOrganizationChange(event.target.value)}
                >
                  {creatableOrgs.length === 0 && <option value="">Sin organizaciones disponibles</option>}
                  {creatableOrgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </>
          )}

          {roleSelect}

          {serverError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm break-words text-destructive"
            >
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 md:h-9"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-11 md:h-9" disabled={pending || noRoles || (isEdit && role === row?.roleId)}>
              {pending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
