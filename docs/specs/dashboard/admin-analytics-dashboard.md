# Dashboard analítico para admin y super admin (Recharts)

**Estado**: approved
**Aprobado por**: nelson.nc421@gmail.com (2026-10-12) — aceptó todas las propuestas de "Preguntas abiertas" tal como están redactadas (1 a 11; la implementación cubre solo la Fase 1)
**Fase**: 1 de 2

## Contexto

Se pide un panel analítico en `/admin/dashboard` para los roles **admin** (`members:manage`) y **super admin**, con el diseño ya aprobado como preview visual (periodo 7/30/90 días con comparación contra el periodo anterior, KPIs, tendencia de ventas, dona por zona, barras por categoría con cross-filter, tabla de eventos con más ventas y, solo super admin, un bloque de plataforma y pagos). Los gráficos usan Recharts a través del componente `chart` de shadcn y los tokens `--chart-1..5` del proyecto. El preview usa datos inventados; esta spec mapea cada métrica a tablas y columnas **reales** (Drizzle) y marca como decisión abierta lo que hoy no existe.

La feature se divide en dos fases para mantener cada una alcanzable: **Fase 1** (esta, detallada) entrega el panel completo para ambos roles con el 4º KPI "ocupación promedio" y deja listo el control de alcance en servidor; **Fase 2** agrega el 4º KPI "comisión de plataforma" y el bloque exclusivo de super admin (ver § Fases siguientes). Diseño de sistema relacionado: `docs/specs/database/data-model.md` § `orders`, § `tickets`, § Roles y permisos (implementado); pagos: `docs/specs/payments/stripe-settlement-refunds.md`.

## Alcance

- **Incluye (Fase 1)**:
  - Ruta `/admin/dashboard` (server component) accesible con `members:manage` (admin y super admin) e ítem "Panel" en el menú.
  - Selector de periodo 7/30/90 días; cada KPI compara contra el periodo inmediatamente anterior de igual longitud (delta %).
  - KPIs: ingresos brutos, entradas vendidas, ticket promedio y ocupación promedio.
  - Gráfico de área "Ventas en el tiempo" (toggle ingresos/entradas) con línea punteada del periodo anterior.
  - Dona de entradas por zona; barras horizontales de ingresos por categoría con cross-filter por clic (clic de nuevo lo quita).
  - Tabla de eventos con más ventas: ordenable, filtro por ciudad, barra de ocupación.
  - Alcance de datos por rol calculado en servidor (super admin: todas las organizaciones; admin: solo las suyas).
  - Estado de filtros en la URL validado con zod; estados de carga, vacío y error; accesibilidad y responsive.
  - Tokens `--chart-1..5` con paleta distinguible en claro y oscuro.
- **No incluye**:
  - 4º KPI "comisión de plataforma", comisión por día, liquidación a organizadores, reembolsos y pagos fallidos por semana: **Fase 2**.
  - Exportar CSV/PDF, tiempo real/websocket/polling, dashboards del organizador (`/organizer`), edición de layout por usuario, filtro por organización o por rango de fechas libre, cambios de esquema de BD, selector de tema claro/oscuro (hoy no existe; solo se garantizan los tokens).
  - Route handlers (`/api/...`) y React Query para este panel (ver § Decisiones de arquitectura).

## Decisiones de arquitectura

1. **Server component + SQL agregado + props**, no route handler + React Query. El panel es de solo lectura, depende de filtros que cambian por navegación y los datos son agregados chicos (decenas de puntos). Un `page.tsx` async lee `searchParams`, llama al servicio de agregación (servidor, `src/db`) y pasa datos serializables a componentes cliente de Recharts. Evita exponer un endpoint extra que habría que proteger por separado (la autorización vive en el servicio, ver AC-2/AC-3), mantiene `db` fuera del bundle cliente y reutiliza el patrón de `src/app/admin/page.tsx` (`requirePermission` + `await searchParams` + schema zod).
2. **Estado de filtros en la URL** (`period`, `category`, `city`), validado con zod y navegando con `router.push` dentro de `useTransition`/`useOptimistic` como `src/modules/events/hooks/use-event-filters-navigation.ts`. No se usa zustand: el estado es compartible/recargable, funciona con atrás/adelante y el servidor necesita los filtros para agregar. La **métrica del gráfico** (ingresos/entradas) y el **orden de la tabla** son estado local de vista (`useState`): operan sobre datos ya cargados y no justifican un viaje al servidor.
3. **Streaming**: `page.tsx` envuelve el contenido de datos en `<Suspense key=...>` con esqueleto (`skeleton` de shadcn) de modo que el selector de periodo queda visible mientras se agrega. Next.js 16 (`AGENTS.md`): `searchParams` es una `Promise` (`await searchParams`, tipo `PageProps<"/admin/dashboard">`), usarlo hace la ruta dinámica; el proyecto **no** tiene `cacheComponents` activado en `next.config.ts`, así que no se usa `"use cache"`. El developer debe leer `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` (§ `searchParams`) y `.../01-getting-started/05-server-and-client-components.md` y `06-fetching-data.md` (streaming) antes de implementar.
4. **Recharts solo en cliente** (`"use client"`), instalado vía `npx shadcn@latest add chart` (envuelve Recharts con `ChartContainer`, `ChartTooltip`, `ChartConfig`). Los datos llegan ya agregados y en céntimos enteros; el cliente solo formatea.

