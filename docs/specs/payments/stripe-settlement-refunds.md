# Liquidación a organizadores y reembolsos (Fase 3: transferencias, comisión y devoluciones)

**Estado**: approved
**Aprobado por**: usuario (confirmado en chat, 2026-10-09)
**Fase**: 3 de 3 (anteriores: `stripe-buyer-payment.md`, `stripe-organizer-onboarding.md`)

> **Nota de estado**: decisiones del usuario incorporadas (ver § Decisiones). La spec permanece en `draft` porque solo el orquestador registra la aprobación humana; sin preguntas bloqueantes.

## Contexto

Con cargos separados y transferencias, Ticketera cobra al comprador y retiene el dinero (Fase 1). Esta fase (a) **transfiere al organizador** `total − comisión` de las órdenes pagadas de un evento una vez que el evento ocurre, hacia su cuenta conectada `active` (Fase 2), y (b) permite al administrador **reembolsar** órdenes (cubre el 100% de devolución por cancelación de `/devoluciones`) **antes** de transferir. La comisión se guarda en `orders.application_fee_amount` y debe cubrir las tarifas de Stripe, que paga la plataforma junto con contracargos y saldos negativos. Diseño: `docs/specs/database/data-model.md` § Decisiones de arquitectura (Pagos), `orders`, `Fuera de alcance` (reembolsos parciales fuera). Política: `src/modules/legal/content/returns.content.ts` (devolución del 100% si el organizador cancela o reprograma sin aceptación).

## Alcance

- **Incluye**:
  - Tabla `settlements` (una liquidación por evento) y columnas de orden `settlement_id`, `refunded_at`, `stripe_refund_id`; migración.
  - Cálculo de comisión (utilidad pura con configuración por entorno) y su registro por orden al liquidar.
  - Servicio de liquidación (elegibilidad, reclamo atómico de órdenes, transferencia idempotente, reintento de fallidas).
  - Servicio de reembolso por orden y por evento cancelado (reanudable e idempotente).
  - Panel `/admin/payments` (solo super admin, decisión 10) para liquidar, reintentar y reembolsar; ítem de menú.
  - Disparador **manual** desde `/admin/payments` (decisión 4); sin cron.
- **No incluye**: cron de liquidación automática (T-6 omitida) y `CRON_SECRET`; pagos de otros métodos; reembolsos parciales; **reembolso o reversión de transferencias ya liquidadas** (el evento liquidado no admite reembolsos automáticos; requiere reversión manual en Stripe — decisión 10); gestión de contracargos/disputas; reportes contables o facturación; liquidación anticipada antes del evento; notificaciones por correo; cálculo de impuestos; cambios al onboarding (Fase 2) o al cobro (Fase 1); la comisión se descuenta al organizador.

## Criterios de aceptación

