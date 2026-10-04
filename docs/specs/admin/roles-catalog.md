# Catálogo de roles dinámicos con permisos (CRUD)

**Estado**: done
**Aprobado por**: usuario — 2026-10-02 (respondió "aprobado"; preguntas abiertas: se aceptan las propuestas)
**Fase**: 2 de 2 (depende de `docs/specs/admin/organizations-catalog.md`; se implementa después)

## Contexto

Los roles son hoy un enum fijo de Postgres (`org_role`: `admin`, `organizer`) y sus permisos están escritos en `permissions.ts`. Se pide un **catálogo de roles con CRUD** y que el diálogo "Agregar usuario" ofrezca los roles de ese catálogo. Decisión del usuario: **roles dinámicos con permisos** (no solo etiquetas). Esto cambia el modelo de autorización: ver `docs/specs/database/data-model.md` § Autenticación y § Roles y permisos (se actualiza al final).

## Alcance

- **Incluye**:
  - Tabla `roles` en Postgres: `id` (slug, PK), `name`, `description`, `permissions` (`text[]`), `is_system`, timestamps. Se siembran `admin` y `organizer` como roles de sistema con sus permisos actuales.
  - `organization_members.role` (enum) pasa a `role_id` FK → `roles.id` (`on delete restrict`); se elimina el enum `org_role`. Migración de Drizzle con datos (los ids `admin`/`organizer` se conservan).
  - Autorización basada en permisos del rol: `AuthSubject.memberships[].permissions`; `can()` los usa. Permisos asignables a roles: `members:manage`, `events:manage`, `tickets:redeem`. Permisos solo del super admin (no asignables): `organizations:manage` y nuevo `roles:manage`.
  - Regla de asignación generalizada (`assignableRoles`): el super admin asigna cualquier rol; quien tiene `members:manage` en una organización asigna solo roles cuyos permisos **no incluyan `members:manage`** y sean **subconjunto de los suyos** en esa organización (equivale a la regla actual: admin → organizador).
  - Página `/admin/roles` (solo super admin, `roles:manage`): tabla/tarjetas con Nombre, Slug, Descripción, Permisos (etiquetas), Miembros, "Sistema"; crear, editar y eliminar roles.
  - **Roles de sistema** (`admin`, `organizer`): no se eliminan ni cambian de slug ni de permisos; sí se edita nombre y descripción.
  - **Eliminar bloqueado** si el rol está asignado a algún miembro (se muestra cuántos).
  - Los selectores de rol (diálogo agregar/editar usuario, filtro de `/admin/users`) leen del catálogo y filtran por `assignableRoles`.
  - Opción "Roles" en el menú lateral (solo super admin).
- **No incluye**: permisos por recurso/evento, roles globales fuera de organizaciones, jerarquías explícitas, mostrar en el pie del shell el nombre del rol personalizado (el rol global sigue siendo `super_admin | admin | organizer | customer` derivado de permisos), cambios en `publicMetadata` más allá de ese derivado.

## Criterios de aceptación

- **AC-1** (tests): `permissions.ts` refactorizado: `can` evalúa `membership.permissions`; `assignableRoles(subject, orgId, roles)` aplica la regla del Alcance (super admin: todos; `members:manage` sin escalar: solo roles sin `members:manage` y subconjunto de sus permisos; resto: ninguno); `highestRole` deriva `super_admin | admin (members:manage) | organizer (events:manage) | customer` de los permisos. Los tests existentes se migran y se agregan casos de roles personalizados y de no-escalada.
- **AC-2** (tests): `roleSchema` valida `name` (2–40), `slug` (`^[a-z][a-z0-9_-]*$`, 2–32, solo en creación), `description` (≤ 200) y `permissions` (subconjunto no vacío de los permisos asignables, sin duplicados).
- **AC-3**: Migración: crea `roles` con `admin` y `organizer`, convierte `organization_members.role` en `role_id` con FK sin perder datos y borra el enum; `drizzle/` incluye el SQL y el snapshot. `src/db/schema/` y `relations.ts` reflejan el cambio y `npm run build` compila.
- **AC-4**: `getCurrentUser()` carga cada membresía con los permisos de su rol (join con `roles`), y `requirePermission` y los layouts siguen funcionando igual para `admin` y `organizer` existentes (mismos permisos que hoy).
- **AC-5**: Servicio de roles: `listRoles`, `createRole`, `updateRole`, `deleteRole`, todos exigen `roles:manage` en servidor; `deleteRole` falla para roles de sistema y para roles con miembros (mensaje con el conteo); `updateRole` no permite cambiar permisos ni slug de roles de sistema.
- **AC-6**: Tras cambiar los permisos de un rol, los miembros afectados ven el efecto en su siguiente petición (la fuente de verdad es la base, no un token); `syncRoleMetadata` recalcula `publicMetadata.role` de los miembros del rol editado.
- **AC-7**: `addMember`, `changeMemberRole`, `removeMember` y `listMembers` usan `role_id`/`assignableRoles` nuevos; el diálogo "Agregar usuario" ofrece solo roles del catálogo asignables a la organización elegida; el filtro de rol de `/admin/users` lista roles del catálogo.
- **AC-8**: `/admin/roles` (solo super admin; otros → `/`): CRUD con diálogos accesibles, permisos como casillas con etiqueta y descripción, errores por campo y del servidor, estado vacío no aplicable (siempre hay roles de sistema), móvil con tarjetas; el menú muestra "Roles" solo al super admin.
- **AC-9**: El seed (`src/db/seed/run.ts`) y `docs/specs/database/data-model.md` (§ Autenticación, § Roles y permisos, enums) quedan actualizados; `lint`, `test` y `build` pasan.

