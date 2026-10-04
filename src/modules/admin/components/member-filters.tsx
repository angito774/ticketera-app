"use client";

import { useSearchParams } from "next/navigation";
import { SearchFilter } from "@/components/search-filter";
import type { RoleOption } from "@/modules/admin/services/member-list.service";

interface MemberFiltersProps {
  organizations: { id: string; name: string }[];
  roles: RoleOption[];
}

const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-auto md:h-10";

const FILTER_KEYS = ["q", "role", "org", "status"] as const;

export function MemberFilters({ organizations, roles }: MemberFiltersProps) {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "";
  const org = searchParams.get("org") ?? "";
  const status = searchParams.get("status") ?? "";

  return (
    <SearchFilter
      label="Buscar por nombre o correo"
      placeholder="Buscar por nombre o correo"
      clearLabel="Limpiar filtros"
      clearKeys={FILTER_KEYS}
    >
      {(update) => (
        <>
          <select
            aria-label="Rol"
            className={SELECT_CLASS}
            value={role}
            onChange={(e) => update({ role: e.target.value })}
          >
            <option value="">Todos los roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Organización"
            className={SELECT_CLASS}
            value={org}
            onChange={(e) => update({ org: e.target.value })}
          >
            <option value="">Todas las organizaciones</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Estado"
            className={SELECT_CLASS}
            value={status}
            onChange={(e) => update({ status: e.target.value })}
          >
            <option value="">Cualquier estado</option>
            <option value="verified">Verificado</option>
            <option value="pending">Pendiente</option>
          </select>
        </>
      )}
    </SearchFilter>
  );
}
