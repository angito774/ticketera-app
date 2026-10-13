# Rediseño del home: Hero claro con carrusel de contenedor (Fase 1) y Footer oscuro (Fase 2)

**Estado**: approved
**Aprobado por**: Nelson (usuario), 2026-10-07
**Fase**: 1 de 2 (Hero y Footer son independientes y se implementan en paralelo dentro de este mismo plan)

## Contexto

El usuario pidió replicar el **estilo, ubicaciones y formas** de la web de referencia `https://ticketera.mentec.dev/` manteniendo el **contenido actual** de Ticketera (marca, textos, eventos reales, columnas del footer Empresa / Ayuda / Legal). Se trabaja con valores medidos del DOM de la referencia (ancho 1745px), sin captura de pantalla. El rediseño completo tiene fases posteriores (header, barra de filtros bajo el hero); esta spec cubre solo:

- **Fase 1 (Hero)**: de fondo oscuro con degradado radial centrado a cabecera **clara**, titular alineado a la izquierda con acento `--primary`, y carrusel dentro del contenedor (`max-w-7xl`) con esquinas redondeadas (~1216x463 en desktop).
- **Fase 2 (Footer)**: de `bg-muted/30` claro a fondo **oscuro**, con redes como cuadros redondeados oscuros y enlaces en columnas a la derecha.

Specs relacionadas (no se editan): `docs/specs/events/hero-carousel.md` y `docs/specs/events/hero-redesign.md` (hero oscuro anterior, `done`), `docs/specs/shared/accesibilidad-correcciones.md`. Esta spec **sustituye visualmente** el hero oscuro pero conserva todo el comportamiento y la accesibilidad del carrusel.

## Alcance

- **Incluye**:
  - `Hero`: fondo claro sin degradado, contenedor `mx-auto max-w-7xl px-4 pt-8 md:px-6 md:pt-12 lg:px-8`, h1 a la izquierda (48px) con tramo final en color `text-primary`, subtítulo 18px `text-muted-foreground`, buscador actual en versión compacta alineada a la izquierda, carrusel debajo con esquinas redondeadas.
  - `HeroSlide`: altura ~463px en desktop, badge pastilla 12px, título ~60px en desktop, resto de contenido actual (fecha·hora, lugar, "Desde" precio, botón "Comprar entradas").
  - `HeroRail` y `HeroCarouselControls`: reajuste de posición/tamaño para que quepan en el nuevo alto sin solaparse ni desbordar.
  - `Footer`: fondo oscuro, texto gris claro AA, títulos en mayúsculas pequeñas, layout marca+redes a la izquierda y 3 columnas de enlaces, separador, copyright; "Privacidad" enlazada a `/privacidad`.
- **No incluye** (explícito):
  - Header (sticky 65px, blur): fuera de alcance.
  - Barra de filtros bajo el hero y reubicación del buscador (Fase 3 del rediseño): aquí el buscador se queda en el hero, compacto.
  - Libro de Reclamaciones, TikTok, YouTube, nuevas páginas o rutas, nuevas columnas o items de footer.
  - URLs de redes sociales: los iconos Facebook / Instagram / Twitter siguen siendo no interactivos (sin destino).
  - Aviso de cookies: no existe contenido equivalente en el repo (búsqueda `cookie` sin resultados); no se inventa (ver Preguntas abiertas).
  - Cambios en datos, `listHeroEvents`, `HERO_MAX_EVENTS` (5), hooks de autoplay (`use-carousel-autoplay`), `src/components/ui/carousel.tsx`, `globals.css`, `layout.tsx`, `page.tsx`.
  - Dark mode.

## Criterios de aceptación

### Fase 1 — Hero

