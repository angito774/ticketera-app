# Cancelar y eliminar eventos desde el panel del organizador

**Estado**: done
**Aprobado por**: usuario — 2026-10-05
**Fase**: 1 de 1

## Contexto

En "Mis eventos" (`organizer-events-list.tsx`) cada fila solo ofrece "Ver evento" (publicados) o "Editar" (borradores). Se pide agregar **Eliminar** y **Cancelar**. El enum `event_status` ya incluye `cancelled` (`src/db/schema/enums.ts`, `events.ts`), por lo que **no hay migración**. Las FKs `orders.event_id` (y `order_items`/`tickets` vía órdenes) son `restrict`: un evento con órdenes no se puede borrar sin romper el historial de ventas; `ticket_types`, `event_seats` y `coupons` hacia `events` son `cascade` (ver `docs/specs/database/data-model.md` § Eventos y § Reglas de borrado). Specs relacionadas (`done`): `event-management.md` (escritura, "cancelar o eliminar" quedó fuera) y `organizer-panel.md`.

Las decisiones de la sección `Decisiones` (resueltas por el usuario el 2026-10-05) son las que esta spec asume; cualquier cambio posterior la devuelve a `draft`.

## Alcance

- **Incluye**:
  - **Eliminar** (borrado duro) un evento **sin órdenes** (cualquier estado), con diálogo de confirmación.
  - **Cancelar** un evento **publicado** (`published → cancelled`), con diálogo de confirmación; es irreversible desde la UI.
  - Dos server actions con la misma autorización que `updateEvent` (`events:manage` sobre la organización del evento, 404 uniforme) y transaccionalidad donde aplique.
  - Reglas puras de elegibilidad (`canDeleteEvent` / `canCancelEvent`) compartidas por UI y servidor, con tests.
  - Botones por fila en la tabla/tarjetas móviles; un evento cancelado deja de aparecer en el catálogo público (ya filtra `published`) y se desdestaca (`featured = false`).
  - Nuevo filtro "Cancelados" en el panel (hoy solo Todos/Publicados/Borradores).
  - Invalidación de la caché `["events", "organizer"]` y revalidación de `/organizer`, `/events` y `/` tras la acción.
- **No incluye**:
  - Reembolsos, notificación a compradores, ni anulación de órdenes/tickets existentes de un evento cancelado (las órdenes pagadas quedan como están; ver Decisión 2).
  - Reabrir/restaurar un evento cancelado, ni "despublicar" a borrador.
  - Eliminación lógica (soft delete) ni papelera.
  - Cancelar borradores (se eliminan o se publican) ni editar eventos cancelados (ya bloqueado por `updateEvent`).
  - Acciones masivas, cambios de esquema de base de datos, y la vista admin de eventos (si existiera).

## Criterios de aceptación

- **AC-1** (tests): `canDeleteEvent({ status, orderCount })` es `true` solo si `orderCount === 0`; `canCancelEvent({ status })` es `true` solo si `status === "published"`. Casos: draft/published/cancelled con 0 y con N órdenes.
- **AC-2 (seguridad)**: `deleteEvent` y `cancelEvent` exigen `can(actor, "events:manage", event.organizationId)` en servidor; id no UUID, inexistente o de otra organización responden con el mismo "no encontrado" (patrón de `updateEvent`/`getEventForEdit`); el cliente nunca decide la elegibilidad (se recalcula en servidor).
- **AC-3**: `deleteEvent` verifica que el evento no tenga órdenes y lo elimina en una transacción (los `ticket_types`, `event_seats` y cupones caen por `cascade`); si hay órdenes lanza `AdminError` con mensaje claro ("Este evento tiene ventas; cancélalo en lugar de eliminarlo"). Una violación de FK por carrera (`isForeignKeyViolation`) se traduce al mismo mensaje, no a un 500.
- **AC-4**: `cancelEvent` hace `UPDATE ... SET status='cancelled', featured=false WHERE id=? AND status='published'` (condicional, atómico); si no afectó filas por estado distinto de `published`, lanza `AdminError` ("Solo se pueden cancelar eventos publicados"). No toca órdenes, tickets ni `ticket_types`.
- **AC-5**: Tras cancelar, el evento no aparece en el catálogo público, la landing ni el hero, y `purchase.service.ts`/`availability.service.ts` (ya filtran `status = 'published'`) lo rechazan; no se agrega código nuevo ahí (solo verificado por el reviewer).
- **AC-6**: En `organizer-events-list.tsx`, cada fila muestra según estado y reglas: borrador → "Editar" + "Eliminar"; publicado → "Ver evento" + "Cancelar evento" (+ "Eliminar" solo si `sold === 0`, que es un indicador de UI; la verdad la decide el servidor por órdenes); cancelado → solo "Eliminar" si no tiene ventas (si `sold > 0`, sin acciones). Botones con `aria-label` que incluyen el título del evento, objetivo táctil ≥ 44 px en móvil (mismas clases que `ACTION_CLASSES`).
- **AC-7**: Eliminar y Cancelar abren un diálogo de confirmación (`role="alertdialog"`, foco inicial seguro, Escape cierra, botón de confirmar destructivo con estado pendiente "Eliminando…" / "Cancelando…"); el texto del diálogo de cancelar aclara que **no se reembolsan ni anulan las entradas ya vendidas** y que la acción no se puede deshacer; los errores del servidor se muestran en el diálogo (`role="alert"`) sin cerrarlo.
- **AC-8**: Éxito → el diálogo se cierra, la lista se actualiza (`invalidateQueries(["events","organizer"])`), y se muestra aviso `role="status"` ("Evento eliminado" / "Evento cancelado"); los KPIs (eventos publicados, vendidas, ingresos) se recalculan (el resumen ya agrega por la consulta; cancelar baja "Eventos publicados" y los "Ingresos" por fila muestran "—").
- **AC-9** (tests): `parseEventListParams` acepta `status=cancelled` solo con `scope=organizer` (en público se ignora y queda `"all"`), `toQueryString`/serialización lo conserva; el panel muestra el filtro "Cancelados" con `aria-pressed`.
- **AC-10**: `lint`, `test` y `build` pasan; sin duplicar el diálogo de confirmación (se reutiliza `ConfirmDeleteDialog` generalizado).

