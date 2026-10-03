# Gestión de usuarios (CRUD, filtros y paginación)

**Estado**: done
**Aprobado por**: usuario — 2026-10-02 (respondió "aprobado"; preguntas abiertas 1-4: se aceptan las propuestas)
**Fase**: 1 de 1

## Contexto

Hoy `/admin` mezcla en una sola página crear organizaciones y administrar miembros (alta, cambio de rol, quitar) con listas completas sin filtros ni paginación. Se pide una vista de **gestión de usuarios** con CRUD completo, filtros y paginación, según el diseño "Gestión de usuarios" del lienzo (https://claude.ai/artifact/2EudoANk96cVX4eRugN3Rc, tableros "Usuarios · escritorio / móvil / formulario móvil"). Reglas de roles: `docs/specs/database/data-model.md` § Autenticación y `permissions.ts` (`assignableRoles`, `can`). Depende de `docs/specs/shared/dashboard-sidebar.md` (menú lateral).

## Alcance

- **Incluye**:
  - Página `/admin/users` (permiso `members:manage`) con tabla en escritorio y tarjetas en móvil.
  - **Fila = membresía** (usuario en una organización): Usuario (avatar con iniciales, nombre, correo), Rol, Organización, Estado (Verificado / Pendiente = `users.emailVerified`), Último acceso (`users.lastSignInAt`, relativo) y acciones.
  - **Filtros** (en la URL, server-side): búsqueda por nombre/correo, rol, organización y estado; "Limpiar filtros"; estado vacío.
  - **Paginación** server-side, 10 filas por página, con "Mostrando X–Y de N", anterior/siguiente y números de página.
  - **Crear**: diálogo "Agregar usuario" (nombre, correo, organización, rol) → reusa `addMemberAction` (crea la cuenta en Clerk con contraseña temporal si no existe y muestra esa contraseña una sola vez).
  - **Editar**: diálogo "Editar usuario" que cambia el **rol** de la membresía → reusa `changeMemberRoleAction`.
  - **Eliminar**: confirmación y `removeMemberAction` (quita el acceso a esa organización).
  - Opción "Usuarios" en el menú lateral (sección Administración) y simplificación de `/admin` (solo organizaciones; los miembros pasan a `/admin/users`).
- **No incluye**:
  - Borrar la cuenta de Clerk/DB del usuario: "Eliminar" solo quita la membresía (la persona conserva su cuenta de cliente).
  - Editar nombre, correo u organización de una membresía existente (para mover de organización: eliminar y agregar).
  - Listar clientes sin membresía ni super admins (el super admin no se gestiona desde aquí).
  - Orden por columnas, selección múltiple, exportación, tamaño de página configurable.

## Criterios de aceptación

- **AC-1** (tests): `userListQuerySchema` parsea `searchParams` a `{ page, q, role, org, status }`: `page` entero ≥ 1 (inválido → 1), `q` recortado y ≤ 80 caracteres, `role` ∈ `admin|organizer`, `status` ∈ `verified|pending`; valores desconocidos se ignoran (sin error). Helper de paginación (`pageCount`, página acotada al rango) con tests.
- **AC-2**: `listMembers(actor, query)` devuelve solo membresías de organizaciones donde el actor tiene `members:manage` (super admin: todas), aplica los filtros y devuelve `{ rows, total, page, pageCount }` ordenado por nombre; cada fila trae `editable` (false si es el propio actor o si `assignableRoles` no incluye su rol) y `assignableRoles` de su organización.
- **AC-3**: `/admin/users` muestra título "Usuarios", el botón "Agregar usuario", filtros (búsqueda con `label` accesible, selects de rol/organización/estado) y la tabla. Cambiar un filtro actualiza la URL y vuelve a la página 1; recargar conserva el estado. Con filtros activos aparece "Limpiar filtros".
- **AC-4**: La paginación muestra "Mostrando X–Y de N usuarios", botones anterior/siguiente (deshabilitados en los extremos), página actual con `aria-current="page"`; sin resultados: estado vacío con "Limpiar filtros" y sin paginación.
- **AC-5**: "Agregar usuario" valida con `addMemberSchema` (errores bajo cada campo, foco al primero inválido), ofrece solo organizaciones donde el actor puede asignar y roles según `assignableRoles`; tras crear, la tabla se actualiza y se muestra la contraseña temporal si se creó la cuenta (mensaje `role="status"`). Los errores del servidor (`AdminError`) se muestran en el diálogo.
- **AC-6**: "Editar" abre el diálogo con nombre y correo de solo lectura y el rol editable (solo roles asignables); "Guardar cambios" actualiza la fila. Las filas no editables muestran editar/eliminar deshabilitados con `title` explicativo.
- **AC-7**: "Eliminar" abre una confirmación (`alertdialog`) que nombra al usuario y a la organización; confirmar quita la membresía y actualiza la tabla; cancelar no cambia nada.
- **AC-8**: Móvil (390px): las filas se muestran como tarjetas, filtros apilados, controles ≥ 44px, sin scroll horizontal. Escritorio: tabla con `th scope="col"`.
- **AC-9**: Un organizador que abre `/admin/users` es redirigido a `/` (permiso exigido en servidor). El menú lateral muestra "Usuarios" (→ `/admin/users`, activo en esa ruta) y "Organizaciones" (→ `/admin`, activo solo en `/admin` exacto) a admin y super admin, con test actualizado.
- **AC-10**: `/admin` conserva crear organizaciones y la lista de organizaciones (nombre, nº de miembros, enlace a "Usuarios"), sin duplicar la gestión de miembros.
- **AC-11**: `npm run lint`, `npm run test` y `npm run build` pasan.

## Contratos

```ts
// src/modules/admin/schemas/member-list.schema.ts
export const PAGE_SIZE = 10;
export const userListQuerySchema: ZodType<UserListQuery>; // lenient: valores inválidos → default/undefined
export interface UserListQuery { page: number; q?: string; role?: OrgRole; org?: string; status?: "verified" | "pending" }
export function pageCount(total: number, pageSize?: number): number;

// src/modules/admin/services/member-list.service.ts
export interface MemberListRow {
  memberId: string; userId: string; fullName: string | null; email: string; avatarUrl: string | null;
  role: OrgRole; organizationId: string; organizationName: string;
  emailVerified: boolean; lastSignInAt: string | null; // ISO (serializable)
  editable: boolean; assignableRoles: OrgRole[];
}
export interface MemberList { rows: MemberListRow[]; total: number; page: number; pageCount: number }
export function listMembers(actor: CurrentUser, query: UserListQuery): Promise<MemberList>;
export interface ManageableOrganization { id: string; name: string; assignableRoles: OrgRole[] }
export function listManageableOrganizations(actor: CurrentUser): Promise<ManageableOrganization[]>;

// src/lib/format-relative-time.ts
export function formatRelativeTime(iso: string | null, now?: Date): string; // null → "Nunca"; "Hoy", "Ayer", "Hace N días/semanas/meses"
```

Acciones (sin cambios de firma): `addMemberAction`, `changeMemberRoleAction`, `removeMemberAction`; `run()` pasa a revalidar `revalidatePath("/admin", "layout")` para cubrir `/admin/users`.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Alta / cambio de rol / baja de miembro | `admin.service.ts`, `admin.actions.ts`, `admin.schema.ts` | reusar sin cambios (salvo revalidate) |
| Permisos y roles asignables | `can`, `assignableRoles` en `permissions.ts` | reusar |
| Usuario actual / guard | `getCurrentUser`, `requirePermission` | reusar |
| Listado de organizaciones del actor | `listOrganizations` (carga todos los miembros) | no sirve (sin paginar): crear `listManageableOrganizations` liviana |
| Inputs, selects, botones, badges | `ui/input`, `ui/select`, `ui/button`, `ui/badge` | reusar |
| Tabla, diálogos | no hay en `src/components/ui` | agregar de shadcn: `table`, `dialog` (Grupo 0) |
| Paginación | no hay | crear `src/components/pagination.tsx` (genérico, transversal; shadcn `pagination` solo da estilos y no cubre "X–Y de N") — el dev confirma con `npx shadcn@latest search @shadcn -q pagination` y reusa si sirve |
| Fecha relativa | `Intl` nativo; nada en `src/lib` | crear `src/lib/format-relative-time.ts` |
| Estado de filtros | `useSearchParams` / `router.replace` (Next) | URL como fuente de verdad, sin store |

## Plan de tareas

| Tarea | Archivos | Grupo |
|---|---|---|
| **G0** Instalar shadcn `table` y `dialog` | `src/components/ui/table.tsx`, `src/components/ui/dialog.tsx` (+ deps que agregue la CLI) | 0 (serial) |
| **T-1** Schema/paginación + fecha relativa, con tests (AC-1) | `src/modules/admin/schemas/member-list.schema.ts`, `.test.ts`, `src/lib/format-relative-time.ts`, `.test.ts` | 1 |
| **T-2** Servicio de listado (AC-2) | `src/modules/admin/services/member-list.service.ts` | 1 |
| **T-3** Filtros + paginación (AC-3, AC-4) | `src/modules/admin/components/member-filters.tsx`, `src/components/pagination.tsx` | 2 |
| **T-4** Tabla/tarjetas + diálogos crear/editar/eliminar (AC-5..8) | `src/modules/admin/components/members-table.tsx`, `member-form-dialog.tsx`, `delete-member-dialog.tsx` | 2 |
| **T-5** Página, menú, `/admin` simplificado, revalidate (AC-9, AC-10) | `src/app/admin/users/page.tsx`, `src/modules/auth/services/dashboard-nav.ts` + `.test.ts`, `src/modules/admin/components/admin-panel.tsx`, `src/modules/admin/actions/admin.actions.ts` | 3 (depende de T-2, T-3, T-4) |

El servicio (T-2) no lleva tests unitarios de DB (no hay base de pruebas en el repo); su lógica pura (paginación) se prueba en T-1 y el resto lo verifica el reviewer contra AC-2.

## Preguntas abiertas

1. **Eliminar = quitar membresía**, no borrar la cuenta de Clerk. ¿De acuerdo? (Se propone así; borrar cuentas sería destructivo e irreversible.)
2. **Editar solo el rol** (nombre/correo/organización de solo lectura), en vez del diseño donde todo era editable. ¿De acuerdo, o se quiere editar también el nombre (implica un `updateUser` de Clerk nuevo)?
3. **Fila por membresía, sin super admin ni clientes** (el diseño mostraba al super admin). ¿De acuerdo?
4. Quitar la gestión de miembros de `/admin` para no tener dos UIs (AC-10). ¿De acuerdo?
