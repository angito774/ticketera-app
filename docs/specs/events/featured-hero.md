# Eventos destacados: marcado desde el panel y carousel real en el Hero

**Estado**: done
**Aprobado por**: usuario — 2026-10-05
**Fase**: 1 de 1

## Contexto

La landing (`src/app/page.tsx`) ya lee eventos reales de la base (`listPublicEvents`), pero el `Hero` (`src/modules/events/components/hero.tsx`) sigue siendo estático: 5 tiles de Unsplash hardcodeados (spec `hero-redesign.md`, `done`, que no se reabre). La columna `events.featured` (`boolean not null default false`) **ya existe** en el schema y en el seed, y el filtro `featured: true` ya funciona en `event-list.service.ts`; lo que falta es poder **marcarla desde el panel** y **usarla en el Hero**. Por eso **no hay migración de base de datos**.

Decisiones del usuario (conversación previa a esta spec):
1. Solo el **super admin** puede destacar eventos (posiciona en la portada de toda la plataforma).
2. El Hero pasa a ser un **carousel full-width** que reemplaza la grilla bento; el buscador queda sobre el carousel.
3. El flag se marca tanto **desde el listado** como **al crear/editar** un evento.

## Alcance

- **Incluye**:
  - Permiso derivado `events:feature` (solo super admin, no asignable a roles), verificado en servidor.
  - Persistir `featured` al crear/editar un evento (editor) y un cambio rápido desde el listado (`setEventFeaturedAction`).
  - Toggle "Destacado" en cada fila del listado del organizador y checkbox "Destacar en la portada" en el editor, ambos **solo visibles para super admin**.
  - `listHeroEvents()`: eventos `published`, `featured`, con fecha futura, por fecha ascendente, máximo `HERO_MAX_EVENTS` (6).
  - `Hero` con carousel de esos eventos (imagen de portada, título, fecha, recinto, botón "Comprar") con autoplay; sin destacados, solo headline + buscador.
  - Revalidar `/`, `/events` y `/organizer` al cambiar el flag.
- **No incluye**: migraciones o cambios de schema; orden manual de los destacados (se ordenan por fecha); destacar desde `/admin`; cambios a la sección "Eventos destacados" de más abajo (sigue leyendo el mismo flag); nueva dependencia de autoplay (se hace con la API de embla ya instalada); sustituir otras secciones estáticas (`PromoBanner`, `CategoryPill`); dark mode.

## Criterios de aceptación

- **AC-1** (test): `can(actor, "events:feature")` es `true` solo para super admin; un admin u organizador con cualquier membresía/rol da `false`, también con `organizationId`. El permiso no aparece en `ASSIGNABLE_PERMISSIONS`.
- **AC-2** (test): `eventSaveSchema`/`eventUpdateSchema` y `EventSaveInput` aceptan `featured?: boolean` (opcional; ausente = no tocar); `EventFormValues` incluye `featured: boolean`, `EMPTY_EVENT_FORM.featured === false` y `toEventSaveInput` lo envía siempre (el servidor lo ignora si el actor no tiene el permiso, AC-3).
- **AC-3 (seguridad, test del helper puro)**: crear/actualizar un evento solo persiste `featured` si el actor tiene `events:feature`; si no lo tiene, el valor enviado se **ignora** (no se escribe y en edición se conserva el actual). `setEventFeatured(actor, id, featured)` sin el permiso lanza `AdminError("Sin permiso")` (se comprueba primero); con id inexistente → `AdminError("Evento no encontrado")`; con evento `cancelled` → `AdminError("No se puede destacar un evento cancelado")`. Un id que no sea uuid lo rechaza el schema de la acción (AC-4). Nunca se confía en que la UI oculte el control.
- **AC-4**: `setEventFeaturedAction(raw)` valida `{ id: uuid, featured: boolean }`, usa `run()` (sesión obligatoria), y al terminar bien revalida `/`, `/events` y `/organizer` (layout).
- **AC-5**: se puede destacar/quitar un evento en estado `draft` o `published` (en `cancelled` se rechaza, AC-3, y la UI no muestra el toggle); un borrador destacado no aparece en el Hero hasta publicarse (AC-6). `updateEvent` ya rechaza editar cancelados, así que el checkbox del editor no necesita regla extra.
- **AC-6**: `listHeroEvents()` devuelve `Event[]` (mismo mapeo `mapPublicEvent`) solo de eventos `status = 'published'`, `featured = true` y `starts_at >= now()`, ordenados por `starts_at` asc (desempate por `id`), con `limit(HERO_MAX_EVENTS)`. No requiere sesión.
- **AC-7**: en el listado del organizador, cada fila muestra un toggle "Destacado" (botón con `aria-pressed`, etiqueta accesible `Destacar «título»` / `Quitar destacado de «título»`, área táctil ≥ 44px en móvil, compacto en `lg`) **solo si el actor es super admin y el evento no está `cancelled`**; se ubica dentro de la celda "Evento" (junto al título) sin cambiar las columnas del grid de la tabla. Al pulsarlo se actualiza al instante (estado optimista con `useTransition`), al terminar bien invalida las queries `["events", "organizer", …]` de TanStack Query (el listado se carga en cliente con `useEvents`; `revalidatePath` no las refresca), y si el servidor falla muestra el error y revierte. Los demás ven un indicador de solo lectura (estrella + "Destacado") si el evento lo está.
- **AC-8**: el editor muestra el checkbox "Destacar en la portada" (con texto de ayuda: "Aparece en el carousel de la página principal cuando el evento esté publicado") **solo para super admin**, tanto al crear como al editar (incluye eventos publicados). Carga el valor actual al editar y lo envía en el payload de guardado.
- **AC-9**: el `Hero` recibe `featuredEvents: Event[]` por props (render en servidor, desde `page.tsx` con `listHeroEvents()`); con ≥ 1 evento muestra un carousel full-width: imagen de portada (`next/image` `fill` + `sizes`), degradado oscuro, título, fecha/hora, recinto y ciudad, y un enlace "Comprar entradas" a `/events/${event.id}` (en `Event`, `id` es el slug, igual que `EventCard`). Con 0 eventos no renderiza carousel ni tiles de relleno (headline + buscador solamente). El buscador sigue siendo el mismo `Form` a `/events`.
- **AC-10**: el carousel avanza solo cada 6 s, se pausa con hover/foco y **no** autoavanza si `prefers-reduced-motion: reduce`; con un solo evento no muestra controles ni autoplay; con varios, flechas anterior/siguiente con `aria-label` y puntos/contador accesibles; `aria-roledescription="carousel"` y slides `"n de total"`. Sin overflow horizontal a 375px.
- **AC-11**: `page.tsx` llama `listHeroEvents()` en servidor, en paralelo con el prefetch existente (mismo `Promise.all`), y pasa el resultado a `<Hero featuredEvents={…} />`; el prefetch de las otras secciones no cambia. `HeroProps` conserva `headline?`, `subtitle?`, `className?` y suma `featuredEvents?: Event[]` (default `[]`).
- **AC-12** (verificable por comando): sin código muerto (`BENTO_TILES`, `HeroBentoTile`, `BentoTile` se eliminan; sin imports huérfanos); `npm run lint`, `npm run test` y `npm run build` pasan.

