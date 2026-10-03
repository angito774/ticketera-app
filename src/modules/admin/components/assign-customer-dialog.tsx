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
import { cn } from "@/lib/utils";
import { addMemberAction } from "@/modules/admin/actions/admin.actions";
import { addMemberSchema } from "@/modules/admin/schemas/admin.schema";
import type { CustomerRow } from "@/modules/admin/services/customer-list.service";
import type { ManageableOrganization, RoleOption } from "@/modules/admin/services/member-list.service";

const SELECT_CLASSES = cn(
  FIELD_INPUT_CLASSES,
  "w-full border border-input bg-transparent outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
);

type FieldName = "fullName" | "organizationId" | "role";
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_ORDER: FieldName[] = ["fullName", "organizationId", "role"];
const FIELD_IDS: Record<FieldName, string> = {
  fullName: "assign-full-name",
  organizationId: "assign-organization",
  role: "assign-role",
};

interface AssignCustomerDialogProps {
  customer: CustomerRow;
  organizations: ManageableOrganization[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string, tone: "ok" | "error") => void;
}

function defaultRole(roles: RoleOption[]): string {
  return roles.at(-1)?.id ?? "";
}

function customerName(customer: CustomerRow): string {
  return customer.fullName?.trim() || customer.email.split("@")[0];
}

export function AssignCustomerDialog({
  customer,
  organizations,
  open,
  onOpenChange,
  onResult,
}: AssignCustomerDialogProps) {
  const assignableOrgs = organizations.filter((org) => org.assignableRoles.length > 0);
  const name = customerName(customer);

  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [organizationId, setOrganizationId] = useState(assignableOrgs[0]?.id ?? "");
  const [role, setRole] = useState(() => defaultRole(assignableOrgs[0]?.assignableRoles ?? []));

  const roleOptions = assignableOrgs.find((org) => org.id === organizationId)?.assignableRoles ?? [];
  const noRoles = roleOptions.length === 0;

  function handleOrganizationChange(id: string) {
    setOrganizationId(id);
    const roles = assignableOrgs.find((org) => org.id === id)?.assignableRoles ?? [];
    if (!roles.some((r) => r.id === role)) setRole(defaultRole(roles));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const parsed = addMemberSchema.safeParse({ organizationId, email: customer.email, fullName: name, role });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (field !== "fullName" && field !== "organizationId" && field !== "role") continue;
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
      const organizationName = assignableOrgs.find((org) => org.id === organizationId)?.name ?? "";
      onOpenChange(false);
      onResult(`${name} ahora pertenece a ${organizationName}`, "ok");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asociar a organización</DialogTitle>
          <DialogDescription>
            {name} ({customer.email}) pasará a ser miembro de la organización con el rol que elijas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormField id={FIELD_IDS.organizationId} label="Organización" required error={errors.organizationId}>
            <select
              {...fieldA11yProps(FIELD_IDS.organizationId, errors.organizationId, true)}
              name="organizationId"
              className={SELECT_CLASSES}
              value={organizationId}
              disabled={pending}
              onChange={(event) => handleOrganizationChange(event.target.value)}
            >
              {assignableOrgs.length === 0 && <option value="">Sin organizaciones disponibles</option>}
              {assignableOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id={FIELD_IDS.role} label="Rol" required error={errors.role}>
            <select
              {...fieldA11yProps(FIELD_IDS.role, errors.role, true)}
              name="role"
              className={SELECT_CLASSES}
              value={role}
              disabled={pending || noRoles}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="">Selecciona un rol</option>
              {roleOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {noRoles && (
              <p className="mt-1 text-xs text-muted-foreground">No tienes roles asignables en esta organización</p>
            )}
          </FormField>

          {errors.fullName && (
            <p id={FIELD_IDS.fullName} role="alert" className="text-sm text-destructive">
              {errors.fullName}
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
            <Button
              type="button"
              variant="outline"
              className="h-11 md:h-9"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-11 md:h-9" disabled={pending || noRoles}>
              {pending ? "Asociando..." : "Asociar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