## Reglas de datos (verificadas en el repo)

### Roles y alcance

- `can()` / `highestRole()` en `src/modules/auth/services/permissions.ts`: **super admin** (`users.is_super_admin`) pasa todo; **admin** = quien tiene `members:manage` en alguna organización (permiso asignable); `organizations:manage` y `roles:manage` **solo** los tiene el super admin (no asignables). `src/app/admin/layout.tsx` ya exige `members:manage` para todo `/admin/*`; `dashboard-nav.ts` muestra "Pagos" solo con `organizations:manage`.
- **Alcance de organizaciones** (mismo criterio que `listOrganizationCatalog`): super admin → sin filtro; admin → `memberships` donde `can(actor, "members:manage", m.organizationId)`. Con alcance vacío el servicio devuelve un resultado vacío válido (no error). **Ningún parámetro de URL permite elegir organización**; el alcance sale siempre de `CurrentUser`.
- **Guard en servidor**: la ruta usa `requirePermission("members:manage")`; el servicio recibe `actor: CurrentUser` y calcula el alcance dentro. El bloque de plataforma (Fase 2) se protegerá además con `can(actor, "organizations:manage")` **dentro del servicio** (lanza `AdminError("Sin permiso")` antes de tocar la base, patrón de `settlement.service.ts`) y no se renderiza para admin; los datos nunca viajan al cliente de un admin.

### Qué cuenta como venta y cuándo

| Regla | Definición |
|---|---|
| Venta | `orders.status = 'paid'` (excluye `pending`, `cancelled` —expiradas/liberadas— y `refunded`). Una orden liquidada sigue `paid` (con `settlement_id`) y cuenta. |
| Eventos cancelados | Se excluyen las órdenes de eventos con `events.status = 'cancelled'` (están pendientes de reembolso). Propuesta, ver Pregunta 2. |
| Fecha de la venta | `orders.created_at` (no existe `paid_at`; la reserva dura `HOLD_TTL_MINUTES = 30`, por lo que la diferencia con el pago es ≤ 30 min). Ver Pregunta 1. `updated_at` **no** sirve: lo toca la liquidación (`claimOrdersSql`) y la liberación. |
| Zona horaria | `America/Lima` (UTC−5, sin horario de verano). Agrupación diaria en SQL con `(orders.created_at at time zone 'America/Lima')::date`, como `event-list.service.ts` (`LIMA_MONTH`); límites de periodo = medianoche Lima (`${YYYY-MM-DD}T00:00:00-05:00`) a partir de `toLimaDate` (`src/lib/business-days.ts`). |
| Moneda | Solo `PEN`; todos los montos son **céntimos enteros** en el servicio y en los contratos; se convierten a soles solo al mostrar (`formatPrice(cents / 100)` de `src/lib/format.ts`). |
| Periodo | `period` = N ∈ {7, 30, 90}: los últimos N días calendario Lima **incluyendo hoy** (parcial); el periodo anterior son los N días calendario inmediatamente previos. Ver Pregunta 7. |

### Métrica → fuente

| Métrica | Fuente real | Notas |
|---|---|---|
| Ingresos brutos | `Σ orders.total_amount` (ya neto de `discount_amount`) | `events.organization_id ∈ alcance`, venta según tabla anterior |
| Entradas vendidas | `Σ order_items.quantity` de esas órdenes | un `order_item` por tipo de entrada |
| Ticket promedio | `round(ingresos / entradas)` | `null` si entradas = 0 |
| Serie diaria | las dos métricas anteriores agrupadas por día Lima | días sin ventas se rellenan con 0 en TS |
| Entradas por zona | `order_items.quantity` → `ticket_types.venue_zone_id` → `venue_zones.name` | se agrupa por **nombre** de zona (nombres repetidos entre recintos se fusionan); top 4 + "Otras" (cinco colores de `--chart-1..5`) |
| Ingresos por categoría | `Σ orders.total_amount` por `events.category_id` → `categories.slug/label` | cada orden pertenece a un solo evento, por lo que la suma es exacta |
| Eventos con más ventas | por `orders.event_id`: entradas e ingresos del periodo; `events.title`, `venues.city`, `categories.label` | top 10 por entradas del periodo |
| Ocupación por evento | `Σ ticket_types.quantity_sold` / capacidad; capacidad = por `ticket_type`: `quantity_total` si la zona es `general`, `count(event_seats)` si es `numbered` (patrón de `SOLD_BY_EVENT` en `event-list.service.ts`) | `quantity_sold` se mantiene en ambos tipos (`purchase.query.ts`); si la capacidad es 0 o nula → `null` |
| Ocupación promedio (KPI) | `Σ vendidas / Σ capacidad` ponderada, sobre los eventos con ≥ 1 venta en el periodo (sin límite top 10) | **sin delta**: es una foto actual, no hay histórico para el periodo anterior |
| Ciudades (select) | `distinct venues.city` de los eventos del alcance con ventas en el periodo | |

