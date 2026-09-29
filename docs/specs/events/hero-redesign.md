# Rediseño visual del Hero (fondo oscuro degradado + búsqueda flotante + grilla bento)

**Estado**: done
**Aprobado por**: usuario — 2026-09-25
**Fase**: 1 de 1 completada

## Contexto

`docs/specs/events/landing-page.md` (Estado: `done`, sin fases pendientes) ya implementó la landing pública completa, incluyendo el `Hero` actual (`src/modules/events/components/hero.tsx`): headline + subtítulo + buscador visual sobre fondo plano `bg-surface-warm` (AC-2/AC-13 de esa spec, que siguen vigentes y no se tocan aquí).

El usuario vio el resultado y pidió un rediseño visual del `Hero`, usando como referencia `https://www.joinnus.com/` (franja superior con degradado oscuro + barra de búsqueda blanca flotante, que luego transiciona a una página blanca) y `https://www.ticketmaster.com/` (grilla tipo "bento" de imágenes de eventos). Ambos sitios ya fueron investigados en el navegador y el diseño exacto fue confirmado conceptualmente con el usuario en la conversación previa a esta spec (ver resumen de decisiones abajo); esta spec formaliza esa confirmación en criterios verificables y un plan de implementación. Es trabajo nuevo, posterior al cierre de `landing-page.md`: esa spec **no se reabre ni se edita**, solo se referencia como contexto de los contratos existentes (`HeroProps`, `events.service.ts`).

En paralelo a esta spec se actualizó `design-system/ticketera/MASTER.md` (nueva sección "Hero — Dark Gradient + Floating Search + Bento Grid (v2)" en Component Specs, más una nota de excepción en Style Guidelines) para dejar documentado este patrón para futuras páginas.

## Alcance

- **Incluye**:
  - Reemplazar el fondo `bg-surface-warm` del `Hero` por un degradado oscuro radial (navy/negro, sin naranja de marca).
  - Envolver el buscador visual existente (Input + Button, sin cambios de comportamiento) en una tarjeta blanca (`bg-card`) con sombra y bordes redondeados, que "flota" sobre el degradado.
  - Agregar, debajo de la tarjeta de búsqueda y dentro del mismo `Hero`, una grilla bento (1 tile grande + 4 tiles pequeños) con imágenes de Unsplash **distintas** a las de `events.service.ts`, cada una con overlay oscuro y el título del tile superpuesto en texto blanco.
  - Definir el tipo de dato y el dataset propio de los tiles bento dentro de `hero.tsx` (nuevo, decorativo, no consumido por ningún otro componente).
  - Comportamiento responsive de la grilla bento sin overflow horizontal en mobile.
- **No incluye** (explícito, para frenar scope creep):
  - Cualquier lógica real: ningún tile de la grilla bento, ni el buscador, ejecuta navegación, búsqueda, ni cambia ningún dato mostrado en el resto de la página. Mismo alcance "solo visual" que el resto de la landing (`docs/specs/events/landing-page.md` AC-13).
  - Cambios a `events.service.ts` (tipo `Event`, dataset de 10 eventos, o las 3 funciones del servicio): no se le agregan campos ni se reutilizan sus `imageUrl` en la grilla bento.
  - Cambios a `HeroProps` (`headline?`, `subtitle?`, `className?`): el contrato público del componente no cambia; `src/app/page.tsx` sigue invocando `<Hero />` sin props adicionales.
  - Cambios a `next.config.ts`: las nuevas imágenes de la grilla bento siguen sirviéndose desde `images.unsplash.com`, host ya declarado en `images.remotePatterns`.
  - Reutilizar `--surface-warm` en el Hero (el token sigue existiendo para `PromoBanner`, que no se toca).
  - Nuevos tokens de color globales en `globals.css`: el degradado se implementa como clases Tailwind directamente en `hero.tsx` (ver Reuso y Contratos), no como variables CSS compartidas.
  - Cualquier otro componente de la landing (`Header`, `CategoryPill`, `EventCarousel`, `EventSection`, `EventCard`, `EventFilterBar`, `PromoBanner`, `Footer`) o `src/app/page.tsx`: ninguno se modifica.
  - Dark mode / toggle: fuera de alcance, igual que en `landing-page.md`.

## Criterios de aceptación

