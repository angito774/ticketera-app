# Panel de organizador y crear evento (mock data)

**Estado**: draft
**Aprobado por**: —
**Fase**: 5 de 5 del plan de features (ver `docs/specs/tickets/purchase-flow.md` › Plan de fases)

## Contexto

Última fase del diseño de Claude Design: **8 · Panel de organizador** y **8 · Crear evento** (escritorio 1440 + móvil 390). Es el lado "vendedor" de Ticketera: un resumen de ventas y un formulario para crear eventos con sus tipos de entrada. Igual que el resto: **solo UI/UX, sin backend**. Los eventos del organizador son datos mock y lo que se crea queda guardado en el navegador.

## Alcance

- **Incluye**:
  - Área `/organizer` con su propio layout (no usa el `Header`/`Footer` del sitio): en escritorio, barra lateral con marca "Ticketera · Organizadores", navegación (Resumen, Crear evento, Ver sitio) y el organizador con "Cerrar sesión"; en móvil, barra superior con la marca y un menú (`<dialog>` nativo) con la misma navegación.
  - `/organizer` (**Resumen**): "Así van las ventas de tus eventos.", botón "Crear evento", 3 KPIs (Entradas vendidas, Ingresos, Eventos publicados), "Mis eventos" con filtros Todos / Publicados / Borradores y una fila por evento (imagen, título, fecha · ciudad, estado, vendidas / capacidad con barra de progreso, ingresos y acción). En móvil las filas son tarjetas.
  - `/organizer/events/new` (**Crear evento**): Información básica (nombre, categoría, descripción), Fecha y lugar (fecha, hora, lugar, ciudad), Imagen de portada (con vista previa local), Tipos de entrada (nombre, precio, cantidad; agregar/quitar, mínimo 1) con capacidad total, "Guardar borrador" y "Publicar evento", y la **vista previa en vivo** de la tarjeta del evento como la verán los compradores. En móvil las acciones van en la barra fija inferior y la vista previa debajo del formulario.
  - `/organizer/events/[id]/edit`: el mismo formulario precargado para editar un borrador (acción "Editar" de la lista).
  - Datos mock del organizador: 4 eventos publicados del catálogo existente (con vendidas/capacidad) + 1 borrador. Los eventos que se crean o editan se guardan en `localStorage` y se suman a la lista.
  - Enlace "Vender entradas" en el `Header` del sitio (≥ `md`) hacia `/organizer`.
- **No incluye**:
  - Publicar de verdad en el catálogo público: un evento "publicado" aparece como publicado en el panel, pero **no** en `/events` ni en la landing (el catálogo es mock del servidor).
  - Guardar la imagen de portada: la vista previa usa un `blob:` local que no se persiste; los eventos creados muestran una imagen genérica en la lista.
  - Páginas "Ventas" y "Configuración", reportes, exportaciones, ventas reales, roles o permisos de organizador (cualquiera puede entrar al panel), eliminar eventos, editar eventos publicados.
  - Categorías nuevas: el selector usa las 2 categorías del catálogo (el diseño muestra 8 de ejemplo).

## Criterios de aceptación

