# Listado de eventos con datos reales: servicio, API y hook reutilizable

**Estado**: done
**Aprobado por**: usuario — 2026-10-02 (respondió "aprobado"; preguntas abiertas: se aceptan las propuestas)
**Fase**: 1 de 2 (la fase 2 es `docs/specs/organizer/event-management.md`: crear y editar eventos en la base)

## Contexto

El listado de eventos se repite en la web (inicio, secciones por categoría, búsqueda `/events`) y en el panel del organizador (`/organizer`), y hoy todo sale de datos mock (`events.service.ts`, `organizer.service.ts` + `localStorage`). Se pide un **hook reutilizable con la seguridad de roles y permisos** y usarlo en la web pública y en el panel del organizador, que debe mostrar **información real**: entradas vendidas, ingresos y eventos publicados. Modelo de datos: `docs/specs/database/data-model.md` (`events`, `ticket_types`, `venues`, `categories`); roles y permisos: `permissions.ts` (`events:manage`).

Decisiones del usuario: la web pública usa el hook en **landing y `/events`** (detalle, selección de entradas y checkout siguen con mock); ventas e ingresos se calculan desde **`ticket_types`** (`quantity_sold`, `price`); crear/editar se conecta a la base en la fase 2.

## Alcance

- **Incluye**:
  - Servicio de servidor con dos alcances: `public` (solo eventos publicados, sin datos de ventas) y `organizer` (eventos de las organizaciones donde el usuario tiene `events:manage`, con borradores, tipos de entrada, vendidas, capacidad e ingresos, y un resumen).
  - Ruta `GET /api/events` que valida los parámetros y aplica la seguridad por alcance.
  - Hook `useEvents` (TanStack Query) reutilizable, tipado por alcance, con la clave de caché compartida con el servidor.
  - `/organizer` (Resumen) con datos reales: KPIs (entradas vendidas, ingresos, eventos publicados) y lista de eventos con filtros Todos/Publicados/Borradores, estados de carga, error y vacío.
  - Landing `/` y búsqueda `/events` leen de la base mediante el mismo hook, con precarga en el servidor (sin parpadeo de carga ni pérdida de SEO).
  - Facetas de la búsqueda (categorías, ciudades, meses) calculadas desde la base.
- **No incluye**:
  - Crear/editar eventos (fase 2): mientras tanto el panel deja de mezclar borradores del navegador.
  - Detalle `/events/[id]`, mapas de zonas/asientos, selección de entradas y checkout: siguen con el catálogo mock. Los eventos sembrados usan como `slug` los ids del mock (`concert-01`…), por lo que sus enlaces siguen funcionando; **un evento nuevo que no esté en el mock mostrará "no encontrado" en el detalle**.
  - Ingresos desde órdenes pagadas, reportes, exportaciones, paginación infinita.

## Criterios de aceptación

