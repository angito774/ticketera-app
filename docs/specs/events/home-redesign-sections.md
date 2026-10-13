# Rediseño del home: secciones bajo el hero (Fase 3)

**Estado**: approved
**Aprobado por**: Nelson (usuario), 2026-10-07
**Fase**: 1 de 2 (se detalla solo la Fase 1; la Fase 2 está listada en "Fases siguientes")

## Contexto

Continuación de `docs/specs/events/home-redesign-hero-footer.md` y `docs/specs/events/hero-search-bar.md` (aprobadas e implementadas; no se reabren). El usuario pide replicar **estilo, ubicaciones y formas** de `https://ticketera.mentec.dev/` en las secciones bajo el hero, **manteniendo nuestro contenido** (marca Ticketera, solo las categorías `concert` y `theater`, nuestros eventos y textos, sin rutas nuevas). Orden objetivo de la referencia: Header, Hero + búsqueda (hecho), Explora por categoría, Destacados, Próximos eventos, Cómo funciona, Para organizadores, Compra con confianza, Suscripción, Footer (hecho).

Los valores de la referencia (contenedor `max-w-7xl`, secciones `py-12 md:py-16 px-4 md:px-6 lg:px-8`) vienen del pedido; no se pudo inspeccionar el sitio desde este agente, así que cualquier valor fino adicional (radios, sombras, tamaños de tile) se ajusta en revisión visual sin cambiar contratos.

## Alcance

- **Incluye (Fase 1)**:
  - Header: fondo blanco ~90 % con `backdrop-blur`, conservando sticky, altura total 65 px y borde inferior fino.
  - Sección "Explora por categoría" (tiles con icono) que sustituye a la fila de `CategoryPill` bajo el hero.
  - Sección "Destacados": carrusel horizontal con flechas Anterior/Siguiente y enlace "Ver todos" junto al título; se acepta que repita los eventos del hero (decisión 1).
  - Sección "Próximos eventos": pestañas (Todos + nuestras 2 categorías), grilla de tarjetas y botón "Ver todos los eventos".
  - Componente compartido de sección (`PageSection`) con el contenedor y el espaciado de la referencia.
  - Reordenar `src/app/page.tsx` y retirar el código que queda sin uso.
- **No incluye (Fase 1)**: "Cómo funciona", banner de organizadores, "Compra con confianza" y restyling del newsletter (Fase 2); cambios en hero, buscador, footer, `listHeroEvents`, `listPublicEvents`, API `/api/events`, modelo de datos; más categorías que `concert` y `theater`; dark mode; rutas nuevas.

## Estado actual verificado

- `Header` (`src/components/header.tsx`): ya es `sticky top-0 z-50 border-b`; la fila interna es `h-16` (64 px) + 1 px de borde = **65 px totales**. Difiere solo en el fondo: `bg-background` sólido, sin blur. Tiene además enlaces Conciertos / Teatro y "Vender entradas" (se conservan; la referencia solo muestra "Eventos" y cuenta, pero el contenido es nuestro).
- Duplicación hero / Destacados: `listHeroEvents()` devuelve eventos `published`, `featured = true` y `startsAt >= now`, máx. 5 (`HERO_MAX_EVENTS`). `FeaturedEvents` consulta `listPublicEvents({featured:true})` (published + featured, sin filtro de fecha, hasta 50). Por tanto **todo evento del hero aparece también en Destacados**, y si hay ≤ 5 destacados futuros el carrusel Destacados es idéntico al hero. `Event.id` es el `slug` en ambos.
- `PromoBanner` (`promo-banner.tsx`) **es el newsletter** (suscripción real); no existe hoy un banner de organizadores. Destinos existentes para organizadores: `/organizer` (usado por "Vender entradas" del Header) y `/organizer/events/new`; protegidos por `src/proxy.ts`. No existe página de "Conoce más".
- `EventCarousel` solo lo usa `FeaturedEvents`; sus flechas (`CarouselPrevious/Next` de `ui/carousel`) están posicionadas fuera (`-left-12`/`-right-12`) y miden 28 px.
- `EventFilterBar`, `CategoryEvents` y `AllEvents` solo se usan en `src/app/page.tsx`. **`EventSection` NO**: también lo usa `src/app/events/[id]/page.tsx` (corregido en T-6); se conserva. Las consultas de las tres listas (`FEATURED`, `CONCERT`, `THEATER`, `ALL`) ya se precargan en el servidor y se hidratan.