- **AC-1 (comisión, pura)**: `computeApplicationFee(amountCents, config)` devuelve un entero en centavos = `round(amountCents × percentBps / 10000) + fixedCents`, nunca negativo y nunca mayor que `amountCents`; con `config` inválida (no enteros, `percentBps` fuera de 0–10000, `fixedCents` < 0) lanza error. `parseFeeConfig(env)` lee `PLATFORM_FEE_BPS` y `PLATFORM_FEE_FIXED_CENTS` y **falla si faltan** (el código no tiene valores por defecto; el supuesto de demo es `PLATFORM_FEE_BPS=1000` y `PLATFORM_FEE_FIXED_CENTS=0` en `.env.example`). El payout de una orden es `totalAmount − fee`, siempre ≥ 0.
- **AC-2 (elegibilidad, pura)**: `isEventSettleable` es verdadero solo si el evento está `published` (no `cancelled`), `startsAt + SETTLEMENT_DELAY_HOURS ≤ ahora` (`events` no tiene fecha de fin: se usa `starts_at`) (supuesto de demo: `0`, configurable; sin default en código), la organización tiene `stripe_account_id` y `stripe_connect_status = 'active'`, no existe liquidación `paid`/`pending` para el evento y hay al menos una orden `paid` sin liquidar. Cualquier otra condición → falso con motivo legible (`reason`).
- **AC-3 (reclamo atómico)**: `settleEvent` crea la fila `settlements` (`pending`, `attempts = 1`) y, en el **mismo `db.batch`**, asigna `orders.settlement_id` y `application_fee_amount` solo a órdenes `status = 'paid'` con `settlement_id IS NULL` del evento; si el número de órdenes reclamadas no coincide con el leído (p. ej. una se reembolsó entre medio) el batch aborta con guarda de división por cero y se reintenta lectura/cálculo una vez. `gross = Σ total`, `fee = Σ application_fee_amount`, `payout = gross − fee` (restricción `CHECK` en BD). `UNIQUE(event_id)` impide dos liquidaciones del mismo evento aun con ejecuciones simultáneas (23505 → "ya en proceso/liquidada").
- **AC-4 (transferencia idempotente)**: tras el reclamo, se crea `stripe.transfers.create` por `payout` hacia `stripe_account_id`, con `transfer_group = "event_<eventId>"` (el mismo grupo de los cobros de la Fase 1), `metadata.settlementId`/`eventId` y clave de idempotencia `settlement-<settlementId>-<attempts>`; éxito → `status = 'paid'`, `stripe_transfer_id`, `paid_at`; error de Stripe → `status = 'failed'`, `failure_code` (código corto, sin payload), las órdenes siguen asociadas a la liquidación. Si `payout ≤ 0` no se llama a Stripe: se marca `paid` sin transferencia (id nulo) y se registra. Nunca se transfiere dos veces el mismo evento.
- **AC-5 (reintento)**: `retrySettlement(settlementId)` solo opera sobre `failed`: incrementa `attempts`, vuelve a `pending` con una guarda condicional (`WHERE status = 'failed'`; dos reintentos simultáneos → uno solo avanza) y repite AC-4 con una clave nueva. Una liquidación `paid` no se reintenta.
- **AC-6 (reembolso de una orden)**: `refundOrder(actor, orderId)` exige el permiso de la decisión 10 (super admin) y que la orden esté `paid`, tenga `stripe_payment_intent_id`, `settlement_id IS NULL` y ninguna entrada `redeemed`; si no, error legible sin efectos. Orden de operaciones (impide el doble pago al comprador y al organizador): (1) un `db.batch` guardado (`WHERE status = 'paid' AND settlement_id IS NULL`) pasa la orden a `refunded` con `refunded_at`, marca sus entradas `cancelled` y, **solo si el evento sigue `published`**, devuelve inventario (asientos `sold → available`, `quantity_sold` decrementado); (2) `stripe.refunds.create({ payment_intent })` con clave `refund-order-<orderId>`; (3) guarda `stripe_refund_id`. Si (2) falla la orden queda `refunded` sin `stripe_refund_id` y figura en "reembolsos pendientes" para reintentar solo (2)–(3) (idempotente por la clave). Reembolsar dos veces la misma orden no genera dos reembolsos.
- **AC-7 (reembolso por evento cancelado)**: `refundEventOrders(actor, eventId, { limit })` exige el mismo permiso, requiere evento `cancelled` y sin liquidación `paid`/`pending`; procesa hasta `REFUND_BATCH_SIZE` órdenes por llamada aplicando AC-6 y devuelve `{ processed, failed, remaining }`; puede volver a invocarse hasta `remaining = 0` sin duplicar reembolsos. Un evento con liquidación previa → error "evento ya liquidado; reversión manual".
- **AC-8 (consistencia liquidación–reembolso)**: ninguna orden `refunded` entra en una liquidación (el reclamo de AC-3 filtra por `paid`) y ninguna orden con `settlement_id` puede reembolsarse (AC-6): un mismo pago no se devuelve al comprador y se transfiere al organizador a la vez. Los eventos `cancelled` nunca se liquidan.
- **AC-9 (panel admin)**: `/admin/payments` redirige a `/` a quien no tenga `organizations:manage`; muestra (a) eventos listos para liquidar con bruto, comisión y payout calculados y botón "Liquidar", (b) liquidaciones con estado (`pending`/`paid`/`failed`) y "Reintentar" en `failed`, (c) eventos cancelados con órdenes pagadas y botón "Reembolsar evento", (d) un diálogo "Reembolsar orden" que pide el id de orden, muestra evento/total/correo antes de confirmar y exige confirmación; errores del servidor en `role="alert"`; los botones se deshabilitan mientras procesan. El menú muestra "Pagos" solo a quien tenga el permiso.
- **AC-10 (disparador manual)**: la liquidación se dispara solo desde `/admin/payments` (AC-9) por el super admin; no existe ruta de cron ni `CRON_SECRET`. Liquidar un evento no elegible devuelve el motivo legible de `isEventSettleable`.
- **AC-11 (seguridad)**: todas las acciones exigen sesión y permiso; los ids vienen validados con zod (uuid) y los montos se calculan siempre desde la base; respuestas y logs sin payloads de Stripe, claves ni datos de tarjeta; `stripe` solo en servidor.
- **AC-12 (calidad)**: `lint`, `test`, `build` pasan; pruebas puras para comisión, elegibilidad, reglas de reembolso y schemas; el reviewer valida el SQL de reclamo y liberación contra la base en solo lectura (como en `real-purchase.md`).