- **AC-1** (tests): `parseEventListParams` convierte `searchParams`/objeto a `EventListParams` de forma tolerante (reusa `parseEventFilters` para `q`, `category`, `city`, `month`, `price`, `sort`; añade `scope`, `featured`, `status`, `organizationId`, `page`, `pageSize` ≤ 50); lo inválido se ignora y `scope` desconocido cae a `public`. `eventListToSearchParams` + `parseEventListParams` es ida y vuelta; `eventListKey(params)` es estable (mismo resultado para parámetros equivalentes).
- **AC-2 (seguridad, alcance `public`)**: `listPublicEvents` devuelve solo `status = published`; nunca borradores ni cancelados; la respuesta no incluye ids de organización, tipos de entrada ni cifras de ventas. No exige sesión.
- **AC-3 (seguridad, alcance `organizer`)**: `listOrganizerEvents(actor, params)` exige `can(actor, "events:manage")` (si no, `EventsAccessError` 403; sin sesión, 401) y limita siempre a las organizaciones donde el actor tiene ese permiso (super admin: todas); `organizationId` se acepta solo dentro de ese alcance (fuera → resultado vacío, nunca filtra datos de otra organización). El alcance se aplica en la consulta, no filtrando después.
- **AC-4**: Cada fila del organizador trae `tiers` con nombre, precio (soles), cantidad, vendidas; `sold` = Σ `quantity_sold`; `capacity` = Σ (`quantity_total`, o cantidad de `event_seats` del tipo si es zona numerada); `revenue` = Σ `quantity_sold × price` (centavos → soles). El `summary` (entradas vendidas, ingresos, eventos publicados, total) se calcula sobre **todos** los eventos del alcance y filtro de estado "todos", no solo sobre la página devuelta. Las funciones puras de cálculo llevan tests.
- **AC-5**: `GET /api/events` responde 200 con JSON; 400 con parámetros inválidos que no se puedan tolerar; 401 sin sesión y 403 sin permiso para `scope=organizer`; cabecera `Cache-Control: no-store` en `organizer` y caché corta compartida en `public`. No expone detalles de errores internos.
- **AC-6**: `useEvents(params)` devuelve `{ data, isPending, isError, error, refetch }` tipado por alcance (`public` → `PublicEventList`, `organizer` → `OrganizerEventList` con `summary`); conserva los datos anteriores al cambiar de filtro; los errores 401/403 llegan como `EventsApiError` con `status`. No contiene lógica de permisos: la seguridad vive en servidor.
- **AC-7**: `/organizer` muestra KPIs reales y lista real; los filtros Todos/Publicados/Borradores usan el hook con `status`; estados de carga (esqueleto), error (con reintentar) y vacío ("Crear evento"); fila con imagen, título, fecha corta · ciudad, estado, "N / capacidad vendidas" con barra, ingresos (— en borradores) y acción (Ver evento / Editar). Ya no se importan `ORGANIZER_EVENTS` ni el store del navegador en esta vista.
- **AC-8**: `/` y `/events` obtienen sus eventos con `useEvents` (alcance `public`) con precarga en el servidor y `HydrationBoundary`: el primer HTML ya contiene los eventos y no hay petición redundante al cargar. Los filtros de `/events` siguen viviendo en la URL; fechas y meses se calculan en hora de Lima (`America/Lima`). Una imagen ausente muestra un marcador visual.
- **AC-9**: `lint`, `test` y `build` pasan; no queda código muerto del mock que ya nadie usa (verificado con grep), salvo lo que la fase 2 reemplaza (`organizer.store`, formulario).

## Contratos

```ts
// src/modules/events/schemas/event-list.schema.ts  (puro, importable en cliente)
export type EventListScope = "public" | "organizer";
export interface EventListParams {
  scope: EventListScope; q: string; categories: EventCategory[]; cities: string[];
  month: string | null; price: PriceRangeKey | null; sort: EventSort;
  featured?: boolean; status: "all" | "published" | "draft"; // status solo aplica a organizer
  organizationId?: string; page: number; pageSize: number;
}
export function parseEventListParams(raw: Record<string, string | string[] | undefined>): EventListParams;
export function eventListToSearchParams(p: EventListParams): URLSearchParams;
export function eventListKey(p: EventListParams): readonly unknown[];

// src/modules/events/types/event-list.types.ts
export interface PublicEventList { events: Event[]; total: number; page: number; pageCount: number } // Event = tipo existente; id = slug
export interface OrganizerEventTier { id: string; name: string; price: number; quantity: number; sold: number }
export interface OrganizerEventRow {
  id: string; slug: string; status: "draft" | "published" | "cancelled"; title: string;
  category: EventCategory | null; description: string | null; startsAt: string; venue: string; city: string;
  imageUrl: string | null; tiers: OrganizerEventTier[]; sold: number; capacity: number; revenue: number; fromPrice: number | null;
}
export interface OrganizerSummary { sold: number; revenue: number; published: number; total: number }
export interface OrganizerEventList { events: OrganizerEventRow[]; total: number; page: number; pageCount: number; summary: OrganizerSummary }

// src/modules/events/services/event-list.service.ts (solo servidor)
export class EventsAccessError extends Error { status: 401 | 403 }
export function listPublicEvents(params: EventListParams): Promise<PublicEventList>;
export function listOrganizerEvents(actor: CurrentUser | null, params: EventListParams): Promise<OrganizerEventList>;
export function getPublicEventFacets(): Promise<EventFacets>; // tipo existente en events.service.ts

// src/modules/events/hooks/use-events.ts ("use client")
export class EventsApiError extends Error { status: number }
export function useEvents(params: EventListParams & { scope: "public" }): UseQueryResult<PublicEventList, EventsApiError>;
export function useEvents(params: EventListParams & { scope: "organizer" }): UseQueryResult<OrganizerEventList, EventsApiError>;
```