El cross-filter por categoría (`category` = `categories.slug`) filtra KPIs, serie, dona, tabla y (Fase 2) bloque de plataforma; las barras de categoría muestran **todas** las categorías (la seleccionada resaltada, el resto atenuado). El filtro de ciudad solo afecta la tabla de eventos.

## Criterios de aceptación

- **AC-1 (acceso)**: `/admin/dashboard` sin sesión redirige a `/sign-in`; con sesión sin `members:manage` redirige a `/`; con `members:manage` (admin) o super admin renderiza el panel. El permiso se exige en `page.tsx` con `requirePermission` además del layout.
- **AC-2 (alcance en servidor)**: `getDashboardOverview(actor, filters)` agrega solo sobre las organizaciones del actor: super admin → todas; admin → únicamente aquellas donde `can(actor, "members:manage", orgId)`; sin organizaciones → respuesta vacía válida (ceros, listas vacías) sin lanzar. Los `searchParams` no pueden ampliar el alcance (no existe parámetro de organización) y la respuesta no contiene datos personales (sin correos ni ids de compradores).
- **AC-3 (qué es una venta)**: solo cuentan órdenes `paid` de eventos no `cancelled`; las `pending`, `cancelled` y `refunded` no suman a ningún KPI ni gráfico. Una orden reembolsada tras la compra deja de contar.
- **AC-4 (periodos y zona horaria)**: `resolvePeriods(period, now)` devuelve el periodo actual (N días Lima incluyendo hoy) y el anterior (N días previos, sin solapamiento ni huecos); un pedido realizado a las 23:30 hora Lima cae en ese día aunque en UTC sea el siguiente. La serie diaria tiene exactamente N puntos (días sin ventas = 0) y cada punto trae su valor homólogo del periodo anterior (día i ↔ día i).
- **AC-5 (KPIs y deltas)**: ingresos, entradas y ticket promedio muestran valor y delta % contra el periodo anterior, con 1 decimal y signo. `computeDelta(current, previous)` devuelve `null` si `previous` es 0 (incluye 0 → 0) y la UI muestra "—" con texto "sin datos del periodo anterior" en vez de `Infinity`/`NaN`; ticket promedio es `null` (muestra "—") si no hay entradas; si el actual es 0 y el anterior > 0 el delta es −100 %.
- **AC-6 (ocupación)**: el 4º KPI "Ocupación promedio" muestra el porcentaje ponderado (0–100 %, sin delta); sin eventos con capacidad válida muestra "—".
- **AC-7 (tendencia)**: gráfico de área con la serie del periodo y la línea punteada del anterior; un toggle (`toggle-group`) alterna ingresos/entradas sin recargar ni cambiar la URL; el eje Y y el tooltip formatean soles (`formatPrice`) o enteros según la métrica; el eje X muestra fechas Lima legibles sin solaparse.
- **AC-8 (zonas)**: la dona muestra entradas por zona (máx. 5 porciones: 4 + "Otras"); la leyenda y el tooltip muestran nombre, cantidad y porcentaje.
- **AC-9 (categorías y cross-filter)**: las barras horizontales muestran ingresos por categoría; clic en una barra pone `category=<slug>` en la URL y todo el panel (KPIs, serie, dona, tabla) se recalcula para esa categoría; clic de nuevo en la misma barra (o en el chip "✕ Quitar filtro") quita el parámetro. Hay una vía por teclado: la tabla de datos de la tarjeta (AC-13) incluye un botón por categoría con `aria-pressed`. Una categoría inexistente en la URL produce el estado vacío con opción de quitar el filtro (no un error).
- **AC-10 (tabla de eventos)**: muestra hasta 10 eventos con título, categoría · ciudad, entradas del periodo, ocupación (barra + %) e ingresos; cada cabecera ordenable es un botón con `aria-sort` y alterna ascendente/descendente en el cliente; el select de ciudad filtra vía URL (`city`) y el top 10 se calcula **dentro** de la ciudad elegida; sin filas muestra "Sin eventos para este filtro".
- **AC-11 (filtros en URL)**: `dashboardFiltersSchema` parsea `period` (solo 7, 30 o 90; por defecto 30), `category` (slug `^[a-z0-9]+(-[a-z0-9]+)*$`, máx. 60) y `city` (texto recortado, máx. 80); cualquier valor inválido, repetido o malformado cae al valor por defecto **sin lanzar** (nunca 500 por una URL manipulada). `toDashboardSearchParams` omite valores por defecto. Atrás/adelante del navegador restauran el estado; durante la navegación el panel marca `aria-busy` y atenúa el contenido.
- **AC-12 (estados)**: carga → esqueleto (Suspense) con la misma estructura de la grilla; vacío (sin ventas en el periodo para el filtro) → mensaje explicativo + CTA para ampliar el periodo o quitar el filtro, KPIs en 0/"—" y sin gráficos vacíos; error de agregación → `error.tsx` con mensaje en `role="alert"` y botón "Reintentar" (sin filtrar mensajes internos ni SQL).
- **AC-13 (accesibilidad)**: cada gráfico tiene `role="img"` con `aria-label` que resume el dato clave y activa `accessibilityLayer` de Recharts cuando aplique; cada tarjeta de gráfico ofrece una alternativa textual (`<details>` "Ver datos en tabla" con `<table>` de los mismos datos); la información no depende solo del color (leyenda con texto, deltas con ▲/▼ y texto); los colores `--chart-1..5` cumplen contraste ≥ 3:1 frente a `--card` en claro y oscuro; todos los controles (periodo, métrica, orden, ciudad, quitar filtro) son operables por teclado con foco visible (`focus-visible:ring-3 ring-ring` como el resto del proyecto); los deltas y totales usan `tabular-nums`.
- **AC-14 (responsive y tema)**: grilla de 12 columnas que colapsa a una columna bajo `md`; KPIs en `grid-cols-2`/`auto-fit`; la tabla hace scroll horizontal dentro de su tarjeta sin romper la página; los gráficos usan `ChartContainer` (responsive) con altura mínima fija; los colores salen exclusivamente de tokens (`--chart-*`, `--card`, `--border`, `--muted-foreground`), sin hex en componentes, y se ven correctos con la clase `.dark`.
- **AC-15 (navegación)**: el menú de administración muestra "Panel" (`/admin/dashboard`, ícono `dashboard`) como primer ítem de la sección "Administración" para quien tenga `members:manage`; queda activo en `/admin/dashboard`.
- **AC-16 (calidad)**: `npm run lint`, `npm run test` y `npm run build` pasan; hay tests Vitest para el schema de filtros, utilidades de formato, mapeo de periodos/deltas/series/zonas/ocupación, orden de la tabla, guard/alcance del servicio y navegación.

