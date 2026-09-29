# Landing page pública de eventos (mock data)

**Estado**: done
**Aprobado por**: usuario — 2026-09-25 (Fase 3, cierre final)
**Fase**: 3 de 3 completada — feature cerrado, sin fases pendientes

> **Historial**: Fase 1 — **done**, aprobada por usuario el 2026-09-25 (implementación verificada: `npm run build`, `npm run lint` y `npm run test` en verde). Fase 2 — **done**, aprobada por usuario el 2026-09-25 (implementación verificada: `npm run build`, `npm run lint` y `npm run test` en verde; cierra los 2 hallazgos MINOR de Fase 1). Esta edición detalla la Fase 3 (**última fase**) a fondo y la deja en `draft`: requiere nueva aprobación humana antes de que el `developer` inicie sus tareas.

## Contexto

Primera etapa del proyecto Ticketera: una landing page pública (`/`), inspirada visualmente en ticketmaster.com y joinnus.com, que muestra eventos con **datos mock** (sin backend real todavía). El diseño visual (paleta, tipografía, patrón de página) ya fue decidido y persistido en `design-system/ticketera/MASTER.md`; esta spec traduce ese diseño en un plan de implementación dentro de las convenciones de `docs/SETUP.md`. Solo modo claro. No hay autenticación, búsqueda ni filtrado funcionales en esta etapa: todo lo interactivo que no sea navegación básica es visual únicamente.

## Alcance

- **Incluye**:
  - Página `/` (`src/app/page.tsx`) que compone, en orden: Header → Hero → Category quick-nav → Carrusel "Eventos destacados" → Fila "Conciertos" → Fila "Teatro y espectáculos" → "Todos los eventos" (grid + barra de búsqueda/filtro visual) → Banner promocional/newsletter → Footer.
  - Módulo de dominio nuevo `src/modules/events/` con tipo `Event`, servicio mock síncrono, y componentes presentacionales del dominio.
  - Header y Footer como componentes compartidos (`src/components/`), reutilizables fuera del dominio `events`.
  - Wiring de diseño: tipografía Poppins vía `next/font/google` en el layout raíz, tokens de color de marca en `globals.css`, `images.remotePatterns` en `next.config.ts` para servir imágenes mock desde Unsplash.
  - Componentes shadcn/ui nuevos: `card`, `badge`, `input`, `carousel`, `separator`.
- **No incluye** (explícito, para frenar scope creep):
  - Backend real, llamadas HTTP, TanStack Query/Axios para eventos (el servicio es 100% síncrono con datos en memoria).
  - Autenticación funcional: los botones "Iniciar sesión" / "Registrarse" del Header son visuales, sin handler, sin ruta, sin modal.
  - Filtrado o búsqueda funcional en ningún punto de la página: ni el buscador del Hero, ni las category pills, ni la barra de búsqueda/filtro de "Todos los eventos" cambian los datos mostrados. Pueden tener estado visual local (ej. un pill "activo"), pero ese estado nunca afecta qué eventos se renderizan.
  - Submit real del banner de newsletter (sin validación de email, sin request).
  - Toggle de dark mode. El bloque `.dark` que ya trae el starter de shadcn se deja intacto y sin uso; no se invierte esfuerzo en removerlo (YAGNI).
  - Rutas de detalle de evento, checkout, o cualquier página más allá de `/`.
  - Tests para componentes puramente presentacionales (no tienen lógica de negocio, ver `docs/SETUP.md` §3).

## Criterios de aceptación

Cubren la landing completa (3 fases). Cada uno indica en qué fase se cumple de punta a punta.

- **AC-1** (Fase 1 crea el componente; Fase 3 lo monta en la página): Existe un `Header` compartido con logo, enlaces de navegación por categoría (Conciertos, Teatro y espectáculos) y dos botones visuales "Iniciar sesión" / "Registrarse", sin ningún handler de autenticación ni navegación real.
- **AC-2** (Fase 2 crea el componente; Fase 3 lo monta): La sección Hero muestra headline + subtítulo + un buscador (input + botón) sobre fondo `--surface-warm`; ni el input ni el botón ejecutan ninguna búsqueda.
- **AC-3** (Fase 1 crea el componente; Fase 3 lo monta): Existe una fila de `CategoryPill` para "Conciertos" y "Teatro y espectáculos"; el click puede cambiar un estado visual local de "seleccionado" pero nunca filtra ningún listado.
- **AC-4** (Fase 2 crea el componente; Fase 3 lo monta): La sección "Eventos destacados" renderiza un `Carousel` (shadcn) con controles prev/next accesibles (`aria-label`, operables por teclado) mostrando los eventos con `featured: true` de `getFeaturedEvents()`.
- **AC-5** (Fase 2 crea el componente; Fase 3 lo monta): Existen dos filas ("Conciertos", "Teatro y espectáculos") usando el mismo componente reutilizable `EventSection`, cada una poblada con `getEventsByCategory(...)`.
- **AC-6** (Fase 3): La sección "Todos los eventos" muestra un grid con `getAllEvents()` y una barra de búsqueda/filtro (input de texto + selector de categoría) puramente visual: escribir o seleccionar no cambia el grid.
- **AC-7** (Fase 2 crea el componente; Fase 3 lo monta): Existe un banner promocional/newsletter con input de email y botón "Suscribirse" sin submit real.
- **AC-8** (Fase 1 crea el componente; Fase 3 lo monta): Existe un `Footer` compartido con enlaces (empresa/ayuda/legal), íconos de redes sociales (lucide) y copyright.
- **AC-9** (Fase 1): `EventCard` muestra imagen, título, badge de categoría, fecha, venue + ciudad y precio formateado, derivados directamente de un `Event`.
- **AC-10** (Fase 1, con test): El tipo `Event` y el servicio mock (`getFeaturedEvents`, `getEventsByCategory`, `getAllEvents`) existen en `src/modules/events/`, son síncronos, determinísticos (mismo resultado en cada llamada) y `getEventsByCategory` filtra correctamente por la categoría pedida.
- **AC-11** (Fase 1): Toda la página usa Poppins (400/500/600/700) vía `next/font/google` y los tokens de color de `design-system/ticketera/MASTER.md` (primario naranja, accent azul, `--surface-warm` en hero/banner); ya no queda la fuente Geist del starter en uso.
- **AC-12** (Fase 1 configura; Fase 3 consume): Las imágenes de evento se sirven con `next/image` desde el host declarado en `images.remotePatterns` de `next.config.ts`, sin warnings de Next por host no configurado.
- **AC-13** (transversal, todas las fases): Ningún control de esta etapa (login/signup, buscador hero, category pills, filtro de "todos los eventos", newsletter) dispara una llamada de red, navegación de auth o cambio real en los datos mostrados.