`GET /api/events?scope=…&q=…&category=…&city=…&month=…&price=…&sort=…&featured=…&status=…&page=…` en `src/app/api/events/route.ts`.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Filtros de búsqueda por URL | `parseEventFilters`, `EventFilters`, `PRICE_RANGES` (`event-filters.schema.ts`) | reusar y extender (`parseEventListParams` los incluye) |
| Tipo `Event`, `EventFacets`, categorías | `event.types.ts`, `events.service.ts` | reusar; el servicio mock queda solo para el detalle (se acota en fase 2) |
| Permisos y usuario actual | `can`, `getCurrentUser`, `CurrentUser` | reusar |
| Paginación | `src/components/pagination.tsx`, `PAGE_SIZE` | reusar si el panel pagina (la fase 1 usa `pageSize` ≤ 50 sin controles) |
| Caché del cliente | `QueryProvider` (`src/components/providers/query-provider.tsx`), `@tanstack/react-query` instalado sin uso | reusar; añadir `getQueryClient()` de servidor (`src/lib/query-client.ts`) para precarga con `HydrationBoundary` |
| Formato de fechas/moneda | `src/lib/format.ts` (zona Lima) | reusar |
| KPIs, lista, fila | `summary-kpis.tsx`, `organizer-events-list.tsx`, `organizer-dashboard-view.tsx` | adaptar al nuevo tipo |
| Secciones de eventos de la landing | `event-carousel.tsx`, `event-section.tsx`, `event-card.tsx`, `event-search-view.tsx` | adaptar: se alimentan del hook mediante envoltorios cliente delgados |
| Consultas con conteos correlacionados | `organization-catalog.service.ts` (cuidado: calificar la columna externa, ver `ORG_ID`) | seguir el mismo patrón calificado |

## Plan de tareas

| Tarea | Archivos | Grupo |
|---|---|---|
| **T-1** Parámetros, tipos, clave de caché y cálculos puros + tests (AC-1, AC-4 parte pura) | `src/modules/events/schemas/event-list.schema.ts` (+test), `src/modules/events/types/event-list.types.ts`, `src/modules/events/services/event-list.calc.ts` (+test: centavos→soles, resumen, capacidad), `src/lib/query-client.ts` | 1 |
| **T-2** Servicio de listado y facetas (AC-2, AC-3, AC-4) | `src/modules/events/services/event-list.service.ts` | 1 |
| **T-3** Ruta API + hook (AC-5, AC-6) | `src/app/api/events/route.ts`, `src/modules/events/hooks/use-events.ts` | 2 |
| **T-4** Panel de organizador con datos reales (AC-7) | `src/modules/organizer/components/{organizer-dashboard-view,organizer-events-list,summary-kpis}.tsx`, `src/app/organizer/page.tsx` | 3 |
| **T-5** Web pública con el hook (AC-8) | `src/app/page.tsx`, `src/app/events/page.tsx`, `src/modules/events/components/{event-search-view,featured-events,category-events}.tsx` (los dos últimos nuevos, envoltorios cliente) | 3 |

T-4 y T-5 tocan archivos distintos y corren en paralelo. T-2 no lleva tests de base (el repo no tiene cómo simularla): su lógica pura se prueba en T-1 y el resto lo verifica el reviewer.

## Preguntas abiertas

1. **Detalle de eventos nuevos**: hasta que el detalle/compra lean de la base, un evento creado desde el panel no tiene página pública funcional. ¿Se acepta para esta fase, o se prefiere ocultar de la web pública los eventos que no estén en el catálogo mock hasta migrar el detalle?
2. **Tamaño de lista del organizador**: sin paginación, hasta 50 eventos por consulta. ¿Suficiente por ahora?
