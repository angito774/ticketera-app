# Cancelación de evento con motivo y reembolso automático

**Estado**: approved
**Aprobado por**: usuario (confirmado en chat, 2026-10-14)
**Fase**: 1 de 2 (la Fase 2 está listada al final: seguimiento de plazo en el panel admin y textos legales)

## Contexto

Hoy `cancelEvent` (`src/modules/organizer/services/event-lifecycle.service.ts`) solo cambia `status` a `cancelled`; el diálogo (`cancel-event-dialog.tsx`) dice que las entradas vendidas **no se reembolsan**. El reembolso existe pero es manual y solo del super admin (`refund.service.ts`: `refundOrder`, `refundEventOrders` por lotes de 25, reanudable e idempotente; spec `docs/specs/payments/stripe-settlement-refunds.md`). El comprador no ve que su evento fue cancelado ni el estado de su devolución, no se le avisa, y `events` no guarda motivo ni fecha de cancelación.

La política publicada (`returns.content.ts`) promete devolución del 100% con plazo "máximo 15 días hábiles", y Indecopi ha sancionado a productoras por no devolver (investigación en la conversación del 2026-10-14; si la enfermedad del artista califica como fuerza mayor que exima la devolución no está confirmado en las fuentes, se asume que **se devuelve igual**, y los textos legales deben revisarse con un abogado antes de producción).

Esta fase hace que cancelar por causa justificada (artista, desastre natural o sismo, autoridad, recinto, seguridad, otro) **registre el motivo, reembolse automáticamente el 100% a los compradores, muestre el estado al comprador y le avise por correo**.

Decisiones tomadas por el usuario (2026-10-14) en la conversación de diseño:
1. Alcance A: motivo + reembolso automático + estado visible + correo. **Sin** reprogramación ni reversión de eventos ya liquidados.
2. Enfoque 1: el reembolso se dispara al cancelar (primeros lotes en la misma acción, el resto reanudable por el organizador). No hay cron ni aprobación del super admin.
3. Un evento **ya liquidado** no se puede cancelar desde el panel del organizador.
4. Correo con Resend (una dependencia nueva); su falla nunca bloquea el reembolso.

## Alcance

- **Incluye**:
  - Columnas `cancellation_reason`, `cancellation_note`, `cancelled_at` en `events` + migración. Sin estado nuevo.
  - Cancelar con motivo obligatorio (nota obligatoria si es "otro"), bloqueado si el evento tiene liquidación.
  - Reembolso automático al cancelar (hasta agotar un presupuesto de tiempo) y acción "Continuar reembolsos" para el organizador.
  - Estado de reembolso visible en el panel del organizador (pendientes / reembolsadas).
  - Estado del evento cancelado y del reembolso visible para el comprador (Mis entradas y confirmación), con el plazo legal.
  - Correo al comprador cuando su reembolso queda registrado en Stripe, con registro en `notifications`.
- **No incluye**: reprogramación; cancelación parcial (un día de un festival); reversión de transferencias ya liquidadas (sigue siendo manual en Stripe); reembolsos parciales; cancelación de eventos con entradas ya canjeadas más allá de lo que ya hace `refund.service` (esas órdenes se omiten); cron; reembolso de gastos extra del comprador; seguimiento de plazo en el panel admin y textos legales (Fase 2).

## Criterios de aceptación