## Contratos

### Base de datos (migración `drizzle/0005_*.sql`, generada con `npm run db:generate`; aplicación manual `npm run db:migrate`)

```ts
// src/db/schema/enums.ts
export const settlementStatus = pgEnum("settlement_status", ["pending", "paid", "failed"]);

// src/db/schema/payments.ts — tabla nueva (junto a stripe_events de la Fase 1)
export const settlements = pgTable("settlements", {
  id: uuid().primaryKey().defaultRandom(),
  eventId: uuid().notNull().unique().references(() => events.id, { onDelete: "restrict" }),
  organizationId: text().notNull().references(() => organizations.id, { onDelete: "restrict" }),
  grossAmount: integer().notNull(),      // centavos, Σ orders.total_amount
  feeAmount: integer().notNull(),        // centavos, Σ orders.application_fee_amount
  payoutAmount: integer().notNull(),     // centavos transferidos
  currency: text().notNull().default("PEN"),
  status: settlementStatus().notNull().default("pending"),
  attempts: integer().notNull().default(0),
  stripeTransferId: text().unique(),
  failureCode: text(),
  paidAt: tstz(),
  ...timestamps(),
}, (t) => [
  index("settlements_org_idx").on(t.organizationId),
  index("settlements_status_idx").on(t.status),
  check("settlements_amounts_check", sql`${t.grossAmount} >= 0 and ${t.feeAmount} >= 0 and ${t.payoutAmount} = ${t.grossAmount} - ${t.feeAmount} and ${t.payoutAmount} >= 0`),
]);

// src/db/schema/orders.ts — columnas nuevas
settlementId: uuid().references(() => settlements.id, { onDelete: "restrict" }),   // + index("orders_settlement_idx")
refundedAt: tstz(),
stripeRefundId: text().unique(),
```

`orders.status = 'refunded'` se fija al reclamar el reembolso (paso 1 de AC-6); "reembolso pendiente de Stripe" = `status = 'refunded' AND stripe_refund_id IS NULL`.

### Tipos, schemas y servicios

