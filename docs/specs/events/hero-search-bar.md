# Barra de búsqueda bajo el carrusel del Hero (Qué quieres ver · Fecha · Precio · Buscar)

**Estado**: approved
**Aprobado por**: Nelson (usuario), 2026-10-07
**Fase**: 1 de 1

## Contexto

La referencia `https://ticketera.mentec.dev/` muestra, debajo del carrusel del hero, **una sola píldora blanca** con tres bloques (Qué quieres ver | Fecha | Precio) y un botón "Buscar" con lupa. Hoy el hero tiene un buscador compacto (solo texto + botón) **encima** del carrusel. Esta spec lo sustituye por la barra nueva, con filtros de fecha y precio, manteniendo nuestros textos y rangos de precio.

Esta spec **complementa** `docs/specs/events/home-redesign-hero-footer.md` (aprobada, no se reabre ni se edita) y **reemplaza AC-5 de home-redesign-hero-footer** (buscador compacto sobre el carrusel). Esa spec sigue vigente en todo lo demás (h1, subtítulo, carrusel, footer). La mención del buscador en su AC-11 (test de `hero.test.tsx` sobre AC-5) queda sustituida por los tests de esta spec. Su AC-4 (subtítulo) no cambia; solo cambia lo que viene después del subtítulo: el carrusel pasa a seguir directamente al subtítulo.

## Alcance

- **Incluye**:
  - Componente nuevo `HeroSearchBar` (client): `<Form action="/events" role="search">` con campo `q`, select `month` ("Cualquier fecha"), select `price` ("Cualquier precio") y botón "Buscar" con icono `Search`.
  - `Hero`: eliminar el buscador actual encima del carrusel y renderizar `HeroSearchBar` **debajo** del carrusel (misma columna `max-w-7xl`, ~16px de separación).
  - Opciones de Fecha: helper puro que toma los meses de `facets.months` (ya existentes) y los reduce a los próximos meses; con fallback a los próximos 6 meses generados.
  - `src/app/page.tsx`: obtener `getPublicEventFacets()` en el `Promise.all` existente y pasar `monthOptions` al `Hero`.
- **No incluye**:
  - Cambios en `EventFilterBar` (se conserva intacto en "Todos los eventos", con categoría), `EventFiltersForm`, `EventSearchView`, `parseEventFilters`, `PRICE_RANGES`, `getPublicEventFacets`.
  - Filtro de categoría o ciudad en la barra; ordenamiento.
  - Nuevas rutas, nuevos componentes shadcn (se reusan `Input`, `Select`, `Button`), dark mode.
  - Copiar los rangos de precio de la referencia: se usan los `PRICE_RANGES` actuales.
  - Cambios en h1, subtítulo, carrusel, riel, footer.

## Criterios de aceptación