- **AC-1 (schema, tests)**: `cancelEventInputSchema` valida `{ id: uuid, reason: CancellationReason, note?: string }`; `note` se recorta, máx. 500 caracteres, y es **obligatoria** si `reason === "other"`; motivo desconocido o id no UUID se rechazan. `CANCELLATION_REASON_LABELS` tiene una etiqueta en español para cada motivo.
- **AC-2 (BD)**: migración `0006_*` agrega a `events`: `cancellation_reason` (enum `cancellation_reason`, nullable), `cancellation_note` (text, nullable), `cancelled_at` (timestamptz, nullable). Eventos ya cancelados quedan con valores nulos (el comprador ve "Evento cancelado" sin motivo).
- **AC-3 (cancelar)**: `cancelEvent(actor, input)` mantiene la autorización de `events:manage` con 404 uniforme; rechaza si el evento no está `published`; rechaza con `AdminError` ("Este evento ya fue liquidado; contacta a soporte para cancelarlo") si existe fila en `settlements` para el evento; hace un `UPDATE ... WHERE id=? AND status='published'` condicional que fija `status='cancelled'`, `featured=false`, `cancellation_reason`, `cancellation_note` y `cancelled_at=now()`; si no afectó filas lanza el error actual de "solo publicados".
- **AC-4 (reembolso automático)**: tras el `UPDATE` exitoso, `cancelEvent` invoca `drainEventRefunds(eventId, 15_000)`. Un fallo del reembolso (Stripe, red) **no revierte la cancelación ni hace fallar la acción**: se registra solo el código del error y las órdenes quedan reanudables. La acción responde éxito aunque queden órdenes pendientes.
- **AC-5 (drain)**: `drainEventRefunds(eventId, budgetMs)` llama en bucle a `refundEventOrdersCore` hasta que `remaining === 0`, se agota `budgetMs` (reloj monotónico) o un lote procesa 0 órdenes (todas fallaron); devuelve el último `{ processed, failed, remaining }` acumulando `processed`/`failed`. Nunca crea un reembolso duplicado (reusa la idempotencia por orden de `refund.service`).
- **AC-6 (núcleo sin actor)**: `refundEventOrdersCore(eventId, opts)` contiene la lógica actual de `refundEventOrders` (evento `cancelled`, sin liquidación, selección `claimable | stripePending`, lote ≤ `REFUND_BATCH_SIZE`) sin chequeo de actor; `refundEventOrders(actor, …)` conserva su firma y comportamiento (llama `requireAdmin` + núcleo); los tests existentes siguen pasando.
- **AC-7 (continuar, organizador)**: `continueEventRefunds(actor, eventId)` exige `can(actor, "events:manage", organizationId)` del evento con 404 uniforme (id inválido/inexistente/ajeno), exige evento `cancelled`, y ejecuta `drainEventRefunds`. `getEventRefundProgress(actor, eventId)` (misma autorización) devuelve `{ pending, refunded }` donde `pending` = órdenes del evento `claimable | stripePending` y `refunded` = órdenes `refunded` con `stripe_refund_id` no nulo. Ninguna operación requiere ser super admin; ninguna puede reembolsar un evento no cancelado ni liquidado.
- **AC-8 (correo)**: cuando `createStripeRefund` registra por primera vez el `stripe_refund_id` de una orden (el `UPDATE ... WHERE stripe_refund_id IS NULL` afecta una fila), se envía **un** correo al comprador (evento, motivo si existe, monto, nº de orden, plazo) y se inserta una fila en `notifications` (`type: "order_refunded"`, `channel: "email"`, `status` `sent`/`failed`, `payload: { orderId }`, `sentAt`). Reintentos que no registran el id **no** reenvían. Si falta `RESEND_API_KEY` o el envío falla: se registra `status = failed`/log sin payload, y el reembolso queda intacto. `buildRefundEmail(...)` es una función pura (tests: incluye título, monto formateado, motivo, plazo; escapa HTML en título y nota).
- **AC-9 (vista del comprador, tests)**: función pura `getRefundView({ orderStatus, eventStatus, hasStripeRefund })` → `"none" | "in_progress" | "completed"`: `paid` + evento `cancelled` → `in_progress`; `refunded` sin `stripe_refund_id` → `in_progress`; `refunded` con id → `completed`; resto → `none`. `OrderView` expone `eventCancellationReason` (nullable), `refundState` y `refundedAt` (ISO o null). `order-ticket-card.tsx` y `confirmation-view.tsx` muestran, cuando el evento está cancelado, un aviso `role="status"` con "Evento cancelado" + motivo (si existe) + estado ("Reembolso en curso — máximo 15 días hábiles" / "Reembolsado el {fecha}"). Sin motivo no se inventa texto.
- **AC-10 (dialog, UI)**: `cancel-event-dialog.tsx` pide motivo (select, obligatorio) y nota (input, obligatoria si "otro", máx. 500, contador accesible); el texto indica que **se reembolsará el 100% a todos los compradores y se les avisará por correo** y que no se puede deshacer; los errores del servidor se muestran en el diálogo sin cerrarlo; mantiene `role="alertdialog"`, foco inicial seguro y botón con estado pendiente. `ConfirmDeleteDialog` acepta `children` opcional (retrocompatible) para el formulario.
- **AC-11 (panel organizador, UI)**: en `organizer-events-list.tsx`, un evento cancelado con ventas muestra `EventRefundProgress`: "N reembolsadas · M pendientes" (consulta con react-query a `getEventRefundProgressAction`, `aria-live="polite"`); si `pending > 0`, botón "Continuar reembolsos" (objetivo táctil ≥ 44 px móvil, estado pendiente, errores en `role="alert"`) que llama a `continueEventRefundsAction` y refresca el progreso. Con `pending === 0` muestra "Reembolsos completados".
- **AC-12 (seguridad)**: todas las acciones nuevas validan con zod, exigen sesión y permiso en servidor, no confían en datos del cliente (monto, órdenes), y no registran ni devuelven payloads de Stripe, claves o correos en logs. `RESEND_API_KEY` solo en servidor. La nota del organizador se trata como texto (se escapa en correo y UI).
- **AC-13 (calidad)**: `lint`, `test` y `build` pasan; sin duplicar lógica de reembolso (un único núcleo en `refund.service.ts`); sin cambios en el flujo de liquidación; el reviewer valida el SQL de selección y la migración contra la base en solo lectura.

