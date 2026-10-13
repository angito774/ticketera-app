# Hero carousel de eventos destacados (rediseño del carousel actual)

**Estado**: approved
**Aprobado por**: nelson.nc421@gmail.com (aprobación explícita en chat, 2026-10-05)
**Fase**: 1 de 1

## Contexto

La spec `featured-hero.md` (`done`, no se reabre) dejó un carousel funcional en `src/modules/events/components/hero-carousel.tsx` (embla + `setInterval`, slide con título/fecha/recinto/CTA, flechas y puntos de 24px). El usuario aprobó un rediseño (maqueta `hero-carousel.html`): tag de categoría, precio "Desde", rail de próximos eventos con barra de progreso en escritorio, puntos de 44px en móvil, controles pausa/reanudar, y requisitos de accesibilidad y movimiento más estrictos. Esta spec **reemplaza el contenido** de `hero-carousel.tsx` y ajusta `Hero`; los datos (`listHeroEvents`, tipo `Event`) se reutilizan tal cual.

## Alcance

- **Incluye**:
  - Slides con imagen, degradado, tag, título, fecha/hora, lugar, "Desde S/ xx" y un único CTA "Comprar entradas".
  - Rail de próximos eventos (>= 860px) con barra de progreso en la activa; puntos de 44px (< 860px).
  - Autoplay de 6 s con `embla-carousel-autoplay`, y las pausas pedidas (hover, foco, arrastre, botón, pestaña oculta, reduced motion).
  - Accesibilidad: roles, `inert`, teclado, anuncio de cambios, objetivos >= 44px, foco visible.
  - Tope de slides en 5 (`HERO_MAX_EVENTS` pasa de 6 a 5).
  - Hook compartido `useCarouselAutoplay` con tests.
- **No incluye**:
  - Cambios de datos, schema, permisos o panel (marcar destacados sigue como en `featured-hero.md`).
  - Transición fade (`embla-carousel-fade`) ni efecto Ken Burns de la maqueta: el arrastre del carousel es de desplazamiento y el zoom suma movimiento sin AC (YAGNI).
  - Barra "sticky" y notas de diseño de la maqueta (son parte de la página demo, no del hero).
  - Fuentes nuevas (Bricolage/DM Sans): se usa la fuente del proyecto (`font-heading`/`font-sans`).
  - Cambios al buscador ni al headline del `Hero`.
  - Dark mode.

## Criterios de aceptación