- **AC-1**: El `<section>` raíz del `Hero` no tiene `style` de fondo ni degradado oscuro (se elimina el `radial-gradient`) ni clases `bg-black`/`text-white` en el titular; el fondo es el de la página (claro).
- **AC-2**: El contenido del `Hero` se envuelve en un contenedor con las clases `mx-auto max-w-7xl px-4 pt-8 md:px-6 md:pt-12 lg:px-8`; el carrusel queda dentro de ese mismo contenedor (ancho ≤ 1216px a 1745px de viewport).
- **AC-3**: El `h1` está alineado a la izquierda (sin `text-center`), usa `text-5xl`/48px en desktop y color `text-foreground`; su texto completo sigue siendo "Encuentra los mejores eventos cerca de ti" y el tramo final ("cerca de ti") se renderiza en un `<span>` con `text-primary`.
- **AC-4**: El subtítulo (texto actual sin cambios) está debajo del h1, a la izquierda, `text-lg` (18px) y `text-muted-foreground`.
- **AC-5**: El buscador conserva su función (`<Form action="/events" role="search">` con `Input name="q"`, `aria-label="Buscar eventos"` y botón "Buscar") y se muestra compacto: alineado a la izquierda, ancho máximo ~`max-w-xl`, sin tarjeta flotante oscura ni sombra pronunciada, sobre fondo claro con borde (`border`) legible.
- **AC-6**: El carrusel tiene esquinas redondeadas con `overflow-hidden` (`rounded-2xl` o mayor) y, en viewport ≥ `min-[860px]`, cada slide mide ~463px de alto (±8px; clase de altura fija, p. ej. `h-[463px]`); en móvil mantiene una altura suficiente para el contenido sin recortarlo (mínimo actual permitido).
- **AC-7**: Cada slide muestra: imagen full-bleed con overlay oscuro (contraste de texto blanco sobre imagen ≥ 4.5:1 conservado por los gradientes), badge de categoría en pastilla con texto 12px (`text-xs`), título `h2` blanco de ~60px en desktop (`lg:text-6xl`), "fecha · hora", "lugar, ciudad", "Desde S/ …" (solo si `price > 0`) y enlace "Comprar entradas" a `/events/{id}`.
- **AC-8**: En desktop (≥ `min-[860px]`) el riel de eventos (`HeroRail`) con 5 eventos cabe completo dentro del alto de 463px sin desbordar ni solaparse con el bloque de texto del slide ni con los controles; el botón activo conserva la barra de progreso.
- **AC-9**: Se conserva toda la accesibilidad del carrusel: `aria-label="Eventos destacados"`, autoplay con botón de pausa/reanudar, región `aria-live="polite"` (`sr-only`), slides inactivos con `inert` + `aria-hidden="true"`, `aria-label="{n} de {total}"` por slide, respeto a `prefers-reduced-motion` (clases `motion-reduce:*` y hook de autoplay sin cambios), objetivos táctiles ≥ 44px (`size-11`/`min-h-11`).
- **AC-10**: `HeroProps` solo se extiende de forma retrocompatible (ver Contratos); `src/app/page.tsx` (`<Hero featuredEvents={heroEvents} />`) compila y se renderiza sin modificarse. Si `featuredEvents` está vacío no se renderiza el carrusel y la sección conserva espaciado inferior.
- **AC-11**: Los 4 tests existentes de `hero-slide.test.tsx` siguen pasando (un solo enlace `/events/rock-fest`, `img alt=""`, h2 con título, "Concierto", "Desde"; sin "Desde" si `price <= 0`; activo sin `inert`/`aria-hidden`; inactivo con ambos). Se añade `hero.test.tsx` que cubre AC-1, AC-3, AC-4, AC-5 y AC-10.

### Fase 2 — Footer

- **AC-12**: El `<footer>` tiene fondo oscuro mediante el token existente `bg-brand-deep` (`#1E1B4B`, ver Preguntas abiertas sobre `#000814`); ya no usa `bg-muted/30`, `border-t border-border` ni clases `text-muted-foreground`/`text-foreground` sobre fondo oscuro.
- **AC-13**: El texto secundario del footer (descripción, items de columnas, copyright) usa `text-white/70` o más claro (contraste ≥ 4.5:1 sobre `#1E1B4B`), y los separadores usan `border-white/10` o `bg-white/10` (el `Separator` actual con color de borde claro se sobreescribe).
- **AC-14**: Los títulos de columna (Empresa, Ayuda, Legal) se muestran en mayúsculas pequeñas (`text-xs uppercase tracking-wider`), `font-semibold`/negrita y `text-white`, como `<h3>`. El texto "Empresa/Ayuda/Legal" en el DOM no cambia (la mayúscula es CSS).
- **AC-15**: Layout: bloque izquierdo con marca "Ticketera", la descripción actual y las 3 redes (Facebook, Instagram, Twitter); a la derecha las 3 columnas de enlaces. Responsive: grilla de 2 columnas en móvil y 4 desde `sm` (columnas: marca + 3 listas). Sin scroll horizontal a 375px.
- **AC-16**: Las redes se muestran como cuadros redondeados oscuros (p. ej. `size-10 rounded-lg bg-white/10`) con el icono actual (`Share2`, `Camera`, `X`), conservando `role="img"` + `aria-label` (Facebook / Instagram / Twitter). No son enlaces ni botones (no tienen destino): sin `href`, sin `role="button"`, sin `cursor-pointer`.
- **AC-17**: Los items de las columnas son texto plano salvo "Privacidad", que es un `<a>` (`next/link`) con `href="/privacidad"` y estilos de foco visibles sobre fondo oscuro (`focus-visible:ring-*`/`underline` al hover). Ningún otro item es enlace; no se añaden items ni rutas.
- **AC-18**: Bajo un separador, el copyright "© {año} Ticketera. Todos los derechos reservados." queda alineado a la izquierda (centrado en móvil si es necesario). No se renderiza aviso de cookies (sin contenido existente).
- **AC-19**: `Footer` mantiene la firma `Footer({ className })` y se sigue renderizando sin props en las 5 páginas que lo usan (`/`, `/events`, `/events/[id]`, `/my-tickets`, `/privacidad`) sin modificar esas páginas. Se añade `footer.test.tsx` que cubre AC-14, AC-16, AC-17 y AC-18.
- **AC-20** (transversal): `npm run lint`, `npm run test` y `npm run build` pasan al cierre.

