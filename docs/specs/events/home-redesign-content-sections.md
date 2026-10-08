# Rediseño del home: secciones de contenido (Fase 2)

**Estado**: approved
**Aprobado por**: Nelson (usuario), 2026-10-07
**Fase**: 1 de 1 (completa `docs/specs/events/home-redesign-sections.md`, que es la "Fase 1" del rediseño; aquí solo hay una fase de trabajo)

## Contexto

`docs/specs/events/home-redesign-sections.md` (aprobada, implementada y commiteada; **no se reabre**) dejó el home con Hero, Explora por categoría, Destacados, Próximos eventos y el newsletter (`PromoBanner`), y listó en "Fases siguientes" las secciones de contenido pendientes. Esta spec las añade replicando estilo, ubicación y forma de `https://ticketera.mentec.dev/` (contenedor `max-w-7xl`, `py-12 md:py-16`, `PageSection`) con **nuestro contenido y la marca "Ticketera"**: "Cómo funciona", "Para organizadores", "Compra con confianza" y la alineación del newsletter al mismo contenedor. Sin rutas nuevas ni cambios en el footer (conserva su color claro original).

Los valores finos de la referencia (radios, sombras, tamaños de icono) no se pudieron inspeccionar; se ajustan en revisión visual sin cambiar contratos.

## Alcance

- **Incluye**:
  - `HowItWorks`: 3 pasos con icono.
  - `OrganizerCta` (nuevo): banda oscura "Para organizadores" con botón a `/organizer`.
  - `TrustHighlights`: 3 columnas con icono, con textos **verificados contra el código** (ver "Verificación de promesas").
  - Alinear `PromoBanner` (newsletter) al contenedor/espaciado de la referencia, sin tocar su lógica ni los selectores de su test.
  - Exportar las clases del contenedor de sección desde `page-section.tsx` para no duplicarlas.
  - Reordenar `src/app/page.tsx`.
- **No incluye**: botón "Conoce más" (no existe destino; decisión provisional, ver Pregunta 1); rutas nuevas (FAQ, ayuda, página de organizadores); cambios en Header, Hero, Footer, `listPublicEvents`, modelo de datos, pagos o envío de correos; dark mode; modificar `promo-banner.test.tsx`.

## Estado actual verificado

