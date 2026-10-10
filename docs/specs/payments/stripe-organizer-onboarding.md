# Onboarding de organizadores en Stripe Connect (Fase 2: cuentas conectadas y bloqueo de publicación)

**Estado**: approved
**Aprobado por**: usuario (confirmado en chat, 2026-10-09)
**Fase**: 2 de 3 (anterior: `stripe-buyer-payment.md`; siguiente: `stripe-settlement-refunds.md`)

> **Nota de estado**: decisiones del usuario incorporadas (ver § Decisiones). La spec permanece en `draft` porque solo el orquestador registra la aprobación humana; sin preguntas bloqueantes.

## Contexto

Cada organización necesita una cuenta conectada de Stripe para poder recibir, en la Fase 3, lo cobrado por sus eventos (total menos comisión). Decisiones ya tomadas: cuentas **Express vía Accounts v2**, una por organización (`organizations.stripe_account_id`, `organizations.stripe_connect_status`: `not_started | pending | active | restricted`), la plataforma paga las comisiones de Stripe y asume contracargos y saldos negativos, y se usan **componentes incrustados** en `/organizer` para mostrar el estado. Esta fase crea la cuenta, genera el enlace de onboarding, mantiene el estado sincronizado y **bloquea publicar eventos (todos son de pago: publicar exige precio > 0) hasta que la cuenta esté `active`**. Las columnas ya existen (`src/db/schema/identity.ts`, `enums.ts`) y el admin ya muestra el estado (`organizations-table.tsx`). Diseño: `docs/specs/database/data-model.md` § Decisiones de arquitectura (Pagos), `organizations`.

## Alcance

- **Incluye**:
  - Crear la cuenta conectada de una organización (idempotente) y guardar `stripe_account_id`.
  - Enlace de onboarding (hospedado por Stripe) con retorno a `/organizer`.
  - Componentes incrustados de Connect (sesión de cuenta emitida por el servidor) en `/organizer` para estado y gestión básica de la cuenta.
  - Sincronización de `stripe_connect_status`: por webhook de Connect y por lectura a demanda al abrir `/organizer`/volver del onboarding (respaldo cuando el webhook no llega, p. ej. en local).
  - Regla de negocio: no publicar (crear con modo publicar, ni publicar un borrador) si la organización no está `active`.
  - Un único punto de mapeo de estado (puro y testeado) desde la cuenta de Stripe a `stripe_connect_status`.
- **No incluye**: cobros al comprador (Fase 1), transferencias/liquidación y reembolsos (Fase 3); cuentas conectadas Standard/Custom; UI de admin para crear cuentas por otros (solo se reutiliza la columna de estado ya visible); retirada o desactivación de eventos ya publicados cuando la cuenta pasa a `restricted`/`pending` (decisión 9); KYC propio (lo recoge Stripe); cambio de país o de cuenta una vez creada.

## Criterios de aceptación