## Contratos

```ts
// src/modules/dashboard/types/dashboard.types.ts
export const DASHBOARD_PERIODS = [7, 30, 90] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export interface DashboardFilters {
  period: DashboardPeriod;        // default 30
  category?: string;              // categories.slug
  city?: string;                  // venues.city (solo afecta la tabla)
}

export interface PeriodRange {    // fechas de calendario Lima, "YYYY-MM-DD", extremos inclusivos
  from: string;
  to: string;
}

export interface DashboardPeriods {
  days: DashboardPeriod;
  current: PeriodRange;
  previous: PeriodRange;
}

export interface MetricWithDelta {
  value: number | null;           // céntimos (ingresos, ticket promedio) o cantidad (entradas); null = sin dato
  previous: number | null;
  deltaPct: number | null;        // null si previous es 0/null (sin base de comparación)
}

export interface DailyPoint {
  date: string;                   // YYYY-MM-DD (Lima)
  revenueCents: number;
  tickets: number;
  prevRevenueCents: number;       // mismo índice del periodo anterior
  prevTickets: number;
}

export interface ZoneSlice { name: string; tickets: number }              // "Otras" agrupa el resto
export interface CategoryRevenue { slug: string; label: string; revenueCents: number }

export interface TopEventRow {
  eventId: string;
  title: string;
  categoryLabel: string;
  city: string;
  tickets: number;                // vendidas en el periodo
  revenueCents: number;           // en el periodo
  occupancy: number | null;       // 0..1; vendidas totales / capacidad
}

export interface DashboardOverview {
  periods: DashboardPeriods;
  isEmpty: boolean;               // sin ventas en el periodo para el filtro aplicado
  kpis: {
    revenue: MetricWithDelta;
    tickets: MetricWithDelta;
    averageTicket: MetricWithDelta;
    occupancy: number | null;     // 0..1, sin delta
  };
  daily: DailyPoint[];            // length === periods.days
  zones: ZoneSlice[];
  categories: CategoryRevenue[];  // todas, ordenadas por ingresos desc (ignora el filtro de categoría)
  topEvents: TopEventRow[];       // máx. 10
  cityOptions: string[];
  selectedCategoryLabel: string | null;
}
```

