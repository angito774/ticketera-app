# Crear, editar y publicar eventos en la base (panel de organizador)

**Estado**: done
**Aprobado por**: usuario — 2026-10-02 (respondió "aprobado"; preguntas abiertas: se aceptan las propuestas)
**Fase**: 2 de 2 (depende de `docs/specs/events/event-listing.md`; se implementa después)

## Contexto

Hoy "Crear evento" y "Editar" (`/organizer/events/new`, `/organizer/events/[id]/edit`) guardan en `localStorage` con datos mock (`organizer.store.ts`, `event-form.schema.ts`, `event-editor.tsx`). Decisión del usuario: **conectarlos a la base**. El esquema real es más estricto que el formulario: un evento necesita un recinto existente (`venues`, con zonas y asientos) y categoría (`categories`), y las entradas son **un tipo por zona del recinto** (`ticket_types` único por evento+zona, precio en centavos, cantidad solo en zonas generales; las numeradas toman su capacidad de los asientos). Ver `docs/specs/database/data-model.md` y el seed (`src/db/seed/`, de donde sale cómo se crean `event_seats`).

## Alcance

- **Incluye**:
  - Formulario real: nombre, categoría (de `categories`), descripción, fecha y hora (hora de Lima), **recinto** (selector de los recintos de la organización), portada (URL de imagen) y **entradas por zona del recinto elegido** (activar la zona, precio en soles y, en zonas generales, cantidad; en numeradas la capacidad se muestra y se deriva de sus asientos).
  - **Organización destino**: el evento pertenece a una organización donde el usuario tiene `events:manage`; si tiene varias se elige, si tiene una va implícita.
  - Server actions `createEventAction`, `updateEventAction`, `publishEventAction`, con permiso `events:manage` **sobre la organización del evento**, validación zod en servidor y las mismas reglas del formulario actual: guardar borrador exige nombre (≥ 3), categoría, recinto y fecha/hora válidas (`events.venue_id`, `category_id` y `starts_at` son `NOT NULL` en la base; decisión de implementación: se mantiene el esquema y el borrador exige esos tres datos); publicar exige además descripción ≥ 20, fecha futura y al menos una entrada con precio > 0 y cantidad válida.
  - Edición: borradores (y publicados solo en campos que no cambian precios ni zonas con ventas — ver preguntas) de las organizaciones del actor.
  - Al crear/publicar se generan `event_seats` para las zonas numeradas, igual que el seed, de forma transaccional.
  - Se eliminan el store del navegador y los datos mock del organizador (`organizer.store.ts`, `organizer.service.ts` y sus tests, `ORGANIZER_EVENTS`).
  - Tras guardar, se invalida la caché de `useEvents` (la lista del panel y la web pública se actualizan).
- **No incluye**: subir archivos de imagen (solo URL), creación/edición de recintos y zonas, cancelar o eliminar eventos, cupones, ventas reales, detalle público de eventos nuevos (ver fase 1), edición de eventos con ventas.

## Criterios de aceptación

- **AC-1** (tests): `eventFormSchema` (cliente y servidor comparten el mismo schema base) con modos `draft` y `publish`; conversión de entradas del formulario a `ticket_types` (soles → centavos, zona general con `quantityTotal`, numerada con `null`); `toStartsAt` en hora de Lima. Casos de validación del borrador (nombre, categoría, recinto y fecha) vs publicación.
- **AC-2 (seguridad)**: crear/editar/publicar exige `can(actor, "events:manage", organizationId)` verificado en servidor; el recinto y la categoría deben pertenecer/existir y el recinto a la **misma organización** del evento; un usuario no puede escribir ni leer eventos de otra organización aunque conozca el id (404/Sin permiso). Los ids del cliente nunca se confían sin comprobar.
- **AC-3**: `createEvent` inserta evento (`draft`), `ticket_types` y, para zonas numeradas, `event_seats` en una sola transacción; `publishEvent` revalida el borrador completo y cambia a `published`; `updateEvent` reemplaza datos y entradas de un borrador manteniendo ids estables cuando se puede. Los slugs son únicos y se generan desde el título (colisión → sufijo).
- **AC-4**: Página `/organizer/events/new` y `/organizer/events/[id]/edit` con el formulario real (`label` visible, errores por campo, foco al primer inválido, estado de guardado, errores del servidor), vista previa en vivo como hoy; el selector de recinto carga zonas y recalcula la lista de entradas; "Guardar borrador" y "Publicar evento"; en móvil acciones en barra fija.
- **AC-5**: Tras guardar se redirige a `/organizer?saved=draft|published` y el evento aparece en la lista real con sus KPIs; `invalidateQueries` de la clave de eventos.
- **AC-6**: Un evento inexistente o de otra organización en `/organizer/events/[id]/edit` devuelve `notFound()`; un evento publicado muestra el formulario en modo solo lectura salvo lo permitido (según la decisión de preguntas abiertas).
- **AC-7**: `lint`, `test` y `build` pasan; sin referencias al store/mock eliminados.