- **AC-1**: El `Hero` ya no renderiza ningún buscador entre el subtítulo y el carrusel. El orden en el DOM es: `h1`, subtítulo, carrusel (si hay eventos), `HeroSearchBar`. Hay un único `role="search"` dentro del `Hero`.
- **AC-2**: `HeroSearchBar` está dentro del mismo contenedor `max-w-7xl` del hero (alineado con el carrusel) y se separa del carrusel con `mt-4` (16px). Si `featuredEvents` está vacío, la barra se muestra igual tras el subtítulo y la sección conserva el espaciado inferior de home-redesign (AC-10).
- **AC-3**: La barra es **una sola píldora** (`<Form>` con `rounded-2xl` en móvil y `md:rounded-full`, `border`, `bg-background`, `shadow-sm`) con tres bloques separados por divisores verticales sutiles en desktop (`md:divide-x` o borde `border-border`) y el botón "Buscar" a la derecha. En móvil los bloques se apilan en columna, con divisores horizontales, y el botón ocupa todo el ancho.
- **AC-4**: Cada bloque tiene una etiqueta visible pequeña en negrita (`text-xs font-semibold`): "Qué quieres ver", "Fecha", "Precio". El campo de texto es `<Input type="search" name="q">` con `placeholder="Artista o evento"`, sin borde propio (el borde es el de la píldora) y asociado a su etiqueta con `<label htmlFor>`.
- **AC-5**: El select de Fecha usa `name="month"`, valor por defecto `"all"` con texto visible "Cualquier fecha" y como opciones adicionales los meses de `monthOptions` (value `"YYYY-MM"`, label en español p. ej. "Noviembre 2026"). El select de Precio usa `name="price"`, valor por defecto `"all"` con texto "Cualquier precio" y una opción por cada clave de `PRICE_RANGES` (value = clave, label = `PRICE_RANGES[key].label`). Ambos muestran chevron (ya incluido en `SelectTrigger`) y están asociados a su etiqueta visible (`<label htmlFor>` con `id` en el trigger).
- **AC-6**: Al enviar el formulario con valores por defecto, `parseEventFilters` sobre los parámetros resultantes devuelve `month: null`, `price: null` y `q: ""` sin lanzar error (el valor `"all"` y el vacío se descartan por los schemas existentes). Al elegir un mes y un rango, los parámetros llevan `month=YYYY-MM` y `price=<clave>` que `parseEventFilters` acepta tal cual. Esto se verifica en test con `FormData` del `<form>` pasado por `parseEventFilters`.
- **AC-7**: Los datos se envían por GET a `/events` mediante `next/form` (`action="/events"`), sin nuevas rutas. El `<Form>` tiene `role="search"` y `aria-label="Buscar eventos"`; el botón de envío es `type="submit"` con texto "Buscar" visible e icono `Search` con `aria-hidden="true"`, fondo `primary`, texto blanco y esquinas `rounded-full`.
- **AC-8**: Accesibilidad: cada control tiene nombre accesible que incluye el texto de su etiqueta visible (label-in-name, por `htmlFor`/`aria-labelledby`); foco visible en input, selects y botón (`focus-visible:ring-*`); navegable por teclado en orden Qué quieres ver → Fecha → Precio → Buscar. Los objetivos táctiles miden ≥ 44px en móvil (`min-h-11`/`h-11`).
- **AC-9**: Las opciones de Fecha las calcula un helper puro `buildMonthOptions(months, now)` que: (a) conserva solo los meses de `months` cuyo `value` ≥ mes actual en hora de Lima, ordenados ascendentemente y limitados a 6; (b) si el resultado es vacío (o `months` es `undefined`), genera los próximos 6 meses desde `now` (mes actual incluido) con `value` `"YYYY-MM"` y etiqueta de `monthLabel` ("Octubre 2026").
- **AC-10**: Sin desajuste de hidratación: `monthOptions` se calcula **en el servidor** (en `Hero`, server component, a partir de `new Date()` y `facets.months`) y se pasa como prop serializable a `HeroSearchBar`; `HeroSearchBar` **no** llama a `new Date()` ni a `Intl` durante el render. El `Hero` acepta `monthOptions` opcional; si no se pasa, usa el fallback generado (AC-9b).
- **AC-11**: `src/app/page.tsx` pide `getPublicEventFacets()` en el `Promise.all` existente y pasa `facets.months` a `Hero` (prop `facetMonths`); `Hero` conserva compatibilidad: sin esa prop sigue compilando y renderizando con el fallback. `EventFilterBar` en "Todos los eventos" no cambia.
- **AC-12**: `hero.test.tsx` se actualiza (reemplaza el test "conserva el buscador accesible" de AC-5 anterior) y cubre AC-1 y AC-2; se añaden `hero-search-bar.test.tsx` (AC-3 a AC-8) y `event-month-options.test.ts` (AC-9). Los demás tests de `hero.test.tsx` y `hero-slide.test.tsx` siguen pasando.
- **AC-13** (transversal): `npm run lint`, `npm run test` y `npm run build` pasan al cierre.

