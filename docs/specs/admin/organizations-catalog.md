# Catálogo de organizaciones (CRUD)

**Estado**: done
**Aprobado por**: usuario — 2026-10-02 (respondió "aprobado"; preguntas abiertas: se aceptan las propuestas)
**Fase**: 1 de 2 (la fase 2 es `docs/specs/admin/roles-catalog.md`)

## Contexto

Las organizaciones solo se pueden crear hoy (`/admin`, solo el super admin) y no se pueden editar ni eliminar. Al agregar un usuario, la lista de organizaciones sale de ese catálogo, así que hace falta gestionarlo con un CRUD completo. Modelo: `docs/specs/database/data-model.md` (`organizations`; `organization_members` y `coupons` borran en cascada, `events` y `venues` restringen).

## Alcance

- **Incluye**:
  - `/admin` pasa a ser el catálogo de organizaciones (reemplaza a `AdminPanel`): tabla/tarjetas con Nombre, Slug, Miembros, Eventos, Estado de Stripe (`stripeConnectStatus`) y acciones; búsqueda por nombre/slug y paginación (mismo patrón y componentes de `/admin/users`).
  - **Crear** (nombre; el slug se genera con `slugify` y se puede ajustar), **editar** (nombre y slug, con unicidad) y **eliminar** (confirmación).
  - **Eliminar bloqueado** si la organización tiene miembros, eventos, recintos o cupones: se muestra el motivo con los conteos ("Tiene 3 miembros y 2 eventos"); el botón sigue visible pero el servidor rechaza.
  - Solo el super admin (`organizations:manage`) crea/edita/elimina. Un admin de organización ve el catálogo de **sus** organizaciones en solo lectura.
  - El diálogo "Agregar usuario" y los filtros siguen leyendo organizaciones de este catálogo (sin cambios de contrato).
- **No incluye**: desactivar/archivar organizaciones, logo, datos de Stripe editables, borrado en cascada.

## Criterios de aceptación

- **AC-1** (tests): `organizationSchema` (nombre 2–80 caracteres recortado; slug `^[a-z0-9]+(-[a-z0-9]+)*$`, 2–60) y `organizationListQuerySchema` (`page`, `q`, tolerante como `userListQuerySchema`).
- **AC-2**: `listOrganizationCatalog(actor, query)` devuelve `{ rows, total, page, pageCount }` con conteos de miembros y eventos; super admin ve todas, el resto solo donde tiene `members:manage`; cada fila trae `canEdit` (solo super admin).
- **AC-3**: `createOrganization` y `updateOrganization` rechazan slugs duplicados ("Ya existe una organización con ese nombre/slug") y a quien no tenga `organizations:manage`.
- **AC-4**: `deleteOrganization` falla con un `AdminError` que cuenta miembros/eventos/recintos/cupones si hay alguno, y elimina solo si no hay ninguno; verificado en servidor (no basta con ocultar el botón).
- **AC-5**: La página `/admin` muestra "Organizaciones", botón "Nueva organización" (solo super admin), búsqueda con `label`, tabla (escritorio) / tarjetas (móvil), paginación y estado vacío. Búsqueda y página viven en la URL.
- **AC-6**: Los diálogos crear/editar validan con el schema (errores por campo, foco al primero inválido) y muestran errores del servidor; eliminar usa `alertdialog` y muestra el motivo si el servidor bloquea.
- **AC-7**: `lint`, `test` y `build` pasan; un organizador sigue sin acceso a `/admin`.

## Contratos

```ts
// src/modules/admin/schemas/organization.schema.ts
export const organizationSchema: ZodType<{ name: string; slug: string }>;
export const organizationUpdateSchema: ZodType<{ id: string; name: string; slug: string }>;
export const organizationListQuerySchema: ZodType<{ page: number; q?: string }>;

// src/modules/admin/services/organization-catalog.service.ts
export interface OrganizationCatalogRow {
  id: string; name: string; slug: string; stripeConnectStatus: string;
  memberCount: number; eventCount: number; canEdit: boolean;
}
export function listOrganizationCatalog(actor: CurrentUser, q: OrganizationListQuery): Promise<{ rows: OrganizationCatalogRow[]; total: number; page: number; pageCount: number }>;
export function updateOrganization(actor: CurrentUser, input: OrganizationUpdateInput): Promise<void>;
export function deleteOrganization(actor: CurrentUser, id: string): Promise<void>;
// createOrganization ya existe en admin.service.ts (se mueve aquí junto a sus tipos si el developer lo ve más limpio)
```

Acciones nuevas: `updateOrganizationAction`, `deleteOrganizationAction` (misma envoltura `run()` de `admin.actions.ts`).

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Crear organización, `slugify`, `AdminError` | `admin.service.ts`, `admin.schema.ts` | reusar |
| Filtros por URL y paginación | `member-filters.tsx`, `src/components/pagination.tsx`, `member-list.schema.ts` | generalizar: extraer un `SearchFilter` mínimo o reusar `MemberFilters` solo si encaja; el dev decide sin duplicar lógica de debounce/URL |
| Tabla, diálogos | `ui/table`, `ui/dialog`, patrón de `members-table.tsx` y diálogos | reusar patrón y componentes |
| `listOrganizations` (con miembros) | `admin.service.ts` | queda solo si algo más lo usa; si no, eliminarlo (código muerto) |

## Plan de tareas

| Tarea | Archivos | Grupo |
|---|---|---|
| **T-1** Schemas + tests (AC-1) | `src/modules/admin/schemas/organization.schema.ts`, `.test.ts` | 1 |
| **T-2** Servicio del catálogo + update/delete (AC-2..4) | `src/modules/admin/services/organization-catalog.service.ts`, `src/modules/admin/services/admin.service.ts` (limpieza de `listOrganizations`/`OrganizationRow` si quedan sin uso) | 1 |
| **T-3** UI: tabla/tarjetas, filtro, diálogos crear/editar/eliminar (AC-5, AC-6) | `src/modules/admin/components/organizations-table.tsx`, `organization-form-dialog.tsx`, `delete-organization-dialog.tsx`, `organization-filters.tsx` | 2 |
| **T-4** Página, acciones, limpieza (AC-7) | `src/app/admin/page.tsx`, `src/modules/admin/actions/admin.actions.ts`, borrar `src/modules/admin/components/admin-panel.tsx` | 3 |

## Preguntas abiertas

1. El slug se edita a mano (con unicidad). ¿Prefieres que sea de solo lectura tras crear (los enlaces futuros no se rompen)? Se propone editable por ahora.