- **AC-1 (slide)**: cada slide muestra: imagen (`next/image` con `fill` + `sizes`, `alt=""` porque el título está al lado), degradado, tag con `EVENT_CATEGORY_LABELS[category].singular`, título en `<h2>`, fecha y hora (`formatShortDate` · `formatTime`), `"{venue}, {city}"`, `"Desde"` + `formatPrice(price)` (el bloque de precio **no se renderiza si `price <= 0`**, porque `mapPublicEvent` da 0 cuando no hay precio) y **un único** enlace "Comprar entradas" a `/events/${event.id}` (`id` es el slug). Ningún otro enlace dentro de la slide.
- **AC-2 (carga de imagen)**: solo la primera slide usa `preload` (Next 16 deprecó `priority` en favor de `preload`; ver `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`). Las demás cargan en lazy (default).
- **AC-3 (contraste)**: el texto sobre la imagen es blanco puro (sin opacidad) sobre un degradado cuyo mínimo efectivo bajo el bloque de texto es `black/60` (izquierda y abajo, a la maqueta: `from-black/85` abajo y `from-black/90 via-black/55` lateral). Con fondo de imagen blanco el contraste texto/fondo es >= 4.5:1. El tag y el precio usan también texto claro opaco.
- **AC-4 (layout estable)**: el contenedor reserva alto (`h-[560px]` móvil, `h-[600px]` desde 860px, igual que la maqueta) sin depender de la imagen: sin salto de layout. Sin scroll horizontal a 375px; el título hace wrap (`text-balance`) y no se corta.
- **AC-5 (rail, >= 860px)**: se muestra un rail con un botón por evento (fecha corta · precio si `price > 0`, y título), `aria-label="Ir a {título}"`, `aria-current="true"` en el activo; al pulsar va a esa slide. La barra de progreso aparece **solo en el activo** y avanza 0→100% en 6 s **solo mientras el autoplay corre**; si está en pausa por cualquier motivo, la barra está vacía y se reinicia al reanudar. Por debajo de 860px el rail no se renderiza visualmente (`display: none`, fuera del árbol de accesibilidad).
- **AC-6 (puntos, < 860px)**: un botón por evento con área de 44x44px, `aria-label="Ir al evento {n}"`, `aria-current="true"` en el activo (visual: punto ancho). Desde 860px no son visibles.
- **AC-7 (controles)**: botones reales (`<button>`) anterior, siguiente y pausa/reanudar, de 44x44px mínimo, con `aria-label` ("Evento anterior", "Evento siguiente", "Pausar rotación automática"/"Reanudar rotación automática" según estado) y anillo de foco visible (`focus-visible`). Contador "n / total". El icono del botón de pausa cambia con el estado.
- **AC-8 (un solo evento)**: con 1 evento no hay rail, puntos, controles, contador, loop, arrastre ni autoplay (solo la slide). Con 0 eventos `Hero` no renderiza carousel (igual que hoy).
- **AC-9 (autoplay)**: con 2+ eventos y sin ningún motivo de pausa, avanza cada 6000 ms con loop, mediante `embla-carousel-autoplay` (el plugin se crea con `playOnInit: false` y las políticas de pausa las gobierna el hook, ver Contratos).
- **AC-10 (pausas)**: el autoplay se detiene mientras haya: mouse sobre el carousel, foco dentro del carousel (`focus-within`: mover el foco entre elementos internos no reanuda), arrastre/puntero presionado (`pointerDown`→`pointerUp` de embla), o el usuario lo pausó con el botón. Al cesar todos los motivos, reanuda con el ciclo completo de 6 s.
- **AC-11 (pestaña oculta)**: con `document.hidden === true` el autoplay se detiene; al volver visible reanuda (si no hay otro motivo de pausa).
- **AC-12 (reduced motion)**: con `prefers-reduced-motion: reduce` no hay autoplay ni se muestra el botón de pausa/reanudar (no hay nada que pausar); la preferencia se sigue en vivo (evento `change`). El estado inicial en SSR es "reduced" (sin autoplay hasta confirmar en cliente) y se lee con `useSyncExternalStore`, no con `setState` en un effect. Las transiciones CSS propias (barra, puntos) llevan `motion-reduce:transition-none`.
- **AC-13 (semántica a11y)**: el contenedor es `role="region"` con `aria-roledescription="carousel"` y `aria-label="Eventos destacados"` (lo da `Carousel`); cada slide es `role="group"` con `aria-roledescription="slide"` y `aria-label="{n} de {total}"` (lo da `CarouselItem`). Las slides no activas llevan `inert` (y `aria-hidden="true"`), la activa no. Flechas ←/→ cambian de slide (ya lo gestiona `Carousel`; no se duplica).
- **AC-14 (anuncio)**: existe un elemento `sr-only` con `aria-live="polite"` que anuncia `"{título}, {n} de {total}"` **solo** cuando el cambio de slide ocurre con el autoplay detenido (acción del usuario); la rotación automática no se anuncia. No se renderiza el texto inicial.
- **AC-15 (hook, test)**: `useCarouselAutoplay` cumple AC-9..AC-12 en sus tests con timers/mocks (ver T-2).
- **AC-16 (integración)**: `HeroProps` no cambia; `page.tsx` no se modifica; `HERO_MAX_EVENTS === 5`; el carousel queda dentro de un contenedor `max-w-7xl` con bordes redondeados sobre el fondo oscuro del `Hero`.
- **AC-17 (verificable por comando)**: sin código muerto ni imports huérfanos (se eliminan `ARROW_CLASSES`, el `setInterval`, el efecto `matchMedia` y el `sr-only` anteriores de `hero-carousel.tsx`); `npm run lint`, `npm run test` y `npm run build` pasan.

## Contratos

