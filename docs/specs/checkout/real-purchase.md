# Compra real de entradas con sesión de cliente (pago simulado)

**Estado**: approved
**Aprobado por**: usuario — 2026-10-03 (respondió las 6 preguntas abiertas; la 5 se cambió: admin también ve clientes)
**Fase**: 1 de 2 (la fase 2, aparte, sería el cobro real con Stripe)

## Contexto

Hoy el flujo de compra (`/events/[id]/tickets` → `checkout` → `confirmation`, y `/my-tickets`) es mock: el pedido se arma en el navegador (`createOrder`, `order.store`, `DEMO_ORDERS`, cuenta demo), no exige sesión de Clerk, no escribe nada en la base ni descuenta entradas. Se pide que **un cliente** (cualquier persona registrada sin membresía en una organización; no hay un rol "cliente" en `roles`, es el rol global derivado `customer`) **compre entradas de verdad**: con sesión, con la orden y las entradas guardadas a su nombre y el inventario descontado (lo que ya muestra el panel del organizador). Modelo: `docs/specs/database/data-model.md` (`orders`, `order_items`, `tickets`, `event_seats`, `ticket_types`). Decisión del usuario: **compra real con sesión; pago simulado** (sin Stripe todavía).

## Alcance

- **Incluye**:
  - Exigir sesión de Clerk para `/events/[id]/checkout`, `/events/[id]/confirmation` y `/my-tickets` (proxy), volviendo a la página tras iniciar sesión (`redirect_url`). Cualquier persona con sesión puede comprar, también admins y organizadores.
  - Server action `purchaseTicketsAction`: valida, calcula precios y total **en el servidor desde la base**, descuenta inventario y crea orden, ítems y entradas **de forma atómica** (un `db.batch`; el cliente es `neon-http`, sin `db.transaction`).
  - Zonas numeradas: los asientos pasan de `available` a `sold`; zonas generales: se incrementa `quantity_sold` respetando `quantity_total`. Nunca sobreventa, aun con compras simultáneas.
  - Cada entrada recibe un código QR único (token aleatorio); la orden queda `paid` (pago simulado: se valida el método elegido, no se guarda ningún dato de tarjeta).
  - Confirmación y "Mis entradas" leen las órdenes reales del usuario (solo las propias).
  - La selección de asientos (`/tickets`) refleja la disponibilidad real de la base (asientos vendidos y cupo restante de zonas generales).
  - Se eliminan el store y los datos mock del flujo de compra que queden sin uso.
  - **Registro de clientes**: toda persona que inicia sesión queda guardada en `users` (sincronización única por sesión del navegador tras iniciar sesión, que complementa el webhook de Clerk, que en desarrollo local no llega). "Cliente" no es una etiqueta guardada: es el estado derivado (sin membresías y sin ser super admin).
  - **Directorio de clientes para el super admin y los administradores** (`members:manage`): `/admin/customers` lista a los clientes (nombre, correo, verificado, método de acceso, último acceso) con búsqueda y paginación, con la etiqueta "Cliente", y permite **asociar** a un cliente a una organización con un rol (reusa `addMember`; un admin solo puede elegir organizaciones y roles que `assignableRoles` le permite); al asociarlo deja de ser cliente y aparece en `/admin/users`.
- **No incluye**: exponer los clientes a los organizadores (solo `members:manage`: super admin y admin; decisión del usuario, implica que un admin ve nombre y correo de cualquier cliente registrado), una etiqueta "cliente" persistida en la base, cobro con Stripe, cupones, comisiones, reembolsos/cancelaciones, correo de confirmación, canje de entradas en puerta (`tickets:redeem`), `ticket_holds`/reserva temporal (la cuenta regresiva del checkout sigue siendo solo visual; la integridad la garantiza la atomicidad), idempotencia ante doble envío (el botón se deshabilita mientras procesa), y eventos que no existan en el catálogo mock (el detalle y el mapa de asientos siguen dependiendo de él; ver preguntas).

## Criterios de aceptación