## Contratos

```ts
// src/modules/events/components/hero-search-bar.tsx  ("use client")
import type { FacetOption } from "@/modules/events/services/events.service"

interface HeroSearchBarProps {
  /** Meses ya calculados en el servidor ("2026-11" / "Noviembre 2026"). */
  monthOptions: Pick<FacetOption, "value" | "label">[]
  className?: string
}
```

```ts
// src/modules/events/services/event-month-options.ts  (puro, sin DB)
import type { FacetOption } from "@/modules/events/services/events.service"

export const MONTH_OPTIONS_LIMIT = 6

/** Próximos meses a ofrecer en el selector de Fecha. */
export function buildMonthOptions(
  months: Pick<FacetOption, "value" | "label">[] | undefined,
  now: Date
): { value: string; label: string }[]
```

```ts
// HeroProps (retrocompatible): se añade una prop opcional
interface HeroProps {
  // ...props existentes sin cambios
  /** facets.months de getPublicEventFacets(); Hero los pasa por buildMonthOptions. */
  facetMonths?: Pick<FacetOption, "value" | "label">[]
}
```

Valores enviados: `q` (texto libre), `month` (`"all"` | `"YYYY-MM"`), `price` (`"all"` | clave de `PRICE_RANGES`). `parseEventFilters` ya descarta `"all"`, vacío y cualquier valor fuera del regex `^\d{4}-(0[1-9]|1[0-2])$` o del enum de `PRICE_RANGES`.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Formulario GET a `/events` | `next/form` en `hero.tsx` y `event-filter-bar.tsx` | **reusar** el mismo patrón |
| Campo de texto, selects, botón | `@/components/ui/input`, `select`, `button` (patrón de `event-filter-bar.tsx`: `Select name defaultValue="all" items={...}`) | **reusar**; nada nuevo de shadcn |
| Rangos de precio | `PRICE_RANGES` / `PriceRangeKey` en `event-filters.schema.ts`; `event-filters-form.tsx` construye `PRICE_OPTIONS` privado | **reusar** `PRICE_RANGES`; se arma el mapa de items dentro de `hero-search-bar.tsx` (3 líneas; no se exporta `PRICE_OPTIONS` para no tocar `event-filters-form.tsx`) |
| Meses del selector | `facets.months` de `getPublicEventFacets()` (`event-list.service.ts`, usa `monthLabel` y formato `YYYY-MM` hora de Lima), consumido por `/events/page.tsx` | **reusar** como fuente; **crear** solo `buildMonthOptions` (filtra futuros, limita a 6 y da fallback) |
| Etiqueta de mes en español | `monthLabel` en `event-list.mapping.ts` | **reusar** en el fallback |
| Buscador de `EventFilterBar` | incluye categoría y está en "Todos los eventos" | **no duplicar ni tocar**; la barra del hero es un componente distinto por layout y campos (sin categoría) |
| Barra existente en `hero.tsx` | Form + Input + Button | **reemplazar** por `HeroSearchBar` |
| Tests | `hero.test.tsx` (mock de `next/form` y `HeroCarousel`) | **extender** y reusar el mismo mock de `next/form` |

## Plan de tareas

Sin instalaciones ni cambios en archivos globales (no hay Grupo 0). El contrato de props queda fijado arriba para poder paralelizar T-1 y T-2; T-3 integra y va después.

### Grupo 1 (paralelo)