## Contratos

### Tipo de dominio

```ts
// src/modules/events/types/event.types.ts
export type EventCategory = "concert" | "theater";

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  date: string;      // ISO 8601 con offset, ej. "2026-11-14T20:00:00-05:00"
  venue: string;
  city: string;
  price: number;      // soles (PEN), sin símbolo; formatear en el componente
  imageUrl: string;    // URL absoluta, host de images.remotePatterns
  featured: boolean;
}
```

### Servicio mock

```ts
// src/modules/events/services/events.service.ts
export function getAllEvents(): Event[];
export function getFeaturedEvents(): Event[];               // events.filter(e => e.featured)
export function getEventsByCategory(category: EventCategory): Event[];
```

Dataset mock (fijo, en el propio archivo del servicio): 10 eventos — 6 `"concert"`, 4 `"theater"` — al menos 3 con `featured: true` repartidos entre ambas categorías. Ciudades y venues peruanos (Lima, Arequipa, etc., acorde a la referencia joinnus.com); `imageUrl` apuntando a `images.unsplash.com`. Contenido de relleno (nombres de eventos, copy del hero, textos del footer/banner): decisión del autor de la spec, no requiere validación del usuario — el día que haya API real, solo este archivo cambia.

### Props públicas de componentes (dominio `events`)

```ts
// EventCard — src/modules/events/components/event-card.tsx
interface EventCardProps {
  event: Event;
  className?: string;
}

// CategoryPill — src/modules/events/components/category-pill.tsx
interface CategoryPillProps {
  label: string;
  value: EventCategory;
  active?: boolean;
  onSelect?: (value: EventCategory) => void; // solo estado visual local; nunca filtra datos (AC-13)
}

// EventSection (Fase 2) — src/modules/events/components/event-section.tsx
interface EventSectionProps {
  title: string;
  events: Event[];
  viewAllHref?: string; // opcional, solo visual si no existe ruta destino aún
  className?: string;
}

// EventCarousel (Fase 2) — src/modules/events/components/event-carousel.tsx
interface EventCarouselProps {
  events: Event[];
  title?: string;       // encabezado de la sección; default "Eventos destacados"
  className?: string;
}

// Hero (Fase 2) — src/modules/events/components/hero.tsx
interface HeroProps {
  headline?: string;   // valor por defecto definido en el propio componente
  subtitle?: string;
  className?: string;
}

// PromoBanner (Fase 2) — src/modules/events/components/promo-banner.tsx
interface PromoBannerProps {
  title?: string;      // valor por defecto definido en el propio componente ("¿Quieres enterarte antes que nadie?" o similar)
  subtitle?: string;
  className?: string;
}
```

`EventCarousel` y `EventSection` reciben `events: Event[]` ya resueltos (la llamada a `getFeaturedEvents()` / `getEventsByCategory(...)` la hace quien componga la página en Fase 3); en Fase 2 estos componentes no importan `events.service.ts`. `Hero` y `PromoBanner` no reciben datos de eventos.

```ts
// EventFilterBar (Fase 3) — src/modules/events/components/event-filter-bar.tsx
interface EventFilterBarProps {
  className?: string;
}
```

`EventFilterBar` sigue el mismo patrón que `Hero`/`PromoBanner`: no recibe datos ni callbacks, todo el copy (placeholder del input, etiqueta y opciones del selector) tiene su valor por defecto definido dentro del propio componente (decisión de autoría). Renderiza un `Input` de texto (placeholder tipo "Buscar evento por nombre...") + un `Select` (shadcn/ui, agregado en Fase 3 Grupo 0) con una opción por defecto "Todas las categorías" más una opción por `EventCategory` ("Conciertos" → `"concert"`, "Teatro y espectáculos" → `"theater"`), reutilizando las mismas etiquetas ya usadas en `Header`/`CategoryPill`. El `Select` puede tener estado local (para mostrar la opción elegida en el trigger) pero ese estado nunca se propaga fuera del componente ni afecta ningún listado (AC-6, AC-13) — no recibe `onValueChange` desde el padre. `src/components/ui/select.tsx` (generado por el CLI de shadcn) trae su propia directiva `"use client"`, igual que `carousel.tsx`; `EventFilterBar` no necesita declararla porque el límite cliente/servidor ya queda establecido dentro del primitivo, así que sigue siendo un componente sin estado propio a nivel de módulo.