## Contratos

### `HeroProps` (retrocompatible)

```ts
interface HeroProps {
  /** Parte inicial del titular. Default: "Encuentra los mejores eventos" */
  headline?: string
  /** Tramo final del titular, resaltado con text-primary. Default: "cerca de ti" */
  headlineAccent?: string
  subtitle?: string // sin cambios
  className?: string // sin cambios
  featuredEvents?: Event[] // sin cambios
}
```

El `h1` renderiza `{headline} <span className="text-primary">{headlineAccent}</span>`; el texto concatenado coincide con el titular actual. Sin props, el resultado visible es idéntico en contenido al actual. `HeroSlideProps`, `HeroRailProps`, `HeroCarouselProps` y `HeroCarouselControlsProps` **no cambian**.

### `Footer`

Sin cambios de props (`FooterProps { className?: string }`). `FOOTER_COLUMNS` pasa a admitir un `href` opcional por item para no hardcodear "Privacidad" en el JSX:

```ts
interface FooterItem {
  label: string
  /** Solo si el destino existe hoy; sin href se renderiza como texto. */
  href?: string
}
interface FooterColumn {
  title: string
  items: FooterItem[]
}
// Legal -> [{ label: "Términos y condiciones" }, { label: "Privacidad", href: "/privacidad" }]
```

### Guía de estilos (no prescriptiva en clases exactas)

- Hero: `bg` ninguno; h1 `text-4xl font-bold tracking-tight text-foreground md:text-5xl`; subtítulo `mt-3 text-base text-muted-foreground md:text-lg`; buscador `mt-6 max-w-xl`; carrusel `mt-8` con `rounded-2xl overflow-hidden`.
- Slide: `h-[560px] min-[860px]:h-[463px]` (móvil necesita más alto por el apilado de controles); título `text-3xl min-[860px]:text-5xl lg:text-6xl`.
- Footer: `bg-brand-deep text-white/70`; títulos `text-xs font-semibold uppercase tracking-wider text-white`.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Carrusel accesible con autoplay | `hero-carousel.tsx`, `hero-slide.tsx`, `hero-rail.tsx`, `hero-carousel-controls.tsx`, `use-carousel-autoplay` | **reusar** sin tocar `hero-carousel.tsx` ni el hook; **extender** solo clases de `hero-slide`, `hero-rail`, `hero-carousel-controls` |
| Buscador | Form + Input + Button en `hero.tsx` | **reusar** (mismo markup funcional, solo cambia contenedor) |
| Fondo oscuro del footer | token `--brand-deep` (`#1E1B4B`) en `globals.css`, usado en `event-detail-hero`, `seat-map`, `ticket-selection` | **reusar** `bg-brand-deep`; no se define un token nuevo `#000814` (ver Preguntas abiertas) |
| Separador | `src/components/ui/separator.tsx` | **reusar** con `className="bg-white/10"` |
| Enlace | `next/link` (ya usado en `hero-slide.tsx`) | **reusar** |
| Cuadros de redes | `lucide-react` (`Share2`, `Camera`, `X`) ya en `footer.tsx`; búsqueda shadcn (`social`, `footer`) no aporta primitivo útil; `Button` implicaría rol interactivo sin destino | **crear** con clases Tailwind en `footer.tsx` (no hay otro consumidor, YAGNI) |
| Pastilla de badge | `<span>` actual en `hero-slide.tsx`; `@shadcn/badge` existe pero el badge es solo un `span` estático ya probado | **reusar** el span actual, ajustando tamaño (evita migración con riesgo en tests) |
| Acento de color | token `--primary` (`#4F46E5`) vía `text-primary` | **reusar** |
| Tests | `hero-slide.test.tsx` (mocks de `carousel` y `next/image`) | **extender** (mantener) y **crear** `hero.test.tsx` y `footer.test.tsx` siguiendo el mismo estilo de mocks |

## Plan de tareas

Sin Grupo 0: no se instalan dependencias, no se agrega nada de shadcn y no se tocan archivos globales (`layout.tsx`, `globals.css`, `components.json`). Los conjuntos de archivos son disjuntos.