## Criterios de aceptación

### Header
- **AC-1**: `Header` conserva `sticky top-0 z-50`, `border-b` y altura total de 65 px (fila `h-16` + borde), y cambia el fondo a blanco ~90 % con blur (`bg-background/90 backdrop-blur`, con fallback sólido legible si no hay soporte de `backdrop-filter`). Navegación, `HeaderAccount` y textos no cambian.

### PageSection (compartido)
- **AC-2**: Existe un componente `PageSection` que renderiza `<section aria-labelledby>` con contenedor `mx-auto w-full max-w-7xl py-12 md:py-16 px-4 md:px-6 lg:px-8`, un `h2` (`text-2xl font-bold md:text-3xl`) con `id`, un slot opcional `action` alineado a la derecha del título y `children`. Lo usan las 3 secciones de esta fase; no se duplican clases de contenedor en cada una.

### Explora por categoría
- **AC-3**: Bajo el hero se muestra una `PageSection` con h2 "Explora por categoría" y una fila de tiles (un `<ul>`/lista de enlaces) para **Conciertos** (`/events?category=concert`) y **Teatro y espectáculos** (`/events?category=theater`), cada uno con icono decorativo (`aria-hidden`) de `lucide-react` y el nombre tomado de `EVENT_CATEGORY_LABELS[...].plural`. La fila de `CategoryPill` suelta de `page.tsx` desaparece.
- **AC-4**: Cada tile es un solo `<a>` (next/link), con objetivo táctil ≥ 44 px de alto, foco visible (`focus-visible:ring-*`) y sin scroll horizontal a 375 px (wrap en móvil).

### Destacados
- **AC-5**: `FeaturedEvents` sigue mostrando los eventos de `listPublicEvents({featured:true})` **sin excluir** los del hero (se acepta la duplicación, decisión 1). No se agrega `excludeIds`. Con lista vacía la sección no se renderiza (sin título huérfano).
- **AC-6**: La sección usa `PageSection` con h2 "Destacados" y, en `action`, el enlace "Ver todos" a `/events` y las flechas Anterior / Siguiente (botones de `ui/carousel`) en la misma fila del título, **dentro** del contexto del carrusel. Las flechas miden ≥ 44 px (`size-11`), tienen `aria-label` ("Evento anterior" / "Siguiente evento"), `disabled` en los extremos y foco visible. Ya no se posicionan fuera del contenedor (`-left-12`).
- **AC-7**: Accesibilidad del carrusel: región con `aria-roledescription="carousel"` y `aria-label="Destacados"`, cada item con `aria-label="{n} de {total}"`, navegación con flechas del teclado (ya provista por `Carousel`). No hay autoplay, por lo que no se requiere pausa; el desplazamiento animado respeta `prefers-reduced-motion` (opción `duration`/`watchDrag` o equivalente de Embla, o clases `motion-reduce:*` en las tarjetas). `EventCarousel` conserva el early-return `null` con lista vacía.

### Próximos eventos
- **AC-8**: Una `PageSection` con h2 "Próximos eventos" muestra un `tablist` con pestañas "Todos", "Conciertos" y "Teatro y espectáculos" (nombres desde `EVENT_CATEGORY_LABELS`), "Todos" seleccionada por defecto. Usa el primitivo `Tabs` de shadcn (roles `tablist/tab/tabpanel`, `aria-selected`, flechas de teclado) y cada pestaña mide ≥ 44 px de alto.
- **AC-9**: Cada pestaña muestra su grilla de `EventCard` (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, gap-6) con **máximo 8 tarjetas** (`UPCOMING_LIMIT`, constante nombrada). Los datos salen de las consultas ya precargadas (`ALL_PARAMS`, `CONCERT_PARAMS`, `THEATER_PARAMS`), de modo que cambiar de pestaña no dispara una petición de red inicial (la clave `eventListKey` coincide con la precargada). Se reutilizan `EventsQuery` (skeleton/error/reintentar) y `EventCard`.
- **AC-10**: Una pestaña sin eventos muestra el mensaje "No hay eventos por ahora." (`role="status"` no necesario; texto en el tabpanel). No hay h2/h3 huérfanos.
- **AC-11**: Bajo la grilla hay un botón/enlace "Ver todos los eventos" a `/events` (a `/events?category=…` cuando la pestaña activa es una categoría), con estilo `buttonVariants` y alto ≥ 44 px.