## Contratos

```ts
// src/modules/auth/services/permissions.ts
export type Permission = /* …existentes… */ | "events:feature";
// can(): "events:feature" no está en ASSIGNABLE_PERMISSIONS → solo super admin.

// src/modules/events/types/event-list.types.ts
export interface OrganizerEventRow { /* …existente… */ featured: boolean }
// listOrganizerEvents() agrega `featured: events.featured` al select y al mapeo de filas (event-list.service.ts).

// src/modules/organizer/schemas/event-form.schema.ts
export interface EventFormValues { /* …existente… */ featured: boolean }
// eventSaveSchema / eventUpdateSchema: featured?: boolean

// src/modules/organizer/services/event-write.mapping.ts (puro, con test)
export function resolveFeatured(
  canFeature: boolean,
  requested: boolean | undefined,
): { featured: boolean } | Record<string, never>; // {} = no tocar la columna

// src/modules/organizer/services/event-write.service.ts (solo servidor)
export function setEventFeatured(actor: CurrentUser, id: string, featured: boolean): Promise<void>;
// createEvent/updateEvent aplican resolveFeatured(can(actor,"events:feature"), input.featured)
// en el insert y en AMBOS updates (borrador y publicado).

// src/modules/organizer/actions/event.actions.ts ("use server")
export function setEventFeaturedAction(raw: unknown): Promise<ActionResult>; // { id: uuid, featured: boolean }
// El schema zod va como const no exportada dentro del archivo (un archivo "use server" solo exporta funciones async).

// src/modules/events/services/event-list.service.ts (solo servidor)
export const HERO_MAX_EVENTS = 6;
export function listHeroEvents(): Promise<Event[]>;

// src/modules/organizer/services/event-edit.service.ts
// getEventForEdit(): values.featured = events.featured

// src/modules/events/components/hero.tsx
export interface HeroProps { headline?: string; subtitle?: string; className?: string; featuredEvents?: Event[] }
```

