# Búsqueda y listado de eventos (mock data)

**Estado**: done
**Aprobado por**: usuario — 2026-09-29
**Fase**: 3 de 5 del plan de features (ver `docs/specs/tickets/purchase-flow.md` › Plan de fases)

## Contexto

Las Fases 1 y 2 entregaron el flujo de compra (detalle → entradas → checkout → confirmación). Esta fase entrega la pantalla **2 · Búsqueda y listado** del diseño de Claude Design (escritorio 1440 + móvil 390): buscador, filtros por categoría, ciudad, mes y precio, chips de filtros activos, orden y resultados. Mismo alcance: solo UI/UX sobre los datos mock de `events.service.ts`, sin backend.

Hoy los controles de búsqueda de la landing son solo visuales (`landing-page.md` AC-13). Con una página de resultados real, esta fase los conecta a ella.

## Alcance

- **Incluye**:
  - Ruta `/events`: "Explora eventos", buscador de texto, filtros, chips de filtros activos, contador de resultados, orden ("Fecha" / "Precio más bajo"), resultados y estado vacío con "Limpiar filtros".
  - **Filtros en la URL** (`/events?q=rock&category=concert&city=Lima&month=2026-11&price=100-200&sort=price`): se pueden compartir, sobreviven a recargas y el botón "atrás" del navegador funciona. El filtrado se hace en el servidor (`searchEvents`) igual que lo haría una API futura.
  - Escritorio: barra lateral de filtros + grilla de tarjetas. Móvil: buscador, botón "Filtros" (con contador) que abre un panel a pantalla completa, botón de orden, chips de categoría con scroll horizontal y lista de tarjetas horizontales.
  - Conexión de la landing a la búsqueda: el buscador del Hero y la barra "Todos los eventos" envían a `/events?q=…`; los enlaces del header, las category pills y "Ver todos" de las filas llevan a `/events?category=…`.
- **No incluye**:
  - Selector de fechas con calendario y rango de precio libre (el diseño usa opciones fijas; aquí también).
  - Paginación o scroll infinito (hay 10 eventos mock).
  - Categorías o eventos nuevos: se usan las 2 categorías y los 10 eventos existentes (el diseño muestra 8 categorías de ejemplo; se agregan cuando existan datos).
  - Badges "Últimas entradas" / "Agotado" por evento: el mock no tiene disponibilidad a nivel evento (se decide cuando exista la API).
  - Búsqueda difusa, sugerencias o autocompletado.

## Criterios de aceptación

- **AC-1**: `/events` muestra el `Header` y `Footer` compartidos, el título "Explora eventos" y un buscador (input + "Buscar"). Enviar el buscador actualiza `q` en la URL y los resultados; la búsqueda ignora mayúsculas y tildes y compara contra título, recinto y ciudad ("opera" encuentra "El Fantasma de la Ópera").
- **AC-2**: Filtros: **Categoría** (checkboxes multiselección, con cantidad de eventos por opción), **Ciudad** (checkboxes con cantidad, opciones derivadas de los datos), **Fecha** (radios: "Cualquier fecha" + un mes por cada mes con eventos, ej. "Noviembre 2026") y **Precio desde** (radios: "Cualquier precio", "Hasta S/ 100", "S/ 100 – 200", "S/ 200 – 300", "Más de S/ 300"). Cambiar un filtro actualiza la URL sin recargar la página ni mover el scroll, y los resultados.
- **AC-3**: Los filtros se combinan con AND entre grupos y OR dentro de un grupo multiselección. El contador muestra "N eventos" / "1 evento" (`aria-live="polite"`).
- **AC-4**: Cada filtro activo aparece como chip "✕ etiqueta" que lo quita; "Limpiar" (en la barra de filtros) y "Limpiar filtros" (en el estado vacío) quitan todos los filtros y la búsqueda de texto.
- **AC-5**: Orden: "Fecha" (más próximo primero, por defecto) y "Precio más bajo", como botones de alternancia (`aria-pressed`) en escritorio y un botón "Orden: X" en móvil.
- **AC-6**: Sin resultados, se muestra "No encontramos eventos con esos filtros" con sugerencia y "Limpiar filtros".
- **AC-7**: Móvil (< `lg`): la barra lateral no se muestra; "Filtros" (con badge del número de filtros activos de ciudad/fecha/precio) abre un panel modal a pantalla completa (`<dialog>` nativo: foco atrapado, Escape cierra) con Ciudad, Fecha y Precio, "Limpiar" y "Ver N eventos". La categoría se elige con chips horizontales (`aria-pressed`) sobre la lista. Los resultados se muestran como tarjetas horizontales. Sin scroll horizontal de página en 375 px.
- **AC-8**: Valores inválidos o desconocidos en la URL (`?price=foo&sort=bar&category=sports`) se ignoran sin romper la página.
- **AC-9**: Landing: el buscador del Hero y la barra de "Todos los eventos" son formularios `GET` a `/events` (`q` y, en la barra, `category`); "Conciertos" y "Teatro y espectáculos" del header y las category pills son enlaces a `/events?category=…`; las filas de categoría muestran "Ver todos" hacia `/events?category=…`.
- **AC-10** (con tests): `parseEventFilters` convierte los `searchParams` en filtros válidos (descarta lo inválido, acepta valores repetidos o uno solo) y `toSearchParams` hace la conversión inversa omitiendo valores por defecto. `searchEvents` aplica texto, categoría, ciudad, mes, rango de precio y orden; `getEventFacets` devuelve categorías, ciudades y meses con sus cantidades.
- **AC-11**: Todo con tokens de `globals.css`; ninguna llamada de red.