- **AC-1**: La sección raíz del `Hero` ya no usa `bg-surface-warm`; usa un fondo con degradado oscuro (radial, anclado arriba, tonos navy/negro — ver hex exactos en Contratos), sin ninguna clase de color primario/secundario naranja (`bg-primary`, `bg-secondary`, etc.) en el fondo del `section`.
- **AC-2**: El buscador (mismo `Input` + `Button` visual-only ya existentes, sin `onClick`/`onChange` nuevos) está envuelto en un contenedor con `bg-card` (o equivalente que resuelva a blanco en modo claro), esquinas redondeadas y sombra visible, de modo que se perciba como una tarjeta sólida flotando sobre el degradado oscuro.
- **AC-3**: Debajo de la tarjeta de búsqueda, dentro del mismo `Hero`, existe una grilla de exactamente 5 tiles de imagen (1 grande + 4 pequeños): cada tile renderiza una imagen (`next/image`, con `fill` + `sizes`, mismo patrón que `EventCard`), un overlay degradado oscuro sobre la imagen, y el título del tile en texto blanco superpuesto y legible sobre el overlay.
- **AC-4**: Ninguna de las `imageUrl` usadas por los tiles de la grilla bento coincide con ninguna `imageUrl` del dataset `EVENTS` de `src/modules/events/services/events.service.ts` (verificable por comparación directa de las URLs).
- **AC-5**: En viewport mobile (375px de referencia), la grilla bento no genera scroll horizontal de página y sigue siendo legible (puede colapsar a menos columnas que en desktop).
- **AC-6**: Ningún elemento nuevo (tiles de la grilla bento, contenedor de la tarjeta de búsqueda) dispara navegación, búsqueda real, llamada de red, ni cambia cualquier dato mostrado en otra parte de la página — mismo criterio que AC-13 de `landing-page.md`, extendido a los elementos nuevos de esta spec.
- **AC-7**: `HeroProps` (`headline?: string`, `subtitle?: string`, `className?: string`) no cambia de forma; `src/app/page.tsx` sigue compilando y renderizando `<Hero />` sin modificaciones.

## Contratos

### Tipo de dato propio del Hero (nuevo, local a `hero.tsx`)

```ts
// dentro de src/modules/events/components/hero.tsx — no se exporta fuera del archivo,
// no vive en src/modules/events/types/ porque no lo consume ningún otro componente (YAGNI)
interface HeroBentoTile {
  title: string;
  imageUrl: string; // host images.unsplash.com, URL distinta a las de events.service.ts (AC-4)
  span: "large" | "small";
}
```

Dataset fijo de 5 tiles (1 `"large"` + 4 `"small"`), definido como `const BENTO_TILES: HeroBentoTile[]` en el propio `hero.tsx`. Decisión de autoría (no bloqueante, ver Preguntas abiertas): los títulos son decorativos pero coherentes con el universo del dataset real (mismos artistas/shows que `events.service.ts`, ej. "Bad Bunny en Lima", "Festival Vivo por el Rock", "El Fantasma de la Ópera", etc.) para que la grilla se sienta parte del mismo catálogo, aunque la imagen de cada tile sea una URL de Unsplash nueva y distinta a la usada por el `Event` real homónimo (si lo hay). No se reutiliza el tipo `Event` completo: `HeroBentoTile` no necesita `date`, `venue`, `price`, `category` ni `id`, y esos campos quedarían muertos en un tile puramente promocional (YAGNI).

### Fondo degradado del Hero (Tailwind, sin nuevo token global)

```
bg-[radial-gradient(ellipse_at_top,_#1a2332_0%,_#0a0e1a_45%,_#000000_100%)]
```

(o equivalente vía `style={{ background: "radial-gradient(ellipse at top, #1a2332 0%, #0a0e1a 45%, #000000 100%)" }}` si la clase arbitraria de Tailwind resulta poco legible en JSX — decisión de implementación del developer, el resultado visual es el contrato, no el mecanismo). Estos 3 stops de color están documentados también en `design-system/ticketera/MASTER.md` → Component Specs → "Hero — Dark Gradient + Floating Search + Bento Grid (v2)".

### Estructura de la grilla bento (sketch, no prescriptivo en clases exactas)

```
<section class="hero degradado">
  <headline + subtitle />
  <div class="tarjeta blanca flotante"> <!-- bg-card, rounded-*, shadow-* -->
    <Input /> <Button />
  </div>
  <div class="grid bento"> <!-- grid-cols-2 en mobile, grid-cols-4 en sm+ -->
    <Tile span="large" />  <!-- col-span-2 row-span-2 en desktop -->
    <Tile span="small" />
    <Tile span="small" />
    <Tile span="small" />
    <Tile span="small" />
  </div>
</section>
```

Cada `Tile` es un contenedor `relative` con: `next/image` (`fill`, `sizes` acorde al tamaño del tile), un `div` absoluto con overlay (`bg-gradient-to-t from-black/70 via-black/10 to-transparent`), y el título en un `div`/`span` absoluto inferior (`text-white font-semibold`, con padding suficiente para no tocar el borde).