```ts
// src/modules/dashboard/schemas/dashboard-filters.schema.ts
export const dashboardFiltersSchema: z.ZodType<DashboardFilters>;  // tolerante: valores inválidos -> defaults
export function toDashboardSearchParams(filters: DashboardFilters): URLSearchParams;  // omite defaults
export function toggleCategory(filters: DashboardFilters, slug: string): DashboardFilters; // alterna category
export const DEFAULT_PERIOD: DashboardPeriod; // 30

// src/modules/dashboard/services/dashboard.mapping.ts (puro)
export function resolvePeriods(period: DashboardPeriod, now: Date): DashboardPeriods;
export function addDaysIso(isoDate: string, days: number): string;
export function limaDayStart(isoDate: string): Date;             // `${iso}T00:00:00-05:00`
export function computeDelta(current: number | null, previous: number | null): number | null;
export function fillDailySeries(rows: { date: string; revenueCents: number; tickets: number }[], periods: DashboardPeriods): DailyPoint[];
export function buildZoneSlices(rows: ZoneSlice[], maxSlices?: number): ZoneSlice[]; // top (max-1) + "Otras"
export function computeOccupancy(rows: { sold: number; capacity: number }[]): number | null;
export function averageTicketCents(revenueCents: number, tickets: number): number | null;

// src/modules/dashboard/services/dashboard.service.ts (solo servidor)
export function getDashboardOverview(actor: CurrentUser, filters: DashboardFilters, now?: Date): Promise<DashboardOverview>;

// src/modules/dashboard/services/top-events.mapping.ts (puro, usado por el cliente)
export type TopEventSortKey = "tickets" | "occupancy" | "revenueCents";
export function sortTopEvents(rows: TopEventRow[], key: TopEventSortKey, dir: "asc" | "desc"): TopEventRow[]; // null al final; desempate por título
```

```ts
// src/lib/format.ts (extender)
export function formatCompactPrice(cents: number): string;  // "S/ 12 mil" (ejes de gráficos)
export function formatPercent(ratio: number, fractionDigits?: number): string; // 0.734 -> "73 %"
export function formatDeltaPct(deltaPct: number | null): string; // "+12,3 %" | "-4,0 %" | "—"
```

Props públicas de los componentes (presentacionales, reciben datos y callbacks; no importan servicios ni stores):

- `KpiCard({ label, value, deltaPct, hint? })` — `deltaPct` null → "—" + texto accesible.
- `SalesTrendChart({ data: DailyPoint[]; periodDays })` — mantiene el toggle ingresos/entradas en estado local.
- `ZoneDonutChart({ data: ZoneSlice[] })`.
- `CategoryBarsChart({ data: CategoryRevenue[]; selectedSlug: string | null; onSelect(slug: string): void })`.
- `ChartDataTable({ caption, columns, rows })` — `<details>` con tabla compartida por los tres gráficos (las filas de categoría admiten un botón de acción).
- `TopEventsTable({ rows: TopEventRow[]; cityOptions: string[]; city: string | undefined; onCityChange(city: string | undefined): void })`.
- `PeriodSelector({ filters: DashboardFilters })` (cliente; usa `useDashboardFilters`).