Para saber si mostrar el control, las páginas del servidor calculan `canFeature = can(user, "events:feature")` (con `requirePermission("events:manage")`, que ya está cacheado por request) y lo pasan como prop `canFeature: boolean`:
- `src/app/organizer/page.tsx` → `OrganizerDashboardView` (`canFeature`) → `OrganizerEventsList` (`canFeature`); `OrganizerDashboardView` es cliente, así que la prop viene de la página.
- `src/app/organizer/events/new/page.tsx` y `src/app/organizer/events/[id]/edit/page.tsx` → `EventEditor` (`canFeature`).
Cada prop es obligatoria (sin default) y la declara la misma tarea que edita el componente (T-4 y T-5); la comprobación real sigue en servidor (AC-3).

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Columna y filtro de destacados | `events.featured`, `listPublicEvents({featured})` | reusar; sin migración |
| Permisos | `can()` / `ASSIGNABLE_PERMISSIONS` en `permissions.ts` | extender con `events:feature` |
| Acciones y errores | `run()`, `AdminError`, `event.actions.ts` | reusar el patrón |
| Mapeo de evento público | `mapPublicEvent` (`event-list.mapping.ts`) | reusar |
| Carousel | `src/components/ui/carousel.tsx` (embla, `setApi`) | reusar; autoplay con `setApi` + `setInterval`, sin dependencia nueva |
| Controles de formulario | `ui/checkbox.tsx`, `FormField` | reusar |
| Imagen de evento | patrón `next/image fill + sizes` de `EventCard` | reusar |
| Hero estático | `BENTO_TILES` en `hero.tsx` | eliminar |

## Plan de tareas

Archivos con cambios sin commitear del usuario (`organizer-events-list.tsx`, `event-editor.tsx`, `organizer-dashboard-view.tsx`): se editan encima, **sin revertir ni reformatear** esos cambios (ya existentes: `OrganizerEventsList` es `"use client"`, el dashboard filtra en cliente por nombre/fechas con `DatePicker`, el editor usa `DatePicker`). Verificado: ninguno de los tres contiene aún nada de `featured`/`canFeature`, así que no hay trabajo duplicado; el grid de 5 columnas de la lista debe conservarse.

| Tarea | Archivos | Grupo |
|---|---|---|
| **T-1** Contratos compartidos: permiso `events:feature` (+test), `featured` en `OrganizerEventRow`, `featured` en el schema/valores del formulario (+test) (AC-1, AC-2) | `src/modules/auth/services/permissions.ts`, `permissions.test.ts`, `src/modules/events/types/event-list.types.ts`, `src/modules/organizer/schemas/event-form.schema.ts` (+ su test si existe) | 0 |
| **T-2** Escritura: `resolveFeatured` (+test), `setEventFeatured`, persistir en create/update y cargar en edición (AC-3, AC-5) | `src/modules/organizer/services/event-write.mapping.ts`, `event-write.mapping.test.ts`, `event-write.service.ts`, `event-edit.service.ts` | 1 |
| **T-3** Lectura: `listHeroEvents` y `featured` en las filas del organizador (AC-6, AC-7) | `src/modules/events/services/event-list.service.ts` (solo consultas Drizzle; sin test unitario, lo valida el `reviewer` contra la base) | 1 |
| **T-4** Acción + toggle del listado, con prop `canFeature` en dashboard view y lista, y página `/organizer` (AC-4, AC-5, AC-7) | `src/modules/organizer/actions/event.actions.ts`, `src/modules/organizer/components/organizer-events-list.tsx`, `featured-toggle.tsx` (nuevo), `organizer-dashboard-view.tsx`, `src/app/organizer/page.tsx` | 2 |
| **T-5** Checkbox del editor, con prop `canFeature` y páginas new/edit (AC-8) | `src/modules/organizer/components/event-editor.tsx`, `src/app/organizer/events/new/page.tsx`, `src/app/organizer/events/[id]/edit/page.tsx` | 2 |
| **T-6** Hero con carousel real (AC-9..AC-12) | `src/modules/events/components/hero.tsx`, `hero-carousel.tsx` (nuevo), `src/app/page.tsx` | 2 |

Cada tarea de un grupo toca archivos disjuntos (T-2/T-3 en el grupo 1; T-4/T-5/T-6 en el grupo 2). Dependencias: T-4 usa `setEventFeatured` (T-2) y `OrganizerEventRow.featured` (T-1/T-3); T-5 usa `EventFormValues.featured` (T-1) y `getEventForEdit` (T-2); T-6 usa `listHeroEvents` (T-3). Cobertura: AC-1/2 → T-1; AC-3/5 → T-2; AC-6 → T-3; AC-4/7 → T-4; AC-8 → T-5; AC-9..12 → T-6. Las consultas SQL las valida el `reviewer` contra la base en **solo lectura**.

## Preguntas abiertas (con valor por defecto; no bloquean la aprobación)

1. La sección "Eventos destacados" (más abajo en la landing) muestra los mismos eventos que el Hero. **Por defecto se mantiene** (el usuario pidió solo el Hero); se puede quitar después.
2. Tope de 6 slides y autoplay de 6 s: valores por defecto ajustables.
3. Un organizador **no** puede quitar el destacado de su propio evento; solo el super admin. Por defecto sí, coherente con la decisión 1.
4. Los eventos `cancelled` ya destacados no se pueden desmarcar desde la UI (no hay toggle); no afecta al Hero porque solo muestra `published`. Por defecto se acepta.
