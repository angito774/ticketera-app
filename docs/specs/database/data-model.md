# Modelo de datos (MER) — Ticketera

**Estado**: draft
**Aprobado por**: (pendiente)

## Contexto

Este documento define el **modelo entidad-relación** de la base de datos real (Postgres — Neon en local, Cloud SQL en producción) para Ticketera: eventos, organizaciones, roles, entradas por zona/asiento, órdenes y pagos.

Hasta ahora el proyecto solo tiene UI con **datos mock** (`docs/specs/events/`, `docs/specs/tickets/purchase-flow.md`, `docs/specs/checkout/checkout-and-confirmation.md`, todos `done`), sin backend ni base de datos real. Este MER es la base para una futura spec de implementación (instalar Drizzle ORM, escribir el schema TypeScript real y migrar contra Neon) — **no se instala nada ni se escribe schema en esta tarea**, solo se documenta el diseño.

El modelo se diseñó reconciliando dos fuentes que en algunos puntos no coincidían:

1. El pedido original: roles (Super admin, Administrador, Organizador, Cliente), autenticación con Clerk (email/password + Google), pagos con Stripe, Google Maps en producción.
2. Lo que ya está **implementado y aprobado** en la UI mock: selección de entradas por **zona y asiento numerado** (`docs/specs/tickets/purchase-flow.md` — `VenueLayout`, `VenueZone`, `Seat`) y un checkout con métodos de pago peruanos (Tarjeta / Yape / PagoEfectivo, `docs/specs/checkout/checkout-and-confirmation.md`).

Decisión tomada con el usuario: el MER real **sí modela zonas y asientos** (no un modelo plano de "un precio por evento"), pero los pagos **solo cubren Stripe** en esta primera versión — Yape/PagoEfectivo siguen siendo opciones visuales del mock sin respaldo de pago real hasta que se decida un proveedor local (ver "Fuera de alcance").

## Decisiones de arquitectura

- **Autenticación**: **Clerk** con dos métodos: correo + contraseña y **Google (OAuth, social connection de Clerk)**. Clerk gestiona todo el flujo OAuth (redirección, consentimiento, tokens, sesión); la app **no** guarda contraseñas ni tokens de Google, ni implementa OAuth propio. Los scopes de Google se limitan a `openid email profile`. Si un correo ya existe con contraseña y entra con Google (o al revés), Clerk los enlaza en **una sola cuenta** siempre que el correo esté verificado — por eso `users.email` sigue siendo único. Reemplaza la sesión simulada de `useSessionStore` y el selector mock de `docs/specs/account/google-sign-in.md`.
- **Roles**: `users.is_super_admin` es un flag global, fuera de cualquier organización. `admin`/`organizer` son valores de `organization_members.role`, un rol *dentro* de una organización. `Cliente` es cualquier usuario sin membresías que compra entradas.
- **Organizaciones**: se usa el feature nativo **Clerk Organizations** (crear org, invitar miembros, asignar rol se maneja en Clerk). Postgres guarda una copia sincronizada vía webhook (`users`, `organizations`, `organization_members`) para poder hacer JOINs con eventos/órdenes — Clerk sigue siendo la fuente de verdad.
- **Pagos**: **Stripe Connect** (marketplace) — cada organización tiene su cuenta conectada (`organizations.stripe_account_id`) y recibe el pago menos `orders.application_fee_amount`.
- **Entradas**: modelo de **zonas + asientos**, no un precio único por evento. Un `venue` tiene `venue_zones` (generales o numeradas); las zonas numeradas tienen `venue_seats` físicos reutilizables entre eventos del mismo recinto. El precio y disponibilidad se fijan **por evento** en `ticket_types` (un venue se reusa, pero el precio de un concierto no tiene por qué ser el de otro en el mismo lugar).
- **Reserva temporal (hold)**: el checkout ya aprobado reserva la selección por 10 minutos con cuenta regresiva (`docs/specs/checkout/checkout-and-confirmation.md`, AC-3). `ticket_holds` respalda esto: mientras el hold no expira, ese asiento/cupo no puede venderse a otro comprador.
- **Categorías**: tabla `categories` gestionable por Super admin, no un enum fijo en código.
- **Moneda**: `PEN` (soles), consistente con `Event.price` ya usado en la UI (`src/modules/events/types/event.types.ts`).
- **ORM**: Drizzle (elegido, no instalado en esta tarea).