### Criterio unificado "sin eventos" (ajuste pedido explícitamente por el usuario en Fase 3)

El reviewer de Fase 2 reportó (MINOR, no bloqueante) una inconsistencia: `EventCarousel` retorna `null` cuando `events.length === 0` (oculta toda la sección, incluido el título), mientras `EventSection` sigue mostrando `title` y el enlace "Ver todos" y solo omite la fila de `EventCard` cuando `events` está vacío.

**Criterio único adoptado para ambos componentes**: *si `events.length === 0`, el componente completo no se renderiza — ni título, ni "Ver todos", ni cuerpo (retorna `null`)*. Se elige generalizar el comportamiento ya existente de `EventCarousel` (en vez del de `EventSection`) porque:
- Es el más consistente con el resto de la landing: cada sección de la página (`EventCarousel`, `EventSection`, y por extensión cualquier sección futura poblada por el servicio mock) se trata como una unidad autocontenida que se muestra o se oculta entera según haya o no datos, sin dejar encabezados "huérfanos" sin contenido debajo.
- Evita un salto visual raro (título + "Ver todos" flotando sobre un espacio vacío) si en el futuro el dataset mock cambia y alguna categoría queda sin eventos.
- Es el cambio más pequeño: `EventCarousel` ya lo implementa tal cual (no requiere modificación); solo `EventSection` debe ajustarse (mover la condición `events.length > 0` para que envuelva todo el `return`, no solo la fila de cards).

Con el dataset mock actual (6 `"concert"` / 4 `"theater"`, `getAllEvents()` con 10 eventos) ninguna categoría está vacía, así que este ajuste es defensivo/preventivo y no cambia nada visible hoy — solo blinda el comportamiento ante datos futuros.

`EventCarousel` reutiliza `Carousel`/`CarouselContent`/`CarouselItem`/`CarouselPrevious`/`CarouselNext` de `src/components/ui/carousel.tsx`: ese primitivo ya trae navegación por teclado (`ArrowLeft`/`ArrowRight`) y botones prev/next con texto `sr-only` en inglés ("Previous slide"/"Next slide"). Para que el `aria-label` efectivo quede en español (consistente con el resto del sitio), `EventCarousel` debe pasar `aria-label="Evento anterior"` / `aria-label="Siguiente evento"` a `CarouselPrevious`/`CarouselNext` (el atributo llega a `ButtonPrimitive` vía `...props` y prevalece sobre el texto `sr-only` interno para tecnología de asistencia).

`Header` (`src/components/header.tsx`) y `Footer` (`src/components/footer.tsx`) no reciben props obligatorias (contenido estático + `className?: string` opcional). El nav de categorías del Header se resuelve como enlaces de texto simples (no usa `CategoryPill`, no usa `navigation-menu`): son dos ítems fijos sin submenú, por lo que un mega-menú sería sobre-ingeniería (YAGNI).

### Tokens de color (mapeo directo de `design-system/ticketera/MASTER.md`, sin reinventar valores)

En `src/app/globals.css`, dentro de `:root` (solo modo claro; el bloque `.dark` existente no se toca):

| Variable shadcn existente | Valor (hex, de MASTER.md) | Rol MASTER.md |
|---|---|---|
| `--background` | `#FFFFFF` | Background |
| `--foreground` | `#0F172A` | Foreground |
| `--card` / `--card-foreground` | `#FFFFFF` / `#0F172A` | Card / Card Foreground |
| `--primary` / `--primary-foreground` | `#EA580C` / `#0F172A` | Primary / On Primary |
| `--secondary` / `--secondary-foreground` | `#F97316` / `#0F172A` | Secondary (hover/lighter de primary) / On Secondary |
| `--accent` / `--accent-foreground` | `#2563EB` / `#FFFFFF` | Accent / On Accent |
| `--muted` / `--muted-foreground` | `#F1F5F9` / `#475569` | Muted / Muted Foreground |
| `--border` / `--input` | `#E2E8F0` | Border |
| `--destructive` / `--destructive-foreground` | `#DC2626` / `#FFFFFF` | Destructive / On Destructive |
| `--ring` | `#EA580C` | Ring |

Variable nueva (no existe en el set shadcn por defecto), agregar en `:root` y exponer en el bloque `@theme inline` como `--color-surface-warm`:

```css
--surface-warm: #FFF7ED; /* solo hero y banner promocional, nunca fondo global */
```