```ts
// src/lib/application-fee.ts (puro)
export interface FeeConfig { percentBps: number; fixedCents: number }
export function parseFeeConfig(env: Record<string, string | undefined>): FeeConfig;     // PLATFORM_FEE_BPS, PLATFORM_FEE_FIXED_CENTS (obligatorias)
export function computeApplicationFee(amountCents: number, config: FeeConfig): number;
export function computePayout(totalCents: number, feeCents: number): number;            // total − fee, ≥ 0

// src/modules/payments/services/settlement.mapping.ts (puro)
export interface SettleabilityInput {
  eventStatus: "draft" | "published" | "cancelled"; startsAt: Date; now: Date; delayHours: number;
  connectStatus: "not_started" | "pending" | "active" | "restricted"; hasAccount: boolean;
  existingSettlement: "none" | "pending" | "paid" | "failed"; unsettledPaidOrders: number;
}
export function isEventSettleable(i: SettleabilityInput): { ok: true } | { ok: false; reason: string };
export function summarizeSettlement(orders: { id: string; totalAmount: number }[], config: FeeConfig):
  { gross: number; fee: number; payout: number; perOrderFee: { orderId: string; fee: number }[] };

// src/modules/payments/services/settlement.service.ts (solo servidor)
export interface SettlementCandidate { eventId: string; eventTitle: string; organizationName: string; orders: number; gross: number; fee: number; payout: number }
export function listSettlementCandidates(now?: Date): Promise<SettlementCandidate[]>;
export function listSettlements(actor: CurrentUser): Promise<SettlementRow[]>;
export function settleEvent(actor: CurrentUser | "system", eventId: string, now?: Date): Promise<{ status: "paid" | "failed" | "skipped"; settlementId?: string; reason?: string }>;
export function retrySettlement(actor: CurrentUser, settlementId: string): Promise<{ status: "paid" | "failed" }>;

// src/modules/payments/schemas/refund.schema.ts
export const refundOrderInputSchema = z.object({ orderId: z.string().uuid() });
export const refundEventInputSchema = z.object({ eventId: z.string().uuid() });
export const settleEventInputSchema = z.object({ eventId: z.string().uuid() });
export const retrySettlementInputSchema = z.object({ settlementId: z.string().uuid() });

// src/modules/payments/services/refund.mapping.ts (puro)
export const REFUND_BATCH_SIZE = 25;
export function assertRefundable(o: { status: string; hasPaymentIntent: boolean; settlementId: string | null; redeemedTickets: number }): void; // lanza RefundRuleError
export function shouldReturnInventory(eventStatus: "draft" | "published" | "cancelled"): boolean;

// src/modules/payments/services/refund.service.ts (solo servidor)
export function getRefundPreview(actor: CurrentUser, orderId: string): Promise<{ orderId: string; eventTitle: string; total: number; buyerEmail: string; refundable: boolean; reason?: string } | null>;
export function refundOrder(actor: CurrentUser, orderId: string): Promise<{ status: "refunded" | "pending_stripe" }>;
export function refundEventOrders(actor: CurrentUser, eventId: string, opts?: { limit?: number }): Promise<{ processed: number; failed: number; remaining: number }>;
export function retryPendingRefunds(actor: CurrentUser, opts?: { limit?: number }): Promise<{ processed: number; failed: number; remaining: number }>;

// src/modules/payments/actions/payments-admin.actions.ts ("use server")
export type PaymentsActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };
// settleEventAction, retrySettlementAction, refundOrderAction, refundEventAction, retryPendingRefundsAction
```

### Variables de entorno (en `.env.example`)

`PLATFORM_FEE_BPS`, `PLATFORM_FEE_FIXED_CENTS`, `SETTLEMENT_DELAY_HOURS`. Supuestos de demo, configurables (decisiones 2 y 3): `1000`, `0` y `0`; se escriben en `.env.example` (no en `.env`) y el código no define valores por defecto.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Cliente Stripe y manejo de errores | `src/lib/stripe.ts` (Fase 1) | reusar |
| Tabla de eventos / idempotencia, `payments.ts` | Fase 1 | **extender** (`settlements` en el mismo archivo) |
| Estado y cuenta del organizador | `organizations.stripe_account_id`, `stripe_connect_status` (Fase 2) | reusar |
| Escrituras atómicas con guarda | `purchase.query.ts` (`reserveGeneralSql`, `claimSeatsSql`, guarda por división por cero, `buildPurchaseRows`), `reservation.service.ts`, `pg-errors.ts` | reusar sin cambios, incluidos `releaseSoldSql`/`releaseSeatsSql` que añade la Fase 1 (T-5) para liberar asientos/cupo; no se duplica SQL |
| Cancelar evento | `cancelEvent` en `event-lifecycle.service.ts` (solo cambia estado) | reusar sin cambios; el reembolso masivo es una acción de admin aparte |
| Permisos | `can`, `requirePermission`, `organizations:manage` (solo super admin) | reusar; no se crea permiso nuevo (decisión 10) |
| Panel admin y navegación | `src/modules/auth/services/dashboard-nav.ts` (+test), `src/components/dashboard/dashboard-shell.tsx`, `src/app/admin/*` | **extender** con "Pagos" |
| Tablas y diálogos | `table`, `dialog`, `tabs`, `badge`, `button`, `input` ya en `src/components/ui/`; patrón de `customers-table.tsx`, `assign-customer-dialog.tsx`, `organizations-table.tsx` | reusar; no se agrega nada de shadcn (verificado: existen `@shadcn/table`, `@shadcn/dialog`, `@shadcn/alert-dialog` por si se prefiere confirmar con `alert-dialog`: `npx shadcn@latest add alert-dialog` en T-4) |
| Formato de montos y fechas | `formatPrice`, `formatDate` en `src/lib/format.ts` | reusar |
| Comisión | nada en `src/` | **crear** `src/lib/application-fee.ts` (genérica, sin dependencia de dominio; reutilizable) |
| Lectura de órdenes y vistas de usuario | `order-read.service.ts` (`refunded` ya modelado en `OrderView`) | reusar sin cambios |

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Esquema, migración y variables de entorno. — archivos: `src/db/schema/enums.ts` (`settlementStatus`), `src/db/schema/payments.ts` (`settlements`), `src/db/schema/orders.ts` (`settlementId`, `refundedAt`, `stripeRefundId`), `drizzle/0005_*.sql` y `drizzle/meta/*` (generados por `npm run db:generate`), `.env.example` (agregar `PLATFORM_FEE_BPS=1000`, `PLATFORM_FEE_FIXED_CENTS=0`, `SETTLEMENT_DELAY_HOURS=0`; sin tocar `.env`) — tests: no (el reviewer valida la migración y los `CHECK` contra la base) — cubre: AC-3, AC-6

