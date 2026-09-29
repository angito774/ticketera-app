# Flujo de compra: detalle de evento + selección de entradas con mapa de asientos (mock data)

**Estado**: done
**Aprobado por**: usuario — 2026-09-29 (Fase 1, con la decisión de paleta "Migrar a índigo del diseño")
**Fase**: 1 de 5 completada — Fase 2 (checkout + confirmación) pendiente de spec y aprobación

## Contexto

La landing (`docs/specs/events/landing-page.md`, `hero-redesign.md`) está cerrada. El siguiente paso son las pantallas "Features 2–8" del diseño hecho en Claude Design (`https://claude.ai/artifact/NmeqG8Dta7F7zcSPmbQC8y`, páginas *Features 2–8* y *Features 2–8 · móvil*): búsqueda, detalle de evento, selección de entradas, checkout, confirmación, login/registro, Mis entradas y panel de organizador, cada una en escritorio (1440) y móvil (390).

Alcance del proyecto en esta etapa: **solo UI/UX**, sin backend ni base de datos. Todo se alimenta de datos mock síncronos (mismo patrón que `events.service.ts`); el día que exista una API, solo cambian los services.

El diseño resuelve la selección de entradas **por zona** (estadio: Campo VIP, Campo General, tribunas) con contadores +/−. El pedido agrega un **mapa de asientos seleccionable** para zonas numeradas (teatros, tribunas numeradas). Esta fase cubre ambas cosas.

### Decisión: librería para el mapa de asientos

| Opción | Compatibilidad con el repo | Veredicto |
|---|---|---|
| **SVG propio (React) + `react-zoom-pan-pinch`** | `react-zoom-pan-pinch@4.2.0`: peer `react: *`, sin dependencias, mantenido (sept. 2026). El SVG es JSX puro: se estiliza con Tailwind/tokens, renderiza en servidor y cada asiento es un elemento accesible (foco, `aria-pressed`, `aria-label`). | **Elegida** |
| `react-konva` (canvas) | `react-konva@19.3.0` exige `react ^19.3.0`; el repo usa `19.2.8` → conflicto de peer deps (habría que fijar 19.2.x). Canvas: sin accesibilidad nativa, sin Tailwind, requiere `dynamic(..., { ssr: false })`. Solo compensa con decenas de miles de asientos visibles a la vez. | Descartada |
| `@seatsio/seatsio-react` | SaaS de pago: exige cuenta, workspace y mapas diseñados en su editor; carga un iframe externo. Incompatible con "solo UI con datos mock". | Descartada (evaluable a futuro si se contrata) |
| `seatchart`, `react-seatmap`, `react-seat-picker` | Sin mantenimiento (2022) o peer deps de React 15/16. | Descartadas |

Motivos: el mapa se describe con datos (`VenueLayout`: formas de zonas + filas/asientos con coordenadas), se dibuja con SVG (nítido a cualquier zoom, liviano para cientos de asientos por zona), y `react-zoom-pan-pinch` aporta solo lo que el SVG no trae: pinch-to-zoom y arrastre en móvil, rueda y botones +/− en escritorio. Para estadios grandes se usa el patrón de dos niveles del propio diseño: primero se elige la **zona** en el mapa del recinto, y solo las zonas numeradas abren el **mapa de asientos** de esa zona (nunca se dibujan todos los asientos del estadio a la vez).

## Plan de fases (feature completo)

| Fase | Pantallas (escritorio + móvil) | Estado |
|---|---|---|
| **1 (esta)** | 3 · Detalle de evento, 4 · Selección de entradas (mapa de zonas + mapa de asientos) | done |
| 2 | 5 · Checkout y pago, 6 · Confirmación de compra | pendiente |
| 3 | 2 · Búsqueda y listado (filtros funcionales sobre el mock) | pendiente |
| 4 | 7 · Login y registro, 6 · Mis entradas | pendiente |
| 5 | 8 · Panel de organizador, 8 · Crear evento | pendiente |

Cada fase deja el proyecto compilando y con tests en verde, y requiere su propia aprobación. Solo la Fase 1 se detalla aquí.

## Alcance (Fase 1)

- **Incluye**:
  - Ruta `/events/[id]` (detalle) y `/events/[id]/tickets` (selección de entradas), responsive: layout de dos columnas con tarjeta lateral en `lg+`, una columna con barra de compra fija abajo en móvil (como en `EventDetailMobile` / `TicketsMobile`).
  - Datos de detalle por evento (descripción, apertura de puertas, edad mínima, dirección, recinto) para los 10 eventos existentes.
  - Módulo nuevo `src/modules/tickets/`: tipos de recinto/zonas/asientos, service mock de layouts, store de selección (zustand), mapa de zonas, mapa de asientos, lista de zonas con contadores y resumen de compra.
  - Dos layouts mock: **estadio** (zonas generales + tribunas numeradas) y **teatro** (todas las zonas numeradas).
  - `EventCard` pasa a ser un enlace a `/events/[id]` (hoy no navega).
  - Header de compra con pasos (`Entradas → Datos y pago → Confirmación`) reutilizable por la Fase 2.
