"use client";

import { SearchFilter } from "@/components/search-filter";

export function OrganizationFilters() {
  return (
    <SearchFilter
      label="Buscar por nombre o slug"
      placeholder="Buscar por nombre o slug"
      clearLabel="Limpiar búsqueda"
    />
  );
}