`images.remotePatterns` en `next.config.ts`: host `images.unsplash.com`, protocolo `https`.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Botones (login/signup, CTAs, buscar) | `src/components/ui/button.tsx` ya existe (variantes default/outline/secondary/ghost/link, sobre `@base-ui/react`) | reusar |
| Card contenedor de evento | `@shadcn/card` — no instalado (`src/components/ui/` solo tiene `button.tsx`) | agregar de shadcn |
| Badge (categoría, "Agotado", "Destacado") | `@shadcn/badge` — no instalado | agregar de shadcn |
| Input (buscador hero, filtro, newsletter) | `@shadcn/input` — no instalado | agregar de shadcn |
| Carrusel de destacados | `@shadcn/carousel` — no instalado (trae `embla-carousel-react` vía el CLI); usuario descartó swiper explícitamente | agregar de shadcn |
| Separador visual (footer, entre secciones) | `@shadcn/separator` — no instalado | agregar de shadcn |
| Nav de categorías en Header | `@shadcn/navigation-menu` existe en el registro pero está pensado para menús desplegables/mega-menu; aquí son 2 enlaces fijos sin submenú | construir a mano con enlaces + `Button variant="ghost"`, no instalar `navigation-menu` (YAGNI) |
| Iconos (redes sociales, prev/next, UI) | `lucide-react` ya instalado | reusar |
| `cn()` helper de merge de clases | `src/lib/utils.ts` → re-exporta `cn` de `"cn"` | reusar |
| Fetch de datos de eventos | nada en `src/`; `axios`/`@tanstack/react-query` instalados pero sin patrón de uso aún | **no usar** en esta fase — datos síncronos mock, envolver en TanStack Query sería sobre-ingeniería (YAGNI); servicio síncrono simple en `src/modules/events/services/` |
| Tipo `Event` / servicio de eventos | nada en `src/modules/` (dominio `events` no existe) | crear `src/modules/events/types/event.types.ts` + `src/modules/events/services/events.service.ts` |
| Header / Footer compartidos | nada en `src/components/` (solo `ui/` y `providers/`) | crear `src/components/header.tsx`, `src/components/footer.tsx` |
| `EventCard`, `CategoryPill`, `EventSection`, `Hero`, `EventCarousel`, banner, filtro visual | nada en `src/modules/events/components/` | crear (repartidos entre Fase 1 y Fase 2, ver plan) |

### Reuso — detalle Fase 2

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Fondo cálido de Hero/banner | token `--surface-warm` ya definido en `:root` y expuesto como `--color-surface-warm` en `@theme inline` (Fase 1 T-2) → utilidad Tailwind `bg-surface-warm` | reusar |
| Input/botón de búsqueda (Hero) e input/botón de suscripción (banner) | `src/components/ui/input.tsx` y `src/components/ui/button.tsx` ya instalados (Fase 1 T-1 / starter) | reusar |
| Carrusel con controles prev/next accesibles | `src/components/ui/carousel.tsx` ya instalado (Fase 1 T-1, con el fix de lint de `cn` aplicado); ya incluye teclado (`ArrowLeft`/`ArrowRight`) y botones prev/next | reusar — envolver, no reimplementar |
| Slide del carrusel / item de fila | `EventCard` ya existe (Fase 1 T-6) | reusar tal cual, sin modificarlo |
| Icono de lupa para el buscador del Hero (opcional, decorativo) | `lucide-react` ya instalado (`Search`) | reusar si se agrega, opcional — no es requisito de ningún AC |
| Autoplay / play-pause del carrusel (mencionado en `design-system/ticketera/MASTER.md`, "Conversion Strategy") | ningún plugin de autoplay instalado en Fase 1 Grupo 0 (`embla-carousel-autoplay` no es dependencia actual) | **no implementar en esta fase** — AC-4 solo exige controles prev/next accesibles; agregar autoplay sería scope creep + nueva dependencia no aprobada (YAGNI). Ver Preguntas abiertas. |
| Copia mutable del array interno del servicio (`EVENTS`) devuelta por `getAllEvents`/`getFeaturedEvents`/`getEventsByCategory` | hallazgo MINOR del reviewer de Fase 1: las 3 funciones devuelven una referencia al array module-level, no una copia | **corregir** en `events.service.ts` (fix incluido como T-2 de esta fase, ver Plan de tareas) |
| Variable huérfana `--font-mono: var(--font-geist-mono)` en `globals.css` | hallazgo MINOR del reviewer de Fase 1: `--font-geist-mono` ya no se define en ningún lado (Geist fue removido en Fase 1 T-2) | **eliminar** (fix incluido como T-1 de esta fase, ver Plan de tareas) |

### Reuso — detalle Fase 3