`useDashboardFilters(current: DashboardFilters)` → `{ filters, isPending, setPeriod(p), setCity(c), toggleCategory(slug), clearCategory() }`; sigue el patrón de `use-event-filters-navigation.ts` (`router.push(..., { scroll: false })` dentro de `startTransition` + `useOptimistic`).

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Gráficos (área, dona, barras, tooltip, leyenda) | Nada en `src/`; `recharts` no está instalado; `npx shadcn@latest search @shadcn -q "chart"` → `@shadcn/chart` (ui), `@shadcn/chart-example`, `@shadcn/dashboard-01` (block) | **agregar de shadcn**: `npx shadcn@latest add chart` (instala Recharts y `src/components/ui/chart.tsx`) en Grupo 0, serial. No se agrega el block `dashboard-01` (trae sidebar propio; ya existe `DashboardShell`) |
| Selector de periodo y toggle de métrica | `@shadcn/toggle-group` (ui); `tabs.tsx` ya existe pero modela paneles, no un valor de filtro | **agregar de shadcn**: `npx shadcn@latest add toggle-group` (arrastra `toggle`) |
| Esqueleto de carga | `@shadcn/skeleton` | **agregar de shadcn**: `npx shadcn@latest add skeleton` |
| Tarjetas, tabla, select, badge, botón | `src/components/ui/card.tsx`, `table.tsx`, `select.tsx`, `badge.tsx`, `button.tsx` | **reusar** (patrón de `customers-table.tsx`/`organizations-table.tsx`) |
| Guard de permiso y alcance por organización | `requirePermission`, `getCurrentUser`, `can` (`current-user.service.ts`, `permissions.ts`); alcance en `organization-catalog.service.ts` (`listOrganizationCatalog`) | **reusar** `requirePermission`/`can`; el cálculo de alcance se replica en una función local (3 líneas: `memberships.filter(can members:manage)`); si una tercera pantalla lo necesita, extraer a `src/modules/auth/services/` (YAGNI ahora) |
| `AdminError` para "Sin permiso" | `src/modules/admin/services/admin.service.ts` (ya importado por `settlement.service.ts`) | **reusar** (Fase 2) |
| Filtros en URL con zod tolerante | `organizationListQuerySchema` (`first()` + `transform` con fallback) y `use-event-filters-navigation.ts`, `search-filter.tsx` | **reusar el patrón**; schema y hook nuevos del dominio dashboard (el filtro es específico) |
| Formato de moneda PEN/fechas Lima | `formatPrice` (recibe soles), `formatDate`, `TIME_ZONE = "America/Lima"` en `src/lib/format.ts` | **extender** `format.ts` con `formatCompactPrice`, `formatPercent`, `formatDeltaPct` (genéricos, con tests) |
| Fecha Lima de un instante | `toLimaDate` en `src/lib/business-days.ts` | **reusar**; `addDaysIso` y `limaDayStart` se crean en `dashboard.mapping.ts` (solo los usa este dominio) |
| Comisión de plataforma | `computeApplicationFee`, `parseFeeConfig` en `src/lib/application-fee.ts` | **reusar en Fase 2** |
| Agregaciones SQL de eventos/capacidad | `SOLD_BY_EVENT`, `LIMA_MONTH` en `event-list.service.ts` (no exportados) | **reusar el patrón** (SQL en el servicio del dashboard); no se exportan ni se refactorizan en esta fase |
| Servicios de agregación para ventas | Nada (`order-read.service.ts` es por usuario) | **crear** `dashboard.service.ts` |
| Hook de navegación por filtros | `use-event-filters-navigation.ts` es específico de eventos | **crear** `use-dashboard-filters.ts` |
| Tema oscuro | `.dark` con `--chart-*` definidos en `src/app/globals.css`; no hay `ThemeProvider` ni selector | **extender** tokens `--chart-1..5` (hoy grises neutros `oklch(... 0 0)`, indistinguibles entre sí); verificar que ningún otro componente los use (`grep` previo: sin usos en `src/`) |

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Dependencias y tokens globales. Ejecutar `npx shadcn@latest add chart toggle-group skeleton` (instala `recharts`) y reemplazar `--chart-1..5` en `:root` y `.dark` por una paleta de marca distinguible (indigo, naranja, teal, fucsia, lima; ≥ 3:1 sobre `--card` en ambos temas; variantes más claras en `.dark`). — archivos: `src/components/ui/chart.tsx`, `src/components/ui/toggle-group.tsx`, `src/components/ui/toggle.tsx`, `src/components/ui/skeleton.tsx` (todos generados por la CLI), `package.json`, `package-lock.json`, `src/app/globals.css` — tests: no — cubre: AC-7, AC-8, AC-9, AC-12, AC-13, AC-14
- **T-2**: Contratos compartidos y formato. Tipos del dashboard, schema zod de filtros con `toDashboardSearchParams`/`toggleCategory`, y helpers de formato. — archivos: `src/modules/dashboard/types/dashboard.types.ts`, `src/modules/dashboard/schemas/dashboard-filters.schema.ts`, `src/modules/dashboard/schemas/dashboard-filters.schema.test.ts`, `src/lib/format.ts`, `src/lib/format.test.ts` — tests: sí (schema: defaults, periodo inválido/repetido, slug malformado, ciudad larga, round-trip con `toDashboardSearchParams`, `toggleCategory` activa/desactiva; formato: compacto, porcentaje, delta con signo y `null`) — cubre: AC-5, AC-9, AC-11, AC-16

### Grupo 1 (paralelo)