`HeroProps` no cambia (ver Alcance): `headline?: string`, `subtitle?: string`, `className?: string`, todos con default ya definidos en el propio componente.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Fondo degradado oscuro del Hero | nada reusable en `src/`; búsqueda en registro shadcn (`npx shadcn@latest search @shadcn -q "gradient"`) sin resultados | crear como clase Tailwind arbitraria directamente en `hero.tsx`, sin nuevo token en `globals.css` (single consumer hoy, YAGNI — ver nota de "promover a token" en `design-system/ticketera/MASTER.md` si un futuro consumidor lo necesita) |
| Tarjeta blanca flotante para el buscador | `--card` (`#FFFFFF` en modo claro) ya definido en `globals.css` y expuesto como utilidad `bg-card`; `src/components/ui/card.tsx` (compound `Card`/`CardContent`/`CardFooter`) ya instalado (Fase 1 de `landing-page.md`) | reusar el token `bg-card` + utilidades Tailwind (`rounded-*`, `shadow-*`) directamente sobre un `div`, **no** el compound `Card` (pensado para slots título/contenido/footer que no aplican a un row de Input+Button; envolverlo agregaría indirección sin beneficio, KISS) |
| Buscador (Input + Button) | ya existe en `hero.tsx` (Fase 2 de `landing-page.md`), visual-only | reusar tal cual, sin tocar su lógica ni sus props |
| Overlay/gradiente sobre imagen de tile | búsqueda en registro shadcn (`gradient`, `overlay`, `bento`) sin coincidencias útiles (`bento` solo devuelve `@shadcn/sidebar-08`, un bloque de sidebar no relacionado) | crear con Tailwind directo (`bg-gradient-to-t from-black/70 via-black/10 to-transparent`), sin dependencia nueva |
| Imagen remota de cada tile | `next/image` + `images.remotePatterns` (`images.unsplash.com`) ya configurado en `next.config.ts` (Fase 1 de `landing-page.md`); patrón `fill` + `sizes` ya usado en `EventCard` | reusar tal cual, sin tocar `next.config.ts` (mismo host) |
| Icono de lupa del buscador | `lucide-react` (`Search`) ya usado en `hero.tsx` | reusar tal cual |
| Tipo `Event` / `events.service.ts` | dataset y tipo ya existen, con su propio contrato (10 eventos, 6 concert/4 theater) | **no tocar**; los tiles bento usan un tipo propio (`HeroBentoTile`) y URLs de imagen nuevas, nunca las de `EVENTS` (AC-4) |
| `cn()` helper | `src/lib/utils.ts` | reusar |

## Plan de tareas

### Grupo 1 (una sola tarea; no hay archivos globales/compartidos que tocar, así que no hace falta Grupo 0)

- **T-1**: Redisear `Hero`: reemplazar `bg-surface-warm` por el degradado oscuro (ver Contratos); envolver el buscador existente en el contenedor `bg-card` flotante; agregar `const BENTO_TILES: HeroBentoTile[]` (5 tiles, URLs de Unsplash nuevas y distintas a `events.service.ts`) y renderizar la grilla bento (1 tile grande + 4 pequeños) debajo de la tarjeta de búsqueda, cada tile con `next/image` + overlay + título superpuesto; grilla responsive sin overflow horizontal en mobile. — archivos: `src/modules/events/components/hero.tsx` — tests: no (componente presentacional, sin lógica de negocio — mismo criterio que el resto de componentes visuales de `landing-page.md`, ver `docs/SETUP.md` §3) — cubre: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7.

**Al cierre de esta spec**: el proyecto sigue compilando (`npm run build`), `npm run lint` y `npm run test` pasan; `HeroProps` no cambió, por lo que `src/app/page.tsx` no requiere ningún ajuste; el Hero de la landing pública queda con el fondo oscuro degradado, la tarjeta de búsqueda flotante y la grilla bento, sin ningún nuevo comportamiento funcional.

## Preguntas abiertas

Ninguna bloquea el inicio de la implementación una vez que un humano apruebe esta spec. Notas de autoría, no bloqueantes:

- **Títulos de los tiles bento**: se decidió que referencien el mismo universo de artistas/shows que `events.service.ts` (coherencia visual) aunque la imagen sea siempre una URL distinta. Si el usuario prefiere tiles genéricos sin relación con el dataset real, es un ajuste cosmético menor sobre T-1, no un cambio de contrato.
- **Stops exactos del degradado** (`#1a2332` / `#0a0e1a` / `#000000`, radial anclado arriba): son la interpretación de autoría de "igual que Joinnus... tonos oscuros neutros/azulados"; si el usuario quiere un match píxel-a-píxel con joinnus.com, es una iteración visual posterior sobre el mismo archivo, no bloqueante.
- **Token de gradiente global vs. clases locales**: se decidió no promoverlo a `globals.css` por tener un solo consumidor hoy (YAGNI); si una página futura reutiliza este mismo fondo oscuro, se recomienda entonces extraerlo a `--color-hero-gradient-*` en `globals.css` (documentado como nota en `design-system/ticketera/MASTER.md`).