- **No incluye**:
  - Checkout, confirmación, búsqueda, auth, Mis entradas, organizador (fases 2–5). El botón "Continuar" enlaza a `/events/[id]/checkout`, ruta que entrega la Fase 2.
  - Reservas reales, bloqueo de asientos entre usuarios, tiempo de reserva (temporizador: Fase 2).
  - Persistencia de la selección al recargar la página (se decide en Fase 2 si el checkout lo necesita).
  - Mapa geográfico real del lugar: el bloque "Lugar" muestra un placeholder visual + enlace "Cómo llegar" a Google Maps con la dirección.
  - "Guardar" y "Compartir" del detalle: solo estado visual local (guardar alterna el ícono), sin persistencia.
  - Editor de mapas para organizadores.
  - Dark mode.

## Criterios de aceptación

- **AC-1**: `/events/[id]` muestra, para cualquiera de los 10 eventos mock: migas (Inicio / categoría / título), imagen, categoría, título, fecha larga, hora de inicio, recinto y ciudad, "Acerca del evento", "Información importante" (apertura de puertas, inicio, edad mínima, ingreso con QR), "Lugar" (recinto, dirección, "Cómo llegar") y una tarjeta de precios por zona con estado (`Agotado`, `Últimas`) y CTA "Elegir entradas" hacia `/events/[id]/tickets`. Un `id` inexistente responde con la página 404 de Next (`notFound()`).
- **AC-2**: El detalle muestra "También te puede interesar" con hasta 4 eventos de la misma categoría (excluyendo el actual), reutilizando `EventSection`/`EventCard`.
- **AC-3**: En móvil (<`lg`) el detalle muestra una barra fija inferior con "Desde S/ X" y "Comprar entradas"; en `lg+` la tarjeta de precios es lateral y fija al hacer scroll (`sticky`).
- **AC-4**: Cada `EventCard` de la landing es un enlace a `/events/[id]` (navegable con teclado).
- **AC-5**: `/events/[id]/tickets` muestra el header de compra con el paso 1 activo, el evento (imagen, título, fecha, recinto) y un **mapa de zonas** SVG del recinto: escenario + una forma por zona, coloreada por nivel de precio, con nombre y precio (o "Agotado"). Cada zona disponible es un control accesible (foco con teclado, Enter/Espacio la selecciona, `aria-pressed`, `aria-label` con nombre y precio); las agotadas no se pueden seleccionar.
- **AC-6**: La lista "Entradas" muestra todas las zonas. Las zonas **generales** tienen contador −/+ (mín. 0, máx. `MAX_TICKETS_PER_ZONE` = 6, botones deshabilitados en los límites). Las zonas **numeradas** muestran "Elegir asientos" (o "N asientos") y al activarse seleccionan la zona. Tocar una zona en el mapa o en la lista resalta la misma zona en ambos.
- **AC-7**: Al seleccionar una zona **numerada** aparece su **mapa de asientos**: filas etiquetadas, cada asiento con estado *disponible*, *ocupado* (no seleccionable) o *seleccionado*, más una leyenda. Tocar un asiento disponible lo agrega/quita de la selección; no se pueden elegir más de 6 por zona (al llegar al máximo, los disponibles restantes quedan deshabilitados). Cada asiento es accesible (`aria-label` "Fila B, asiento 7", `aria-pressed`).
- **AC-8**: El mapa de asientos admite zoom y desplazamiento: pinch y arrastre en táctil, rueda/arrastre en escritorio, y botones "Acercar", "Alejar" y "Restablecer".
- **AC-9**: El resumen "Tu compra" lista una línea por zona con cantidad × nombre, importe y, en zonas numeradas, los asientos ("Fila B: 7, 8"); muestra el total y la cantidad de entradas. Sin selección muestra el estado vacío y "Continuar" deshabilitado. En `lg+` es una tarjeta lateral; en móvil, una barra fija inferior con total + "Continuar".
- **AC-10** (con tests): `getEventById` devuelve el detalle del evento o `undefined`; `getRelatedEvents` excluye el evento actual, filtra por categoría y limita la cantidad; `getVenueLayout` es determinístico (mismos asientos ocupados en cada llamada), calcula precios de zona a partir del precio base del evento de modo que la zona disponible más barata coincide con `Event.price` ("desde"), y lanza/devuelve `undefined` para un layout inexistente.
- **AC-11** (con tests): el store de selección respeta los límites (0–6 por zona, sin asientos ocupados ni de otra zona), reinicia la selección al cambiar de evento, y `buildPurchaseSummary` calcula líneas, cantidad total e importe total correctos para selecciones mixtas (general + numerada).
- **AC-12**: Los tokens de `globals.css` y `MASTER.md` quedan migrados a la paleta índigo del diseño (ver Contratos › Paleta) y todas las pantallas nuevas usan solo tokens (ninguna clase con hex arbitrario). Sin scroll horizontal de página en 375px.
- **AC-13**: Ningún control de esta fase hace llamadas de red; toda la data sale de los services mock.