- **T-3**: Servicio de agregación y utilidades puras. `resolvePeriods` (Lima, sin solapamiento), `computeDelta`, `fillDailySeries`, `buildZoneSlices`, `computeOccupancy`, `averageTicketCents`; `getDashboardOverview` con consultas SQL (Drizzle) en paralelo (`Promise.all`: serie diaria, zonas, categorías, top eventos, ocupación, ciudades) que aplican alcance por rol y reglas de venta. — archivos: `src/modules/dashboard/services/dashboard.mapping.ts`, `src/modules/dashboard/services/dashboard.mapping.test.ts`, `src/modules/dashboard/services/dashboard.service.ts`, `src/modules/dashboard/services/dashboard.service.test.ts` — tests: sí (mapping: periodos en límites de mes/año y a las 23:30 Lima, delta con previo 0 / 0→0 / caída total, relleno de días sin ventas, "Otras", ocupación con capacidad 0, ticket promedio con 0 entradas; service con `db` mockeado: admin sin organizaciones → vacío sin consultar ventas, admin con dos organizaciones → el alcance usa solo esas, super admin → sin filtro de organización) — cubre: AC-2, AC-3, AC-4, AC-5, AC-6, AC-8, AC-9, AC-10, AC-12
- **T-4**: Componentes de gráficos y KPI (cliente, presentacionales). — archivos: `src/modules/dashboard/components/kpi-card.tsx`, `src/modules/dashboard/components/sales-trend-chart.tsx`, `src/modules/dashboard/components/zone-donut-chart.tsx`, `src/modules/dashboard/components/category-bars-chart.tsx`, `src/modules/dashboard/components/chart-data-table.tsx` — tests: no (presentacionales; la lógica vive en `dashboard.mapping.ts` y `format.ts`) — cubre: AC-5, AC-7, AC-8, AC-9, AC-13, AC-14
- **T-5**: Filtros, selector de periodo y tabla de eventos. — archivos: `src/modules/dashboard/hooks/use-dashboard-filters.ts`, `src/modules/dashboard/components/period-selector.tsx`, `src/modules/dashboard/components/top-events-table.tsx`, `src/modules/dashboard/services/top-events.mapping.ts`, `src/modules/dashboard/services/top-events.mapping.test.ts` — tests: sí (`sortTopEvents`: asc/desc por cada clave, `null` al final, desempate estable por título; el hook es un envoltorio de navegación sin lógica propia más allá de `toggleCategory`/`toDashboardSearchParams`, ya probados en T-2) — cubre: AC-9, AC-10, AC-11, AC-13, AC-14

> Los conjuntos de archivos de T-3, T-4 y T-5 son disjuntos y dependen solo de T-1/T-2. T-4 recibe `onSelect`/`selectedSlug` por props para no depender del hook de T-5.

### Grupo 2 (paralelo)

- **T-6**: Composición de la ruta, estados y navegación. `page.tsx` (`requirePermission("members:manage")`, `await searchParams`, `dashboardFiltersSchema`, `<Suspense key>` + componente async que llama a `getDashboardOverview`), `dashboard-content.tsx` (cliente: conecta `useDashboardFilters` con KPIs, gráficos, tabla, chip de categoría y estado vacío), `dashboard-skeleton.tsx`, `error.tsx` y el ítem "Panel" en `getNavSections`. — archivos: `src/app/admin/dashboard/page.tsx`, `src/app/admin/dashboard/error.tsx`, `src/modules/dashboard/components/dashboard-content.tsx`, `src/modules/dashboard/components/dashboard-skeleton.tsx`, `src/modules/auth/services/dashboard-nav.ts`, `src/modules/auth/services/dashboard-nav.test.ts` — tests: sí (nav: "Panel" aparece para admin y super admin, no para quien no tiene `members:manage`, y va primero en "Administración"; la ruta y el contenido son composición) — cubre: AC-1, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15

## Fases siguientes

**Fase 2 — Bloque de plataforma (solo super admin)** (se detalla al cerrar la Fase 1):

- 4º KPI "Comisión de plataforma" para super admin (en lugar de ocupación) y, debajo, sección "Solo super admin": comisión por día (barras), liquidación a organizadores (bruto, pendiente y estado de cuenta Stripe Connect) y reembolsos y pagos fallidos por semana (líneas).
- Servicio `platform-finance.service.ts` con `can(actor, "organizations:manage")` **dentro** del servicio (lanza `AdminError("Sin permiso")` antes de consultar), componente `PlatformSection` que la página renderiza solo si el actor es super admin y envuelto en su propio `<Suspense>`; tests que prueban que un admin recibe error del servicio, que `getDashboardOverview` no incluye campos de plataforma para un admin y que la respuesta serializada no contiene claves de comisión/liquidación.
- Mapeo propuesto (sujeto a Preguntas 3 y 4):
  - Comisión: `orders.application_fee_amount` solo existe tras liquidar (lo asigna `claimOrdersSql`); para órdenes no liquidadas se **estima** con `computeApplicationFee(total_amount, parseFeeConfig(process.env))` y la UI lo etiqueta "estimada". Cálculo por orden en TypeScript (el redondeo es por orden), por lo que la consulta trae filas `(día Lima, total_amount, application_fee_amount)` del alcance y periodos actual + anterior.
  - Bruto por organización: `Σ total_amount` del periodo por `events.organization_id` (top 10). Pendiente: `Σ (total_amount − fee)` de órdenes `paid` con `settlement_id IS NULL` (saldo actual, no limitado al periodo) más `settlements.payout_amount` con `status <> 'paid'`. Estado: `organizations.stripe_connect_status` (`active` → Activa, `pending` → Verificando, `restricted` → Restringida, `not_started` → Sin iniciar).
  - Reembolsos por semana: `orders.status = 'refunded'` agrupadas por `orders.refunded_at` (semana Lunes, Lima), cantidad y monto.
  - "Pagos fallidos": **no existe registro** de intentos fallidos (ver Pregunta 4).
  - Semanas: últimas 12 semanas, independientes del selector de periodo pero respetando `category`.