Verificado en el repo (`src/modules/events/components/`, `src/components/`, `src/app/page.tsx`) antes de planificar: **todo lo de Fases 1 y 2 ya existe** — `Header` (`src/components/header.tsx`), `Footer` (`src/components/footer.tsx`), `CategoryPill`, `EventCard`, `Hero`, `EventCarousel`, `EventSection`, `PromoBanner` (los 6 en `src/modules/events/components/`), y el servicio (`src/modules/events/services/events.service.ts` con `getAllEvents`/`getFeaturedEvents`/`getEventsByCategory`). No falta ninguna pieza para componer la página; Fase 3 solo agrega `EventFilterBar` y `src/app/page.tsx`. `src/app/page.tsx` sigue siendo el placeholder de `create-next-app` (logo de Next.js, texto "To get started, edit page.tsx...") — confirmado por lectura directa.

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Selector de categoría (visual) para `EventFilterBar` | `@shadcn/select` (registro shadcn, confirmado con `npx shadcn@latest search @shadcn -q "select"`) y `@shadcn/native-select` (envoltorio de `<select>` nativo) — ninguno instalado aún; `Button`/`Carousel` ya usan `@base-ui/react` (`^1.8.0`, ya en `package.json`), y `@shadcn/select` en este proyecto (`components.json` → `base-nova`) se genera sobre ese mismo `@base-ui/react/select`, sin dependencia nueva | agregar de shadcn (`@shadcn/select`), no `native-select`: mantiene el mismo look & feel (trigger + popover) que el resto del sitio en vez de un `<select>` de estilo nativo del navegador, sin costo real porque no suma dependencias nuevas |
| Input de texto para `EventFilterBar` | `src/components/ui/input.tsx` ya instalado (Fase 1 T-1) | reusar |
| Fila de tarjetas del grid "Todos los eventos" | `EventCard` ya existe (Fase 1 T-6) | reusar tal cual, sin modificarlo |
| Dato para el grid "Todos los eventos" | `getAllEvents()` ya existe en `events.service.ts` (Fase 1 T-3) | reusar |
| Composición de página (`Header`, `Hero`, `CategoryPill`, `EventCarousel`, `EventSection`, `PromoBanner`, `Footer`) | todos existen, ver arriba | reusar tal cual, ninguno se modifica en Fase 3 salvo el ajuste puntual de `event-section.tsx` (ver criterio unificado en Contratos) |
| Fila de `CategoryPill` en `page.tsx` (Conciertos / Teatro y espectáculos) | `CategoryPill` ya soporta `active`/`onSelect`, pero mantener el toggle visual en `page.tsx` requeriría estado de React (un límite cliente, `"use client"`, o un pequeño wrapper cliente) | **no cablear el toggle en Fase 3**: se renderizan ambos `CategoryPill` sin `active`/`onSelect` (estáticos). AC-3 solo exige que existan y que el click nunca filtre datos — eso se cumple trivialmente sin estado. Cablear el toggle sería una mejora visual opcional no pedida (YAGNI) y forzaría que `page.tsx` (o un sub-componente) fuera Client Component solo por eso; se documenta como nota en Preguntas abiertas, no bloqueante |
| Selector de categoría con estado de selección visual (trigger del `Select`) | Base UI `Select` maneja su propio estado interno de apertura/valor mostrado | reusar tal cual — ese estado es interno al primitivo (vive dentro de `select.tsx`, que ya trae su propia `"use client"`), no se expone ni se conecta a nada fuera de `EventFilterBar` |

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Instalar los componentes shadcn/ui necesarios: `npx shadcn@latest add card badge input carousel separator`. — archivos: `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/input.tsx`, `src/components/ui/carousel.tsx`, `src/components/ui/separator.tsx`, `package.json` (nueva dependencia `embla-carousel-react` agregada por el propio CLI) — tests: no (primitivos generados, sin lógica propia) — cubre: habilita AC-4, AC-6, AC-7, AC-9 (usados por tareas posteriores).
- **T-2**: Configurar tipografía Poppins (reemplazar `Geist`/`Geist_Mono` por `Poppins` vía `next/font/google`, pesos `["400","500","600","700"]`, variable `--font-sans`) en el layout raíz; aplicar el mapeo de tokens de color de la sección Contratos en `:root` (dejando `.dark` intacto) y agregar `--surface-warm`; agregar `images.remotePatterns` (`images.unsplash.com`, https) en `next.config.ts`. — archivos: `src/app/layout.tsx`, `src/app/globals.css`, `next.config.ts` — tests: no (configuración/estilos) — cubre: AC-11, AC-12.

### Grupo 1

- **T-3**: Crear el tipo `Event`/`EventCategory` y el servicio mock con el dataset fijo (10 eventos, 6 concert / 4 theater, ≥3 featured, imágenes de `images.unsplash.com`, ciudades/venues peruanos) y las 3 funciones (`getAllEvents`, `getFeaturedEvents`, `getEventsByCategory`). — archivos: `src/modules/events/types/event.types.ts`, `src/modules/events/services/events.service.ts`, `src/modules/events/services/events.service.test.ts` — tests: sí, obligatorio por `docs/SETUP.md` §3 (`*.service.ts`): verificar cantidad total, que `getFeaturedEvents` solo devuelve `featured: true`, que `getEventsByCategory("concert")`/`("theater")` filtran correctamente y no se mezclan categorías, y que dos llamadas sucesivas devuelven datos equivalentes (determinismo) — cubre: AC-10.
- **T-4**: Crear el Header y el Footer compartidos. Header: logo (texto/wordmark, no requiere asset de imagen), 2 enlaces de categoría (Conciertos, Teatro y espectáculos) como texto simple sin `href` funcional más allá de `#`, y botones "Iniciar sesión" (`variant="ghost"`) / "Registrarse" (`variant="default"`) sin `onClick`. Footer: columnas de enlaces (Empresa, Ayuda, Legal — contenido de relleno), iconos de redes sociales (`lucide-react`: `Facebook`, `Instagram`, `Twitter` o equivalentes disponibles) sin `href` real, y línea de copyright con el año actual. — archivos: `src/components/header.tsx`, `src/components/footer.tsx` — tests: no (presentacionales, sin lógica) — cubre: AC-1, AC-8, AC-13 (los controles no navegan ni ejecutan auth).

### Grupo 2