### Integración y transversales
- **AC-12**: `src/app/page.tsx` renderiza, en este orden dentro de `<main>`: `Hero`, Explora por categoría, Destacados, Próximos eventos, `PromoBanner` (sin cambios hasta la Fase 2). Mantiene `force-dynamic`, el `Promise.all` con `prefetchQuery` de las 4 listas (`FEATURED`, `CONCERT`, `THEATER`, `ALL`) y `HydrationBoundary`. `page.tsx` solo compone (sin lógica nueva).
- **AC-13**: Jerarquía de encabezados: un único `h1` (hero); las secciones nuevas usan `h2`; cada `<section>` tiene `aria-labelledby` apuntando a su h2; `main` es el único landmark principal. Sin saltos de nivel.
- **AC-14**: Se elimina el código sin uso tras la integración: `event-filter-bar.tsx` y `CategoryEvents`/`AllEvents` de `category-events.tsx` (se conservan `EventsQuery`, `EventsListSkeleton`, `EventsError`). `CategoryPill` queda extendido y usado (ver Reuso). Ver Pregunta abierta 2.
- **AC-15**: Tests nuevos para `PageSection`-consumidores y lógica (ver Plan); los existentes (`hero*.test.tsx`, `promo-banner.test.tsx`, `footer.test.tsx`) siguen pasando sin modificarse. `npm run lint`, `npm run test` y `npm run build` pasan al cierre.

## Contratos

```ts
// src/components/page-section.tsx  (compartido, server-compatible)
interface PageSectionProps {
  /** id del h2; el <section> lo referencia con aria-labelledby. */
  id: string
  title: string
  /** Slot a la derecha del título (enlace "Ver todos", flechas...). */
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}
```

```ts
// src/modules/events/components/category-pill.tsx  (extensión retrocompatible)
interface CategoryPillProps {
  label: string
  value: EventCategory
  className?: string
  /** Icono lucide decorativo; con `variant="tile"` se muestra grande sobre el texto o a la izquierda. */
  icon?: LucideIcon
  /** "pill" (default, comportamiento actual) | "tile" (tarjeta de categoría de la referencia). */
  variant?: "pill" | "tile"
}

// src/modules/events/components/explore-categories.tsx
// Sin props. Itera las categorías reales (EVENT_CATEGORY_LABELS) -> CategoryPill variant="tile".
// Mapa de iconos: concert -> Music, theater -> Drama (lucide).
```