## Contratos

### Filtros (`src/modules/events/schemas/event-filters.schema.ts`)

```ts
export const PRICE_RANGES = {
  "0-100":   { label: "Hasta S/ 100",   min: 0,   max: 100 },
  "100-200": { label: "S/ 100 – 200",   min: 100, max: 200 },
  "200-300": { label: "S/ 200 – 300",   min: 200, max: 300 },
  "300+":    { label: "Más de S/ 300",  min: 300, max: Infinity },
} as const;                                   // rango: min < price <= max (0-100 incluye 0)
export type PriceRangeKey = keyof typeof PRICE_RANGES;
export type EventSort = "date" | "price";

export interface EventFilters {
  q: string;                   // "" = sin texto
  categories: EventCategory[];
  cities: string[];
  month: string | null;        // "2026-11"
  price: PriceRangeKey | null;
  sort: EventSort;             // default "date"
}

export const DEFAULT_EVENT_FILTERS: EventFilters;
export function parseEventFilters(params: Record<string, string | string[] | undefined>): EventFilters; // zod, tolerante
export function toSearchParams(filters: EventFilters): URLSearchParams; // omite defaults
export function countActiveFilters(filters: EventFilters, groups?: ("categories" | "cities" | "month" | "price")[]): number;
```

Claves de URL: `q`, `category` (repetible), `city` (repetible), `month`, `price`, `sort`.

### Service (`src/modules/events/services/events.service.ts`, se agregan)

```ts
export function searchEvents(filters: EventFilters): Event[];
export interface FacetOption<T extends string = string> { value: T; label: string; count: number }
export function getEventFacets(): {
  categories: FacetOption<EventCategory>[];
  cities: FacetOption[];        // orden alfabético
  months: FacetOption[];        // cronológico, label "Noviembre 2026"
};
```

Las cantidades de las facetas son sobre el total de eventos (como en el diseño), no sobre el resultado filtrado.

### Componentes