## Contratos

### Evento (extensión, `src/modules/events/types/event.types.ts`)

```ts
export type EventCategory = "concert" | "theater"; // sin cambios
export interface Event { /* sin cambios */ }

export interface EventDetail extends Event {
  description: string;
  doorsOpenAt: string;       // ISO 8601 con offset
  minAge: number | null;     // null = todo público
  address: string;
  layoutId: VenueLayoutId;   // "stadium" | "theater" (importado de tickets/types)
}
```

`Event` no cambia (la landing no se toca). Los datos extra viven en el mismo `events.service.ts` como `EVENT_DETAILS: Record<Event["id"], Omit<EventDetail, keyof Event>>`.

```ts
// src/modules/events/services/events.service.ts (se agregan)
export function getEventById(id: string): EventDetail | undefined;
export function getRelatedEvents(event: Event, limit?: number): Event[]; // default 4
```

### Recinto, zonas y asientos (`src/modules/tickets/types/venue.types.ts`)

```ts
export type VenueLayoutId = "stadium" | "theater";
export type ZoneSeating = "general" | "numbered";
export type ZoneStatus = "available" | "last-tickets" | "sold-out";
export type SeatStatus = "available" | "taken";
export type ZoneTone = 1 | 2 | 3 | 4 | 5; // 1 = más caro

export interface Rect { x: number; y: number; width: number; height: number } // unidades del viewBox

export interface Seat { id: string; row: string; number: number; status: SeatStatus; x: number; y: number }
export interface SeatRow { label: string; seats: Seat[] }

export interface VenueZone {
  id: string;
  name: string;
  shortName: string;       // etiqueta corta para móvil ("Occidente")
  price: number;           // PEN, ya calculado para el evento
  status: ZoneStatus;
  seating: ZoneSeating;
  tone: ZoneTone;
  shape: Rect;
  rows: SeatRow[];         // [] para zonas generales
}

export interface VenueLayout {
  id: VenueLayoutId;
  viewBox: { width: number; height: number };
  stage: Rect;
  zones: VenueZone[];
}
```

```ts
// src/modules/tickets/services/venues.service.ts
export const MAX_TICKETS_PER_ZONE = 6;
export function getVenueLayout(id: VenueLayoutId, basePrice: number): VenueLayout;
```

- Cada zona del layout base tiene un `priceMultiplier` interno; `price = Math.round(basePrice * priceMultiplier)` y la zona disponible más barata tiene multiplicador `1` (AC-10).
- Asientos ocupados: patrón pseudoaleatorio con semilla fija por zona (~30 %), sin `Math.random`.
- **Estadio** (`stadium`): Campo VIP (general, agotado), Campo General (general), Tribuna Occidente (numerada, últimas entradas), Tribuna Oriente (numerada), Tribuna Norte (general) — misma disposición que el diseño.
- **Teatro** (`theater`): Platea (numerada, filas A–H), Mezzanine (numerada, filas J–L), Balcón (numerada, filas M–O), Palco (agotado).

### Store de selección (`src/modules/tickets/store/purchase.store.ts`)

```ts
interface PurchaseState {
  eventId: string | null;
  activeZoneId: string | null;
  quantities: Record<string, number>;   // zonas generales
  seats: Record<string, string[]>;      // zonas numeradas: ids de asiento
  startPurchase(eventId: string): void; // resetea si cambia el evento
  selectZone(zoneId: string): void;
  setQuantity(zone: VenueZone, qty: number): void;   // clamp 0..MAX, ignora agotadas/numeradas
  toggleSeat(zone: VenueZone, seat: Seat): void;     // ignora ocupados y el 7.º asiento
  clear(): void;
}

export interface PurchaseLine { zoneId: string; zoneName: string; quantity: number; unitPrice: number; amount: number; seatLabels: string[] }
export interface PurchaseSummary { lines: PurchaseLine[]; ticketCount: number; total: number }
export function buildPurchaseSummary(layout: VenueLayout, state: Pick<PurchaseState, "quantities" | "seats">): PurchaseSummary;
```