## Contratos

### Base de datos (migración `drizzle/0006_*.sql`, generada con `npm run db:generate`; aplicación manual `npm run db:migrate`)

```ts
// src/db/schema/enums.ts
export const cancellationReason = pgEnum("cancellation_reason", [
  "artist", "natural_disaster", "authority", "venue", "safety", "other",
]);

// src/db/schema/events.ts — columnas nuevas
cancellationReason: cancellationReason(),
cancellationNote: text(),
cancelledAt: tstz(),
```

### Schema y constantes compartidas

```ts
// src/modules/organizer/schemas/cancellation.schema.ts
export const CANCELLATION_REASONS = ["artist","natural_disaster","authority","venue","safety","other"] as const;
export type CancellationReason = (typeof CANCELLATION_REASONS)[number];
export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string>;
// artist: "Artista enfermo o no disponible", natural_disaster: "Desastre natural o sismo",
// authority: "Orden de una autoridad", venue: "Problema con el recinto",
// safety: "Riesgo para la seguridad", other: "Otro motivo"
export const cancelEventInputSchema: z.ZodType<{ id: string; reason: CancellationReason; note?: string }>;
```

### Servicios y acciones

```ts
// src/modules/payments/services/refund.service.ts (se agrega; refundEventOrders conserva firma)
export async function refundEventOrdersCore(eventId: string, opts?: { limit?: number }): Promise<BatchResult>;
export async function drainEventRefunds(eventId: string, budgetMs: number): Promise<BatchResult>;
export async function continueEventRefunds(actor: CurrentUser, eventId: string): Promise<BatchResult>;
export async function getEventRefundProgress(actor: CurrentUser, eventId: string): Promise<{ pending: number; refunded: number }>;
// BatchResult = { processed: number; failed: number; remaining: number } (ya definido en el archivo)

// src/lib/email.ts
export function sendEmail(input: { to: string; subject: string; html: string }): Promise<boolean>; // false sin RESEND_API_KEY o si falla; nunca lanza

// src/modules/payments/services/refund-email.ts (puro)
export function buildRefundEmail(i: {
  eventTitle: string; reasonLabel: string | null; amountCents: number; orderNumber: string;
}): { subject: string; html: string };

// src/modules/organizer/services/event-lifecycle.service.ts
export async function cancelEvent(actor: CurrentUser, input: { id: string; reason: CancellationReason; note?: string }): Promise<void>;

// src/modules/organizer/actions/event.actions.ts (cancelEventAction cambia de input; se agregan dos)
export async function cancelEventAction(raw: unknown): Promise<ActionResult>;                 // cancelEventInputSchema
export async function continueEventRefundsAction(raw: unknown): Promise<ActionResult>;         // { id: uuid }
export async function getEventRefundProgressAction(raw: unknown): Promise<ActionResult & { pending?: number; refunded?: number }>; // { id: uuid }

// src/modules/checkout/services/order-read.mapping.ts (puro)
export type RefundStateView = "none" | "in_progress" | "completed";
export function getRefundView(i: { orderStatus: OrderStatusView; eventStatus: EventStatusView; hasStripeRefund: boolean }): RefundStateView;
// OrderView / OrderRow se extienden con: eventCancellationReason: CancellationReason | null; refundState: RefundStateView; refundedAt: string | null
```