### Grupo 1 (paralelo)

- **T-2**: Comisión, elegibilidad y servicio de liquidación. — archivos: `src/lib/application-fee.ts`, `src/lib/application-fee.test.ts`, `src/modules/payments/services/settlement.mapping.ts`, `src/modules/payments/services/settlement.mapping.test.ts`, `src/modules/payments/services/settlement.service.ts` — tests: sí (redondeo, topes, config inválida/ausente, elegibilidad con cada motivo, resumen por orden sin pérdida de centavos: `Σ fee_i = fee`) — cubre: AC-1, AC-2, AC-3, AC-4, AC-5, AC-8, AC-11
- **T-3**: Reembolsos. — archivos: `src/modules/payments/schemas/refund.schema.ts`, `src/modules/payments/schemas/refund.schema.test.ts`, `src/modules/payments/services/refund.mapping.ts`, `src/modules/payments/services/refund.mapping.test.ts`, `src/modules/payments/services/refund.service.ts` (importa `releaseSoldSql`/`releaseSeatsSql` de `purchase.query.ts` tal como los deja la Fase 1; si la firma no alcanza es un `SPEC_ISSUE`, no se edita `purchase.query.ts` desde esta tarea) — tests: sí (`assertRefundable` con cada causa, `shouldReturnInventory`, schemas) — cubre: AC-6, AC-7, AC-8, AC-11

### Grupo 2 (paralelo)

- **T-4**: Acciones y pantalla de administración. — archivos: `src/modules/payments/actions/payments-admin.actions.ts`, `src/app/admin/payments/page.tsx`, `src/modules/payments/components/settlements-table.tsx`, `src/modules/payments/components/refund-order-dialog.tsx` — tests: no (presentacional; las acciones delegan en servicios probados); si una acción gana lógica propia, test junto a ella — cubre: AC-9, AC-11
- **T-5**: Navegación. — archivos: `src/modules/auth/services/dashboard-nav.ts`, `src/modules/auth/services/dashboard-nav.test.ts`, `src/components/dashboard/dashboard-shell.tsx` (ícono) — tests: sí (el ítem "Pagos" aparece solo con `organizations:manage`) — cubre: AC-9

> Los conjuntos de archivos de T-4 y T-5 son disjuntos. (La antigua T-6, cron, se omite por la decisión 4.) T-2 y T-3 también (T-3 no modifica `purchase.query.ts`).

## Riesgos