- **T-5**: Crear `CategoryPill`, usando `Badge` o un `button` estilizado con `cn()` (radio visual "activo"/"inactivo" vía prop `active`, sin efecto en datos — ver Contratos). — archivos: `src/modules/events/components/category-pill.tsx` — tests: no (presentacional; el único "estado" es visual local, sin lógica de negocio que testear) — cubre: AC-3, AC-13.
- **T-6**: Crear `EventCard` (usa `Card`, `Badge` para la categoría, `next/image` para `imageUrl`, formatea `price` con `Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })` y `date` con `Intl.DateTimeFormat("es-PE", {...})`). — archivos: `src/modules/events/components/event-card.tsx` — tests: no (presentacional puro: recibe `Event` y renderiza, sin lógica de negocio más allá de formateo de presentación) — cubre: AC-9, AC-12 (consumo de imagen remota).

Ambas tareas de Grupo 2 dependen de T-3 (tipo `Event`) y son independientes entre sí (archivos disjuntos).

**Al cierre de la Fase 1**: el proyecto compila (`npm run build`), `npm run lint` y `npm run test` pasan; no existe todavía una página compuesta (`src/app/page.tsx` sigue siendo el placeholder del starter, se reemplaza recién en Fase 3) — los componentes y el servicio quedan listos y verificables de forma aislada.

## Fases siguientes

### Fase 2 — Secciones compuestas

**AC cubiertos en esta fase** (de punta a punta, salvo lo anotado): AC-2, AC-4, AC-5, AC-7 completos; AC-13 parcial (los 4 controles nuevos de esta fase — buscador del Hero, prev/next del carrusel, y el botón "Suscribirse" del banner — no disparan red/navegación/cambio de datos; los controles de Fase 1 y Fase 3 se verifican en sus propias fases). Ninguna de estas piezas se monta todavía en `src/app/page.tsx` (eso es Fase 3); quedan listas y verificables de forma aislada.

Dos grupos: Grupo 0 serial (toca `globals.css`, archivo global) y Grupo 1 paralelo (todo lo demás; nada de lo paralelo depende de Grupo 0, corren en cualquier orden entre sí pero Grupo 0 va primero por convención de la plantilla).

#### Grupo 0 (serial)

- **T-1**: Fix MINOR de Fase 1 — eliminar la variable huérfana `--font-mono: var(--font-geist-mono)` del bloque `@theme inline` en `globals.css` (no se usa `font-mono` en ningún punto de la app; no se define un valor correcto porque no hace falta, ver Reuso). — archivos: `src/app/globals.css` — tests: no (solo CSS) — cubre: AC-11 (cierra el último rastro de Geist que quedó del starter).

#### Grupo 1 (paralelo — archivos disjuntos entre sí y respecto a T-1)

- **T-2**: Fix MINOR de Fase 1 — en `events.service.ts`, `getAllEvents()` hoy devuelve la referencia directa al array module-level `EVENTS` (`return EVENTS;`); cambiarla a `return [...EVENTS];` para que devuelva una copia. `getFeaturedEvents()` y `getEventsByCategory()` ya devuelven un array nuevo (resultado de `.filter()`), así que no requieren cambio de comportamiento, pero se deja explícito en un comentario que el contrato del servicio es "siempre copia, nunca la referencia interna". Agregar un test que mute el array devuelto por `getAllEvents()` (ej. `.push()`/`.splice()`) y verifique que una llamada posterior a `getAllEvents()` sigue teniendo 10 eventos. — archivos: `src/modules/events/services/events.service.ts`, `src/modules/events/services/events.service.test.ts` — tests: sí, obligatorio (`*.service.ts`, ya tiene suite en Fase 1; se agrega el caso de inmutabilidad) — cubre: AC-10 (refuerza la garantía de determinismo del servicio ante consumidores externos).
- **T-3**: Crear `Hero` — headline + subtítulo (copy de relleno definido en el propio componente, decisión de autoría) + buscador visual (`Input` + `Button variant="default"`, ambos dentro de un `div` sin `<form>` para no disparar ningún submit implícito) sobre fondo `bg-surface-warm`; sin `onClick`/`onChange` que dispare lógica de búsqueda. — archivos: `src/modules/events/components/hero.tsx` — tests: no (presentacional, sin lógica de negocio) — cubre: AC-2, AC-13.
- **T-4**: Crear `EventCarousel`, envolviendo `Carousel`/`CarouselContent`/`CarouselItem`/`CarouselPrevious`/`CarouselNext` de shadcn (ya instalado en Fase 1 T-1): título de sección (`title`, default "Eventos destacados") + un `EventCard` por `CarouselItem` (basis responsivo, ej. `basis-full sm:basis-1/2 lg:basis-1/3`) por cada evento de `events`; pasar `aria-label="Evento anterior"` / `aria-label="Siguiente evento"` a `CarouselPrevious`/`CarouselNext` (ver nota de Contratos). No agregar autoplay (ver Reuso — decisión de alcance). — archivos: `src/modules/events/components/event-carousel.tsx` — tests: no (presentacional; la lógica de scroll/teclado vive en el primitivo `Carousel` ya probado por su propio origen shadcn) — cubre: AC-4.
- **T-5**: Crear `EventSection` — encabezado `title` (+ enlace opcional "Ver todos" con `Button variant="link"` cuando exista `viewAllHref`) seguido de una fila con scroll horizontal (`overflow-x-auto`, `flex`, `gap-4`) de `EventCard` (ancho fijo por card, ej. `w-[260px] shrink-0 sm:w-[300px]`) por cada evento de `events`. — archivos: `src/modules/events/components/event-section.tsx` — tests: no (presentacional puro) — cubre: AC-5.
- **T-6**: Crear `PromoBanner` — título + subtítulo (copy de relleno tipo newsletter, decisión de autoría) sobre fondo `bg-surface-warm`, `Input type="email"` + `Button variant="default"` con texto "Suscribirse", ambos dentro de un `div` sin `<form>`; sin `onClick`/validación real. — archivos: `src/modules/events/components/promo-banner.tsx` — tests: no (presentacional, sin lógica de negocio) — cubre: AC-7, AC-13.