```ts
// src/modules/events/components/event-carousel.tsx  (extensión)
interface EventCarouselProps {
  events: Event[]
  title?: string            // default "Destacados"
  viewAllHref?: string      // "Ver todos" en la fila del título
  className?: string
}

// src/modules/events/components/featured-events.tsx  (props sin cambios: params)

// src/modules/events/components/upcoming-events.tsx  ("use client")
export const UPCOMING_LIMIT = 8
interface UpcomingEventsProps {
  /** Mismos objetos que page.tsx precargó en el servidor. */
  allParams: PublicParams
  concertParams: PublicParams
  theaterParams: PublicParams
}
```

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Chips de categoría | `CategoryPill` (solo `page.tsx`) | **extender** con `icon` y `variant="tile"`; el default sigue idéntico |
| Contenedor/espaciado de sección + título + acción | `EventSection`/`EventCarousel` repiten `h2` y flex; `page.tsx` tiene el contenedor | **crear** `src/components/page-section.tsx` (compartido; lo consumen las 3 secciones y la Fase 2) |
| Carrusel horizontal con flechas | `EventCarousel` + `ui/carousel` (Embla) | **extender** `EventCarousel` (flechas al título, `viewAllHref`); no se crea otro carrusel |
| "Ver todos" | `EventSection` (`buttonVariants({variant:"link"})`) | **reusar** el patrón dentro de `PageSection.action` |
| Pestañas | no existe `ui/tabs`; `@shadcn/tabs` disponible | **agregar de shadcn** (`npx shadcn@latest add tabs`) |
| Carga/skeleton/error de listas | `EventsQuery`, `EventsListSkeleton`, `EventsError` en `category-events.tsx` | **reusar** |
| Tarjeta de evento y grilla | `EventCard`; grilla de `AllEvents` | **reusar** `EventCard`; la grilla pasa a `UpcomingEvents` (se retira `AllEvents`) |
| Filtro/búsqueda del home | `EventFilterBar` (duplica el buscador del hero) | **retirar** (dead code tras el rediseño) |
| Header sticky | `header.tsx` | **extender** solo fondo/blur |
| Iconos | `lucide-react` (`Music`, `Drama`) | **reusar** |
| Botón "Ver todos los eventos" | `buttonVariants` de `ui/button` | **reusar** |

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Agregar `Tabs` de shadcn y crear `PageSection`. — archivos: `src/components/ui/tabs.tsx` (generado por `npx shadcn@latest add tabs`), `src/components/page-section.tsx` — tests: no (primitivo shadcn y componente presentacional) — cubre: AC-2, AC-8

### Grupo 1 (paralelo, archivos disjuntos)

- **T-2**: Header con fondo `bg-background/90` + blur. — archivos: `src/components/header.tsx` — tests: no (clases) — cubre: AC-1
- **T-3**: Explora por categoría: extender `CategoryPill` (icono + variante tile) y crear `ExploreCategories`. — archivos: `src/modules/events/components/category-pill.tsx`, `src/modules/events/components/explore-categories.tsx`, `src/modules/events/components/explore-categories.test.tsx` — tests: sí (2 enlaces con href correcto, nombres plurales, iconos `aria-hidden`, h2 "Explora por categoría") — cubre: AC-3, AC-4, AC-13
- **T-4**: Destacados: `EventCarousel` con flechas en la fila del título y `viewAllHref`; `FeaturedEvents` solo se adapta a `PageSection`/`EventCarousel` (sin `excludeIds`). — archivos: `src/modules/events/components/event-carousel.tsx`, `src/modules/events/components/event-carousel.test.tsx`, `src/modules/events/components/featured-events.tsx`, `src/modules/events/components/featured-events.test.tsx` — tests: sí (event-carousel: título, enlace "Ver todos", flechas con aria-label, vacío -> null; featured-events con `EventsQuery` mockeado: muestra todos los destacados, vacío -> no renderiza) — cubre: AC-5, AC-6, AC-7, AC-13
- **T-5**: Próximos eventos con pestañas y límite de 8. — archivos: `src/modules/events/components/upcoming-events.tsx`, `src/modules/events/components/upcoming-events.test.tsx` — tests: sí (mock de `useEvents`/`EventsQuery`: roles tablist/tab/tabpanel, "Todos" activa, cambio de pestaña muestra su lista, máx. `UPCOMING_LIMIT`, estado vacío, href de "Ver todos los eventos" según pestaña) — cubre: AC-8, AC-9, AC-10, AC-11, AC-13

### Grupo 2 (serial, tras el Grupo 1; `page.tsx` pertenece solo a T-6)

- **T-6**: Integrar en `page.tsx` en el orden de AC-12 y retirar código sin uso. — archivos: `src/app/page.tsx`, `src/modules/events/components/category-events.tsx` (quitar `CategoryEvents` y `AllEvents`, conservar `EventsQuery`/skeleton/error), `src/modules/events/components/event-section.tsx` (eliminar), `src/modules/events/components/event-filter-bar.tsx` (eliminar) — tests: no nuevos (se ejecuta la suite completa y `npm run build`) — cubre: AC-12, AC-14, AC-15

Al cierre de la fase: proyecto compilando, lint y tests pasando (AC-15). Verificación visual manual a 375, 860 y 1745 px.

## Riesgos

