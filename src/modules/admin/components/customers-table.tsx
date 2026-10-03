"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2 } from "lucide-react";

import { ResultBanner } from "@/components/result-banner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { AssignCustomerDialog } from "@/modules/admin/components/assign-customer-dialog";
import { displayName, RoleBadge, StatusLabel, UserCell } from "@/modules/admin/components/user-identity";
import type { CustomerRow } from "@/modules/admin/services/customer-list.service";
import type { ManageableOrganization } from "@/modules/admin/services/member-list.service";

interface CustomersTableProps {
  rows: CustomerRow[];
  organizations: ManageableOrganization[];
  hasQuery?: boolean;
}

const NO_ORGS_TITLE = "No tienes organizaciones con roles asignables";

function providersLabel(row: CustomerRow) {
  return row.authProviders.length > 0 ? row.authProviders.join(", ") : "—";
}

interface AssignButtonProps {
  row: CustomerRow;
  disabled: boolean;
  onAssign: (row: CustomerRow) => void;
}

function AssignButton({ row, disabled, onAssign }: AssignButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 gap-2 md:h-9"
      disabled={disabled}
      title={disabled ? NO_ORGS_TITLE : undefined}
      aria-label={`Asociar a ${displayName(row)} a una organización`}
      onClick={() => onAssign(row)}
    >
      <Building2 />
      Asociar a organización
    </Button>
  );
}

export function CustomersTable({ rows, organizations, hasQuery = false }: CustomersTableProps) {
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const canAssign = organizations.some((org) => org.assignableRoles.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {message && <ResultBanner text={message.text} tone={message.tone} />}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {hasQuery ? "No hay clientes con esa búsqueda" : "Aún no hay clientes registrados"}
          </p>
          {hasQuery && (
            <Button
              variant="outline"
              className="h-11 md:h-9"
              nativeButton={false}
              render={<Link href="/admin/customers" />}
            >
              Limpiar búsqueda
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Cliente</TableHead>
                  <TableHead scope="col">Etiqueta</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col">Acceso</TableHead>
                  <TableHead scope="col">Último acceso</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-64">
                      <UserCell fullName={row.fullName} email={row.email} />
                    </TableCell>
                    <TableCell>
                      <RoleBadge label="Cliente" />
                    </TableCell>
                    <TableCell>
                      <StatusLabel verified={row.emailVerified} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{providersLabel(row)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatRelativeTime(row.lastSignInAt)}</TableCell>
                    <TableCell>
                      <AssignButton row={row} disabled={!canAssign} onAssign={setSelected} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 rounded-xl border p-3">
                <UserCell fullName={row.fullName} email={row.email} />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <RoleBadge label="Cliente" />
                  <StatusLabel verified={row.emailVerified} />
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Acceso</dt>
                    <dd className="font-medium break-words">{providersLabel(row)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Último acceso</dt>
                    <dd className="font-medium">{formatRelativeTime(row.lastSignInAt)}</dd>
                  </div>
                </dl>
                <AssignButton row={row} disabled={!canAssign} onAssign={setSelected} />
              </li>
            ))}
          </ul>
        </>
      )}

      {selected && (
        <AssignCustomerDialog
          customer={selected}
          organizations={organizations}
          open
          onOpenChange={(open) => !open && setSelected(null)}
          onResult={(text, tone) => setMessage({ text, tone })}
        />
      )}
    </div>
  );
}