- **AC-1**: `/organizer` muestra la barra lateral (escritorio) o la barra superior con menú (móvil), el título "Resumen" y "Crear evento" (→ `/organizer/events/new`). La navegación marca la página actual (`aria-current="page"`). El pie de la barra muestra el nombre del usuario con sesión (Fase 4) o "Organizador demo", y "Cerrar sesión" (borra la sesión y va a `/`).
- **AC-2** (con tests): Los KPIs suman sobre todos los eventos: entradas vendidas, ingresos (Σ vendidas × precio de cada tipo de entrada, calculado sobre el reparto mock) y cantidad de eventos publicados.
- **AC-3**: "Mis eventos" filtra con Todos / Publicados / Borradores (`aria-pressed`). Cada fila muestra imagen, título, fecha corta · ciudad (o "Sin fecha"), estado ("Publicado" / "Borrador"), "N / capacidad vendidas" con barra de progreso (`role="progressbar"` con valores), ingresos ("—" en borradores) y la acción: "Ver evento" (→ `/events/[id]` si el evento está en el catálogo) o "Editar" (borradores → `/organizer/events/[id]/edit`). Sin eventos en el filtro: estado vacío con "Crear evento".
- **AC-4**: El formulario de "Crear evento" tiene todos los campos del diseño con `label` visible; los tipos de entrada se pueden agregar y quitar (no se puede quitar el último, botón deshabilitado) y la "Capacidad total" se actualiza al escribir.
- **AC-5**: La vista previa refleja en vivo categoría, nombre (o "Nombre del evento"), fecha (mes/día o "MES/--"), "Lugar · Ciudad", imagen elegida y "Desde S/ X" (menor precio > 0, o "S/ —").
- **AC-6** (con tests del schema): "Guardar borrador" solo exige nombre (≥ 3 caracteres). "Publicar evento" exige: nombre ≥ 3; categoría; descripción ≥ 20; fecha y hora válidas y futuras; lugar y ciudad; al menos un tipo de entrada, y cada tipo con nombre, precio > 0 y cantidad entera > 0. Los errores se muestran bajo cada campo (tipos de entrada: por fila) y el foco va al primero inválido.
- **AC-7**: Al guardar o publicar se vuelve a `/organizer` con un aviso ("Borrador guardado" / "Evento publicado", `role="status"`) y el evento aparece en la lista con su estado; lo creado sobrevive a recargas.
- **AC-8**: `/organizer/events/[id]/edit` precarga un borrador (mock o creado) y al guardar lo actualiza en lugar de duplicarlo; un `id` desconocido o de un evento publicado muestra "No encontramos este borrador" con enlace al panel.
- **AC-9**: La imagen de portada acepta JPG/PNG (clic o arrastrar y soltar), muestra la vista previa y se puede quitar; un archivo de otro tipo muestra "Usa una imagen JPG o PNG.".
- **AC-10**: Sin scroll horizontal en 375 px; todo con tokens (se agrega un token de éxito para el badge "Publicado"); ninguna llamada de red.

## Contratos

### Tipos (`src/modules/organizer/types/organizer.types.ts`)

```ts
export type OrganizerEventStatus = "published" | "draft";
export interface TicketTier { name: string; price: number; quantity: number; sold: number }
export interface OrganizerEvent {
  id: string;                 // mock: id del catálogo o "draft-…"; creados: "org-<timestamp>"
  catalogEventId: string | null; // para "Ver evento"
  status: OrganizerEventStatus;
  title: string;
  category: EventCategory | null;
  description: string;
  startsAt: string | null;    // ISO con offset -05:00
  venue: string;
  city: string;
  imageUrl: string | null;
  tiers: TicketTier[];
}
```

### Service (`src/modules/organizer/services/organizer.service.ts`)

```ts
export const ORGANIZER_EVENTS: OrganizerEvent[];                 // 4 publicados + 1 borrador
export function getEventTotals(event: OrganizerEvent): { sold: number; capacity: number; revenue: number; fromPrice: number | null };
export function getOrganizerSummary(events: OrganizerEvent[]): { sold: number; revenue: number; published: number };
export function filterOrganizerEvents(events: OrganizerEvent[], filter: "all" | OrganizerEventStatus): OrganizerEvent[];
export function mergeOrganizerEvents(mock: OrganizerEvent[], saved: OrganizerEvent[]): OrganizerEvent[]; // guardados reemplazan mock por id, orden por fecha (sin fecha al final)
```

### Formulario (`src/modules/organizer/schemas/event-form.schema.ts`)

```ts
export interface EventFormValues {
  title: string; category: EventCategory | ""; description: string;
  date: string; time: string;          // "2026-12-20", "20:00"
  venue: string; city: string;
  imageUrl: string | null;             // blob: local, no se persiste
  tiers: { name: string; price: string; quantity: string }[];
}
export type EventFormErrors = Partial<Record<"title" | "category" | "description" | "date" | "time" | "venue" | "city" | "tiers", string>> & {
  tierErrors?: Partial<Record<"name" | "price" | "quantity", string>>[];
};
export function getEventFormErrors(values: EventFormValues, mode: "draft" | "publish", now?: Date): EventFormErrors;
export function toOrganizerEvent(values: EventFormValues, status: OrganizerEventStatus, id: string): OrganizerEvent;
export function toFormValues(event: OrganizerEvent): EventFormValues;
```