Las 5 tareas del Grupo 1 tienen archivos disjuntos entre sí y solo dependen de la Fase 1 (`Event`, `EventCard`, tokens de color, shadcn ya instalado); T-2 no depende de T-3–T-6 ni viceversa (los componentes reciben `events: Event[]` ya resueltos, no importan `events.service.ts`).

**Al cierre de la Fase 2**: el proyecto sigue compilando (`npm run build`), `npm run lint` y `npm run test` pasan (incluye los casos nuevos de `events.service.test.ts`); `src/app/page.tsx` sigue siendo el placeholder del starter (se reemplaza en Fase 3) — los 4 componentes nuevos quedan listos y verificables de forma aislada, y los 2 hallazgos MINOR de Fase 1 quedan cerrados.

### Fase 3 — Composición final de la página (última fase)

**AC cubiertos en esta fase** (de punta a punta): AC-6 completo (nuevo, `EventFilterBar`); AC-1, AC-2, AC-3, AC-4, AC-5, AC-7, AC-8, AC-12 quedan **montados** en `src/app/page.tsx` (los componentes y el servicio ya existían de Fases 1/2, esta fase es su ensamblaje final con datos reales); AC-13 se cierra por completo (todos los controles de la página, incluidos los nuevos de `EventFilterBar`, verificados juntos en el mismo árbol de render). Al cerrarse esta fase no queda ningún AC pendiente.

Tres grupos: Grupo 0 serial (instala el primitivo shadcn que falta), Grupo 1 paralelo (dos tareas de archivos disjuntos, ninguna toca `page.tsx`), Grupo 2 serial (el propio `page.tsx`, que depende de que Grupo 1 haya terminado: necesita `EventFilterBar` ya creado, y es más simple razonar sobre el criterio "sin eventos" ya unificado antes de pasarle datos reales a `EventCarousel`/`EventSection`, aunque con el dataset actual ninguna categoría esté vacía).

Se descartó la alternativa de meter `EventFilterBar` en un grupo paralelo *anterior* junto con `page.tsx` en el mismo grupo (ambas cosas en Grupo 1): `page.tsx` importa `EventFilterBar`, por lo que si estuvieran en el mismo grupo paralelo un developer podría empezar `page.tsx` antes de que `EventFilterBar` exista. Mantenerlos en grupos separados (1 y 2) dejando `EventFilterBar` un grupo antes es la opción más segura y no cuesta una fase adicional, ya que de todos modos `page.tsx` es servido por un único archivo y por ende un grupo serial de una sola tarea.

#### Grupo 0 (serial)

- **T-1**: Instalar el componente shadcn/ui que falta para el selector de categoría: `npx shadcn@latest add select`. — archivos: `src/components/ui/select.tsx` (y `package.json`/`package-lock.json` únicamente si el CLI detecta alguna dependencia nueva; no se espera ninguna porque `@base-ui/react` ya está instalado desde Fase 1 T-1) — tests: no (primitivo generado, sin lógica propia) — cubre: habilita AC-6 (usado por T-2).

#### Grupo 1 (paralelo — archivos disjuntos entre sí)

- **T-2**: Crear `EventFilterBar` — `Input` de texto (placeholder de búsqueda, sin `onChange`) + `Select` (shadcn, opciones "Todas las categorías" / "Conciertos" / "Teatro y espectáculos", sin `onValueChange` hacia el padre — ver Contratos), ambos dentro de un `div` sin `<form>` para no disparar ningún submit implícito; layout responsivo simple (`flex flex-col gap-2 sm:flex-row`, consistente con `Hero`/`PromoBanner`). — archivos: `src/modules/events/components/event-filter-bar.tsx` — tests: no (presentacional, sin lógica de negocio: ningún valor ingresado o seleccionado se propaga ni cambia ningún dato, ver `docs/SETUP.md` §3) — cubre: AC-6, AC-13.
- **T-3**: Unificar en `event-section.tsx` el criterio "sin eventos" con el ya existente en `event-carousel.tsx` (ver Contratos → "Criterio unificado 'sin eventos'"): mover la condición `events.length > 0` para que envuelva el `return` completo del componente (si `events.length === 0`, `EventSection` retorna `null` sin renderizar `title` ni "Ver todos", igual que ya hace `EventCarousel`). Ajuste defensivo de 1-2 líneas; no requiere tocar `event-carousel.tsx` (ya cumple el criterio elegido) ni agregar tests nuevos (sigue siendo presentacional puro, sin lógica de negocio que testear). — archivos: `src/modules/events/components/event-section.tsx` — tests: no — cubre: ajuste pedido explícitamente por el usuario en Fase 3 (consistencia entre `EventCarousel`/`EventSection`, relacionado con AC-4/AC-5).

T-2 y T-3 son independientes entre sí (archivos disjuntos) y ambas dependen únicamente de Fase 1/2 (T-2 además depende de Grupo 0 de esta fase para que `select.tsx` exista).