- **AC-1 (crear cuenta, permisos)**: `startOnboardingAction({ organizationId })` exige sesión y `events:manage` en esa organización o ser super admin (decisión 8); otro usuario u organización inexistente → error uniforme "Organización no encontrada". Si la organización no tiene `stripe_account_id`, crea la cuenta Express (Accounts v2) con clave de idempotencia `connect-account-<organizationId>` y guarda el id con un `UPDATE … WHERE stripe_account_id IS NULL`; dos llamadas simultáneas terminan con **una sola cuenta** guardada (la otra reutiliza el id existente). El estado pasa de `not_started` a `pending`.
- **AC-2 (parámetros de cuenta)**: la cuenta se crea con la plataforma como responsable de tarifas y pérdidas (decisión de negocio ya tomada), dashboard Express, la capacidad de recibir transferencias solicitada y el país definido en `CONNECTED_ACCOUNT_COUNTRY` (constante configurable, país válido en modo de prueba) (decisión 6); el nombre/correo prellenados provienen de la organización y del usuario de la sesión, sin datos sensibles. La forma exacta de los parámetros de Accounts v2 se confirma contra la documentación vigente de Stripe en la implementación (`stripe.v2.core.accounts.create`); esta spec fija el comportamiento, no los nombres de campo.
- **AC-3 (enlace de onboarding)**: `startOnboardingAction` devuelve `{ ok: true, url }` con un enlace de onboarding nuevo (los enlaces son de un solo uso y expiran) cuyo `return_url` = `${APP_URL}/organizer?connect=return` y `refresh_url` = `${APP_URL}/organizer?connect=refresh`; el cliente navega a `url`. Al aterrizar con `connect=refresh`, la página ofrece generar un enlace nuevo; con `connect=return`, sincroniza el estado (AC-5) y muestra el resultado.
- **AC-4 (mapeo de estado, puro)**: `mapConnectStatus(snapshot)` devuelve: `not_started` si no hay cuenta; `active` si la capacidad de recibir transferencias está activa y no hay requisitos vencidos ni pendientes; `restricted` si hay requisitos vencidos o la capacidad está restringida/deshabilitada por Stripe; `pending` en cualquier otro caso con cuenta creada. Es total (cualquier entrada válida produce uno de los 4 estados) y no depende del SDK (opera sobre un `ConnectAccountSnapshot` propio).
- **AC-5 (sincronización)**: `syncConnectStatus(organizationId)` recupera la cuenta en Stripe, la convierte en `ConnectAccountSnapshot`, aplica `mapConnectStatus` y actualiza `organizations.stripe_connect_status` solo si cambió. Se invoca (a) desde el webhook de Connect (AC-6) y (b) a demanda al renderizar `/organizer` para las organizaciones del usuario cuyo estado no es `active` y que tienen cuenta, con un máximo de una consulta por organización por carga y errores de Stripe absorbidos (la página sigue funcionando con el último estado guardado).
- **AC-6 (webhook de Connect)**: `POST /api/webhooks/stripe/connect` valida la firma con `STRIPE_CONNECT_WEBHOOK_SECRET` sobre el cuerpo crudo (firma inválida → 400 sin efectos), procesa los eventos de cuenta que cambian requisitos/capacidades de la cuenta (`v2.core.account[...]`; confirmar nombres exactos en la documentación), resuelve la organización por `stripe_account_id` (cuenta desconocida → 200 sin efecto), llama a `syncConnectStatus` y registra el evento en `stripe_events` para idempotencia (reentrega → 200 sin repetir efectos). Errores inesperados → 500.
- **AC-7 (componentes incrustados)**: `createAccountSessionAction({ organizationId })` (mismos permisos que AC-1; exige cuenta existente) devuelve solo el `client_secret` de una sesión de cuenta con los componentes mínimos habilitados (banner de notificaciones/estado y gestión de cuenta); `/organizer` muestra, por organización gestionada, una tarjeta con nombre, estado (badge) y: `not_started` → botón "Conectar cuenta de pagos"; `pending`/`restricted` → botón "Continuar configuración" y el banner incrustado; `active` → "Cuenta lista" y gestión de cuenta incrustada. La clave secreta de Stripe nunca llega al cliente; solo `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` y el `client_secret` de la sesión.
- **AC-8 (bloqueo de publicación)**: `assertPaymentsReady(status)` lanza `EventRuleError` ("Conecta tu cuenta de pagos para publicar eventos") si el estado ≠ `active`; se aplica en `createEvent` (modo publicar) y en `updateEvent` al pasar un borrador a publicar, leyendo el estado actual de la organización dentro del servicio (nunca del cliente). Guardar como borrador sigue permitido. Los eventos ya publicados siguen siendo editables con las reglas vigentes (`assertPublishedText`).
- **AC-9 (UX del bloqueo)**: el editor de eventos muestra el mensaje del servidor al intentar publicar; la tarjeta/aviso de AC-7 es visible en `/organizer` para que el organizador sepa cómo desbloquearse (enlace a la tarjeta); no se duplica lógica de reglas en el cliente.
- **AC-10 (seguridad y secretos)**: ningún id de cuenta de otra organización se acepta del cliente (siempre se deriva de `organizationId` verificado); las respuestas de acciones no incluyen payloads de Stripe ni claves; los logs no contienen datos del titular. `stripe` solo se importa en servidor.
- **AC-11 (calidad)**: `lint`, `test` y `build` pasan; las pruebas listadas en el plan existen y pasan; el estado mostrado en `/admin` (`organization-catalog.service.ts`) sigue funcionando sin cambios.

## Contratos

### Base de datos

**Sin migración.** Reusa `organizations.stripe_account_id` (único) y `organizations.stripe_connect_status` (enum `stripe_connect_status`), y la tabla `stripe_events` de la Fase 1.

### Tipos y schemas