- **T-1**: Helper `buildMonthOptions` (filtrar meses ≥ mes actual en Lima, ordenar, limitar a 6; fallback de 6 meses generados con `monthLabel`). — archivos: `src/modules/events/services/event-month-options.ts`, `src/modules/events/services/event-month-options.test.ts` — tests: sí (filtra pasados, límite 6, orden, fallback con `undefined`/vacío, cambio de año, mes actual en zona Lima cerca de medianoche UTC) — cubre: AC-9
- **T-2**: Componente `HeroSearchBar` (píldora, 3 bloques con etiquetas, divisores, selects con `name`/`defaultValue="all"` e `items`, botón con lupa, responsive, a11y) + test. — archivos: `src/modules/events/components/hero-search-bar.tsx`, `src/modules/events/components/hero-search-bar.test.tsx` — tests: sí (etiquetas visibles asociadas, placeholder, opciones de precio = `PRICE_RANGES`, "Cualquier fecha/precio" por defecto, `FormData` + `parseEventFilters` con valores por defecto y con selección, `role="search"`, botón submit) — cubre: AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-10

### Grupo 2 (serial tras el Grupo 1)

- **T-3**: Integrar en `Hero` y `page.tsx`: quitar el buscador superior, añadir prop `facetMonths`, calcular `buildMonthOptions(facetMonths, new Date())` en el servidor, renderizar `HeroSearchBar` bajo el carrusel (`mt-4`), traer `getPublicEventFacets()` en `page.tsx`; actualizar `hero.test.tsx` (mockeando `hero-search-bar`). — archivos: `src/modules/events/components/hero.tsx`, `src/modules/events/components/hero.test.tsx`, `src/app/page.tsx` — tests: sí (un solo `role="search"`, orden en el DOM, barra presente sin eventos, `monthOptions` calculados con fallback cuando no hay `facetMonths`) — cubre: AC-1, AC-2, AC-10, AC-11, AC-12, AC-13

## Riesgos

- **Hidratación**: `Hero` es server component; `HeroSearchBar` es client y se renderiza también en SSR. Por eso las opciones dependientes de la fecha se calculan en el servidor y viajan como props (AC-10). La home es `force-dynamic`, así que `new Date()` en el servidor no queda congelado por prerender.
- **Valores vacíos en el parser**: verificado en código: `monthSchema` (regex) y `priceSchema` (enum) rechazan `"all"` y `""`, y `parseEventFilters` los convierte a `null`; `q` vacío da `""`. Efecto secundario cosmético: la URL llega como `/events?q=&month=all&price=all` (igual que hoy con `category=all` en `EventFilterBar`).
- **Select base-ui dentro de `next/form`**: `EventFilterBar` ya usa `Select name defaultValue="all" items` y se envía por el input oculto de base-ui; se sigue ese patrón. En jsdom el input oculto puede no comportarse igual que en navegador: si `FormData` no lo refleja, el test debe verificar el `name` del input oculto y validar el envío real manualmente.
- **`facets.months` incluye todos los meses con eventos publicados** (también pasados): por eso `buildMonthOptions` filtra desde el mes actual en Lima.
- **Costo en la home**: `getPublicEventFacets()` añade 3 consultas agrupadas a la home (en paralelo con las existentes). Alternativa sin consulta: usar solo el fallback generado (ver Preguntas abiertas).
- **Etiqueta y nombre accesible**: no poner un `aria-label` distinto del texto visible en los controles; la etiqueta visible es la fuente del nombre (label-in-name).
- **Contraste**: placeholder y chevron en `text-muted-foreground` sobre blanco cumplen AA (ya usado en el proyecto).
- **Móvil**: la píldora `rounded-full` con varias filas se vería deformada; por eso `rounded-2xl` en móvil y `md:rounded-full`.

## Fases siguientes

Ninguna.

## Decisiones resueltas

1. **Meses**: se mantiene `facets.months` como fuente (según AC-11), con `facetMonths` desde `page.tsx`.
2. **URL con `month=all&price=all`**: aceptado; el parser lo ignora (AC-6).
3. **Placeholder**: `q` solo filtra por título (`ilike(events.title, ...)` en `event-list.service.ts`), no por ciudad. Se usa "Artista o evento" para no prometer búsqueda por ciudad. Ampliar `q` a ciudad sería otra spec.