## Contratos

```ts
// permissions.ts
export type Permission = "organizations:manage" | "roles:manage" | "members:manage" | "events:manage" | "tickets:redeem";
export const ASSIGNABLE_PERMISSIONS = ["members:manage", "events:manage", "tickets:redeem"] as const;
export interface RoleDef { id: string; name: string; permissions: Permission[]; isSystem: boolean }
export interface AuthMembership { organizationId: string; roleId: string; permissions: Permission[] }
export interface AuthSubject { isSuperAdmin: boolean; memberships: AuthMembership[] }
export function assignableRoles(subject: AuthSubject, organizationId: string, roles: RoleDef[]): RoleDef[];

// src/db/schema/identity.ts
export const roles = pgTable("roles", { id: text().primaryKey(), name: text().notNull().unique(), description: text(), permissions: text().array().notNull(), isSystem: boolean().notNull().default(false), ...timestamps() });
// organizationMembers.roleId: text().notNull().references(() => roles.id, { onDelete: "restrict" })

// src/modules/admin/services/role.service.ts
export interface RoleRow { id: string; name: string; description: string | null; permissions: Permission[]; isSystem: boolean; memberCount: number }
export function listRoles(actor: CurrentUser): Promise<RoleRow[]>;
export function createRole(actor: CurrentUser, input: RoleInput): Promise<void>;
export function updateRole(actor: CurrentUser, input: RoleUpdateInput): Promise<void>;
export function deleteRole(actor: CurrentUser, id: string): Promise<void>;
```

`OrgRole` deja de ser un union literal: pasa a `string` (id de rol); `ORG_ROLES` se elimina y los usos (`admin.schema.ts`, `member-list.schema.ts`, `member-filters.tsx`) leen del catálogo.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Autorización | `permissions.ts`, `current-user.service.ts`, `requirePermission` | extender/refactorizar (misma API pública salvo `assignableRoles`) |
| Alta/cambio/baja de miembros y listado | `admin.service.ts`, `member-list.service.ts`, diálogos de `/admin/users` | adaptar a `role_id` y roles del catálogo |
| Tabla + diálogos CRUD + filtros | patrón de `/admin/users` y del catálogo de organizaciones | reusar componentes y patrón |
| Casillas de permisos | `ui/` no tiene checkbox | agregar de shadcn: `checkbox` (Grupo 0) |
| `AdminError`, envoltura `run()` de acciones | `admin.actions.ts` | reusar |
| Nombres de rol en UI | `ROLE_LABEL` en `dashboard-nav.ts` | queda para el rol **global** derivado; los roles de organización muestran `roles.name` |

## Plan de tareas (por fases; ≤6 tareas por fase)

**Fase 2A — Modelo y autorización** (riesgosa, se revisa antes de seguir)

| Tarea | Archivos | Grupo |
|---|---|---|
| **G0** `npx shadcn@latest add checkbox` | `src/components/ui/checkbox.tsx` | 0 |
| **T-1** Esquema + migración + seed | `src/db/schema/enums.ts`, `identity.ts`, `relations.ts`, `drizzle/*` (generado y ajustado a mano), `src/db/seed/run.ts` | 1 |
| **T-2** `permissions.ts` refactor + tests | `src/modules/auth/services/permissions.ts`, `.test.ts`, `dashboard-nav.ts`/`.test.ts` (tipos) | 1 |
| **T-3** `getCurrentUser` + user-sync con permisos | `src/modules/auth/services/current-user.service.ts`, `user-sync.service.ts` | 2 |
| **T-4** Servicios de miembros sobre `role_id` | `admin.service.ts`, `member-list.service.ts`, `admin.schema.ts`, `member-list.schema.ts` + tests | 2 |

**Fase 2B — Catálogo de roles** (después del review de 2A)

| Tarea | Archivos | Grupo |
|---|---|---|
| **T-5** Schemas + servicio de roles | `src/modules/admin/schemas/role.schema.ts`, `.test.ts`, `src/modules/admin/services/role.service.ts` | 1 |
| **T-6** UI de `/admin/roles` | `src/modules/admin/components/roles-table.tsx`, `role-form-dialog.tsx`, `delete-role-dialog.tsx`, `src/app/admin/roles/page.tsx` | 2 |
| **T-7** Selectores desde el catálogo + menú + acciones + docs | `member-form-dialog.tsx`, `member-filters.tsx`, `members-table.tsx`, `src/app/admin/users/page.tsx`, `admin.actions.ts`, `dashboard-nav.ts`/`.test.ts`, `docs/specs/database/data-model.md` | 3 |

La migración **no se aplica sola**: el developer deja el SQL listo y el usuario ejecuta `npm run db:migrate` contra su base (Neon). Hasta entonces el código nuevo no corre contra una base vieja.

## Preguntas abiertas

1. **Permisos de roles de sistema bloqueados** (`admin`, `organizer`): para que nadie se quede sin acceso por accidente. ¿De acuerdo, o se deben poder editar?
2. **Regla de asignación** (sin `members:manage` y subconjunto de los permisos propios): ¿te sirve para que un admin cree organizadores pero no otros admins?
3. **Migración con datos**: asumo que puedes correr `db:migrate` en tu base de desarrollo; ¿hay datos de producción que cuidar?