### Grupo 1 (paralelo)

- **T-1**: Rediseñar `Hero`: quitar fondo oscuro, contenedor `max-w-7xl`, h1 a la izquierda con `headlineAccent`, subtítulo, buscador compacto, carrusel con esquinas redondeadas; test del hero (mock de `HeroCarousel` y `next/form`). — archivos: `src/modules/events/components/hero.tsx`, `src/modules/events/components/hero.test.tsx` — tests: sí (hero.test.tsx: sin estilo de fondo, h1 con acento, buscador `role="search"` con `name="q"`, carrusel solo si hay eventos) — cubre: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-10, AC-11
- **T-2**: Ajustar `HeroSlide`: alto 463px en desktop, badge `text-xs`, título hasta `lg:text-6xl`, padding inferior reducido para el nuevo alto; mantener estructura y atributos a11y; verificar/ajustar `hero-slide.test.tsx` solo si algún selector depende de clases cambiadas. — archivos: `src/modules/events/components/hero-slide.tsx`, `src/modules/events/components/hero-slide.test.tsx` — tests: sí (los 4 existentes deben seguir pasando) — cubre: AC-6, AC-7, AC-9, AC-11
- **T-3**: Compactar `HeroRail` (alto del botón, `top`/`bottom`, ancho) para que 5 eventos quepan en 463px y reposicionar `HeroCarouselControls` sin solapamientos ni pérdida de `size-11`, `aria-*`, `motion-reduce`. — archivos: `src/modules/events/components/hero-rail.tsx`, `src/modules/events/components/hero-carousel-controls.tsx` — tests: no (presentacional; sin lógica nueva) — cubre: AC-8, AC-9
- **T-4**: Rediseñar `Footer`: fondo `bg-brand-deep`, tipografía y contraste, layout 2/4 columnas, redes como cuadros oscuros no interactivos, "Privacidad" → `/privacidad`, copyright a la izquierda, `FooterItem`; test del footer. — archivos: `src/components/footer.tsx`, `src/components/footer.test.tsx` — tests: sí (footer.test.tsx: títulos, redes con `role="img"` y sin enlaces propios, único `<a href="/privacidad">`, copyright con año) — cubre: AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20

Al cierre: proyecto compilando, lint y tests pasando (AC-20). Verificación visual manual recomendada al reviewer a 375px, 860px y 1745px.

## Riesgos

- **Dónde se usa**: `Hero` solo en `src/app/page.tsx`. `Footer` en `/`, `/events`, `/events/[id]`, `/my-tickets`, `/privacidad` (5 páginas): el cambio de fondo oscuro afecta a todas; `/events/[id]` termina con `event-detail-hero`/secciones en `bg-brand-deep`, riesgo de que el footer se funda visualmente con ellas: mitigar con un borde superior `border-white/10` o dejando que el developer lo evalúe visualmente.
- **Contraste**: texto blanco sobre imagen depende del overlay (mantener ambos gradientes del slide); `text-white/70` sobre `#1E1B4B` ≈ 9:1 (cumple AA); `text-primary` `#4F46E5` sobre blanco ≈ 6.3:1 (cumple AA para el h1 grande y texto normal).
- **Desbordamiento del riel**: 5 eventos × ~68px + gaps superan los 351px disponibles hoy en 463px de alto; T-3 debe compactarlo (p. ej. una sola línea por item o menor padding). Es el principal riesgo visual.
- **Móvil**: el apilado de controles dentro del slide sigue ocupando `pb-32`; con el alto móvil propuesto verificar que el texto no queda tapado.
- **Referencia sin captura**: los valores vienen del DOM; posibles diferencias finas (radios, sombras) se ajustan en revisión visual, sin cambiar contratos.
- **Preservar tests**: no renombrar el h2, "Desde" ni el enlace del slide.

## Fases siguientes

- Fase 3: barra de filtros bajo el hero (reubica o duplica el buscador actual) y ajustes de `Header` (sticky 65px, blur).

## Decisiones resueltas

1. **Color del footer**: ~~`bg-brand-deep`~~ **revisado (2026-10-07): se mantiene el color original claro** (`bg-muted/30`, texto `text-muted-foreground`, marca `text-primary`). Esto sustituye los criterios AC-12 y AC-13 sobre fondo oscuro y contraste `text-white/70`; el resto del rediseño del footer (layout 2/4 columnas, redes, enlace a `/privacidad`, copyright) se mantiene. Decisión del usuario.
2. **Aviso de cookies**: se omite. Confirmado por el usuario.
3. **Titular con acento**: "cerca de ti" vía `headlineAccent` (supuesto de la spec; el usuario aprobó lanzar la implementación sin objetarlo).