### Paleta (decisión del usuario: migrar a índigo del diseño)

Se reemplazan los tokens de `globals.css` (`:root`) por los del diseño de Claude Design, y `design-system/ticketera/MASTER.md` se actualiza en consecuencia. Afecta también a la landing (cambio global, Grupo 0):

| Token | Antes | Ahora | Uso |
|---|---|---|---|
| `--primary` / `-foreground` | `#EA580C` / `#0F172A` | `#4F46E5` / `#FFFFFF` | marca, enlaces, selección, estados activos |
| `--secondary` / `-foreground` | `#F97316` / `#0F172A` | `#F4F4F5` / `#18181B` | botón secundario neutro (semántica shadcn) |
| `--accent` / `-foreground` | `#2563EB` / `#FFFFFF` | `#EEF2FF` / `#4338CA` | resaltado suave (fila/zona seleccionada, hover de menús) |
| `--cta` / `-hover` / `-foreground` (nuevo) | — | `#F97316` / `#EA580C` / `#18181B` | CTA de compra ("Comprar entradas", "Continuar"); variante `cta` de `Button` |
| `--warning` / `-foreground` (nuevo) | — | `#FFEDD5` / `#9A3412` | badge "Últimas entradas" |
| `--foreground`, `--muted`, `--muted-foreground`, `--border`/`--input`, `--ring` | slate | `#18181B`, `#F4F4F5`, `#52525B`, `#E4E4E7`, `#818CF8` | zinc del diseño |
| `--zone-1…5` / `--zone-foreground-strong`, `--zone-foreground-soft` (nuevos) | — | `#312E81`, `#4F46E5`, `#818CF8`, `#A5B4FC`, `#C7D2FE` | escala de zonas del mapa (1 = más cara); texto blanco en 1–2 y `#1E1B4B` en 3–5 |

Zonas agotadas en `muted`. Asientos: disponible = fondo `background` con borde, seleccionado = `primary`, ocupado = `muted`. `header.tsx` deja de usar `hover:text-secondary` (con la nueva semántica sería casi blanco).

### Props públicas

```ts
// src/components/purchase-header.tsx (compartido: tickets + checkout de Fase 2)
interface PurchaseHeaderProps { currentStep: 1 | 2 | 3; backHref: string; backLabel: string; className?: string }

// src/modules/tickets/components/venue-map.tsx
interface VenueMapProps { layout: VenueLayout; activeZoneId: string | null; onSelectZone(zoneId: string): void; className?: string }

// src/modules/tickets/components/seat-map.tsx
interface SeatMapProps { zone: VenueZone; selectedSeatIds: string[]; maxReached: boolean; onToggleSeat(seat: Seat): void; className?: string }

// src/modules/tickets/components/zone-price-list.tsx (detalle de evento)
interface ZonePriceListProps { zones: VenueZone[]; className?: string }
```

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Tarjetas de eventos relacionados | `EventSection` + `EventCard` | reusar |
| Formato de fecha/precio `es-PE` | formatters locales en `event-card.tsx` | extraer a `src/lib/format.ts` (`formatPrice`, `formatDate`…) con test y usar en ambos |
| Botones, badges, cards, separador | `button`, `badge`, `card`, `separator` en `src/components/ui/` | reusar |
| Pan/zoom táctil del mapa | nada en `src/` ni en shadcn | instalar `react-zoom-pan-pinch` |
| Contador −/+ | nada en `src/` ni en shadcn (no hay "number stepper") | crear `quantity-stepper.tsx` en `tickets/components/` |
| Mapa de zonas / asientos | nada | crear SVG propio (ver decisión arriba) |
| Barra fija inferior en móvil (detalle y entradas) | nada | crear `src/components/sticky-bottom-bar.tsx` (compartida) |
| Panel oscuro del hero del detalle (`#1E1B4B`) | sin token | agregar `--brand-deep` / `--brand-deep-foreground` |
| Estado de selección entre componentes | `zustand` instalado sin uso | crear `purchase.store.ts` (primer store: fija la convención) |
| Header de pasos de compra | nada | crear `src/components/purchase-header.tsx` (lo usa también la Fase 2) |

## Plan de tareas

### Grupo 0 (serial)