- **Fondos disponibles**: una transferencia solo puede cubrirse con saldo disponible de la plataforma; los cobros con tarjeta pasan a disponible según el calendario de Stripe. Si `SETTLEMENT_DELAY_HOURS` es corto o el saldo es insuficiente, la liquidación queda `failed` (se reintenta, AC-5). Depende de la decisión 1 (limitación de demo).
- **Moneda y conversión**: si la plataforma no puede operar en PEN (decisión 1), las transferencias pueden convertirse de moneda con tarifas y tipo de cambio; el payout calculado en PEN podría no coincidir con lo recibido. Resolver antes de implementar.
- **Margen negativo**: la comisión (decisión 2: 10% de demo, configurable) debe cubrir tarifas de Stripe, contracargos y las tarifas no reembolsables de los reembolsos (Stripe no las devuelve); sin esto la plataforma pierde dinero por orden. Recomendado validar con números reales.
- **Reembolso tras liquidación**: fuera de alcance (reversión manual de la transferencia en Stripe); puede dejar saldo negativo a cargo de la plataforma.
- **Falla parcial de reembolso**: orden `refunded` sin `stripe_refund_id` hasta reintento (AC-6); visible en el panel. Un `refund.failed` posterior solo se detectaría manualmente (no hay webhook de reembolsos en esta fase).
- **Ejecuciones concurrentes** (cron + botón manual, o dos pestañas): protegidas por `UNIQUE(event_id)`, guardas condicionales y claves de idempotencia; los tests puros no las cubren, por lo que el reviewer valida el SQL.
- **Orden pagada antes de la Fase 3**: tienen `application_fee_amount = null`; se calcula y guarda al liquidar con la configuración vigente en ese momento (el historial no se recalcula después).
- **Reprogramación**: no existe estado ni fecha original de evento reprogramado; el reembolso por reprogramación se hace con "Reembolsar orden" (manual) hasta que exista ese flujo.
- **Demo en modo de prueba**: los fondos de prueba de Stripe pueden no estar disponibles al instante; si la transferencia falla por saldo, se reintenta desde el panel (AC-5).

## Fases siguientes

Ninguna planificada (esta es la última). Quedan fuera y podrían abrir nuevas specs: reversión de transferencias liquidadas, disputas/contracargos, reembolsos parciales, correo transaccional, reportes contables.

## Decisiones (antes preguntas abiertas)

Registradas a partir de lo comunicado por el coordinador (2026-10-09). Los valores marcados "supuesto de demo, configurable" no fueron elegidos por el usuario y son cambiables sin tocar código.

1. **País/entidad de la plataforma (antes bloqueante)**: el proyecto es una **DEMO en modo de prueba de Stripe** (credenciales de prueba ya en `.env`; no se copian valores). Limitación de demo documentada: en producción habría que verificar con Stripe si Perú puede ser país de plataforma Connect (o si se requiere una plataforma en otro país con cargos separados y transferencias), la moneda de cobro/liquidación y las tarifas reales.
2. **Comisión (supuesto de demo, configurable)**: 10% (`PLATFORM_FEE_BPS=1000`), sin monto fijo (`PLATFORM_FEE_FIXED_CENTS=0`), **descontada al organizador**; el comprador paga solo el precio de las entradas (la Fase 1 no cambia). Advertencia vigente: en producción debe cubrir las tarifas de Stripe (los reembolsos no las devuelven).
3. **Cuándo se paga (supuesto de demo, configurable)**: `SETTLEMENT_DELAY_HOURS=0` contado desde `events.starts_at`, porque `events` no tiene fecha de fin.
4. **Disparador (supuesto de demo)**: liquidación **manual desde `/admin/payments`** tras el evento; **sin cron**.
5. **Alcance**: se implementan las Fases 1, 2 y 3 completas.
6. **País de cuentas conectadas (antes bloqueante)**: constante configurable `CONNECTED_ACCOUNT_COUNTRY` con un país válido en modo de prueba (supuesto de demo; en producción depende de la decisión 1).
7. **Reserva**: `HOLD_TTL_MINUTES = 30` (mínimo de Stripe) y se ajustan los textos/contador visuales.
8. **Quién conecta la cuenta**: `events:manage` en la organización y super admin; sin permiso nuevo.
9. **Eventos ya publicados** sin cuenta `active`: no se tocan (siguen vendiendo; solo se bloquea publicar nuevos y se retiene la liquidación).
10. **Liquidar y reembolsar**: solo super admin (`organizations:manage`); un evento ya liquidado no admite reembolso automático (reversión manual).
11. **Solo tarjeta**: `payment_method_types: ["card"]`; se elimina el selector Yape/efectivo.
12. **F1 en una sola spec** de 8 tareas (sin partir; no se ve un riesgo que lo justifique).

## Preguntas abiertas

Ninguna bloqueante.
- Opcional (no bloqueante): la moneda/conversión real de las transferencias en producción depende de la decisión 1 (limitación de demo).