#### Grupo 2 (serial — un solo archivo de página compartido)

- **T-4**: Reemplazar el placeholder del starter en `src/app/page.tsx` (hoy el logo de Next.js + texto "To get started, edit page.tsx...", confirmado por lectura directa) y componer, en este orden: `Header` → `Hero` → fila de dos `CategoryPill` estáticos ("Conciertos" `value="concert"`, "Teatro y espectáculos" `value="theater"`, sin `active`/`onSelect` — ver Reuso, decisión de no cablear el toggle) → `EventCarousel` con `events={getFeaturedEvents()}` → `EventSection title="Conciertos"` con `events={getEventsByCategory("concert")}` → `EventSection title="Teatro y espectáculos"` con `events={getEventsByCategory("theater")}` → sección "Todos los eventos" (encabezado `<h2>` + `EventFilterBar` + grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6` de `EventCard` por cada evento de `getAllEvents()`) → `PromoBanner` → `Footer`. Todas las llamadas al servicio (`getFeaturedEvents`, `getEventsByCategory`, `getAllEvents`) se hacen directamente en el cuerpo del componente de página (Server Component, sin `"use client"`: son funciones síncronas, sin `useState`/handlers a nivel de página). — archivos: `src/app/page.tsx` — tests: no (composición de componentes ya probados/presentacionales; no hay lógica nueva de negocio en este archivo) — cubre: montaje final de AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-12, y cierra AC-13 de punta a punta.

**Al cierre de la Fase 3**: el proyecto sigue compilando (`npm run build`), `npm run lint` y `npm run test` pasan; `src/app/page.tsx` ya no es el placeholder del starter — la landing pública queda **completa y navegable en `/`**, con las 8 secciones en el orden especificado, alimentada por el servicio mock de `src/modules/events/services/events.service.ts`. **No hay una Fase 4**: esta es la última fase de esta spec. Una vez que un humano la apruebe, el `developer` la implemente y el `reviewer` la valide, `docs/specs/events/landing-page.md` pasa a `**Estado**: done` (las 3 fases) y no queda ninguna fase pendiente ni ningún AC sin cubrir de punta a punta.

## Preguntas abiertas

**Fase 1** (resueltas, quedan documentadas): ninguna bloqueó el inicio. El contenido mock (copy exacto del hero, nombres/ciudades de los 10 eventos, textos de footer/banner) se resolvió como detalle de autoría al implementar T-3/T-4, no como requisito del usuario. No hubo ambigüedad de diseño pendiente: paleta, tipografía, orden de secciones y decisión "carousel de shadcn, no swiper" ya estaban fijadas en `design-system/ticketera/MASTER.md`.

**Fase 2**: ninguna bloquea el inicio de la implementación una vez aprobada esta fase. Dos notas no bloqueantes:

- `design-system/ticketera/MASTER.md` (sección "Page Pattern", Conversion Strategy) menciona autoplay + controles play/pause + detener rotación en foco/hover/fuera de viewport/`prefers-reduced-motion` para el carrusel de destacados. AC-4 y el alcance de esta fase solo exigen controles prev/next accesibles y operables por teclado (ya cubiertos por el primitivo `Carousel` de shadcn). Decisión de autoría: **no implementar autoplay en esta fase** — agregarlo requeriría una dependencia nueva no instalada en Fase 1 Grupo 0 (ej. `embla-carousel-autoplay`) y sería scope creep sobre lo ya esbozado. Si se quiere autoplay, debería ser un pedido explícito para una fase o spec posterior.
- El copy exacto de `Hero` (headline/subtítulo) y `PromoBanner` (título/subtítulo) queda como decisión de autoría del `developer` al implementar T-3/T-6, igual que el criterio seguido en Fase 1 para el dataset mock — no es un requisito del usuario que necesite validación previa.

**Fase 3**: ninguna bloquea el inicio de la implementación una vez aprobada esta fase. Tres notas no bloqueantes:

- **Toggle visual de `CategoryPill` en `page.tsx`**: se decidió no cablear estado real de "seleccionado" entre los dos `CategoryPill` de la página (ver Reuso — detalle Fase 3) para no forzar un límite de Client Component solo por un efecto decorativo que ningún AC exige. Si se quiere ese toggle (ej. resaltar visualmente el pill activo al hacer click, sin filtrar nada), es un pedido explícito para una fase o spec posterior — implicaría un pequeño wrapper cliente (`"use client"`) alrededor de la fila de pills.
- **Copy de `EventFilterBar`** (placeholder del input, etiqueta y opciones del selector): decisión de autoría del `developer` al implementar T-2, mismo criterio que el copy de `Hero`/`PromoBanner` en fases anteriores — no requiere validación previa del usuario.
- **`@shadcn/select` vs. construirlo a mano**: se eligió agregar el primitivo `select` de shadcn (Grupo 0, T-1) en vez de reusar `CategoryPill`/`Badge` a modo de "chips" de categoría dentro de `EventFilterBar`, para que "selector de categoría" se lea inequívocamente como tal (un dropdown), distinto visualmente de la fila de `CategoryPill` que ya existe arriba en la página — evita que ambos controles se vean como si hicieran lo mismo. Si el usuario prefiere reusar `CategoryPill`/`Badge` en `EventFilterBar` en vez de un `Select` nuevo, es un cambio de diseño a validar antes de implementar T-1/T-2.
