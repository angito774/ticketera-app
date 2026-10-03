"use client";

import { useState, useTransition, type FormEvent } from "react";

import { FIELD_INPUT_CLASSES, FieldError, FormField, fieldA11yProps } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/slugify";
import { createRoleAction, updateRoleAction } from "@/modules/admin/actions/role.actions";
import { PERMISSION_INFO, roleCreateSchema, roleUpdateSchema } from "@/modules/admin/schemas/role.schema";
import type { RoleRow } from "@/modules/admin/services/role.service";
import type { Permission } from "@/modules/auth/services/permissions";

type FieldName = "id" | "name" | "description" | "permissions";
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_ORDER: FieldName[] = ["name", "id", "description", "permissions"];
const FIELD_IDS: Record<FieldName, string> = {
  id: "role-slug",
  name: "role-name",
  description: "role-description",
  permissions: "role-permissions",
};

const PERMISSION_KEYS = Object.keys(PERMISSION_INFO) as Array<keyof typeof PERMISSION_INFO>;

interface RoleFormDialogProps {
  mode: "create" | "edit";
  row?: RoleRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string, tone: "ok" | "error") => void;
}

export function RoleFormDialog({ mode, row, open, onOpenChange, onResult }: RoleFormDialogProps) {
  const isEdit = mode === "edit";
  const lockedPermissions = Boolean(row?.isSystem);

  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [name, setName] = useState(row?.name ?? "");
  const [slug, setSlug] = useState(row?.id ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(row?.description ?? "");
  const [permissions, setPermissions] = useState<Permission[]>(row?.permissions ?? []);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function togglePermission(permission: Permission, checked: boolean) {
    setPermissions((current) =>
      checked ? [...current.filter((item) => item !== permission), permission] : current.filter((item) => item !== permission),
    );
  }

  function focusField(field: FieldName) {
    const id = field === "permissions" ? `${FIELD_IDS.permissions}-${PERMISSION_KEYS[0]}` : FIELD_IDS[field];
    document.getElementById(id)?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const parsed = isEdit
      ? roleUpdateSchema.safeParse({ id: row?.id ?? "", name, description, permissions })
      : roleCreateSchema.safeParse({ id: slug, name, description, permissions });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        if (field in FIELD_IDS && !next[field]) next[field] = issue.message;
      }
      setErrors(next);
      const first = FIELD_ORDER.find((field) => next[field]);
      if (first) focusField(first);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = isEdit ? await updateRoleAction(parsed.data) : await createRoleAction(parsed.data);
      if (!result.ok) return setServerError(result.error);
      onOpenChange(false);
      onResult(isEdit ? "Rol actualizado." : "Rol creado.", "ok");
    });
  }

  const permissionsError = errors.permissions;

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar rol" : "Nuevo rol"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "El identificador del rol no se puede cambiar."
              : "El identificador se genera desde el nombre; puedes ajustarlo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormField id={FIELD_IDS.name} label="Nombre" required error={errors.name}>
            <Input
              {...fieldA11yProps(FIELD_IDS.name, errors.name, true)}
              name="name"
              className={FIELD_INPUT_CLASSES}
              autoComplete="off"
              placeholder="Nombre del rol"
              value={name}
              disabled={pending}
              onChange={(event) => handleNameChange(event.target.value)}
            />
          </FormField>
          <FormField id={FIELD_IDS.id} label="Slug" required error={errors.id}>
            <Input
              {...fieldA11yProps(FIELD_IDS.id, errors.id, true)}
              name="slug"
              className={FIELD_INPUT_CLASSES}
              autoComplete="off"
              placeholder="mi-rol"
              value={slug}
              readOnly={isEdit}
              disabled={pending}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
            />
          </FormField>
          <FormField id={FIELD_IDS.description} label="Descripción" error={errors.description}>
            <Input
              {...fieldA11yProps(FIELD_IDS.description, errors.description)}
              name="description"
              className={FIELD_INPUT_CLASSES}
              autoComplete="off"
              maxLength={200}
              placeholder="Qué hace este rol"
              value={description}
              disabled={pending}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>

          <fieldset
            className="flex flex-col gap-3"
            aria-describedby={permissionsError ? `${FIELD_IDS.permissions}-error` : undefined}
          >
            <legend className={permissionsError ? "text-sm font-medium text-destructive" : "text-sm font-medium"}>
              Permisos
            </legend>
            {lockedPermissions && (
              <p className="text-xs text-muted-foreground">
                Los permisos de un rol de sistema no se pueden cambiar
              </p>
            )}
            {PERMISSION_KEYS.map((permission) => {
              const checkboxId = `${FIELD_IDS.permissions}-${permission}`;
              const info = PERMISSION_INFO[permission];
              return (
                <div key={permission} className="flex min-h-11 items-start gap-3 py-1">
                  <Checkbox
                    id={checkboxId}
                    aria-describedby={`${checkboxId}-description`}
                    aria-invalid={permissionsError ? true : undefined}
                    checked={permissions.includes(permission)}
                    disabled={pending || lockedPermissions}
                    onCheckedChange={(checked) => togglePermission(permission, checked)}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <label htmlFor={checkboxId} className="text-sm font-medium">
                      {info.label}
                    </label>
                    <span id={`${checkboxId}-description`} className="text-xs text-muted-foreground">
                      {info.description}
                    </span>
                  </div>
                </div>
              );
            })}
            <div aria-live="polite">
              {permissionsError && <FieldError id={FIELD_IDS.permissions}>{permissionsError}</FieldError>}
            </div>
          </fieldset>

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
            <Button type="submit" className="h-11 md:h-9" disabled={pending}>
              {pending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear rol"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