## Contratos

```ts
// src/modules/organizer/services/event-lifecycle.rules.ts (puro, sin db)
export function canDeleteEvent(e: { status: EventStatus; orderCount: number }): boolean; // orderCount === 0
export function canCancelEvent(e: { status: EventStatus }): boolean; // status === "published"

// src/modules/organizer/services/event-lifecycle.service.ts (solo servidor)
export function deleteEvent(actor: CurrentUser, id: string): Promise<void>; // AdminError si no existe/sin permiso/con órdenes
export function cancelEvent(actor: CurrentUser, id: string): Promise<void>; // AdminError si no existe/sin permiso/no publicado

// src/modules/organizer/actions/event.actions.ts (se agregan; envoltura run() existente)
export async function deleteEventAction(raw: unknown): Promise<ActionResult>; // { id: uuid }
export async function cancelEventAction(raw: unknown): Promise<ActionResult>; // { id: uuid }

// src/modules/events/schemas/event-list.schema.ts
export type EventListStatus = "all" | "published" | "draft" | "cancelled";

// src/components/confirm-delete-dialog.tsx (props nuevas, opcionales, retrocompatibles)
//   pendingLabel?: string   // default "Eliminando..."
//   cancelLabel?: string    // default "Cancelar" (para "Volver" en el diálogo de cancelar evento)
```

`OrganizerEventRow` (`src/modules/events/types/event-list.types.ts`) ya expone `id`, `title`, `status`, `sold`, `slug`: **no cambia**.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Diálogo de confirmación destructiva | `src/components/confirm-delete-dialog.tsx` (sobre `ui/dialog`, `role="alertdialog"`), usado por `delete-role-dialog.tsx` y similares | extender/generalizar (`pendingLabel`, `cancelLabel`); **no** instalar shadcn `alert-dialog` |
| Menú de acciones por fila | no hay `dropdown-menu` en `src/components/ui/` (solo card, badge, input, separator, select, table, checkbox, carousel, dialog, popover, calendar, button, date-picker) | no agregar: dos botones inline con `ACTION_CLASSES` bastan (KISS/YAGNI); evita una dependencia nueva |
| Wrapper de acciones con permiso y `ActionResult` | `run()` en `src/modules/admin/actions/run-action.ts`, `AdminError`, `can()` | reusar |
| Patrón de autorización y 404 uniforme | `updateEvent`, `setEventFeatured` en `event-write.service.ts`, `getEventForEdit` | reusar el patrón; el servicio nuevo va en archivo aparte (`event-lifecycle.service.ts`) para no inflar `event-write.service.ts` |
| Errores de FK | `isForeignKeyViolation` en `src/lib/pg-errors.ts` | reusar |
| Invalidación y aviso tras acción | `featured-toggle.tsx` (`invalidateQueries(["events","organizer"])`), `DeleteRoleDialog` (`onResult`) | reusar el patrón |
| Filtro de estado en el panel | `organizer-dashboard-view.tsx` (chips Todos/Publicados/Borradores), `event-list.schema.ts`, `event-list.service.ts` (ya hace `eq(events.status, params.status)`) | extender con "cancelled"; el servicio no cambia |
| Bloqueo de compra de eventos no publicados | `availability.service.ts`, `purchase.service.ts` ya exigen `published` | reusar, sin cambios |
| Componente de fila con botones | `Action` en `organizer-events-list.tsx` | extender |