## Contratos

```ts
// src/modules/organizer/schemas/event-form.schema.ts (reemplaza la versión mock)
export interface EventFormValues { title: string; categoryId: string; description: string; date: string; time: string; venueId: string; coverImageUrl: string; organizationId: string; tiers: { zoneId: string; enabled: boolean; price: string; quantity: string }[] }
export const eventSaveSchema: ZodType<EventSaveInput>; // payload serializable validado en servidor, con `mode: "draft" | "publish"`

// src/modules/organizer/services/event-write.service.ts (solo servidor)
export function createEvent(actor: CurrentUser, input: EventSaveInput): Promise<{ id: string }>;
export function updateEvent(actor: CurrentUser, id: string, input: EventSaveInput): Promise<void>;
export function getEventForEdit(actor: CurrentUser, id: string): Promise<EventEditData | null>; // con permiso por organización

// src/modules/organizer/services/event-options.service.ts
export function getEventFormOptions(actor: CurrentUser): Promise<{ organizations: {id,name}[]; categories: {id,label}[]; venues: { id; name; city; organizationId; zones: { id; name; seating: "general"|"numbered"; seats: number }[] }[] }>;
```

Acciones en `src/modules/organizer/actions/event.actions.ts` con la envoltura existente (`run-action.ts`, `ActionResult`).

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Formulario, vista previa, campos de entradas | `event-editor.tsx`, `event-preview-card.tsx`, `ticket-tiers-field.tsx`, `cover-image-field.tsx` | adaptar (tiers por zona; portada por URL) |
| Creación de zonas/asientos/`event_seats` | `src/db/seed/run.ts` (`ensureVenues`, bloque de eventos) | extraer la parte reutilizable (generación de `event_seats`) a un helper compartido en vez de copiarla |
| Permiso por organización, errores | `can`, `AdminError`, `run()`, `pg-errors.ts` | reusar |
| Listas en cliente tras guardar | `useEvents` (fase 1) | `invalidateQueries` por clave |
| Selectores, diálogos, form-field | `form-field.tsx`, `ui/select` nativo, patrón de los diálogos admin | reusar |

## Plan de tareas

| Tarea | Archivos | Grupo |
|---|---|---|
| **T-1** Schema del formulario + conversiones + tests (AC-1) | `src/modules/organizer/schemas/event-form.schema.ts` (+test), `src/modules/organizer/types/organizer.types.ts` (limpieza) | 1 |
| **T-2** Opciones del formulario y escritura transaccional (AC-2, AC-3) | `event-options.service.ts`, `event-write.service.ts`, helper de asientos compartido con el seed | 1 |
| **T-3** Acciones del servidor (AC-2, AC-5) | `src/modules/organizer/actions/event.actions.ts` | 2 |
| **T-4** Formulario real y páginas (AC-4, AC-6) | `event-editor.tsx`, `ticket-tiers-field.tsx`, `cover-image-field.tsx`, `event-preview-card.tsx`, `src/app/organizer/events/new/page.tsx`, `src/app/organizer/events/[id]/edit/page.tsx` | 3 |
| **T-5** Limpieza del mock (AC-7) | borrar `organizer.store.ts` (+test), `organizer.service.ts` (+test), acotar `events.service.ts` si queda código muerto | 4 |

## Preguntas abiertas

1. **Eventos publicados**: ¿editables? Se propone permitir editar solo título, descripción y portada; fecha, recinto y entradas quedan bloqueados una vez publicado (evita inconsistencias con ventas).
2. **Recintos**: solo se pueden elegir los ya existentes de la organización (los sembrados). ¿Necesitas ya una pantalla para crear recintos y zonas? No se incluye.
3. **Portada**: por URL (hoy es una vista previa local que no se guarda). ¿Basta con URL o hace falta subir archivos (requiere almacenamiento externo)?