### Store (`src/modules/organizer/store/organizer.store.ts`)

```ts
interface OrganizerState {
  savedEvents: OrganizerEvent[];          // localStorage (`ticketera-organizer`), sin imageUrl blob
  saveEvent(event: OrganizerEvent): void; // upsert por id
}
```

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Campos con error accesible | `src/components/form-field.tsx` | reusar |
| Input, Button, Select, tokens | `src/components/ui/*`, `globals.css` | reusar; se agrega `--success`/`--success-foreground` para "Publicado" |
| Tarjeta de evento para la vista previa | `EventCard` recibe un `Event` completo con imagen obligatoria | crear `event-preview-card.tsx` (acepta valores parciales y placeholders) con el mismo estilo que la tarjeta horizontal |
| Formato de fechas/precios | `src/lib/format.ts` (`formatDateBadge`, `formatShortDate`, `formatPrice`) | reusar |
| Sesión y cerrar sesión | `useSessionStore` (Fase 4) | reusar |
| Datos de eventos del catálogo | `getEventById` | reusar para los 4 eventos mock publicados |
| Menú móvil | shadcn `sheet`: registro bloqueado en este entorno | `<dialog>` nativo (mismo patrón que los filtros de la Fase 3) |
| Textarea | shadcn `textarea`: registro bloqueado | `<textarea>` nativo con las mismas clases que `Input` |

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Tipos, datos mock y cálculos. — archivos: `src/modules/organizer/types/organizer.types.ts`, `src/modules/organizer/services/organizer.service.ts` (+ `.test.ts`) — tests: sí — cubre: AC-2, AC-3
- **T-2**: Schema del formulario, conversiones y store; token de éxito. — archivos: `src/modules/organizer/schemas/event-form.schema.ts` (+ `.test.ts`), `src/modules/organizer/store/organizer.store.ts` (+ `.test.ts`), `src/app/globals.css` — tests: sí — cubre: AC-6, AC-7, AC-8, AC-10

### Grupo 1 (paralelo)

- **T-3**: Layout del área de organizador y enlace desde el sitio. — archivos: `src/modules/organizer/components/organizer-shell.tsx`, `src/app/organizer/layout.tsx`, `src/components/header.tsx` — tests: no — cubre: AC-1
- **T-4**: Resumen: KPIs, lista filtrable y contenedor. — archivos: `src/modules/organizer/components/summary-kpis.tsx`, `src/modules/organizer/components/organizer-events-list.tsx`, `src/modules/organizer/components/organizer-dashboard-view.tsx`, `src/app/organizer/page.tsx` — tests: no — cubre: AC-1, AC-2, AC-3, AC-7
- **T-5**: Piezas del formulario. — archivos: `src/modules/organizer/components/ticket-tiers-field.tsx`, `src/modules/organizer/components/cover-image-field.tsx`, `src/modules/organizer/components/event-preview-card.tsx` — tests: no — cubre: AC-4, AC-5, AC-9

### Grupo 2 (serial)

- **T-6**: Formulario completo y rutas de crear/editar. — archivos: `src/modules/organizer/components/event-editor.tsx`, `src/app/organizer/events/new/page.tsx`, `src/app/organizer/events/[id]/edit/page.tsx` — tests: no — cubre: AC-4 a AC-9

## Fases siguientes

Ninguna: con esta fase se completan las pantallas del diseño (Features 2–8).

## Preguntas abiertas

Ninguna bloqueante. Decisiones de autoría: rutas `/organizer…`; el panel no exige sesión (usa el nombre de la sesión si existe); "Ver ventas" del diseño pasa a "Ver evento" (no hay página de ventas); los eventos publicados desde el panel no entran al catálogo público; la imagen de portada no se persiste.
