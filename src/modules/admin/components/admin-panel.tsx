"use client";

import { useState, useTransition, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addMemberAction,
  changeMemberRoleAction,
  createOrganizationAction,
  removeMemberAction,
  type ActionResult,
} from "@/modules/admin/actions/admin.actions";
import type { OrganizationRow } from "@/modules/admin/services/admin.service";
import type { OrgRole } from "@/modules/auth/services/permissions";

const ROLE_LABELS: Record<OrgRole, string> = {
  admin: "Administrador",
  organizer: "Organizador",
};

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

interface AdminPanelProps {
  organizations: OrganizationRow[];
  canCreateOrganizations: boolean;
}

export function AdminPanel({ organizations, canCreateOrganizations }: AdminPanelProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  function run(action: () => Promise<ActionResult>, okText: string, onOk?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return setMessage({ text: result.error, tone: "error" });
      onOk?.();
      setMessage({
        text: result.temporaryPassword
          ? `${okText} Contraseña temporal (compártela por un canal seguro, no se vuelve a mostrar): ${result.temporaryPassword}`
          : okText,
        tone: "ok",
      });
    });
  }

  function handleCreateOrg(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = new FormData(form).get("name");
    run(() => createOrganizationAction({ name }), "Organización creada.", () => form.reset());
  }

  function handleAddMember(event: FormEvent<HTMLFormElement>, organizationId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    run(
      () =>
        addMemberAction({
          organizationId,
          email: data.get("email"),
          fullName: data.get("fullName"),
          role: data.get("role"),
        }),
      "Miembro agregado.",
      () => form.reset(),
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Administración</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona organizaciones, administradores y organizadores.
        </p>
      </header>

      {message && (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm break-words ${
            message.tone === "error"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-muted"
          }`}
        >
          {message.text}
        </p>
      )}

      {canCreateOrganizations && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva organización</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrg} className="flex gap-2">
              <Input name="name" placeholder="Nombre de la organización" required minLength={2} />
              <Button type="submit" disabled={pending}>
                Crear
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {organizations.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay organizaciones para administrar todavía.</p>
      )}

      {organizations.map((org) => (
        <Card key={org.id}>
          <CardHeader>
            <CardTitle>{org.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col divide-y">
              {org.members.length === 0 && (
                <li className="py-2 text-sm text-muted-foreground">Sin miembros.</li>
              )}
              {org.members.map((member) => {
                const editable = org.assignableRoles.includes(member.role);
                return (
                  <li key={member.id} className="flex flex-wrap items-center gap-2 py-2">
                    <div className="mr-auto min-w-0">
                      <p className="truncate text-sm font-medium">{member.fullName ?? member.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    {editable ? (
                      <>
                        <select
                          aria-label={`Rol de ${member.email}`}
                          className={SELECT_CLASS}
                          defaultValue={member.role}
                          disabled={pending}
                          onChange={(e) =>
                            run(
                              () => changeMemberRoleAction({ memberId: member.id, role: e.target.value }),
                              "Rol actualizado.",
                            )
                          }
                        >
                          {org.assignableRoles.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={pending}
                          onClick={() => run(() => removeMemberAction({ memberId: member.id }), "Miembro quitado.")}
                        >
                          Quitar
                        </Button>
                      </>
                    ) : (
                      <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>

            {org.assignableRoles.length > 0 && (
              <form
                onSubmit={(e) => handleAddMember(e, org.id)}
                className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"
              >
                <Input name="fullName" placeholder="Nombre completo" required minLength={2} />
                <Input name="email" type="email" placeholder="correo@ejemplo.com" required />
                <select name="role" aria-label="Rol" className={SELECT_CLASS} defaultValue={org.assignableRoles.at(-1)}>
                  {org.assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                <Button type="submit" disabled={pending}>
                  Agregar
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