```ts
// src/modules/payments/types/connect.types.ts
export type ConnectStatus = "not_started" | "pending" | "active" | "restricted"; // = enum de BD
export interface ConnectAccountSnapshot {
  hasAccount: boolean;
  transfersCapability: "active" | "pending" | "restricted" | "inactive" | "unknown";
  requirementsCurrentlyDue: number;   // cantidad de requisitos pendientes
  requirementsPastDue: number;        // cantidad de requisitos vencidos
}
export interface OrganizationConnectView {
  organizationId: string; name: string; status: ConnectStatus; hasAccount: boolean;
}
export const CONNECTED_ACCOUNT_COUNTRY: string;   // definido por la decisión 6

// src/modules/payments/schemas/connect.schema.ts
export const connectOrganizationInputSchema = z.object({
  organizationId: z.string().regex(/^org_[0-9a-f-]{36}$/i),   // ids generados por la app: org_<uuid>
});

// src/modules/payments/services/connect-status.mapping.ts (puro)
export function mapConnectStatus(snapshot: ConnectAccountSnapshot): ConnectStatus;

// src/modules/payments/services/connect-account.adapter.ts (único lugar que conoce la forma de la cuenta v2 del SDK)
export function toSnapshot(account: unknown /* respuesta de Stripe */): ConnectAccountSnapshot;

// src/modules/payments/services/connect.service.ts (solo servidor)
export function ensureConnectedAccount(actor: CurrentUser, organizationId: string): Promise<{ accountId: string }>;
export function createOnboardingLink(actor: CurrentUser, organizationId: string): Promise<{ url: string }>;
export function createAccountSessionSecret(actor: CurrentUser, organizationId: string): Promise<{ clientSecret: string }>;
export function syncConnectStatus(organizationId: string): Promise<ConnectStatus>;
export function listConnectViews(actor: CurrentUser): Promise<OrganizationConnectView[]>;   // organizaciones donde actor tiene events:manage (super admin: todas)

// src/modules/payments/actions/connect.actions.ts ("use server")
export type ConnectActionResult<T> = ({ ok: true } & T) | { ok: false; error: string };
export function startOnboardingAction(raw: unknown): Promise<ConnectActionResult<{ url: string }>>;
export function createAccountSessionAction(raw: unknown): Promise<ConnectActionResult<{ clientSecret: string }>>;

// src/modules/organizer/services/event-write.mapping.ts (puro, nuevo)
export function assertPaymentsReady(status: ConnectStatus): void;   // lanza EventRuleError
```

### Variables de entorno

Nueva: `STRIPE_CONNECT_WEBHOOK_SECRET` (se agrega **solo el nombre** a `.env.example`; los valores se configuran fuera del repo). Existentes: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `APP_URL` (Fase 1).

### Dependencias nuevas (cliente)

`@stripe/connect-js` y `@stripe/react-connect-js` (componentes incrustados de Connect). Confirmar contra la documentación vigente de Connect embedded components si la integración con cuentas v2 requiere otra versión o configuración en el Dashboard de Stripe (branding, destino de eventos de Connect).

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Cliente Stripe servidor | `src/lib/stripe.ts` (Fase 1) | reusar |
| Registro de eventos / idempotencia | `stripe_events` + patrón de `stripe-event.handler.ts` (Fase 1) | reusar tabla y patrón; handler nuevo para Connect |
| Verificación de webhook | `src/app/api/webhooks/stripe/route.ts` (Fase 1) y `.../clerk/route.ts` | reusar el patrón; **crear** `src/app/api/webhooks/stripe/connect/route.ts` (secreto distinto y eventos v2 "thin") |
| Columnas de estado | `organizations.stripe_account_id`, `stripe_connect_status`; `organization-catalog.service.ts` y `organizations-table.tsx` (`STRIPE_STATUS` en el admin) | reusar sin cambios; el mapeo debe producir los mismos 4 valores |
| Permisos por organización | `can(actor, "events:manage", orgId)`, `requirePermission` (`src/modules/auth/services/permissions.ts`, `current-user.service.ts`) | reusar; no se crea un permiso nuevo (YAGNI, ver decisión 8) |
| Reglas de publicación | `assertPublishable`, `EventRuleError` en `event-write.mapping.ts`; `createEvent`/`updateEvent` en `event-write.service.ts` | **extender** con `assertPaymentsReady` |
| Dashboard del organizador | `src/app/organizer/page.tsx`, `organizer-dashboard-view.tsx` | **extender** (insertar la tarjeta de pagos) |
| UI de estado y acciones | `card`, `badge`, `button` ya en `src/components/ui/`; `@shadcn/alert` disponible | reusar; agregar `alert` solo si se usa para avisos (`npx shadcn@latest add alert`, en T-1 si procede) |
| Componentes incrustados de Connect | nada en `src/` | agregar `@stripe/connect-js` + `@stripe/react-connect-js` (no hay equivalente en shadcn) |
| Códigos de error uniformes | `AdminError` (`admin.service.ts`) | reusar para errores de servicio |

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Dependencias de cliente, variable de entorno y tipos compartidos. — archivos: `package.json`, `package-lock.json` (vía `npm install @stripe/connect-js @stripe/react-connect-js`), `.env.example` (agregar el nombre `STRIPE_CONNECT_WEBHOOK_SECRET`), `src/modules/payments/types/connect.types.ts` — tests: no (tipos) — cubre: AC-2, AC-4, AC-7

### Grupo 1 (paralelo)