```ts
// src/hooks/use-carousel-autoplay.ts  (nuevo, compartido; "use client")
import type { CarouselApi } from "@/components/ui/carousel";

export interface UseCarouselAutoplayOptions {
  delay: number;      // ms entre slides (6000)
  enabled: boolean;   // false con < 2 slides: nunca corre
}
export interface UseCarouselAutoplayResult {
  plugin: ReturnType<typeof Autoplay>;     // pasar a <Carousel plugins={[plugin]} />
  setApi: (api: CarouselApi) => void;       // pasar a <Carousel setApi />
  api: CarouselApi | undefined;
  canAutoplay: boolean;     // enabled && !reducedMotion (si false: ocultar el botón de pausa)
  userPaused: boolean;      // pausa elegida con el botón
  isRunning: boolean;       // canAutoplay && !userPaused && !hover && !focus && !dragging && !hidden
  runId: number;            // se incrementa cada vez que isRunning pasa a true (reinicia la barra)
  toggle: () => void;       // alterna userPaused
  containerProps: {         // esparcir en <Carousel>
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: (e: React.FocusEvent<HTMLElement>) => void; // solo limpia si e.relatedTarget no está dentro de e.currentTarget
  };
}
export function useCarouselAutoplay(o: UseCarouselAutoplayOptions): UseCarouselAutoplayResult;
```

Plugin: `Autoplay({ delay, playOnInit: false, stopOnInteraction: false, stopOnMouseEnter: false, stopOnFocusIn: false })`. El hook llama `plugin.play()` / `plugin.stop()` cuando cambia `isRunning`, escucha `pointerDown`/`pointerUp` de la API, y en cada `select` llama `plugin.reset()` para que el temporizador y la barra queden alineados (el developer confirma los nombres contra los `.d.ts` de `embla-carousel-autoplay` 8.6.0).

```ts
// src/modules/events/components/hero-slide.tsx
interface HeroSlideProps { event: Event; index: number; total: number; active: boolean }   // active=false => inert + aria-hidden; preload solo si index === 0
// src/modules/events/components/hero-rail.tsx
interface HeroRailProps { events: Event[]; current: number; isRunning: boolean; runId: number; delay: number; onSelect: (index: number) => void }
// src/modules/events/components/hero-carousel-controls.tsx  (dentro de <Carousel>; usa useCarousel())
interface HeroCarouselControlsProps { total: number; current: number; canAutoplay: boolean; userPaused: boolean; onToggle: () => void; onSelect: (i: number) => void }
// src/modules/events/components/hero-carousel.tsx  (contrato público sin cambios)
interface HeroCarouselProps { events: Event[]; className?: string }

// src/modules/events/services/event-list.service.ts
export const HERO_MAX_EVENTS = 5;
```

Keyframes global (T-1, `globals.css`): `@keyframes carousel-progress { from { width: 0 } to { width: 100% } }`; la barra usa `animation: carousel-progress {delay}ms linear forwards` con `key={`${current}-${runId}`}` solo cuando `isRunning`.

Colores: tokens existentes (`bg-primary`/`text-primary-foreground` en el CTA, `ring-ring` para foco), no los hex de la maqueta (ver Preguntas abiertas).

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Carousel base (Embla, teclado ←/→, roles) | `src/components/ui/carousel.tsx`; `npx shadcn@latest search @shadcn -q carousel` → `@shadcn/carousel` ya instalado | reusar; **no** re-ejecutar `shadcn add carousel` (sobrescribiría el archivo) |
| Autoplay | nada en `src/` salvo el `setInterval` de `hero-carousel.tsx` | agregar `embla-carousel-autoplay@8.6.0` (peer `embla-carousel@8.6.0`, ya instalado) y reemplazar el `setInterval` |
| Fade | `embla-carousel-fade` | no agregar (fuera de alcance) |
| Hook de reduced motion | `matchMedia` inline en `hero-carousel.tsx`; nada en `src/hooks/` | extraer dentro de `useCarouselAutoplay` (único consumidor; no se crea hook aparte) |
| Fecha/hora/precio | `formatShortDate`, `formatTime`, `formatPrice` en `src/lib/format.ts` | reusar |
| Etiqueta de categoría | `EVENT_CATEGORY_LABELS` en `event.types.ts` | reusar (la maqueta tiene "Festival · Rock e indie"; el modelo solo tiene `category`) |
| Datos | `listHeroEvents`, `Event`, `Hero` | reusar; solo cambia el tope |
| Botones | `ui/button.tsx` | reusar para controles/rail con clases de tamaño `size-11` |
| Imagen | patrón `next/image fill + sizes` (`EventCard`, carousel actual) | reusar; `preload` en vez de `priority` |
| Estilo de hook con test | `src/hooks/use-countdown.test.ts` (fake timers + `renderHook`) | seguir el patrón |

