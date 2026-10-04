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
import { createOrganizationAction, updateOrganizationAction } from "@/modules/admin/actions/admin.actions";
import { slugify } from "@/lib/slugify";
import { organizationSchema, organizationUpdateSchema } from "@/modules/admin/schemas/organization.schema";
import type { OrganizationCatalogRow } from "@/modules/admin/services/organization-catalog.service";

type FieldName = "name" | "slug";
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_ORDER: FieldName[] = ["name", "slug"];
const FIELD_IDS: Record<FieldName, string> = {
  name: "organization-name",
  slug: "organization-slug",
};

interface OrganizationFormDialogProps {
  mode: "create" | "edit";
  row?: OrganizationCatalogRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string, tone: "ok" | "error") => void;
}

export function OrganizationFormDialog({ mode, row, open, onOpenChange, onResult }: OrganizationFormDialogProps) {
  const isEdit = mode === "edit";

  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [name, setName] = useState(row?.name ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const parsed = isEdit
      ? organizationUpdateSchema.safeParse({ id: row?.id ?? "", name, slug })
      : organizationSchema.safeParse({ name, slug });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        if (field in FIELD_IDS && !next[field]) next[field] = issue.message;
      }
      setErrors(next);
      const first = FIELD_ORDER.find((field) => next[field]);
      if (first) document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = isEdit
        ? await updateOrganizationAction({ id: row?.id ?? "", ...parsed.data })
        : await createOrganizationAction(parsed.data);
      if (!result.ok) return setServerError(result.error);
      onOpenChange(false);
      onResult(isEdit ? "Organización actualizada." : "Organización creada.", "ok");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar organización" : "Nueva organización"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cambiar el slug puede romper enlaces existentes a la organización."
              : "El slug se genera desde el nombre; puedes ajustarlo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormField id={FIELD_IDS.name} label="Nombre" required error={errors.name}>
            <Input
              {...fieldA11yProps(FIELD_IDS.name, errors.name, true)}
              name="name"
              className={FIELD_INPUT_CLASSES}
              autoComplete="off"
              placeholder="Nombre de la organización"
              value={name}
              disabled={pending}
              onChange={(event) => handleNameChange(event.target.value)}
            />
          </FormField>
          <FormField id={FIELD_IDS.slug} label="Slug" required error={errors.slug}>
            <Input
              {...fieldA11yProps(FIELD_IDS.slug, errors.slug, true)}
              name="slug"
              className={FIELD_INPUT_CLASSES}
              autoComplete="off"
              placeholder="mi-organizacion"
              value={slug}
              disabled={pending}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
            />
          </FormField>

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
              {pending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear organización"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