- **T-2**: Mapeo de estado y schema de entrada. — archivos: `src/modules/payments/services/connect-status.mapping.ts`, `src/modules/payments/services/connect-status.mapping.test.ts`, `src/modules/payments/schemas/connect.schema.ts`, `src/modules/payments/schemas/connect.schema.test.ts` — tests: sí (todos los caminos de `mapConnectStatus`: sin cuenta, activa, vencidos → `restricted`, pendiente; ids de organización válidos/ inválidos) — cubre: AC-4, AC-10
- **T-3**: Regla de publicación. — archivos: `src/modules/organizer/services/event-write.mapping.ts` (`assertPaymentsReady`), `src/modules/organizer/services/event-write.mapping.test.ts`, `src/modules/organizer/services/event-write.service.ts` (cargar el estado de la organización y llamar a la regla en `createEvent` y `updateEvent` solo al publicar un borrador) — tests: sí (los 4 estados; `active` pasa) — cubre: AC-8, AC-9

### Grupo 2 (serial por dependencia de T-2)

- **T-4**: Servicio Connect y adaptador del SDK. — archivos: `src/modules/payments/services/connect-account.adapter.ts`, `src/modules/payments/services/connect-account.adapter.test.ts` (con respuestas de ejemplo ficticias de la cuenta v2: sin requisitos, con vencidos, capacidad pendiente), `src/modules/payments/services/connect.service.ts` — tests: sí para el adaptador (puro); el servicio es orquestación y se valida con el reviewer contra el flujo (sin llamar a Stripe real en tests) — cubre: AC-1, AC-2, AC-3, AC-5, AC-7, AC-10

### Grupo 3 (paralelo)

- **T-5**: Acciones y UI en `/organizer`. — archivos: `src/modules/payments/actions/connect.actions.ts`, `src/modules/payments/components/connect-status-card.tsx`, `src/modules/payments/components/connect-embedded.tsx` (cliente: `ConnectComponentsProvider` con `fetchClientSecret` que llama a `createAccountSessionAction`), `src/app/organizer/page.tsx` (lee `?connect=` y la lista de `listConnectViews`, dispara `syncConnectStatus` a demanda), `src/modules/organizer/components/organizer-dashboard-view.tsx` (monta la tarjeta) — tests: no (presentacional; la lógica está en servicios) — cubre: AC-3, AC-5, AC-7, AC-9
- **T-6**: Webhook de Connect. — archivos: `src/app/api/webhooks/stripe/connect/route.ts`, `src/modules/payments/services/connect-event.handler.ts`, `src/modules/payments/services/connect-event.handler.test.ts` — tests: sí (cuenta conocida/desconocida, duplicado, evento irrelevante, firma inválida si es testeable) — cubre: AC-6, AC-10

> T-5 y T-6 no comparten archivos. T-3 es independiente de Stripe (solo lee `organizations.stripe_connect_status`) y podría ir en cualquier grupo previo a la verificación final; se deja en el Grupo 1 para correr en paralelo con T-2.

## Riesgos

- **Accounts v2 y eventos "thin"**: la API v2 y sus eventos usan un formato distinto al v1 y necesitan un destino de eventos propio configurado en el Dashboard de Stripe; la forma exacta de campos/eventos debe confirmarse en la documentación vigente. Se aísla en `connect-account.adapter.ts` y `connect-event.handler.ts` para que un cambio no toque el resto.
- **Webhook en local**: no llega sin Stripe CLI; por eso AC-5(b) sincroniza a demanda.
- **País de la cuenta conectada**: depende de la decisión 1 (Stripe puede no permitir cuentas conectadas en Perú según el modelo de plataforma) y de la 6; sin esto la creación de cuentas puede fallar en vivo.
- **Eventos ya publicados** (incluidos los sembrados con `npm run db:seed`, que publica sin pasar por el servicio) en organizaciones sin cuenta `active`: siguen vendiendo (Fase 1) pero no podrán liquidarse hasta que la organización complete el onboarding (Fase 3). Ver decisión 9.
- **Carrera de doble creación de cuenta**: mitigada con idempotencia de Stripe + `UPDATE … WHERE stripe_account_id IS NULL`; si el UPDATE no afecta filas se lee el id ya guardado.
- **Datos personales**: el titular es persona natural o empresa; Stripe recoge los documentos; la app no los almacena.
- **Salida de prueba/live**: usar modo de prueba de Stripe hasta resolver la decisión 1.

## Fases siguientes

- Fase 3 — `docs/specs/payments/stripe-settlement-refunds.md`: transferencias a organizadores, comisión y reembolsos (usa `stripe_connect_status = 'active'` y `stripe_account_id` como destino).

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
- Opcional (no bloqueante): confirmar el país por defecto concreto de `CONNECTED_ACCOUNT_COUNTRY` (válido en modo de prueba) al implementar T-1.