## Riesgos

- **Rendimiento**: `orders` solo tiene índices por `(event_id, status)`, usuario, cupón y liquidación; filtrar por `created_at` y agrupar por día es un scan parcial. Con el volumen de la demo es aceptable; si crece, abrir spec aparte para un índice `(status, created_at)`.
- **Recharts y React 19**: la versión que instale `shadcn add chart` debe ser compatible con React 19.2 (el preview usaba Recharts 2.12 por UMD). El reviewer verifica que `build` pase, que no haya warnings de hidratación y que el clic en `Bar` (cross-filter) funcione con esa versión.
- **Hidratación de gráficos**: `ResponsiveContainer` mide en cliente; los componentes deben renderizar sin errores con SSR (esqueleto de altura fija; `use-hydrated.ts` está disponible si hace falta).
- **Delta sesgado por "hoy" parcial**: el periodo actual incluye un día incompleto frente a periodos anteriores completos (Pregunta 7).
- **Consistencia entre consultas**: las consultas del `Promise.all` no comparten transacción (driver `neon-http`); una venta que entre en medio puede dar diferencias de ±1 orden entre KPI y gráficos. Aceptado para un panel de lectura.

## Preguntas abiertas / decisiones para el aprobador

Ninguna impide aprobar la Fase 1 si se aceptan las propuestas marcadas; las 3 y 4 solo afectan a la Fase 2.

1. **Fecha de venta**: `orders` no tiene `paid_at`; se propone usar `orders.created_at` (diferencia ≤ 30 min con el pago). Alternativa: agregar columna `paid_at` con migración y rellenarla al marcar la orden `paid` (cambia checkout y webhooks; fuera de esta spec). ¿Se acepta `created_at`?
2. **Eventos cancelados con órdenes aún `paid`** (pendientes de reembolso): se propone **excluirlos** de todas las métricas. Alternativa: contarlos hasta que se reembolsen. ¿Qué prefieres?
3. **(Fase 2) Comisión**: solo se guarda al liquidar. Propuesta: mostrar comisión **estimada** (fórmula + env actuales) para lo no liquidado, etiquetada. Alternativa: mostrar solo la comisión de órdenes ya liquidadas (exacta, pero con retraso y 0 mientras no haya liquidaciones). ¿Cuál?
4. **(Fase 2) "Pagos fallidos"**: la BD no los registra (`orders.cancelled` mezcla reservas vencidas, reemplazadas y pagos fallidos; `stripe_events` guarda solo id y tipo). Propuesta: renombrar la serie a "Órdenes canceladas/no completadas" y usar `orders.status = 'cancelled'` (fecha `updated_at`, estado terminal). Alternativa: nueva tabla/columna de intentos de pago (migración y cambios de webhook, spec aparte). ¿Se acepta el proxy?
5. **Ruta y navegación**: se propone `/admin/dashboard` con ítem "Panel" (primero en "Administración") y dejar `/admin` como listado de organizaciones. ¿O el panel debe ser la landing de `/admin`?
6. **Paleta de gráficos**: los `--chart-1..5` actuales son grises neutros; se propone reemplazarlos por una paleta de marca (indigo, naranja, teal, fucsia, lima) en claro y oscuro. No hay selector de tema en la app: el modo oscuro solo se valida forzando la clase `.dark`. ¿Se aprueba el cambio de tokens y la validación solo por clase?
7. **Periodo incluye hoy** (día parcial) frente a "hasta ayer" (días completos, deltas más justos pero un día de retraso). Se propone incluir hoy.
8. **Ocupación promedio sin delta** (no hay histórico de ocupación por periodo; el preview mostraba un +2,4 % inventado) y calculada sobre eventos con ventas en el periodo, ponderada por capacidad. ¿Se acepta? Zonas de tipo `general` sin `quantity_total` (ilimitadas) quedan fuera de la capacidad.
9. **Alcance del admin**: organizaciones donde tiene `members:manage` (igual que el listado de organizaciones). ¿Correcto o debe ver todas como el super admin?
10. **Agrupaciones**: zonas por **nombre** (fusiona nombres iguales de distintos recintos) con top 4 + "Otras"; tabla top 10 por entradas del periodo; moneda asumida `PEN` (órdenes con otra moneda no se contemplan). ¿Se acepta?
11. **(Fase 2) Semanas**: 12 semanas fijas (lunes a domingo, Lima) independientes del selector de periodo. ¿O deben seguir el periodo elegido?