## Plan de tareas

Seis tareas, máx. 3 archivos cada una, archivos disjuntos entre tareas. Cada fase final deja el proyecto compilando.

### Grupo 0 (serial: contrato y componente compartidos)
- **T-1**: Aceptar `cancelled` como estado filtrable del organizador y generalizar el diálogo de confirmación — archivos: `src/modules/events/schemas/event-list.schema.ts`, `src/modules/events/schemas/event-list.schema.test.ts`, `src/components/confirm-delete-dialog.tsx` — tests: sí (schema: `status=cancelled` solo en scope organizer, round-trip de query string) — cubre: AC-9, AC-10

### Grupo 1 (serial; una sola tarea)
- **T-2**: Reglas puras y servicio de ciclo de vida (eliminar/cancelar) — archivos: `src/modules/organizer/services/event-lifecycle.rules.ts`, `src/modules/organizer/services/event-lifecycle.rules.test.ts`, `src/modules/organizer/services/event-lifecycle.service.ts` — tests: sí (reglas; el servicio con db no se testea unitariamente, igual que `event-write.service.ts`) — cubre: AC-1, AC-2, AC-3, AC-4

### Grupo 2 (paralelo; dependen de T-1 y T-2)
- **T-3**: Server actions `deleteEventAction` / `cancelEventAction` con revalidación — archivos: `src/modules/organizer/actions/event.actions.ts` — tests: no (envoltura delgada, igual que las existentes) — cubre: AC-2, AC-3, AC-4, AC-8 (revalidación)
- **T-4**: Filtro "Cancelados" en el panel — archivos: `src/modules/organizer/components/organizer-dashboard-view.tsx` — tests: no — cubre: AC-9 (UI), AC-8 (KPIs recalculados vía invalidación)

### Grupo 3 (serial; depende de T-3)
- **T-5**: Diálogos de confirmación del evento — archivos: `src/modules/organizer/components/delete-event-dialog.tsx`, `src/modules/organizer/components/cancel-event-dialog.tsx` — tests: no (UI sin lógica; reusan `ConfirmDeleteDialog` y las actions de T-3) — cubre: AC-7

### Grupo 4 (serial; depende de T-5)
- **T-6**: Botones y flujo en la fila de "Mis eventos" — archivos: `src/modules/organizer/components/organizer-events-list.tsx` — tests: no — cubre: AC-6, AC-8 (aviso y refresco); AC-5 y AC-10 los verifica el reviewer (lint/test/build y que compra/disponibilidad rechazan eventos no publicados)

## Fases siguientes

Fuera de esta fase, si el usuario lo pide: reembolsos/anulación de entradas al cancelar (requiere decisión de pagos con Stripe), notificación por correo a compradores, y soft delete.

## Decisiones

Resueltas por el usuario el 2026-10-05 (se aceptaron todas las propuestas por defecto):

1. **Semántica de eliminar**: borrado duro **solo si el evento no tiene órdenes** (cualquier estado); con órdenes se bloquea y se ofrece cancelar. La FK `restrict` de `orders` ya impide el borrado con ventas, y no hay soft delete.
2. **Cancelar con entradas vendidas**: cancelar solo cambia el estado a `cancelled` (sale del catálogo, se desdestaca, no se puede comprar); **no** hay reembolsos, ni se anulan órdenes/tickets, ni se notifica a compradores (el diálogo lo aclara).
3. **Estados que permiten cada acción**: Cancelar solo desde `published`; Eliminar desde `draft`, `published` o `cancelled` siempre que no existan órdenes.
4. **Confirmación**: diálogo simple (reusando `ConfirmDeleteDialog`) para ambas acciones, sin escribir el título del evento.
5. **Reflejo en catálogo y filtros**: un evento cancelado desaparece del catálogo público, landing y hero (ya filtran `published`); en el panel sigue visible con badge "Cancelado" en "Todos" y en un **nuevo filtro "Cancelados"**; "Publicados" y "Borradores" no lo incluyen. `/events/[slug]` de un evento cancelado mantiene el 404.
6. **Permiso de ejecución**: basta `events:manage` en la organización para eliminar y cancelar.

## Preguntas abiertas

Ninguna.

Aprobada por el usuario el 2026-10-05.