- **AC-1** (tests): `purchaseRequestSchema` valida el payload serializable `{ eventSlug, selection: { quantities: Record<zoneKey, int>, seats: Record<zoneKey, seatRef[]> }, buyer: { fullName, email, documentNumber?, phone? }, paymentMethod }` (límite `MAX_TICKETS_PER_ZONE` por zona, al menos 1 entrada, sin duplicados de asiento, cantidades enteras ≥ 0, textos recortados y acotados). Helpers puros (resolución selección → ítems, total en centavos, generación de token QR, formato de número de pedido) con tests.
- **AC-2 (seguridad)**: la acción exige sesión (`getCurrentUser`, 401 → "Inicia sesión"); el comprador es SIEMPRE el usuario de la sesión (`orders.user_id`), nunca un id enviado por el cliente. Precios, totales, estado de la orden, zonas y asientos se resuelven en servidor; del cliente solo se acepta lo que el schema permite (selección y datos de contacto). Un usuario nunca puede leer, ni por id, órdenes o entradas de otro (404 uniforme).
- **AC-3 (integridad)**: la compra es una sola unidad atómica (`db.batch`): si algo falla (asiento ya vendido, cupo agotado, evento no publicado o pasado) no queda ninguna fila a medias ni inventario descontado. Dos compradores simultáneos del mismo asiento: exactamente uno lo obtiene y el otro recibe "Ese asiento ya no está disponible". Zonas generales: nunca `quantity_sold > quantity_total`. Se verifica con una consulta guardia como primera sentencia (patrón de división por cero basada en datos reales, **no** constante: ver `draftGuardSql`) y/o los `CHECK` existentes, traduciendo 22012/23514/23505 a errores legibles.
- **AC-4**: solo se compra sobre eventos `published` con fecha futura; zonas y asientos pertenecen al recinto del evento; precios = `ticket_types.price` de la base; la orden guarda `order_items.unit_price` como snapshot y `total_amount` = Σ cantidad × precio. Orden `paid`, `stripe_*` nulos, `currency` PEN.
- **AC-5**: tras comprar, `ticket_types.quantity_sold` sube por zona (también en numeradas) y el panel `/organizer` refleja ventas e ingresos reales; las `event_seats` compradas quedan `sold` y no vuelven a ofrecerse.
- **AC-6**: `/events/[id]/tickets` muestra los asientos vendidos de la base como no disponibles y el cupo restante de las zonas generales; si la selección guardada incluye un asiento que ya no está libre, se avisa y se quita.
- **AC-7**: `/events/[id]/confirmation?order=<uuid>` y `/my-tickets` muestran la orden y sus entradas reales (zona, fila/asiento, QR del token) solo si pertenecen a la sesión; sin sesión redirigen a iniciar sesión; orden ajena o inexistente → `notFound()`. "Mis entradas" lista las órdenes del usuario, más recientes primero, con estado vacío ("Aún no tienes entradas") y enlace a explorar eventos.
- **AC-8**: el checkout usa el nombre y correo de la sesión como valores por defecto (editables), muestra errores del servidor en el formulario (`role="alert"`) sin perder lo escrito, deshabilita el botón mientras procesa y redirige a la confirmación; el método de pago se valida pero no se almacenan datos de tarjeta (ni siquiera se envían al servidor).
- **AC-9a (registro)**: tras iniciar sesión, una sola llamada por sesión del navegador (`POST /api/auth/sync`, requiere sesión, idempotente) hace que exista la fila en `users`; la respuesta no devuelve datos del usuario ni errores internos; sin sesión → 401. No se llama en cada página.
- **AC-9b (directorio)**: `listCustomers(actor, query)` exige `members:manage` en alguna organización o ser super admin (otros → 403) y devuelve solo usuarios sin membresías y no super admin, con búsqueda por nombre/correo (`escapeLike`) y paginación, ordenados por último acceso; `/admin/customers` redirige a `/` a quien no tenga el permiso. "Asociar a organización" reutiliza `addMember` (rol asignable según `assignableRoles`, guardas de `member-guard`) sin crear cuenta ni contraseña temporal (el usuario ya existe), actualiza la lista y el menú muestra "Clientes" a quien tenga `members:manage`; el diálogo de asociación ofrece solo las organizaciones y roles que el actor puede asignar (`listManageableOrganizations`).
- **AC-9**: sin código muerto: se eliminan `order.store`, el `createOrder` mock y `DEMO_ORDERS`/cuenta demo si ya nadie los usa (grep); `lint`, `test` y `build` pasan.

## Contratos

```ts
// src/modules/checkout/schemas/purchase.schema.ts (puro)
export const purchaseRequestSchema: ZodType<PurchaseRequest>;
export interface PurchaseRequest { eventSlug: string; selection: { quantities: Record<string, number>; seats: Record<string, string[]> /* ids de asiento del layout */ }; buyer: { fullName: string; email: string; documentNumber?: string; phone?: string }; paymentMethod: PaymentMethod }

// src/modules/checkout/services/purchase.service.ts (solo servidor)
export function purchaseTickets(actor: CurrentUser | null, request: PurchaseRequest): Promise<{ orderId: string; orderNumber: string }>;

// src/modules/checkout/services/order-read.service.ts (solo servidor)
export interface OrderView { id: string; number: string; eventSlug: string; eventTitle: string; createdAt: string; total: number /*soles*/; status: "paid"|"pending"|"cancelled"|"refunded"; buyerName: string; buyerEmail: string; tickets: { id: string; zoneName: string; seatLabel: string | null; qrCode: string; status: "valid"|"redeemed"|"cancelled" }[] }
export function getOrderForUser(actor: CurrentUser, orderId: string): Promise<OrderView | null>;
export function listOrdersForUser(actor: CurrentUser): Promise<OrderView[]>;

// src/modules/checkout/services/availability.service.ts (solo servidor, lectura pública)
export function getEventAvailability(slug: string): Promise<{ soldSeatIds: string[]; remainingByZone: Record<string, number | null> } | null>;

// src/app/api/auth/sync/route.ts  POST → 204 (ya sincronizado/creado) | 401
// src/modules/admin/services/customer-list.service.ts (solo servidor)
export interface CustomerRow { id: string; fullName: string | null; email: string; emailVerified: boolean; authProviders: string[]; lastSignInAt: string | null; createdAt: string }
export function listCustomers(actor: CurrentUser, query: { page: number; q?: string }): Promise<{ rows: CustomerRow[]; total: number; page: number; pageCount: number }>;

// src/modules/checkout/actions/purchase.actions.ts ("use server")
export function purchaseTicketsAction(raw: unknown): Promise<{ ok: true; orderId: string } | { ok: false; error: string }>;
```

