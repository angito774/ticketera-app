# Menú lateral unificado de administración y organizador

**Estado**: done
**Aprobado por**: usuario — 2026-10-02 (respondió "aprobado"; preguntas abiertas 1 y 2: se aceptan las propuestas)
**Fase**: 1 de 1

## Contexto

Hoy solo `/organizer` tiene barra lateral (`organizer-shell.tsx`, con sesión mock del store); `/admin` no tiene menú. Los roles del sistema son `super_admin`, `admin` y `organizer`. Se pide **un solo menú lateral responsive** que junte las opciones de ambos roles y muestre cada opción según el permiso del usuario. Diseño aprobado en el lienzo "Menú de administración Ticketera" (https://claude.ai/artifact/2EudoANk96cVX4eRugN3Rc). Ver `docs/specs/database/data-model.md` § Autenticación para roles y Clerk.

## Alcance

- **Incluye**:
  - Componente compartido `DashboardShell`: barra lateral fija en escritorio (≥ `lg`, 272px) y barra superior + panel `<dialog>` desde la derecha en móvil (mismo patrón que el shell actual).
  - Menú con secciones: **Resumen** · **Eventos** (Crear evento) · **Administración** (solo con `members:manage`) · pie con "Ver sitio", nombre, etiqueta de rol y "Cerrar sesión".
  - Función pura que calcula las secciones visibles según el usuario.
  - Layout nuevo `src/app/admin/layout.tsx` y `src/app/organizer/layout.tsx` usando el shell; el `organizer-shell.tsx` actual se elimina.
  - Cierre de sesión con Clerk en lugar del store mock.
- **No incluye**:
  - Páginas nuevas: "Mis eventos", "Validar entradas" y "Miembros y roles" del diseño **no existen** y no se crean; "Mis eventos" ya es `/organizer` y "Organizaciones/Miembros" es `/admin`.
  - Menú colapsable a íconos, modo oscuro del shell, rediseño del contenido de `/admin` o `/organizer`.

## Criterios de aceptación

- **AC-1** (tests): `getNavSections(user)` devuelve para un **organizador**: Resumen y Crear evento; para **admin** y **super_admin**: lo mismo más la sección "Administración" con `/admin`. "Ver sitio" no está en esta función: lo agrega el shell. Las opciones se filtran con `can()` de `permissions.ts`, no comparando roles.
- **AC-2**: `/organizer` y `/admin` renderizan el mismo `DashboardShell`; la opción de la ruta actual lleva `aria-current="page"` y fondo `accent` (`/organizer/events/*` marca "Crear evento").
- **AC-3**: En escritorio la barra lateral es fija; bajo `lg` aparece la barra superior con botón "Abrir menú del panel" que abre el `<dialog>` con el mismo menú, con botón "Cerrar menú"; al navegar el panel se cierra.
- **AC-4**: El pie muestra el nombre del usuario (`fullName` o email), una etiqueta con su rol ("Super admin" / "Administrador" / "Organizador") y "Cerrar sesión", que cierra la sesión de Clerk y va a `/`.
- **AC-5**: Un organizador que abre `/admin` sigue siendo redirigido a `/` (el permiso lo exige el layout/página, no solo se oculta el enlace).
- **AC-6**: Filas del menú de ≥ 44px de alto, íconos con `aria-hidden`, foco visible, secciones con título visible; sin scroll horizontal a 390px.
- **AC-7**: `npm run lint`, `npm run test` y `npm run build` pasan.

## Contratos

```ts
// src/modules/auth/services/dashboard-nav.ts
export type NavIcon = "dashboard" | "plus" | "building" | "external";
export interface NavItem { href: string; label: string; icon: NavIcon; matchPrefix?: string } // activo: pathname === href || (matchPrefix && startsWith)
export interface NavSection { title?: string; items: NavItem[] }
export function getNavSections(subject: AuthSubject): NavSection[]; // "Ver sitio" va aparte (footerItems), ver shell

// src/components/dashboard/dashboard-shell.tsx  ("use client")
interface DashboardShellProps {
  sections: NavSection[];
  user: { name: string; roleLabel: string };
  children: ReactNode;
}
```

Los layouts (server) calculan `sections` y `user` con `getCurrentUser()`/`requirePermission` y los pasan serializados; el shell mapea `NavIcon` → ícono de `lucide-react`.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Shell con sidebar + dialog móvil | `src/modules/organizer/components/organizer-shell.tsx` | generalizar → mover a `src/components/dashboard/` (es transversal) y borrar el original |
| Permisos por rol | `can`, `highestRole` en `permissions.ts` | reusar |
| Usuario con rol | `getCurrentUser`, `requirePermission` | reusar |
| Cerrar sesión | `useClerk` (`@clerk/nextjs`), `header-account.tsx` usa `UserButton` | reusar Clerk `signOut` |
| Etiquetas de rol | `ROLE_LABELS` en `admin-panel.tsx` (solo admin/organizer) | crear `ROLE_LABEL` con `super_admin` en `dashboard-nav.ts` |
| Hidratación | `useHydrated` | no hace falta (el nombre llega del servidor) |
| Componentes shadcn extra | `sheet`/`sidebar` de shadcn | no: se mantiene `<dialog>` nativo, ya probado en el repo (YAGNI) |

## Plan de tareas

| Tarea | Archivos | Grupo |
|---|---|---|
| **T-1** `getNavSections` + etiquetas de rol + tests (AC-1) | `src/modules/auth/services/dashboard-nav.ts`, `dashboard-nav.test.ts` | 1 |
| **T-2** `DashboardShell` (AC-2, 3, 4, 6) | `src/components/dashboard/dashboard-shell.tsx` | 1 |
| **T-3** Layouts + limpieza (AC-2, 5) | `src/app/admin/layout.tsx` (nuevo), `src/app/organizer/layout.tsx`, borrar `src/modules/organizer/components/organizer-shell.tsx` | 2 (depende de T-1 y T-2) |

Grupo 0: nada (sin instalaciones ni contratos compartidos previos; los tipos viven en T-1).

## Preguntas abiertas

1. ¿Se aprueba omitir del menú "Mis eventos", "Validar entradas" y "Miembros y roles" hasta que existan esas páginas (en vez de mostrarlas deshabilitadas)? Se propone omitirlas.
2. El admin ve "Administración" → `/admin`, que hoy lista organizaciones y miembros en una sola página; ¿se deja una sola opción? Se propone una sola.