### Variables de entorno (`.env.example`)

`RESEND_API_KEY=` y `EMAIL_FROM=` (opcionales: sin ellas no se envían correos y se registra `failed`). No se toca `.env`.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Cancelar y autorización con 404 uniforme | `cancelEvent`, `loadManagedEvent` en `event-lifecycle.service.ts` | extender |
| Reembolso por lote, idempotente y reanudable | `refundEventOrders`, `refundLoadedOrder`, `createStripeRefund`, `claimable`, `stripePending` en `refund.service.ts` | extraer núcleo sin actor y reusar; no se duplica SQL |
| Reglas de reembolsabilidad | `assertRefundable`, `shouldReturnInventory`, `clampRefundLimit` en `refund.mapping.ts` | reusar sin cambios |
| Permiso del organizador | `can(actor, "events:manage", orgId)` | reusar |
| Wrapper de acciones | `run()` en `src/modules/admin/actions/run-action.ts` | reusar |
| Diálogo destructivo | `ConfirmDeleteDialog` (ya tiene `pendingLabel`/`cancelLabel`) | agregar `children?` retrocompatible |
| Formulario del diálogo | `ui/select`, `ui/input` ya en `src/components/ui/` | reusar; no se agrega textarea (nota corta, 500 caracteres) |
| Registro de avisos | tabla `notifications` + enum `notification_status` (existen, sin uso) | reusar como bitácora de correos |
| Cliente de correo | nada en `src/` ni `package.json` | **crear** `src/lib/email.ts` + dependencia `resend` |
| Estado del pedido para el comprador | `OrderView`, `buildOrderViews`, `eventStatus`, `status: "refunded"` en `order-read.mapping.ts` | extender |
| Formato de montos y fechas | `formatPrice`, `formatDate` en `src/lib/format.ts` | reusar |
| Texto del plazo | `REFUND_DEADLINE` en `returns.content.ts` | no se importa (contenido legal); la UI usa su propia constante, unificar en Fase 2 |
| Invalidar lista tras acción | `invalidateQueries(["events","organizer"])` (patrón de `featured-toggle.tsx`) | reusar |

## Plan de tareas

### Grupo 0 (serial: dependencia, esquema y contrato compartido)

- **T-1**: Dependencia de correo, variables de entorno y migración — archivos: `package.json`, `package-lock.json` (`npm i resend`), `.env.example`, `src/db/schema/enums.ts`, `src/db/schema/events.ts`, `drizzle/0006_*.sql` y `drizzle/meta/*` (generados por `npm run db:generate`) — tests: no (el reviewer valida la migración contra la base) — cubre: AC-2
- **T-2**: Schema y etiquetas de motivo — archivos: `src/modules/organizer/schemas/cancellation.schema.ts`, `src/modules/organizer/schemas/cancellation.schema.test.ts` — tests: sí (motivo inválido, `other` sin nota, recorte y máx. 500, id no UUID, etiquetas completas) — cubre: AC-1

### Grupo 1 (paralelo; dependen de T-1 y T-2)

- **T-3**: Núcleo de reembolso, drain, progreso y correo — archivos: `src/modules/payments/services/refund.service.ts`, `src/lib/email.ts`, `src/lib/email.test.ts`, `src/modules/payments/services/refund-email.ts`, `src/modules/payments/services/refund-email.test.ts` — tests: sí (email: sin clave devuelve `false` sin lanzar, error de red devuelve `false`; plantilla pura con escape HTML; `drainEventRefunds` es SQL/Stripe y se valida por el reviewer) — cubre: AC-5, AC-6, AC-7, AC-8, AC-12
- **T-4**: Vista del comprador — archivos: `src/modules/checkout/services/order-read.mapping.ts`, `src/modules/checkout/services/order-read.mapping.test.ts`, `src/modules/checkout/services/order-read.service.ts`, `src/modules/checkout/components/order-ticket-card.tsx`, `src/modules/checkout/components/confirmation-view.tsx` — tests: sí (`getRefundView` por cada combinación; `buildOrderViews` propaga motivo y estado) — cubre: AC-9