La **correspondencia con la base** reutiliza que el seed creó las zonas y asientos desde el layout mock: zona del layout (`getVenueLayout(...).zones[].name`) = `venue_zones.name` del recinto del evento; asiento = (`row.label`, `seat.number`) = `venue_seats.row_label`/`seat_number`. Se documenta como límite conocido (válido para eventos sembrados).

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Formulario, resumen, vistas de checkout/confirmación | `src/modules/checkout/components/*`, `checkout.schema.ts` | adaptar (de mock-cliente a acción de servidor) |
| Selección y layouts | `purchase.store.ts`, `venues.service.ts` (`getVenueLayout`, `MAX_TICKETS_PER_ZONE`) | reusar; la disponibilidad real se superpone al layout |
| Usuario de la sesión | `getCurrentUser` (sincroniza la fila en `users`), `CurrentUser` | reusar |
| Escritura atómica | patrón de `event-write.service.ts` (`db.batch`, UUID previos, guard con división por cero basada en datos) y `pg-errors.ts` | reusar el patrón; extraer el guard genérico si se repite (`src/lib/sql-guard.ts`) |
| Protección de rutas | `src/proxy.ts` (`createRouteMatcher`) | ampliar el matcher privado |
| Vistas de entradas/pedidos | `my-tickets-view.tsx`, `order-list.tsx`, `ticket-viewer.tsx`, `order-ticket-card.tsx`, `decorative-qr.tsx` | adaptar a `OrderView` |
| Pedido mock/estado en navegador | `orders.service.ts`, `order.store.ts`, `DEMO_ORDERS`, `session.store.ts` (cuenta demo) | eliminar lo que quede sin uso |

## Plan de tareas

| Tarea | Archivos | Grupo |
|---|---|---|
| **T-1** Schema, tipos y helpers puros + tests (AC-1) | `src/modules/checkout/schemas/purchase.schema.ts` (+test), `src/modules/checkout/services/purchase.mapping.ts` (+test) | 1 |
| **T-2** Servicio de compra atómica (AC-2..5) | `src/modules/checkout/services/purchase.service.ts` | 1 |
| **T-3** Servicios de lectura: órdenes y disponibilidad (AC-2, AC-6, AC-7) | `src/modules/checkout/services/order-read.service.ts`, `availability.service.ts` | 1 |
| **T-4** Acción, protección de rutas y checkout (AC-2, AC-8) | `src/modules/checkout/actions/purchase.actions.ts`, `src/proxy.ts`, `src/app/events/[id]/checkout/page.tsx`, `checkout-view.tsx`, `checkout-form.tsx` | 2 |
| **T-5** Confirmación y Mis entradas reales (AC-7) | `src/app/events/[id]/confirmation/page.tsx`, `src/app/my-tickets/page.tsx`, `confirmation-view.tsx`, `my-tickets-view.tsx`, `order-list.tsx`, `ticket-viewer.tsx`, `order-ticket-card.tsx` | 2 |
| **T-6** Disponibilidad real en la selección (AC-6) | `src/app/events/[id]/tickets/page.tsx`, `src/modules/tickets/components/ticket-selection.tsx` (y lo mínimo del layout/overlay) | 2 |
| **T-8** Registro de clientes al iniciar sesión (AC-9a) | `src/app/api/auth/sync/route.ts`, `src/modules/account/components/header-account.tsx` (llamada única por sesión) | 1 |
| **T-9** Directorio de clientes y asociación (AC-9b) | `src/modules/admin/services/customer-list.service.ts`, `src/modules/admin/components/{customers-table,assign-customer-dialog}.tsx`, `src/app/admin/customers/page.tsx`, `src/modules/auth/services/dashboard-nav.ts` (+test; "Clientes" bajo `members:manage`) y `src/components/dashboard/dashboard-shell.tsx` (ícono) | 2 |
| **T-7** Limpieza de mocks y docs (AC-9) | `order.store`, `orders.service` mock, `DEMO_ORDERS`/cuenta demo y sus tests; `docs/specs/database/data-model.md` (§ compras) | 3 |

El cálculo de precios, totales y unicidad vive en servidor; los tests unitarios cubren lo puro y el `reviewer` valida el SQL contra la base real en **solo lectura** (como en la gestión de eventos).

## Decisiones del usuario (antes preguntas abiertas)

1. Pago simulado: la orden queda `paid`. 2. Solo se compran los 10 eventos sembrados. 3. Se mantiene el límite por zona. 4. Se elimina el login mock (`/login`, cuenta demo, `session.store`) en la limpieza (T-7). 5. **Super admin y admin ven los clientes** y pueden asociarlos. 6. "Cliente" es una etiqueta derivada, no guardada.