## Diagrama ER

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : has
    USERS ||--o{ ORGANIZATION_MEMBERS : has
    ORGANIZATIONS ||--o{ VENUES : owns
    ORGANIZATIONS ||--o{ EVENTS : owns
    ORGANIZATIONS ||--o{ COUPONS : issues
    VENUES ||--o{ VENUE_ZONES : has
    VENUE_ZONES ||--o{ VENUE_SEATS : has
    VENUES ||--o{ EVENTS : hosts
    CATEGORIES ||--o{ EVENTS : classifies
    EVENTS ||--o{ TICKET_TYPES : offers
    VENUE_ZONES ||--o{ TICKET_TYPES : "priced for"
    EVENTS ||--o{ EVENT_SEATS : has
    VENUE_SEATS ||--o{ EVENT_SEATS : instantiates
    TICKET_TYPES ||--o{ EVENT_SEATS : covers
    TICKET_TYPES ||--o{ TICKET_HOLDS : reserves
    EVENT_SEATS ||--o| TICKET_HOLDS : reserves
    USERS ||--o{ TICKET_HOLDS : holds
    USERS ||--o{ ORDERS : places
    EVENTS ||--o{ ORDERS : "sold for"
    COUPONS ||--o{ ORDERS : discounts
    ORDERS ||--o{ ORDER_ITEMS : contains
    TICKET_TYPES ||--o{ ORDER_ITEMS : "sold as"
    ORDER_ITEMS ||--o{ TICKETS : issues
    EVENT_SEATS ||--o| TICKETS : "seat of"
    USERS ||--o{ TICKETS : redeems
    USERS ||--o{ NOTIFICATIONS : receives
```

## Entidades

### Identidad y organizaciones (sincronizadas desde Clerk vía webhook)

#### `users`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `text` PK | = Clerk user id (`user_...`) |
| `email` | `text` unique, not null | |
| `full_name` | `text` | nullable |
| `avatar_url` | `text` | nullable — con Google se llena con la foto de perfil |
| `email_verified` | `boolean` not null default `false` | `true` siempre con Google; base del enlace de cuentas |
| `auth_providers` | `text[]` not null default `'{}'` | métodos enlazados: `password`, `google`. Una cuenta puede tener ambos |
| `last_sign_in_at` | `timestamptz` | nullable |
| `is_super_admin` | `boolean` not null default `false` | flag global, fuera de cualquier org |
| `created_at` / `updated_at` | `timestamptz` not null | |

#### `organizations`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `text` PK | = Clerk organization id (`org_...`) |
| `name` | `text` not null | |
| `slug` | `text` unique, not null | |
| `logo_url` | `text` | nullable |
| `stripe_account_id` | `text` unique | nullable — cuenta Connect |
| `stripe_connect_status` | `text` enum `stripe_connect_status` not null default `not_started` | `not_started \| pending \| active \| restricted` |
| `created_at` / `updated_at` | `timestamptz` not null | |

#### `organization_members`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `text` PK | = Clerk organization membership id |
| `organization_id` | `text` FK → `organizations.id`, not null | |
| `user_id` | `text` FK → `users.id`, not null | |
| `role` | `text` enum `org_role` not null | `admin \| organizer` |
| `created_at` | `timestamptz` not null | |

Restricción: único por `(organization_id, user_id)`.

### Catálogo

#### `categories`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `gen_random_uuid()` | |
| `slug` | `text` unique, not null | |
| `label` | `text` not null | |
| `icon` | `text` | nullable, nombre de ícono lucide |
| `created_at` | `timestamptz` not null | |

Gestionada por Super admin (reemplaza el union type `EventCategory` hardcodeado de `event.types.ts`).

### Recinto (venue), reutilizable entre eventos

#### `venues`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `organization_id` | `text` FK → `organizations.id`, not null | dueño del recinto |
| `name` | `text` not null | |
| `address_line` | `text` not null | |
| `city` | `text` not null | |
| `country` | `text` not null default `'PE'` | |
| `lat` / `lng` | `numeric(9,6)` | nullable hasta geocoding (Google Maps, solo prod) |
| `capacity` | `integer` | nullable |
| `created_at` / `updated_at` | `timestamptz` not null | |

#### `venue_zones`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `venue_id` | `uuid` FK → `venues.id`, not null | |
| `name` | `text` not null | ej. "Tribuna Occidente" |
| `short_name` | `text` not null | etiqueta corta para móvil, ej. "Occidente" |
| `seating` | `text` enum `zone_seating` not null | `general \| numbered` |
| `shape` | `jsonb` not null | rect/polígono del mapa SVG (`{x,y,width,height}`) |
| `tone` | `smallint` not null | 1–5, escala visual (1 = más cara) — ver `design-system/ticketera/MASTER.md` § Color Palette, `--zone-1..5` |
| `sort_order` | `integer` not null default `0` | |
| `created_at` / `updated_at` | `timestamptz` not null | |

#### `venue_seats`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `venue_zone_id` | `uuid` FK → `venue_zones.id`, not null | solo zonas `seating = 'numbered'` |
| `row_label` | `text` not null | ej. "B" |
| `seat_number` | `integer` not null | |
| `x` / `y` | `numeric` not null | coordenadas del mapa SVG |
| `created_at` | `timestamptz` not null | |

Restricción: único por `(venue_zone_id, row_label, seat_number)`.

### Eventos

#### `events`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `organization_id` | `text` FK → `organizations.id`, not null | |
| `venue_id` | `uuid` FK → `venues.id`, not null | |
| `category_id` | `uuid` FK → `categories.id`, not null | |
| `title` | `text` not null | |
| `slug` | `text` unique, not null | |
| `description` | `text` | nullable |
| `cover_image_url` | `text` | nullable |
| `starts_at` | `timestamptz` not null | |
| `ends_at` | `timestamptz` | nullable |
| `doors_open_at` | `timestamptz` | nullable — ya existe como `EventDetail.doorsOpenAt` en la UI mock |
| `min_age` | `integer` | nullable — `null` = todo público, ya existe como `EventDetail.minAge` |
| `status` | `text` enum `event_status` not null default `draft` | `draft \| published \| cancelled` |
| `featured` | `boolean` not null default `false` | ya existe como `Event.featured` |
| `created_at` / `updated_at` | `timestamptz` not null | |

### Venta de entradas (por evento)

#### `ticket_types`

Precio y disponibilidad de una zona **para un evento específico** (el mismo venue puede tener precios distintos en cada evento).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `event_id` | `uuid` FK → `events.id`, not null | |
| `venue_zone_id` | `uuid` FK → `venue_zones.id`, not null | |
| `name` | `text` not null | por defecto el nombre de la zona; puede sobreescribirse (ej. "VIP Campo") |
| `price` | `integer` not null | centavos |
| `currency` | `text` not null default `'PEN'` | |
| `quantity_total` | `integer` | **solo** cuando la zona es `general`; `null` si `numbered` (la capacidad sale de contar `event_seats`) |
| `quantity_sold` | `integer` not null default `0` | contador denormalizado |
| `sales_start_at` / `sales_end_at` | `timestamptz` | nullable |
| `created_at` / `updated_at` | `timestamptz` not null | |

Restricción: único por `(event_id, venue_zone_id)`.

#### `event_seats`

Una fila por asiento numerado **de un evento concreto** (instancia de `venue_seats` con estado de venta).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `event_id` | `uuid` FK → `events.id`, not null | |
| `venue_seat_id` | `uuid` FK → `venue_seats.id`, not null | |
| `ticket_type_id` | `uuid` FK → `ticket_types.id`, not null | |
| `status` | `text` enum `seat_status` not null default `available` | `available \| held \| sold` |
| `created_at` / `updated_at` | `timestamptz` not null | |

Restricción: único por `(event_id, venue_seat_id)`.

#### `ticket_holds`

Respalda la reserva de 10 minutos ya implementada visualmente en `docs/specs/checkout/checkout-and-confirmation.md` (AC-3). Mientras un hold no expira, esa cantidad/asiento no está disponible para otro comprador.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `ticket_type_id` | `uuid` FK → `ticket_types.id`, not null | |
| `event_seat_id` | `uuid` FK → `event_seats.id` | nullable — solo zonas `numbered` |
| `quantity` | `integer` not null default `1` | zonas `general`; siempre `1` en `numbered` |
| `user_id` | `text` FK → `users.id` | nullable — ver Preguntas abiertas (checkout como invitado) |
| `expires_at` | `timestamptz` not null | |
| `created_at` | `timestamptz` not null | |

### Promociones

#### `coupons`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `organization_id` | `text` FK → `organizations.id`, not null | |
| `event_id` | `uuid` FK → `events.id` | nullable — `null` = aplica a todos los eventos de la org |
| `code` | `text` not null | único por organización |
| `discount_type` | `text` enum `discount_type` not null | `percentage \| fixed_amount` |
| `discount_value` | `integer` not null | |
| `max_redemptions` | `integer` | nullable |
| `redemptions_count` | `integer` not null default `0` | |
| `valid_from` / `valid_until` | `timestamptz` | nullable |
| `created_at` / `updated_at` | `timestamptz` not null | |

Restricción: único por `(organization_id, code)`.

### Órdenes y pago (Stripe)

#### `orders`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `text` FK → `users.id`, not null | comprador |
| `event_id` | `uuid` FK → `events.id`, not null | |
| `status` | `text` enum `order_status` not null default `pending` | `pending \| paid \| cancelled \| refunded` |
| `stripe_checkout_session_id` | `text` unique | nullable |
| `stripe_payment_intent_id` | `text` unique | nullable |
| `total_amount` | `integer` not null | centavos |
| `currency` | `text` not null default `'PEN'` | |
| `application_fee_amount` | `integer` | nullable — comisión de plataforma (Stripe Connect) |
| `coupon_id` | `uuid` FK → `coupons.id` | nullable |
| `discount_amount` | `integer` not null default `0` | snapshot del descuento aplicado |
| `created_at` / `updated_at` | `timestamptz` not null | |

#### `order_items`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `order_id` | `uuid` FK → `orders.id`, not null | |
| `ticket_type_id` | `uuid` FK → `ticket_types.id`, not null | |
| `quantity` | `integer` not null | |
| `unit_price` | `integer` not null | snapshot del precio al momento de compra |
| `created_at` | `timestamptz` not null | |

#### `tickets`

Una fila por entrada individual (por unidad de `order_items.quantity`); es la unidad que se valida en puerta vía QR.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `order_item_id` | `uuid` FK → `order_items.id`, not null | |
| `ticket_type_id` | `uuid` FK → `ticket_types.id`, not null | denormalizado, consultas rápidas |
| `event_seat_id` | `uuid` FK → `event_seats.id` | nullable — solo zonas `numbered` |
| `qr_code` | `text` unique, not null | token/UUID firmado |
| `status` | `text` enum `ticket_status` not null default `valid` | `valid \| redeemed \| cancelled` |
| `redeemed_at` | `timestamptz` | nullable |
| `redeemed_by` | `text` FK → `users.id` | nullable — staff/organizador que escaneó |
| `created_at` | `timestamptz` not null | |

### Notificaciones

#### `notifications`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `text` FK → `users.id`, not null | |
| `type` | `text` not null | `order_confirmation \| event_reminder \| ticket_redeemed \| ...` |
| `channel` | `text` not null default `'email'` | |
| `status` | `text` enum `notification_status` not null default `pending` | `pending \| sent \| failed` |
| `payload` | `jsonb` | nullable — ej. `{ orderId, eventId }` |
| `sent_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` not null | |

Tabla de log/auditoría; no dispara nada por sí sola (el envío real lo hace un servicio aparte).

## Enums (resumen)

| Enum | Valores |
|---|---|
| `stripe_connect_status` | `not_started`, `pending`, `active`, `restricted` |
| `org_role` | `admin`, `organizer` |
| `zone_seating` | `general`, `numbered` |
| `event_status` | `draft`, `published`, `cancelled` |
| `seat_status` | `available`, `held`, `sold` |
| `discount_type` | `percentage`, `fixed_amount` |
| `order_status` | `pending`, `paid`, `cancelled`, `refunded` |
| `ticket_status` | `valid`, `redeemed`, `cancelled` |
| `notification_status` | `pending`, `sent`, `failed` |

## Relación con la UI ya construida (mock)

Mapeo de los tipos mock existentes a las tablas reales que los reemplazarán cuando haya backend:

| Tipo/servicio mock | Tabla(s) real(es) |
|---|---|
| `Event` / `EventDetail` (`src/modules/events/types/event.types.ts`) | `events` (+ `venues`, `categories` por las FKs) |
| `VenueLayout` / `VenueZone` (`src/modules/tickets/types/venue.types.ts`) | `venues` + `venue_zones` (plantilla física, hoy hardcodeada como "stadium"/"theater") |
| `Seat` / `SeatRow` | `venue_seats` (físico) + `event_seats` (estado de venta por evento) |
| `PurchaseState` / `buildPurchaseSummary` (`purchase.store.ts`) | `ticket_holds` (selección en curso) → `order_items` al confirmar |
| `Order` / `OrderTicket` (`src/modules/checkout/types/order.types.ts`) | `orders` + `order_items` + `tickets` |
| Cuenta regresiva de 10 min (`useCountdown`) | `ticket_holds.expires_at` |

Cuando exista una spec de implementación del backend, el `layoutId` fijo (`"stadium" | "theater"`) deja de generarse en código y pasa a ser datos reales en `venue_zones`/`venue_seats`, cargados una vez por venue.

## Autenticación (Clerk + Google)

```mermaid
sequenceDiagram
    participant U as Usuario
    participant App as Next.js (Ticketera)
    participant C as Clerk
    participant G as Google OAuth
    participant DB as Postgres

    U->>App: "Continuar con Google"
    App->>C: iniciar sign-in/sign-up (strategy oauth_google)
    C->>G: redirección + consentimiento (openid email profile)
    G-->>C: código → identidad (email verificado, nombre, foto)
    C-->>App: sesión (cookie) y redirección a `next` o /my-tickets
    C->>App: webhook user.created / user.updated
    App->>DB: upsert users (id, email, full_name, avatar_url, auth_providers)
```

- **Cliente** (`src/modules/account/`): el botón "Continuar con Google" del login/registro llama a la estrategia `oauth_google` de Clerk; el selector de cuentas mock se elimina.
- **Servidor**: el middleware de Clerk protege las rutas privadas (`/my-tickets`, `/checkout`, panel de organizador). Los server actions/route handlers leen el `userId` de la sesión de Clerk, nunca de un parámetro del cliente.
- **Primera vez con Google** equivale a registro: el webhook crea la fila en `users`. Un `users.id` es siempre el id de Clerk, sin importar el método de acceso.
- **Entorno**: requiere un OAuth client en Google Cloud (consent screen + URI de redirección que entrega Clerk), configurado en el dashboard de Clerk, no en variables propias. Solo se agregan `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`.

## Sincronización con Clerk

`users`, `organizations` y `organization_members` son una **copia de solo lectura** de lo que existe en Clerk, mantenida vía webhooks (`user.created/updated/deleted`, `organization.created/updated`, `organizationMembership.created/updated/deleted`). Clerk sigue siendo la fuente de verdad para autenticación (incluido Google), invitaciones y gestión de roles; Postgres solo la necesita para hacer `JOIN` con `events`, `orders`, etc. `auth_providers`, `email_verified` y `avatar_url` se derivan de las `external_accounts` y `email_addresses` del payload de `user.*`; `last_sign_in_at` de `last_sign_in_at` en ese mismo payload.

## Fuera de alcance (esta versión)

- Yape y PagoEfectivo como métodos de pago reales (quedan como opciones visuales del checkout mock; requeriría un proveedor de pagos local además de Stripe).
- Otros proveedores sociales (Apple, Facebook), One Tap de Google y acceso a APIs de Google (Calendar, Contactos): solo se pide `openid email profile`.
- Reembolsos parciales (solo `orders.status = 'refunded'` a nivel de orden completa).
- Editor de mapas de venue para organizadores (crear/editar `venue_zones`/`venue_seats` desde UI) — hoy son datos que se cargarían manualmente o por script.
- Instalación de Drizzle y escritura del schema real — corresponde a una spec de implementación posterior, ya con este documento como base aprobada.

## Preguntas abiertas

- **Checkout como invitado**: el formulario de checkout ya aprobado (`checkout-and-confirmation.md`) pide nombre/correo/documento directamente, sin pasar por login de Clerk. ¿El comprador final debe autenticarse con Clerk antes de pagar (entonces `orders.user_id`/`ticket_holds.user_id` son siempre obligatorios), o se permite compra como invitado (entonces esas columnas quedan nullable y se usa el email del formulario como identificador)? No bloquea escribir este MER (las columnas ya están marcadas nullable), pero sí bloquea la futura spec de implementación del checkout real.
- **Expiración de `ticket_holds`**: si se libera por un cron/job periódico o de forma perezosa (al intentar reservar, se descartan los holds vencidos de esa zona/evento primero). Decisión de la spec de implementación, no del modelo de datos.