> Los conjuntos de archivos de T-3 y T-4 son disjuntos. `order-read.service.ts` selecciona `events.cancellationReason` y `orders.stripeRefundId`/`refundedAt`.

### Grupo 2 (serial; depende de T-3 y T-2)

- **T-5**: Cancelar con motivo y reembolso automático — archivos: `src/modules/organizer/services/event-lifecycle.service.ts`, `src/modules/organizer/actions/event.actions.ts`, `src/modules/organizer/components/cancel-event-dialog.tsx`, `src/components/confirm-delete-dialog.tsx` — tests: no (servicio con db y envoltura delgada, igual que las existentes; la lógica pura está probada en T-2) — cubre: AC-3, AC-4, AC-10, AC-12

### Grupo 3 (serial; depende de T-5)

- **T-6**: Progreso y "Continuar reembolsos" en el panel del organizador — archivos: `src/modules/organizer/components/event-refund-progress.tsx`, `src/modules/organizer/components/organizer-events-list.tsx` — tests: no (UI sin lógica propia; reusa las acciones de T-5) — cubre: AC-11; AC-13 lo verifica el reviewer (lint/test/build, SQL y migración en solo lectura)

## Riesgos

- **Duración de la acción**: cada reembolso son varias consultas + una llamada a Stripe; con el presupuesto de 15 s una cancelación con cientos de órdenes no termina en una sola invocación (el lote es de 25). Por eso existe "Continuar reembolsos". En un host serverless con `maxDuration` bajo hay que confirmar el límite; si es menor a ~20 s, bajar `budgetMs`.
- **Fondos de Stripe**: reembolsar requiere saldo disponible en la plataforma; si falta, la orden queda `refunded` sin `stripe_refund_id` y se reintenta (comportamiento actual, AC-6 de la spec de pagos). Stripe no devuelve sus comisiones: cada cancelación cuesta dinero a la plataforma.
- **Permiso ampliado**: hoy solo el super admin reembolsa; ahora el organizador (`events:manage`) dispara reembolsos de **su** evento cancelado. Está acotado: evento `cancelled`, sin liquidación, idempotente, sin elegir montos ni órdenes.
- **Cancelación abusiva o equivocada**: es irreversible y reembolsa todo; el diálogo lo advierte con motivo obligatorio. Un organizador malintencionado podría cancelar para "devolver" ventas; mitigación posible (aprobación del super admin) quedó descartada por el usuario (enfoque 1).
- **Evento ya iniciado**: se permite cancelar mientras no esté liquidado; las órdenes con entradas ya canjeadas se omiten del reembolso automático (regla existente) y quedan para gestión manual.
- **Entrega de correo**: Resend requiere dominio verificado en producción; sin `RESEND_API_KEY` el aviso en la app es el único canal. Un correo que falla no se reintenta automáticamente en esta fase (queda `failed` en `notifications`).
- **Datos previos**: eventos cancelados antes de esta fase no tienen motivo ni fecha; sus órdenes siguen el flujo manual del super admin o "Continuar reembolsos".
- **Legal**: los textos de devolución y términos y la calificación de la enfermedad del artista como fuerza mayor deben validarlos un abogado (Fase 2 los actualiza; no es asesoría legal).

## Fases siguientes

**Fase 2** (spec propia al terminar la Fase 1): (a) seguimiento del plazo en `/admin/payments` — antigüedad en días hábiles desde `cancelled_at` (utilidad pura `businessDaysBetween` en `src/lib/`), con alerta desde 10 días hábiles; (b) actualizar `returns.content.ts` y `terms.content.ts` (motivos, plazo, aviso por correo) con sus tests.
Fuera de plan: reprogramación con opción de devolución, cancelación de eventos liquidados con reversión de transferencia, reembolsos parciales, reintento automático de correos.

## Decisiones

Resueltas por el usuario el 2026-10-14 (ver Contexto): alcance A, reembolso automático al cancelar con continuación por el organizador, bloqueo de cancelación para eventos liquidados, correo con Resend.

Supuestos de esta spec (cambiables): presupuesto de 15 s por invocación; nota de hasta 500 caracteres; el aviso al comprador usa "máximo 15 días hábiles" como en la política vigente.

## Preguntas abiertas

Ninguna bloqueante.