- **T-0**: Migrar la paleta a índigo: tokens nuevos/actualizados, variante `cta` de `Button`, ajuste de hover del header y `MASTER.md`. — archivos: `src/app/globals.css`, `src/components/ui/button.tsx`, `src/components/header.tsx`, `design-system/ticketera/MASTER.md` — tests: no — cubre: AC-12
- **T-1**: Instalar `react-zoom-pan-pinch`; extraer formatters a `src/lib/format.ts` y usarlos en `EventCard`, que pasa a envolver la tarjeta en `next/link` hacia `/events/[id]`. — archivos: `package.json`, `package-lock.json`, `src/lib/format.ts`, `src/lib/format.test.ts`, `src/modules/events/components/event-card.tsx` — tests: sí (`format.test.ts`) — cubre: AC-4, AC-12
- **T-2**: Contratos y datos mock: `EventDetail`, `getEventById`, `getRelatedEvents`, tipos de recinto y `getVenueLayout` (estadio + teatro). — archivos: `src/modules/events/types/event.types.ts`, `src/modules/events/services/events.service.ts`, `src/modules/events/services/events.service.test.ts`, `src/modules/tickets/types/venue.types.ts`, `src/modules/tickets/services/venues.service.ts`, `src/modules/tickets/services/venues.service.test.ts` — tests: sí — cubre: AC-10, AC-13
- **T-3**: Store de selección + `buildPurchaseSummary`. — archivos: `src/modules/tickets/store/purchase.store.ts`, `src/modules/tickets/store/purchase.store.test.ts` — tests: sí — cubre: AC-11

### Grupo 1 (paralelo)

- **T-4**: Página de detalle. — archivos: `src/app/events/[id]/page.tsx`, `src/modules/events/components/event-detail-hero.tsx`, `src/modules/events/components/event-info.tsx`, `src/modules/tickets/components/zone-price-list.tsx`, `src/modules/tickets/components/zone-status-badge.tsx` — tests: no (presentacional) — cubre: AC-1, AC-2, AC-3
- **T-5**: Mapas: zonas (SVG), asientos (SVG + `react-zoom-pan-pinch` + leyenda + controles de zoom) y contador. — archivos: `src/modules/tickets/components/venue-map.tsx`, `src/modules/tickets/components/seat-map.tsx`, `src/modules/tickets/components/quantity-stepper.tsx`, `src/modules/tickets/components/zone-tones.ts` (mapa `ZoneTone` → clases `bg-zone-n`/`text-zone-foreground-n`) — tests: no (presentacional; la lógica vive en store/service) — cubre: AC-5, AC-7, AC-8, AC-12
- **T-6**: Header de compra. — archivos: `src/components/purchase-header.tsx` — tests: no — cubre: AC-5

### Grupo 2 (serial, depende de G1)

- **T-7**: Página de selección: contenedor cliente que conecta store + mapas, lista de zonas, resumen lateral y barra móvil. — archivos: `src/app/events/[id]/tickets/page.tsx`, `src/modules/tickets/components/ticket-selection.tsx`, `src/modules/tickets/components/zone-ticket-list.tsx`, `src/modules/tickets/components/purchase-summary.tsx` — tests: no — cubre: AC-5, AC-6, AC-7, AC-9

### Notas de implementación (desvíos menores respecto del plan)

- Se agregaron `src/components/sticky-bottom-bar.tsx` (barra móvil compartida por T-4 y T-7) y `src/modules/tickets/components/ticket-prices-card.tsx` (tarjeta de precios del detalle + barra móvil), para no definir componentes dentro de `page.tsx`.
- `EVENT_CATEGORY_LABELS` vive en `event.types.ts` y lo usan `EventCard` y el hero del detalle.
- Los formatters de `src/lib/format.ts` formatean siempre en `America/Lima` (antes `EventCard` usaba la zona del servidor, y un evento de las 20:00 en Lima podía mostrarse con la fecha del día siguiente en UTC).
- El mapa de asientos tiene un ancho mínimo (~26 px por asiento) para que sea usable al tacto; en móvil se recorre arrastrando.

Verificado: `npm run lint`, `npm run test` y `npm run build` en verde; revisión visual con Playwright en 1440 px y 390 px (sin scroll horizontal, selección de zonas/asientos y resumen correctos, 404 para id inexistente).

## Fases siguientes

Ver "Plan de fases". La Fase 2 (checkout + confirmación) reutiliza `PurchaseHeader`, `purchase.store.ts` y `buildPurchaseSummary`, y agrega el temporizador de reserva, formulario del comprador (zod) y métodos de pago (Tarjeta / Yape / PagoEfectivo) con UI mock.

## Preguntas abiertas

Ninguna. *(Resuelta 2026-09-29: el usuario eligió migrar a la paleta índigo del diseño.)*