- **Hidratación / prefetch**: `UpcomingEvents` y `FeaturedEvents` deben usar exactamente los mismos objetos `params` que `page.tsx` prefetchea (`eventListKey` idéntico); cualquier parámetro nuevo (p. ej. `pageSize: 8`) cambiaría la clave y provocaría un fetch en cliente. Por eso el límite de 8 se aplica con `slice` en el cliente, no en el params.
- **Tests existentes**: `promo-banner.test.tsx`, `hero*.test.tsx` y `footer.test.tsx` no tocan los archivos de esta fase. No hay tests previos de `EventCarousel`, `FeaturedEvents`, `category-events`, `event-filter-bar` ni `category-pill`; borrar `AllEvents`/`CategoryEvents`/`EventFilterBar` no rompe tests (verificado por búsqueda).
- **Destacados duplica el hero**: decisión del usuario (se acepta). `featured` en `listPublicEvents` no filtra por fecha, por lo que Destacados podría mostrar eventos pasados que el hero oculta; no se cambia el servicio (fuera de alcance).
- **Flechas de `ui/carousel`**: son `absolute` con `-left-12`; hay que sobreescribir con `className` (posición estática, `size-11`) sin modificar `src/components/ui/carousel.tsx`.
- **Accesibilidad**: landmarks (`<section aria-labelledby>`), orden h1 > h2, objetivos 44 px (tiles, pestañas, flechas, botón), foco visible, reduced motion en el desplazamiento del carrusel, `Tabs` de shadcn (base-ui) con teclado nativo; los iconos son `aria-hidden`.
- **Blur del Header**: `bg-background/90` sobre contenido con imágenes podría reducir el contraste del texto del menú; 90 % blanco mantiene ≥ 4.5:1. Con `z-50` no cambia el apilamiento. El Header se usa en todas las páginas públicas: el cambio es global y deseado.
- **Dead code**: eliminar `EventFilterBar` quita la barra "Buscar por nombre, artista o venue..." de "Todos los eventos"; la búsqueda del home queda solo en el hero.

## Fases siguientes

**Fase 2 (secciones de contenido; se detalla en una spec/edición posterior, con `page.tsx` otra vez en una sola tarea final)**:

- "Cómo funciona" (`HowItWorks`): h2 "Tres pasos y ya estás dentro." y 3 pasos "PASO 1/2/3" con icono (Buscar, Elegir, Comprar), cada uno h3 + texto.
- Banner "PARA ORGANIZADORES" (`OrganizerCta`, nuevo; el `PromoBanner` actual es el newsletter): etiqueta, título con nuestra marca, botón "Publica tu evento" a un destino existente y secundario "Conoce más" (ver Pregunta 4).
- "Compra con confianza" (`TrustHighlights`): 3 columnas con icono.
- Alinear `PromoBanner` (newsletter) al contenedor/espaciado de la referencia usando `PageSection`/mismos paddings, sin tocar su lógica ni sus selectores de test (label "Correo electrónico", botón "Suscribirse", `role="status"`, enlace a `/privacidad`).
- Orden final en `page.tsx`: Hero, Explora, Destacados, Próximos, Cómo funciona, Organizadores, Confianza, Newsletter, Footer.

## Decisiones resueltas (2026-10-07)

1. **Destacados vs hero**: se acepta la duplicación (opción b). Sin `excludeIds`.
2. **Eliminar `EventFilterBar`** y las secciones por categoría del home: confirmado.
3. **Banner de organizadores (Fase 2)**: el usuario respondió "sí" a una pregunta con dos opciones ("omitir Conoce más" o "apuntarlo a `/organizer`"); sigue **pendiente de aclarar** al iniciar la Fase 2. No afecta a la Fase 1.
4. **Header**: se mantienen los enlaces Conciertos / Teatro y "Vender entradas": confirmado.
5. **Footer**: fuera de alcance; conserva su color claro original (decisión del usuario).
6. **Textos de Fase 2** ("Cómo funciona", "Compra con confianza"): se confirman al iniciar la Fase 2 (ver propuesta en el historial de esta spec; `q` solo busca por título, no escribir "ciudad").
7. **`EventSection` se conserva** (lo usa la página de detalle `/events/[id]`); migrarlo a `PageSection` y borrarlo queda fuera de esta fase.