## Plan de tareas

### Grupo 0 (serial)
- T-1: instalar `embla-carousel-autoplay@8.6.0` y agregar el `@keyframes carousel-progress` — archivos: `package.json`, `package-lock.json`, `src/app/globals.css` — tests: no — cubre: AC-5, AC-9

### Grupo 1 (paralelo)
- T-2: hook `useCarouselAutoplay` (plugin, pausas, reduced motion con `useSyncExternalStore`, visibilidad, `runId`, `containerProps`) + tests (mock del plugin y de la API con emisor de eventos, `matchMedia` y `document.hidden` simulados) — archivos: `src/hooks/use-carousel-autoplay.ts`, `src/hooks/use-carousel-autoplay.test.ts` — tests: sí (play/stop según cada motivo de pausa, reanudación, blur interno no reanuda, reduced motion y `change`, `enabled=false`, `runId`) — cubre: AC-9, AC-10, AC-11, AC-12, AC-15
- T-3: slide y rail — archivos: `src/modules/events/components/hero-slide.tsx`, `src/modules/events/components/hero-slide.test.tsx`, `src/modules/events/components/hero-rail.tsx` — tests: sí, solo de `HeroSlide` (precio 0 oculto, un único enlace a `/events/{id}`, `inert`/`aria-hidden` según `active`, `alt=""`); el rail es presentacional — cubre: AC-1, AC-2, AC-3, AC-4, AC-5, AC-13
- T-4: controles (prev/next/pausa/contador) y puntos — archivos: `src/modules/events/components/hero-carousel-controls.tsx` — tests: no (presentacional; la lógica está en T-2) — cubre: AC-6, AC-7, AC-12

### Grupo 2 (serial, depende de T-1..T-4)
- T-5: componer `HeroCarousel` (plugin/hook, estado `current`, `inert`, región `aria-live` solo con autoplay detenido, caso de 1 evento), ajustar `Hero` (contenedor `max-w-7xl`, bordes redondeados) y `HERO_MAX_EVENTS = 5` — archivos: `src/modules/events/components/hero-carousel.tsx`, `src/modules/events/components/hero.tsx`, `src/modules/events/services/event-list.service.ts` — tests: no (composición; el reviewer valida con lint/test/build y revisión manual de AC-3/AC-4) — cubre: AC-8, AC-13, AC-14, AC-16, AC-17

Cobertura: cada AC tiene tarea; las tareas del grupo 1 tocan archivos disjuntos.

## Preguntas abiertas

Ninguna bloquea la aprobación; valores por defecto indicados.

1. **Color del CTA y tag**: la maqueta usa amarillo (`#ffcf3f`) que no existe en el sistema de diseño (primary es índigo `#4F46E5`). Por defecto: tokens existentes (`bg-primary`). Si se quiere el amarillo, hay que agregar un token en `globals.css` (volvería a Grupo 0).
2. **Tag de categoría**: la maqueta muestra "Festival · Rock e indie"; el modelo `Event` solo tiene `category` (`concert` | `theater`). Por defecto se muestra "Concierto"/"Teatro". Subcategorías requerirían cambio de datos (fuera de alcance).
3. **Mínimo de 3 slides**: el diseño dice 3-5; con 1-2 destacados el carousel igual funciona (1 = sin controles). Por defecto no se fuerza un mínimo.
4. **Observación (no se toca)**: `src/components/ui/carousel.tsx` importa `cn` desde el paquete `"cn"` en vez de `@/lib/utils`; funciona hoy, pero conviene revisarlo aparte.
5. **Fade vs deslizamiento**: la maqueta hace crossfade; aquí queda el deslizamiento de embla por el requisito de arrastre. Cambiarlo implicaría `embla-carousel-fade` y revisar `inert` durante la transición.