- `src/app/page.tsx` ya compone Hero, `ExploreCategories`, `FeaturedEvents`, `UpcomingEvents`, `PromoBanner` dentro de `<main className="flex flex-1 flex-col">`, con `force-dynamic`, `Promise.all` de prefetch y `HydrationBoundary` (se conservan intactos).
- `src/components/page-section.tsx` (`PageSection`: `<section aria-labelledby>`, contenedor `mx-auto w-full max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8`, `h2 text-2xl font-bold md:text-3xl`, slot `action`) existe y es server-compatible.
- `PromoBanner` está en `src/modules/events/components/promo-banner.tsx` (no en `src/components/`). Es client, con `<section className="bg-surface-warm py-12 text-center md:py-16">` **a ancho completo** y contenido interno `max-w-2xl`; su `h2` es centrado `text-3xl/4xl`, por lo que **no puede usar `PageSection`** (que impone un h2 a la izquierda). Su `<section>` no tiene `aria-labelledby`.
- Tokens de color existentes (`src/app/globals.css`): `brand-deep` (#1E1B4B) / `brand-deep-foreground` (#E0E7FF), ya usados en `event-detail-hero.tsx` y `seat-map.tsx`; `cta` (#F97316, texto #18181B) con variante `cta` en `ui/button`; `surface-warm` (#FFF7ED); `accent`/`primary` (#4F46E5). Iconos de acento: patrón `size-10 rounded-xl bg-accent text-primary` ya usado en `confirmation-view.tsx`.
- El `Header` ya tiene `bg-background/90 backdrop-blur` (Fase 1 hecha): no se toca.

## Verificación de promesas (contra el código, 2026-10-07)

| Promesa de la referencia | Hallazgo en el código | Resultado |
|---|---|---|
| "Paga" con métodos de pago | `PAYMENT_METHODS = card / yape / cash` (`checkout.schema.ts`) son campos del formulario, pero `purchaseTickets` (`purchase.service.ts`) solo reserva stock y **inserta orden + tickets en BD**; no hay llamada a pasarela (Stripe solo existe como columnas en `db/schema`, sin integración). Los datos de tarjeta no se procesan en un proveedor. | **No se puede prometer "pago seguro" ni nombrar métodos de pago.** |
| "Recibe tus entradas por correo" | `confirmation-view.tsx` dice "Enviamos tus entradas a {correo}", pero no existe ninguna librería/servicio de envío de correo en `src/` ni en `package.json` (solo Clerk, y el newsletter guarda correos en BD). | **No se promete envío por correo.** (Hallazgo aparte: la pantalla de confirmación afirma algo no implementado; fuera de alcance, ver Pregunta 5.) |
| Entrada con código QR | Cada ticket tiene `qrCode` (token único, `generateQrToken`) y se muestra un código corto; pero el dibujo es `DecorativeQr` ("No es un código real", `aria-hidden`). No hay pantalla de escaneo/canje (`tickets:redeem` es solo un permiso). | **QR escaneable: no es cierto.** Sí es cierto: entrada digital con código único en "Mis entradas". |
| "Mis entradas" | `/my-tickets` existe, exige sesión (proxy.ts + redirect) y lista las órdenes del usuario (`listOrdersForUser`, orden validada como propia en servidor). | Cierto. |
| Soporte 24/7 / canal de ayuda | En el footer "Soporte", "Contacto", "Preguntas frecuentes" son texto sin `href`; no hay canal real. | **No se promete soporte.** |
| Disponibilidad garantizada | La compra reclama asientos/cupo de forma atómica en una transacción (`claimSeatsSql`, `reserveGeneralSql`, `db.batch`); ante conflicto responde 409. | Cierto: "sin sobreventa". |
| Cuenta protegida | Auth con Clerk (correo/contraseña y Google), rutas privadas protegidas por `proxy.ts`; el usuario solo ve sus órdenes. | Cierto. |
| Organizadores | `/organizer` exige sesión (proxy → login) y luego `requirePermission("events:manage")`: sin permiso **redirige a `/` sin mensaje**. Para un cliente sin rol, el botón "no hace nada visible". | Destino existe; ver Riesgos y Pregunta 2. |
| Búsqueda | `q` solo busca por título (`hero-search-bar.md`, decisión 3). | El paso 1 no menciona "ciudad". |

## Criterios de aceptación

### Cómo funciona
- **AC-1**: `HowItWorks` renderiza una `PageSection` (id `how-it-works-title`) con h2 "Tres pasos y ya estás dentro." y una lista ordenada `<ol>` de 3 ítems, cada uno con: etiqueta "Paso N" (mostrada en mayúsculas con CSS `uppercase`), icono lucide decorativo `aria-hidden` (Search, Ticket, CircleCheck; el paso 3 usa CircleCheck en vez de CreditCard por decisión posterior a la revisión, para no sugerir pago con tarjeta), un `h3` y un párrafo.
- **AC-2**: Textos: 1 "Buscar" — "Encuentra el evento o artista que quieres ver."; 2 "Elegir" — "Selecciona tus entradas y la cantidad."; 3 "Comprar" — "Confirma tu compra y encuentra tus entradas al instante en Mis entradas." (sin mencionar métodos de pago, correo ni ciudad). Grilla `grid-cols-1 md:grid-cols-3`, `gap-6/8`.

### Para organizadores
- **AC-3**: `OrganizerCta` renderiza `<section aria-labelledby>` con el contenedor de sección compartido y, dentro, una tarjeta/banda `rounded-3xl bg-brand-deep text-brand-deep-foreground` con: etiqueta "PARA ORGANIZADORES" (texto en el DOM, `<p>`, no encabezado), `h2` "Vende tus entradas con Ticketera", subtítulo breve y un enlace con estilo de botón "Publica tu evento" a `/organizer`.
- **AC-4**: El botón usa `buttonVariants({ variant: "cta", size: "lg" })` (naranja `cta` sobre `brand-deep`: contraste alto; el `primary` índigo sobre `brand-deep` no se distingue), alto ≥ 44 px, foco visible. No existe el botón "Conoce más". Contraste del texto de la banda ≥ 4.5:1 (`brand-deep-foreground` sobre `brand-deep`; el subtítulo no usa opacidad que lo baje de ese umbral).
- **AC-5**: El subtítulo no promete funcionalidades inexistentes (sin "cobra", "pagos automáticos", "reportes"); texto sugerido: "Crea tu evento, define zonas y precios y gestiona tus entradas desde un solo panel." (verificable: existen `/organizer/events/new` y gestión de ticket types).

### Compra con confianza
- **AC-6**: `TrustHighlights` renderiza una `PageSection` (id `trust-highlights-title`) con h2 "Compra con confianza" y 3 columnas (`grid-cols-1 md:grid-cols-3`), cada una con icono lucide `aria-hidden`, `h3` y texto corto, usando exclusivamente promesas **verificadas**:
  1. ShieldCheck — "Tu cuenta, protegida" — "Inicia sesión con tu correo o con Google. Solo tú ves tus compras.".
  2. Ticket — "Entradas digitales" — "Cada entrada queda en Mis entradas con su código único, siempre a la mano.".
  3. CircleCheck — "Tu lugar asegurado" — "Reservamos tus asientos o cupos al comprar, sin sobreventa.".
- **AC-7**: Ningún texto de la sección ni de `HowItWorks` menciona: pago seguro/cifrado, métodos de pago concretos, envío por correo, QR escaneable, soporte/atención 24/7, reembolsos. (Test lo verifica con una lista de términos prohibidos.)

### Newsletter alineado
- **AC-8**: `PromoBanner` queda con el mismo contenedor que el resto: `<section aria-labelledby={headingId}>` con las clases compartidas de `PageSection` y, dentro, una tarjeta `rounded-3xl bg-surface-warm` con `px-6 py-12 md:px-12` y el contenido centrado actual. El `h2` recibe `id` (con `useId`, estable en SSR). **No cambian** la lógica, los textos, ni los selectores: label "Correo electrónico", botón "Suscribirse"/"Suscribiendo…", `role="status"`, `role="alert"`, enlace "política de privacidad" a `/privacidad`. `promo-banner.test.tsx` pasa sin modificarse.

### Integración y transversales
- **AC-9**: `src/app/page.tsx` renderiza dentro de `<main>`, en este orden: `Hero`, `ExploreCategories`, `FeaturedEvents`, `UpcomingEvents`, `HowItWorks`, `OrganizerCta`, `TrustHighlights`, `PromoBanner`; luego `Footer` (fuera de `main`). Se conservan `force-dynamic`, prefetch y `HydrationBoundary` sin cambios. `page.tsx` solo compone.
- **AC-10**: Jerarquía de encabezados: un único `h1` (hero); cada sección nueva tiene un `h2`; los ítems usan `h3`; sin saltos de nivel; cada `<section>` con `aria-labelledby` apuntando a su h2; `main` único landmark principal.
- **AC-11**: Las clases del contenedor de sección salen de una sola constante exportada por `src/components/page-section.tsx` (`PAGE_SECTION_CLASSES`), usada por `PageSection`, `OrganizerCta` y `PromoBanner`; no se repite la cadena `max-w-7xl ... py-12 md:py-16`. Sin scroll horizontal a 375 px.
- **AC-12**: `npm run lint`, `npm run test` y `npm run build` pasan; los tests existentes (`promo-banner`, `hero*`, `footer`, `explore-categories`, `featured-events`, `upcoming-events`, `event-carousel`) no se modifican.

## Contratos

```ts
// src/components/page-section.tsx  (cambio mínimo: exportar la constante; PageSection no cambia de comportamiento)
export const PAGE_SECTION_CLASSES =
  "mx-auto w-full max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8"

// src/modules/events/components/how-it-works.tsx  (server-compatible, sin props)
export function HowItWorks(): JSX.Element
// pasos como constante tipada (módulo, no exportada):
interface HowItWorksStep { title: string; text: string; icon: LucideIcon }

// src/modules/events/components/organizer-cta.tsx  (server-compatible)
interface OrganizerCtaProps {
  href?: string        // default "/organizer"
  className?: string
}
export function OrganizerCta(props: OrganizerCtaProps): JSX.Element

// src/modules/events/components/trust-highlights.tsx  (server-compatible, sin props)
export function TrustHighlights(): JSX.Element
interface TrustHighlight { title: string; text: string; icon: LucideIcon }

// src/modules/events/components/promo-banner.tsx
// PromoBannerProps sin cambios (title?, subtitle?, className?). Solo cambia el marco de la sección.
```

Ubicación en `src/modules/events/components/` (home del dominio, junto a `explore-categories`); son específicos del home de eventos, aunque `OrganizerCta`/`TrustHighlights` son presentacionales y podrían moverse a `src/components/` si otro dominio los necesitara (YAGNI).

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Contenedor + h2 de sección | `PageSection` (`src/components/page-section.tsx`) | **reusar** en `HowItWorks` y `TrustHighlights`; **extender** exportando `PAGE_SECTION_CLASSES` para `OrganizerCta` y `PromoBanner` |
| Tarjetas/pasos con icono | patrón icono `size-10 rounded-xl bg-accent text-primary` en `confirmation-view.tsx`; `ui/card` | **reusar el patrón** de clases (no hay componente compartido que lo encapsule; 2 usos aún no justifican abstraer). Estructura propia con `<ol>/<li>` |
| Botón "Publica tu evento" | `buttonVariants` con variante `cta` (`ui/button`) sobre `next/link` | **reusar** |
| Fondo oscuro de la banda | token `brand-deep` / `brand-deep-foreground` | **reusar** (ver decisión de color abajo) |
| Componentes de shadcn para features/CTA | `npx shadcn@latest search @shadcn -q "feature"` sin resultados; el registro no tiene bloques de landing en `@shadcn` (solo primitivos); no se requiere ningún primitivo nuevo | **no agregar nada** de shadcn |
| Iconos | `lucide-react` (Search, Ticket, ShieldCheck, CircleCheck) | **reusar** |
| Banner de organizadores | no existe (`PromoBanner` es el newsletter) | **crear** `OrganizerCta` |
| Newsletter | `PromoBanner` + `promo-banner.test.tsx` | **extender** solo el marco (sección/contenedor/id del h2) |
| Destino de organizadores | `/organizer` (mismo del Header "Vender entradas") | **reusar** |

Decisión de color del banner: `brand-deep` (fondo) + `cta` (botón). Es la combinación de "momento de acción" ya usada en el detalle de evento, diferencia la banda del newsletter (`surface-warm`) y respeta el footer claro. `primary` queda descartado porque el botón de `primary` sobre `brand-deep` casi no contrasta.

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Exportar `PAGE_SECTION_CLASSES` desde `page-section.tsx` y usarla en `PageSection` (sin cambio visual). — archivos: `src/components/page-section.tsx` — tests: no (constante de clases) — cubre: AC-11

### Grupo 1 (paralelo, archivos disjuntos)

- **T-2**: `HowItWorks`. — archivos: `src/modules/events/components/how-it-works.tsx`, `src/modules/events/components/how-it-works.test.tsx` — tests: sí (h2, `ol` con 3 `li`, 3 h3 Buscar/Elegir/Comprar, "Paso 1/2/3", textos de AC-2, sin "ciudad", iconos `aria-hidden`) — cubre: AC-1, AC-2, AC-7, AC-10
- **T-3**: `OrganizerCta`. — archivos: `src/modules/events/components/organizer-cta.tsx`, `src/modules/events/components/organizer-cta.test.tsx` — tests: sí (section con nombre accesible = h2, etiqueta "PARA ORGANIZADORES", enlace "Publica tu evento" con `href="/organizer"`, no existe "Conoce más", prop `href` personalizada) — cubre: AC-3, AC-4, AC-5, AC-10, AC-11
- **T-4**: `TrustHighlights`. — archivos: `src/modules/events/components/trust-highlights.tsx`, `src/modules/events/components/trust-highlights.test.tsx` — tests: sí (h2, 3 h3, textos de AC-6 y ausencia de términos prohibidos de AC-7 en `HowItWorks`+`TrustHighlights`: /pago seguro|cifrad|yape|tarjeta|correo|qr|24\/7|soporte|reembols/i) — cubre: AC-6, AC-7, AC-10
- **T-5**: Marco de `PromoBanner`. — archivos: `src/modules/events/components/promo-banner.tsx`, `src/modules/events/components/promo-banner.layout.test.tsx` (nuevo; `promo-banner.test.tsx` no se toca) — tests: sí (la sección se nombra por su h2 vía `getByRole("region", { name })`, h2 con `id`, selectores intactos) — cubre: AC-8, AC-10, AC-11

> T-3 y T-5 importan `PAGE_SECTION_CLASSES` de T-1 (grupo anterior): válido.

### Grupo 2 (serial, tras el Grupo 1; `page.tsx` pertenece solo a T-6)

- **T-6**: Integrar en `page.tsx` en el orden de AC-9. — archivos: `src/app/page.tsx` — tests: no nuevos (se ejecuta la suite completa, `npm run lint` y `npm run build`) — cubre: AC-9, AC-12

Al cierre: proyecto compilando, lint y tests pasando. Verificación visual manual a 375, 860 y 1745 px.

## Riesgos

- **Tests del newsletter**: `promo-banner.test.tsx` busca por label, `getByRole("button")` (único botón: no añadir botones dentro de `PromoBanner`), `role="status"`, `role="alert"` y el enlace. T-5 solo cambia el contenedor y añade `id`/`aria-labelledby`; no se renombra ni se reordena el formulario.
- **Hidratación**: `HowItWorks`, `OrganizerCta` y `TrustHighlights` son server components sin estado ni fechas; `PromoBanner` usa `useId` (estable entre servidor y cliente). No se usa `Math.random`/`Date` en el render.
- **Jerarquía y landmarks**: el "PARA ORGANIZADORES" es un `<p>`, no un encabezado; el `h2` de la banda es el título; no hay `<main>` anidados; el footer queda fuera de `main`.
- **Contraste**: `brand-deep-foreground` (#E0E7FF) sobre `brand-deep` (#1E1B4B) ≈ 12:1; botón `cta` (#18181B sobre #F97316) ≈ 7:1. Texto del newsletter sobre `surface-warm` sin cambios.
- **Usuario sin rol de organizador**: `/organizer` redirige a `/` sin mensaje tras iniciar sesión (ver Pregunta 2). El "Vender entradas" del Header ya se comporta así, así que no es una regresión nueva.
- **Fondo del newsletter**: pasar de full-bleed a tarjeta contenida cambia el aspecto respecto a hoy; es lo pedido (alinear al contenedor). Si se prefiere mantener full-bleed, ver Pregunta 3.
- **Contenido honesto**: los textos de confianza se redactaron solo con lo verificado; si el producto agrega pasarela/correo/QR real, se actualizan en otra spec.

## Fases siguientes

Ninguna. (Fuera de alcance explícito: cambiar la confirmación de compra que dice "Enviamos tus entradas a {correo}" sin que exista envío, y el QR decorativo.)

## Decisiones resueltas (2026-10-07)

1. **"Conoce más"**: se omite (no hay destino); el banner solo lleva "Publica tu evento" a `/organizer`.
2. **Usuario sin rol en `/organizer`**: se acepta el comportamiento actual (vuelve a `/` sin mensaje, igual que "Vender entradas"). Un mensaje o pantalla de "sin permiso" sería otra spec.
3. **Newsletter**: tarjeta contenida (`rounded-3xl bg-surface-warm` dentro del contenedor compartido).
4. **Compra con confianza**: ítems honestos (Tu cuenta, protegida / Entradas digitales / Tu lugar asegurado), sin QrCode ni LifeBuoy. Elegido por el usuario.
5. **Paso 3 de Cómo funciona**: "Confirma tu compra y encuentra tus entradas al instante en Mis entradas." (aprobado al aprobar la spec).
6. **Fuera de alcance, pendiente de otra spec**: la confirmación promete correo y QR que no existen y el checkout ofrece métodos de pago sin pasarela.