```ts
// src/modules/events/components/event-card.tsx — se extiende (sin romper usos actuales)
interface EventCardProps { event: Event; layout?: "vertical" | "horizontal"; className?: string }

// src/modules/events/components/event-filters-form.tsx — grupos de filtros reutilizados por la barra lateral y el panel móvil
interface EventFiltersFormProps {
  filters: EventFilters;
  facets: ReturnType<typeof getEventFacets>;
  groups: ("categories" | "cities" | "month" | "price")[];
  onChange: (next: EventFilters) => void;
}

// src/modules/events/hooks/use-event-filters-navigation.ts — actualiza la URL (router.push, scroll: false: cada cambio queda en el historial) en una transición
export function useEventFiltersNavigation(current: EventFilters): { filters: EventFilters /* optimista */; isPending: boolean; apply: (filters: EventFilters) => void };
```

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Tarjeta de evento | `EventCard` | extender con `layout="horizontal"` para la lista móvil |
| Header, Footer, formato de fechas/precios, `Input`, `Button`, `Badge` | `src/components/`, `src/lib/format.ts` | reusar |
| Etiquetas de categoría | `EVENT_CATEGORY_LABELS` | reusar |
| Validación de query params | `zod` (ya usado en checkout) | crear `event-filters.schema.ts` |
| Panel de filtros móvil | shadcn `sheet`/`dialog`: registro bloqueado en este entorno | `<dialog>` nativo con `showModal()` (foco atrapado y Escape por defecto) |
| Checkbox / radio | shadcn `checkbox`/`radio-group`: registro bloqueado | inputs nativos estilizados (misma decisión que la Fase 2) |
| Barra "Todos los eventos" de la landing | `EventFilterBar` | extender: pasa a ser un formulario `GET` a `/events` |

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Contrato de filtros + búsqueda + facetas. — archivos: `src/modules/events/schemas/event-filters.schema.ts` (+ `.test.ts`), `src/modules/events/services/events.service.ts`, `src/modules/events/services/events.service.test.ts` — tests: sí — cubre: AC-1, AC-2, AC-3, AC-8, AC-10

### Grupo 1 (paralelo)

- **T-2**: Hook de navegación de filtros y formulario de filtros (barra lateral + panel móvil con `<dialog>`) + chips activos. — archivos: `src/modules/events/hooks/use-event-filters-navigation.ts`, `src/modules/events/components/event-filters-form.tsx`, `src/modules/events/components/event-filters-dialog.tsx`, `src/modules/events/components/active-filter-chips.tsx` — tests: no (la lógica está en el schema) — cubre: AC-2, AC-4, AC-7
- **T-3**: `EventCard` horizontal, barra de búsqueda y orden, estado vacío. — archivos: `src/modules/events/components/event-card.tsx`, `src/modules/events/components/event-search-bar.tsx`, `src/modules/events/components/event-sort-toggle.tsx`, `src/modules/events/components/event-results-empty.tsx` — tests: no — cubre: AC-1, AC-5, AC-6, AC-7
- **T-4**: Conectar la landing. — archivos: `src/components/header.tsx`, `src/modules/events/components/hero.tsx`, `src/modules/events/components/category-pill.tsx`, `src/modules/events/components/event-filter-bar.tsx`, `src/app/page.tsx` — tests: no — cubre: AC-9

### Grupo 2 (serial)

- **T-5**: Contenedor cliente de la búsqueda y ruta `/events`. — archivos: `src/modules/events/components/event-search-view.tsx`, `src/app/events/page.tsx` — tests: no — cubre: AC-1 a AC-7, AC-11

### Notas de implementación

- El hook devuelve los filtros en forma **optimista** (`useOptimistic`): sin eso, los checkboxes controlados por la URL no se marcaban hasta que respondía el servidor (lo detectó la prueba en navegador).
- `CategoryPill` pasó a ser un enlace; se quitaron sus props `active`/`onSelect`, que ya no usaba nadie. Se agregó "Eventos" al header.
- `EventFilterBar` suma un botón "Buscar" para enviar el formulario.

Verificado: `npm run lint`, `npm run test` (99 tests) y `npm run build` en verde; recorrido con Playwright en 1440 px y 390 px: búsqueda desde el Hero con tildes ("opera"), chips, filtros combinados, orden, "atrás" del navegador, estado vacío y "Limpiar filtros", parámetros inválidos, enlaces del header, chips de categoría y panel de filtros móvil (Escape cierra, badge de activos), sin scroll horizontal ni errores de consola.

## Fases siguientes

Fase 4 (login/registro + Mis entradas) y Fase 5 (organizador). Ver `docs/specs/tickets/purchase-flow.md`.

## Preguntas abiertas

Ninguna bloqueante. Decisiones de autoría: filtros en la URL; rangos de precio fijos ajustados a los precios mock (S/ 75–350); sin badges de disponibilidad por evento; landing conectada a la búsqueda (deja de ser "solo visual" en esos controles).
