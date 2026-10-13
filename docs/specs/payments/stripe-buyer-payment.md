# Pago del comprador con Stripe Checkout (Fase 1: cobro, reserva y emisión de entradas)

**Estado**: approved
**Aprobado por**: usuario (confirmado en chat, 2026-10-09)
**Fase**: 1 de 3 (siguientes: `stripe-organizer-onboarding.md`, `stripe-settlement-refunds.md`)

> **Nota de estado**: decisiones del usuario incorporadas (ver § Decisiones). La spec permanece en `draft` porque solo el orquestador registra la aprobación humana; sin preguntas bloqueantes.

## Contexto

Hoy `purchaseTickets` (`src/modules/checkout/services/purchase.service.ts`) simula el pago: crea la orden directamente en `paid`, vende los asientos y emite las entradas en un solo `db.batch`. Se pide cobrar de verdad con **Stripe Checkout (página alojada)** en PEN, con el modelo **cargos separados y transferencias** (Ticketera cobra y retiene; el pago al organizador es la Fase 3). Decisiones ya tomadas: SDK oficial `stripe` solo en servidor, webhook `/api/webhooks/stripe` con verificación de firma e idempotencia, la plataforma paga las comisiones de Stripe y asume contracargos. Como no existe reserva temporal real (la cuenta regresiva es solo visual), esta fase mantiene los asientos/cupos reservados mientras se paga y los libera al expirar la sesión. Diseño del sistema: `docs/specs/database/data-model.md` § Decisiones de arquitectura (Pagos, Reserva temporal), `orders`, `ticket_holds`, `tickets`; base previa: `docs/specs/checkout/real-purchase.md` (done).

## Alcance

- **Incluye**:
  - Dependencia `stripe` y cliente servidor único (`src/lib/stripe.ts`); variable nueva `APP_URL` (las claves `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ya figuran en `.env.example`; **no se leen ni copian valores de `.env`**).
  - Cambios de base de datos con migración: `orders.expires_at`, `ticket_holds.order_id`, tabla `stripe_events` (registro de eventos procesados).
  - Compra en dos pasos: (1) la server action reserva (orden `pending` + `order_items` + `ticket_holds`, asientos `held`, cupo general sumado) y crea la Checkout Session; (2) el webhook confirma el pago y emite las entradas.
  - Webhook `POST /api/webhooks/stripe`: `checkout.session.completed` (pagada) y `checkout.session.expired`; firma sobre el cuerpo crudo; idempotencia atómica con los efectos.
  - Liberación de reservas: por `checkout.session.expired`, al reemplazar un intento propio y por barrido perezoso de órdenes vencidas (con periodo de gracia).
  - Pago tardío o con monto inconsistente: no se emiten entradas y se reembolsa automáticamente.
  - Checkout sin campos de tarjeta ni selector de método (los resuelve la página de Stripe); confirmación con estados `pending`/`paid`/`cancelled`; "Mis entradas" solo con órdenes `paid`/`refunded`.
- **No incluye**: onboarding de organizadores y bloqueo de publicación (Fase 2); transferencias al organizador, cálculo de comisión (`applicationFeeAmount` queda `null` en esta fase) y reembolsos manuales (Fase 3); Yape/PagoEfectivo y cualquier método asíncrono (solo `card`, coherente con `data-model.md` § Fuera de alcance); cupones; correo de confirmación; Stripe Elements/Payment Element incrustado; compra de eventos con total 0 (no existen: publicar exige precio > 0, `assertPublishable`); reembolsos parciales; guardar tarjetas.

## Criterios de aceptación

- **AC-1 (inicio de pago, seguridad)**: `purchaseTicketsAction` exige sesión (401 → "Inicia sesión para comprar"); el comprador es siempre el usuario de la sesión; precios, totales, zonas y asientos se resuelven en servidor desde la base (como hoy); `PurchaseRequest` ya no incluye `paymentMethod` ni datos de tarjeta. Si el total calculado es 0 o negativo se rechaza con error legible. Devuelve `{ ok: true, orderId, checkoutUrl }`.
- **AC-2 (reserva atómica)**: crear la orden `pending`, sus `order_items`, los `ticket_holds`, pasar asientos `available → held` y sumar `quantity_sold` ocurre en **un solo `db.batch`** con guardas (patrón de división por cero basada en datos de `purchase.query.ts`). Con dos compradores simultáneos del mismo asiento exactamente uno lo reserva y el otro recibe "Ese asiento ya no está disponible…"; nunca `quantity_sold > quantity_total`. `orders.expires_at` y `ticket_holds.expires_at` = ahora + `HOLD_TTL_MINUTES`.
- **AC-3 (Checkout Session)**: la sesión se crea con `mode: "payment"`, `currency: "pen"`, `payment_method_types: ["card"]`, un `line_item` por zona con `unit_amount` = precio de la base en centavos, `client_reference_id` y `metadata.orderId` = id de la orden, `customer_email` = el del comprador, `expires_at` = `orders.expires_at`, `payment_intent_data.transfer_group = "event_<eventId>"` y `payment_intent_data.metadata.orderId`, `success_url` = `${APP_URL}/events/<slug>/confirmation?order=<id>`, `cancel_url` = `${APP_URL}/events/<slug>/checkout`. Se crea con clave de idempotencia `checkout-<orderId>`; el id de sesión se guarda en `orders.stripe_checkout_session_id`. Si Stripe falla, la reserva se libera y el usuario ve un error genérico (sin detalles internos).
- **AC-4 (reintentos)**: al iniciar un pago, las órdenes `pending` propias del mismo evento se liberan (`superseded`) y su sesión de Stripe se expira (`checkout.sessions.expire`, mejor esfuerzo) antes de reservar de nuevo; así un usuario nunca se bloquea con sus propios asientos.
- **AC-5 (webhook, firma e idempotencia)**: `POST /api/webhooks/stripe` lee el cuerpo **crudo** (`req.text()`), verifica `stripe-signature` con `STRIPE_WEBHOOK_SECRET`; firma inválida o ausente → 400 sin efectos. Cada evento se registra en `stripe_events(id)` **en el mismo `db.batch`** que sus efectos: reenviar el mismo `event.id` no vuelve a emitir entradas ni a liberar inventario (23505 en `stripe_events` = ya procesado → 200). Errores inesperados → 500 (Stripe reintenta). Eventos de otro tipo → se registran y se responde 200.
- **AC-6 (pago confirmado)**: ante `checkout.session.completed` con `payment_status = "paid"`, si la sesión coincide con `orders.stripe_checkout_session_id`, `amount_total` = `orders.total_amount` y `currency = "pen"`, en un `db.batch`: orden `pending → paid`, `stripe_payment_intent_id` guardado, asientos `held → sold`, un `tickets` por unidad con token QR único (`generateQrToken`), `ticket_holds` de la orden eliminados. `application_fee_amount` queda `null`. Duplicado o reentrega no genera entradas dobles (AC-5).
- **AC-7 (pago tardío o inconsistente)**: si la sesión llega pagada pero la orden ya no está `pending` (cancelada/expirada) o el monto/moneda no coincide, **no se emiten entradas**, la orden queda `cancelled` (con su reserva liberada si aplica), se crea un reembolso total (`refunds.create` sobre el `payment_intent`, clave de idempotencia `late-<sessionId>`) y se deja un `console.error` estructurado con ids (sin datos personales ni claves).
- **AC-8 (expiración y liberación)**: `checkout.session.expired` libera la orden `pending` (`cancelled`), asientos `held → available`, descuenta `quantity_sold` y borra los holds, de forma idempotente (liberar dos veces no resta dos veces). Un barrido perezoso (al reservar y al leer disponibilidad del evento) libera órdenes `pending` con `expires_at` < ahora − `HOLD_GRACE_MINUTES`, nunca antes (evita cancelar un pago en curso).
- **AC-9 (confirmación)**: `/events/[id]/confirmation?order=<uuid>` muestra según `OrderView.status`: `pending` → "Confirmando tu pago…" con refresco automático acotado (máx. `PENDING_POLL_MAX` intentos cada `PENDING_POLL_MS`) y, agotado, un mensaje con enlace a "Mis entradas"; `paid` → vista actual con entradas y QR; `cancelled` → "El pago no se completó o la reserva expiró" con enlace para reintentar; solo órdenes propias (404 uniforme).
- **AC-10 (Mis entradas)**: `listOrdersForUser` devuelve solo órdenes `paid` y `refunded`; las `pending`/`cancelled` no aparecen.
- **AC-11 (checkout UI)**: el formulario de checkout ya no muestra campos de tarjeta, selector de método ni QR/instrucciones de Yape/efectivo; muestra un aviso de que el pago se completa en Stripe; el botón se deshabilita mientras procesa, errores del servidor en `role="alert"` sin perder lo escrito, y al recibir `checkoutUrl` navega a Stripe (`window.location.assign`). Ningún dato de tarjeta pasa por la app.
- **AC-12 (secretos y alcance servidor)**: `stripe` y `STRIPE_SECRET_KEY` solo se importan desde archivos de servidor (services, route handlers, actions); `src/lib/stripe.ts` falla con error claro si falta la clave; ninguna respuesta de acción ni log incluye claves, payloads completos de Stripe ni datos de tarjeta.
- **AC-13 (consistencia de paneles)**: los ingresos/órdenes del panel `/organizer` cuentan solo órdenes `paid` (verificar `src/modules/events/services/event-list.service.ts` y lecturas de ventas; `quantity_sold` pasa a significar vendido + reservado). Si hace falta cambiarlo, es un `SPEC_ISSUE` para ampliar el plan, no se hace fuera de tarea.
- **AC-14 (calidad)**: sin código muerto (`PAYMENT_METHODS`, `PaymentMethodField` y la validación de tarjeta del checkout se eliminan si nadie los usa); `lint`, `test` y `build` pasan; las pruebas cubren lo descrito en cada tarea.

## Contratos

### Base de datos (migración `drizzle/0004_*.sql`, generada con `npm run db:generate`; aplicarla es manual: `npm run db:migrate`)

```ts
// src/db/schema/orders.ts — columna nueva
expiresAt: tstz(),                       // vencimiento de la reserva de una orden pending (null en órdenes antiguas)

// src/db/schema/ticketing.ts — ticket_holds, columna nueva
orderId: uuid().references(() => orders.id, { onDelete: "cascade" }),  // + index("ticket_holds_order_idx")
// (nullable: holds sin orden no existen hoy; ciclo ticketing <-> orders: usar la forma lazy de Drizzle o mover el FK
//  al índice/relations si hay import circular; decide el developer sin cambiar el contrato)

// src/db/schema/payments.ts — tabla nueva (exportada desde src/db/schema/index.ts)
export const stripeEvents = pgTable("stripe_events", {
  id: text().primaryKey(),               // event.id de Stripe
  type: text().notNull(),
  createdAt: createdAt(),
});
```

Estados: ninguna enum nueva. `orders.status`: `pending → paid` (webhook) o `pending → cancelled` (expiración/reemplazo/pago tardío). `order_items` y `ticket_holds` se crean al reservar; `tickets` solo al pagar.

### Constantes y tipos

```ts
// src/modules/payments/services/checkout-session.mapping.ts (puro)
export const HOLD_TTL_MINUTES = 30;       // Stripe exige expires_at >= 30 min (ver pregunta abierta 7)
export const HOLD_GRACE_MINUTES = 5;      // gracia del barrido perezoso
export interface CheckoutSessionInput {
  orderId: string; eventId: string; eventSlug: string; eventTitle: string;
  buyerEmail: string; appUrl: string; expiresAt: Date;
  items: { zoneName: string; unitPriceCents: number; quantity: number }[];
}
export function buildCheckoutSessionParams(input: CheckoutSessionInput): Stripe.Checkout.SessionCreateParams;
export function isSessionPayable(
  session: { payment_status: string; amount_total: number | null; currency: string | null; id: string },
  order: { stripeCheckoutSessionId: string | null; totalAmount: number; status: string },
): "ok" | "late" | "mismatch";

// src/modules/payments/schemas/checkout-metadata.schema.ts
export const checkoutMetadataSchema = z.object({ orderId: z.string().uuid() });

// src/modules/checkout/schemas/purchase.schema.ts — PurchaseRequest pierde paymentMethod
// src/modules/checkout/actions/purchase.actions.ts
export type PurchaseActionResult =
  | { ok: true; orderId: string; checkoutUrl: string }
  | { ok: false; error: string };

// src/modules/checkout/services/reservation.service.ts (solo servidor)
export function reserveOrder(args: { actor: CurrentUser; eventId: string; resolved: ResolvedZone[]; items: PricedItem[]; now?: Date }): Promise<{ orderId: string; expiresAt: Date }>;
export function attachCheckoutSession(orderId: string, sessionId: string): Promise<void>;
export function releaseOrder(orderId: string, reason: "expired" | "superseded" | "payment_failed" | "late_payment", opts?: { stripeEventId?: string }): Promise<"released" | "noop">;
export function finalizePaidOrder(args: { orderId: string; paymentIntentId: string; stripeEventId: string }): Promise<"paid" | "duplicate" | "not_pending">;
export function listPendingOrderIds(userId: string, eventId: string): Promise<string[]>;
export function releaseStaleOrders(opts: { eventId?: string; now?: Date }): Promise<number>;

// src/modules/payments/services/stripe-event.handler.ts (solo servidor)
export function handleStripeEvent(event: Stripe.Event, deps?: StripeEventDeps): Promise<void>;
```

`buildCheckoutSessionParams` valida que Σ `unitPriceCents × quantity` > 0 y que el `expiresAt` sea ≥ 30 min y ≤ 24 h desde ahora (límites de Stripe) o lanza error.

### Forma de llamadas a Stripe

Consultar la documentación vigente de Stripe (`checkout.sessions.create`, `webhooks.constructEvent`, `refunds.create`, `checkout.sessions.expire`) y la versión de API que fije el SDK instalado antes de implementar; **no fijar a mano una `apiVersion` distinta de la del SDK**. Consultar también `node_modules/next/dist/docs/` para route handlers (`AGENTS.md`: esta versión de Next difiere de lo conocido).

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Reserva atómica con guardas | `claimSeatsSql`, `reserveGeneralSql`, `addSoldSql`, `buildPurchaseRows` en `src/modules/checkout/services/purchase.query.ts` (+test) | **extender/generalizar**: `claimSeatsSql` parametrizado por estado destino (`held`/`sold`) y origen (`available`/`held`), nuevos `releaseSeatsSql` (held → available) y `releaseSoldSql` (sold → available + descuento de `quantity_sold`; lo reutiliza la Fase 3 sin cambios), `buildPurchaseRows` con estado `pending` y filas de holds, nuevo `buildTicketRows` (solo tickets al pagar) |
| Selección, precios, QR, número de pedido | `purchase.mapping.ts` (`resolveSelection`, `computeTotalCents`, `generateQrToken`, `orderNumberFromId`) | reusar sin cambios |
| Orquestación de compra | `purchase.service.ts` (`loadEvent`, `resolve`, `priceItems`) | **extender**: se conserva la resolución; cambia el final (reservar + crear sesión en vez de pagar) |
| Errores de Postgres | `src/lib/pg-errors.ts` (`isUniqueViolation`, `isDivisionByZero`, …) | reusar |
| Usuario de sesión | `getCurrentUser` | reusar |
| Lectura de órdenes y vistas | `order-read.service.ts`, `OrderView` (ya admite `pending`/`cancelled`), `confirmation-view.tsx` | **extender** (filtro de estados y estados de confirmación) |
| Disponibilidad pública | `availability.service.ts` ya oculta asientos `status <> 'available'` (cubre `held`) | reusar; solo se agrega el barrido perezoso desde el service de reserva |
| Webhook firmado | `src/app/api/webhooks/clerk/route.ts` (patrón: verificar firma, 400 si falla, 200) | reusar el patrón; **crear** `src/app/api/webhooks/stripe/route.ts` (no hay nada de Stripe en `src/`; solo columnas y estado en el admin) |
| Rutas públicas/privadas | `src/proxy.ts`: `/api/webhooks/*` no está en el matcher privado | sin cambios (el webhook debe ser público) |
| Cliente Stripe | nada en `src/` | **crear** `src/lib/stripe.ts` (único punto de construcción del cliente; lo reusan F2 y F3) |
| Aviso / alerta / indicador de carga | `@shadcn/alert` disponible (`npx shadcn@latest search @shadcn -q "alert"`); `badge`, `button`, `card` ya instalados | reusar lo instalado; `alert` solo si el aviso de Stripe lo necesita (se agrega en la tarea de UI con `npx shadcn@latest add alert`; si se prefiere no instalar nada, usar `card`/texto) |
| Estado de sesión Stripe en cliente | no aplica | no se instala `@stripe/stripe-js` (redirección completa a la página alojada) |

## Plan de tareas

> Esta fase tiene 8 tareas (supera el ~6 sugerido) por ser transversal: base de datos, contrato, dominio de reserva, webhook y UI. Se mantiene como una sola spec (decisión 12): partirla dejaría el checkout sin compra funcional entre medias y no hay un riesgo que lo justifique.

### Grupo 0 (serial)

- **T-1**: Instalar `stripe`, cliente servidor y variable `APP_URL`. — archivos: `package.json`, `package-lock.json` (vía `npm install stripe`), `.env.example` (agregar `APP_URL=http://localhost:3000`, sin valores secretos), `src/lib/stripe.ts` (exporta `getStripe()` singleton; error claro si falta `STRIPE_SECRET_KEY`; solo servidor), `src/lib/stripe.test.ts` — tests: sí (lanza sin clave, reutiliza instancia) — cubre: AC-12
- **T-2**: Esquema de base de datos y migración. — archivos: `src/db/schema/orders.ts` (`expiresAt`), `src/db/schema/ticketing.ts` (`ticketHolds.orderId` + índice), `src/db/schema/payments.ts` (`stripeEvents`), `src/db/schema/index.ts` (export), `drizzle/0004_*.sql` y `drizzle/meta/*` (generados por `npm run db:generate`; ajustar si la salida requiere revisión manual) — tests: no (esquema; el reviewer valida la migración contra la base) — cubre: AC-2, AC-5, AC-8
- **T-3**: Contrato de compra sin método de pago. — archivos: `src/modules/checkout/schemas/purchase.schema.ts`, `src/modules/checkout/schemas/purchase.schema.test.ts`, `src/modules/checkout/schemas/checkout.schema.ts` (quita `PAYMENT_METHODS`, `PaymentMethod`, tarjeta y validación cruzada de tarjeta; deja datos de comprador/documento), `src/modules/checkout/schemas/checkout.schema.test.ts` — tests: sí (actualizados) — cubre: AC-1, AC-11, AC-14

### Grupo 1 (paralelo)

- **T-4**: Mapeo puro de la sesión de Stripe y metadata. — archivos: `src/modules/payments/services/checkout-session.mapping.ts`, `src/modules/payments/services/checkout-session.mapping.test.ts`, `src/modules/payments/schemas/checkout-metadata.schema.ts`, `src/modules/payments/schemas/checkout-metadata.schema.test.ts` — tests: sí (parámetros de sesión, límites de `expires_at`, total > 0, `isSessionPayable` ok/late/mismatch, metadata inválida) — cubre: AC-3, AC-6, AC-7
- **T-5**: Consultas SQL y servicio de reserva. — archivos: `src/modules/checkout/services/purchase.query.ts`, `src/modules/checkout/services/purchase.query.test.ts`, `src/modules/checkout/services/reservation.service.ts` — tests: sí para el SQL/filas puras (`purchase.query.test.ts`: guardas, liberación idempotente, `buildTicketRows`); el servicio es orquestación delgada y el reviewer valida el SQL contra la base en solo lectura, como en `real-purchase.md` — cubre: AC-2, AC-6, AC-8
- **T-6**: UI del checkout y de la confirmación. — archivos: `src/modules/checkout/components/checkout-form.tsx`, `src/modules/checkout/components/checkout-view.tsx`, `src/modules/checkout/components/payment-method-field.tsx` (eliminar), `src/modules/checkout/components/confirmation-view.tsx`, `src/modules/checkout/components/reservation-notice.tsx` (texto/contador según `HOLD_TTL_MINUTES`, decisión 7), `src/app/events/[id]/confirmation/page.tsx` — tests: no por defecto (presentacional); si el refresco acotado de `pending` se extrae a un hook con lógica, agregar `use-*.test.ts` junto al hook (archivo extra permitido solo para eso) — cubre: AC-9, AC-11, AC-14

### Grupo 2 (paralelo)

- **T-7**: Flujo de compra en servidor (inicio de pago) y lectura de órdenes. — archivos: `src/modules/checkout/services/purchase.service.ts`, `src/modules/checkout/actions/purchase.actions.ts`, `src/modules/checkout/services/order-read.service.ts`, `src/modules/checkout/services/order-read.mapping.ts` (solo si el filtro de estados vive allí), `src/modules/checkout/services/order-read.mapping.test.ts` — tests: sí (lo puro modificado) — cubre: AC-1, AC-2, AC-3, AC-4, AC-10, AC-12
- **T-8**: Webhook de Stripe. — archivos: `src/app/api/webhooks/stripe/route.ts` (`runtime = "nodejs"`, cuerpo crudo, firma), `src/modules/payments/services/stripe-event.handler.ts`, `src/modules/payments/services/stripe-event.handler.test.ts` — tests: sí (con dependencias inyectadas: completed ok, duplicado, tardío, monto distinto, expired, tipo desconocido, firma inválida en la ruta si es testeable) — cubre: AC-5, AC-6, AC-7, AC-8, AC-12

> T-7 y T-8 no comparten archivos. AC-13 es una verificación del reviewer sobre lecturas existentes (sin tarea propia); si requiere cambios, vuelve como `SPEC_ISSUE`.

## Riesgos

- **Pagos tardíos / carreras**: el pago puede completarse justo al vencer la reserva; mitigado con gracia en el barrido, reembolso automático (AC-7) y registro de eventos. Un fallo del reembolso queda solo en log: requiere revisión manual (se atiende con las acciones de Fase 3).
- **Entrega del webhook en local**: el webhook no llega sin Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`); sin él las órdenes quedan `pending` hasta expirar. Documentar en la tarea T-8.
- **`quantity_sold` ahora incluye reservas**: cualquier lectura que lo muestre como "vendido" debe aceptarlo o consultar `orders` (AC-13).
- **Estado de la migración**: `drizzle/0004` debe aplicarse (`npm run db:migrate`) antes de probar; no se aplica automáticamente.
- **Comisiones de Stripe y contracargos** los asume la plataforma (decisión ya tomada); con la comisión de demo (10%, decisión 2) el margen podría ser negativo en producción. Reembolsos no devuelven las tarifas de Stripe.
- **Eventos sembrados**: el catálogo mock y el layout siguen acoplando la compra a eventos existentes (límite heredado de `real-purchase.md`).
- **Cuenta de plataforma**: si en producción Stripe no admite Perú como país de plataforma Connect (limitación de demo, decisión 1), cambia moneda de liquidación, tarifas y posiblemente PEN como moneda de cobro; los ACs de moneda (`pen`) podrían cambiar.

## Fases siguientes

- Fase 2 — `docs/specs/payments/stripe-organizer-onboarding.md`: cuentas conectadas y bloqueo de publicación.
- Fase 3 — `docs/specs/payments/stripe-settlement-refunds.md`: transferencias a organizadores, comisión y reembolsos.

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
- Opcional (no bloqueante): confirmar el país por defecto concreto de `CONNECTED_ACCOUNT_COUNTRY` cuando se implemente F2.
