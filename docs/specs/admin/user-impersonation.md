# Impersonación de usuarios y registro de auditoría del super admin

**Estado**: approved (Fase 1: done, commiteada en 22d1899; Fase 2: aprobada, preguntas 9 y 10 aceptadas como propuestas; Fase 3 se detalla al cerrar la Fase 2)
**Aprobado por**: usuario — 2026-10-23 (Fase 1) / 2026-10-24 (Fase 2)
**Fase**: 2 de 3

> Historial: la Fase 1 fue aprobada por el usuario el 2026-10-23 (aceptó todas las propuestas de Preguntas abiertas 1-8). Al detallar la Fase 2 la spec vuelve a `draft` y requiere nueva aprobación humana antes de que un developer empiece las tareas T-7 en adelante.

## Contexto

El super admin necesita **impersonar usuarios** desde `/admin/users` para completar rápido la sección de Stripe de los organizadores (onboarding Connect en `/organizer`) actuando como ellos. Como esto da acceso total a una cuenta ajena, se exige además que **toda acción del super admin quede registrada a nivel de base de datos** (acción + timestamp `timestamptz` con fecha, hora, minutos y segundos), incluida la actividad realizada mientras impersona. Relacionado: `docs/specs/admin/user-management.md` (tabla de `/admin/users`), `docs/specs/database/data-model.md` § Autenticación.

El trabajo se divide en 3 fases; cada una deja el proyecto compilando y con tests pasando:

1. **Fase 1 (esta, detallada)**: infraestructura de auditoría (tabla append-only, servicio, redacción) y registro de todas las acciones mutantes del super admin.
2. **Fase 2**: impersonación (actor token de Clerk, guard, action, botón en la tabla), registrando `impersonation.start|end|denied`.
3. **Fase 3**: banner persistente de "Impersonando a X" + "Dejar de impersonar", restricciones durante la impersonación (checkout real) y verificación del flujo Stripe.

## Alcance

- **Incluye (Fase 1)**:
  - Tabla `admin_audit_log` (migración `0008`), append-only (trigger en BD que rechaza `UPDATE`/`DELETE`).
  - Módulo `src/modules/audit/` con `recordAudit()`, `redactInput()` y `auditedAction()`.
  - Registro, con nombre de acción, de las acciones mutantes de `admin.actions.ts`, `role.actions.ts`, `payments-admin.actions.ts`, `event.actions.ts` y `connect.actions.ts` cuando el actor es super admin.
- **Incluye (Fases 2-3, resumido)**: impersonación vía Clerk actor tokens, reglas de servidor, banner, botón "Impersonar" en `RowActions`, eventos de auditoría de impersonación.
- **No incluye**:
  - Auditar acciones de admin/organizer que no son super admin (el pedido es sobre el super admin).
  - Auditar lecturas (páginas vistas, `listMembers`, `previewRefund`).
  - Auditar procesos del sistema (cron/webhooks; p. ej. `settleEvent` con actor `"system"`): no son acciones de un super admin. Solo se audita cuando lo dispara un super admin.
  - Vista de solo lectura del log en `/admin` (ver Preguntas abiertas; hasta entonces se consulta por SQL).
  - Edición/borrado/purga del log desde la app; retención.
  - Cambiar el modelo de auth (Clerk) o crear tabla de sesiones propia.

## Criterios de aceptación

Fase 1 (auditoría):

- **AC-1** (tests): `redactInput(input)` devuelve una copia JSON-serializable sin claves sensibles (`password`, `temporaryPassword`, `token`, `secret`, `clientSecret`, `authorization`, coincidencia case-insensitive y anidada), reemplazadas por `"[REDACTED]"`; no muta el original; trunca strings > 500 caracteres; tolera `undefined`, ciclos y valores no serializables.
- **AC-2**: La migración crea `admin_audit_log` con `created_at timestamptz NOT NULL DEFAULT now()` (segundos y fracción incluidos, asignado por la BD, no por la app) y el trigger que lanza excepción en `UPDATE`/`DELETE`. Sin FK dura a `users`/`organizations` (borrar usuarios u organizaciones no se bloquea ni borra historia).
- **AC-3** (tests): `recordAudit(entry)` inserta una fila con `action`, `actor_user_id`, `result`, `target_*`, `organization_id`, `input` redactado y `error_code`; si el actor real no es super admin no inserta nada (devuelve `null`). El `input` guardado pasa siempre por `redactInput`.
- **AC-4** (tests): `auditedAction(meta, fn)` ejecuta `fn`, registra `result: "ok"` si resuelve y `"error"` (con `error_code`) si lanza o devuelve error de dominio, y **devuelve/relanza exactamente lo mismo que `fn`** (no cambia el contrato de las actions). Si `recordAudit` falla en una acción normal: se loguea con `console.error` y la acción no se interrumpe (fail-open; ver Preguntas abiertas).
- **AC-5**: Cada action mutante listada en Contratos § Catálogo de acciones registra una fila con su nombre de acción cuando la ejecuta un super admin, tanto si tiene éxito como si falla. Un admin/organizer no genera filas. La contraseña temporal de `addMember` nunca aparece en el log.
- **AC-6**: Los tres wrappers existentes (`run()` de `run-action.ts`, `execute()` de `payments-admin.actions.ts`, `run()` de `connect.actions.ts`) delegan en `auditedAction`; los call sites pasan el nombre de acción y el contrato de retorno/errores de cada wrapper no cambia.
- **AC-7**: `npm run lint`, `npm run test` y `npm run build` pasan; `npm run db:generate` no deja cambios pendientes.

Fase 2 (impersonación): **AC-8 a AC-11 se refinan y amplían en "Fase 2 (detalle)" más abajo** (AC-8 a AC-11, AC-14, AC-15). Fase 3 (sin detallar):

- **AC-12**: Banner persistente (ámbar, `role="status"`) en `DashboardShell` y en el header público con "Estás actuando como X (correo)" y botón "Dejar de impersonar", que registra `impersonation.end` y cierra la sesión impersonada.
- **AC-13**: Impersonando, el organizador ve `/organizer`, inicia el onboarding de Stripe (`startOnboardingAction`/`createAccountSessionAction`) y al volver de Stripe (`/organizer?connect=return`) conserva la sesión impersonada. El checkout/pago real queda bloqueado con mensaje mientras `impersonatedBy != null`.

## Contratos

```ts
// src/db/schema/audit-log.ts  (re-export en src/db/schema/index.ts)
export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: createdAt(),                       // timestamptz NOT NULL DEFAULT now()
  actorUserId: text().notNull(),                // super admin REAL (nunca el destino). Sin FK
  impersonatedUserId: text(),                   // null si no hay impersonación. Sin FK
  action: text().notNull(),                     // ver catálogo, p. ej. "organization.create"
  targetType: text(),                           // "organization" | "user" | "event" | "order" | "role" | ...
  targetId: text(),
  organizationId: text(),                       // sin FK; mismo tipo que organizations.id (id Clerk/app "org_...")
  input: jsonb(),                               // redactado
  result: text().notNull(),                     // "ok" | "error" | "denied"
  errorCode: text(),
  metadata: jsonb(),                            // p. ej. { actorTokenId, expiresAt } en impersonation.start
}, (t) => [
  index("admin_audit_log_created_at_idx").on(t.createdAt),
  index("admin_audit_log_actor_idx").on(t.actorUserId, t.createdAt),
  index("admin_audit_log_action_idx").on(t.action),
]);
// Migración 0008: CREATE TABLE + función/trigger BEFORE UPDATE OR DELETE -> RAISE EXCEPTION 'admin_audit_log is append-only'

// src/modules/audit/types/audit.types.ts
export type AuditResult = "ok" | "error" | "denied";
export interface AuditMeta {
  action: string;
  targetType?: string;
  targetId?: string | null;
  organizationId?: string | null;
  input?: unknown;                 // se redacta
}
export interface AuditEntry extends AuditMeta {
  result: AuditResult;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

// src/modules/audit/services/redact-input.ts
export function redactInput(input: unknown): unknown;

// src/modules/audit/services/audit.service.ts
export function recordAudit(user: CurrentUser, entry: AuditEntry): Promise<string | null>; // id; null si el actor real no es super admin
export function auditedAction<T>(user: CurrentUser, meta: AuditMeta, fn: () => Promise<T>): Promise<T>;
```

Resolución del actor real (Fase 1): `user.isSuperAdmin` → `actorUserId = user.id`. Fase 2 la extiende en un único punto: si `user.impersonatedBy` existe, `actorUserId = user.impersonatedBy.id` e `impersonatedUserId = user.id`, y se audita siempre (el destino no es super admin pero el actor real sí).

Wrappers (firma nueva, el nombre de acción es el primer argumento):
```ts
// src/modules/admin/actions/run-action.ts
run<T>(action: string, fn: (actor: CurrentUser) => Promise<T>, meta?: Omit<AuditMeta, "action">): Promise<ActionResult<T>>
```
(La forma exacta de retorno actual de `run()`, `execute()` y el `run()` de connect se conserva; el developer lee cada wrapper y solo antepone `action`.)

Catálogo de acciones (nombre `dominio.verbo`):

| Archivo | Acciones |
|---|---|
| `admin.actions.ts` | `organization.create`, `organization.update`, `organization.delete`, `member.add` (input sin contraseña), `member.change_role`, `member.remove` |
| `role.actions.ts` | `role.create`, `role.update`, `role.delete` |
| `payments-admin.actions.ts` | `payments.settle_event`, `payments.retry_settlement`, `payments.refund_order`, `payments.refund_event`, `payments.retry_pending_refunds` |
| `event.actions.ts` | `event.create`, `event.update`, `event.delete`, `event.cancel`, `event.set_featured`, `event.continue_refunds` |
| `connect.actions.ts` | `connect.start_onboarding`, `connect.create_account_session` |
| Fase 2 | `impersonation.start`, `impersonation.end`, `impersonation.denied` |

Fases 2-3 (resumen de contratos): `CurrentUser.impersonatedBy: { id: string; email: string; fullName: string | null } | null`; `impersonation.service.ts` con `assertCanImpersonate` y `startImpersonation` (usa `(await clerkClient()).actorTokens.create({ userId, actor: { sub: adminId }, expiresInSeconds, sessionMaxDurationInSeconds })`, que devuelve `ActorToken.url`, verificado en `@clerk/backend` 3.21.1); `ImpersonationBanner` con props `{ targetName: string; targetEmail: string }`; `DashboardShell` gana `banner?: ReactNode`.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Columnas timestamptz | `tstz()`, `createdAt()` en `src/db/schema/columns.ts` | reusar |
| Wrapper de actions admin | `run()` en `run-action.ts` | extender (añadir `action` + `auditedAction`) |
| Wrapper de pagos | `execute()` en `payments-admin.actions.ts` | extender, delegando en `auditedAction` |
| Wrapper de Connect | `run()` en `connect.actions.ts` | extender, delegando en `auditedAction` |
| Auditoría | nada en `src/` | crear `src/modules/audit/` |
| Resolver usuario actual | `getCurrentUser` (cache) | reusar; Fase 2 le añade `impersonatedBy` |
| Guard de reglas (self/rol) | `member-guard.ts` (+ test como estilo) | reusar patrón; guard nuevo en Fase 2 |
| Impersonación | `ActorTokenAPI` en `@clerk/backend` (`clerkClient().actorTokens`) | reusar (sin cookie propia: `useUser()` del cliente seguiría mostrando al admin) |
| Diálogo de confirmación | `ConfirmDeleteDialog` (destructivo, no encaja), `ui/dialog` | Fase 2: reusar `Dialog` |
| Banner | `ResultBanner` (estilo), shadcn `alert` no instalado | Fase 3: crear `impersonation-banner.tsx` con el estilo ámbar de `StatusLabel`; evaluar `shadcn add alert` en Grupo 0 de Fase 3 |
| Avatar/rol en UI | `UserCell`, `RoleBadge`, `Button` | reusar |

## Plan de tareas

### Fase 1

#### Grupo 0 (serial)
- T-1: Schema de auditoría, migración y tipos — archivos: `src/db/schema/audit-log.ts`, `src/db/schema/index.ts`, `drizzle/0008_admin_audit_log.sql` (generada con `npm run db:generate` + trigger append-only añadido a mano; el nombre/meta de drizzle los genera la CLI), `src/modules/audit/types/audit.types.ts` — tests: no (verificación por AC-2/AC-7 del reviewer; no hay BD de pruebas) — cubre: AC-2, AC-7

#### Grupo 1 (paralelo)
- T-2: Redacción de input — archivos: `src/modules/audit/services/redact-input.ts`, `src/modules/audit/services/redact-input.test.ts` — tests: sí — cubre: AC-1
- T-3: Servicio de auditoría y `auditedAction` — archivos: `src/modules/audit/services/audit.service.ts`, `src/modules/audit/services/audit.service.test.ts` (mock de `db` y de `redactInput`) — tests: sí — cubre: AC-3, AC-4

#### Grupo 2 (paralelo; depende de T-2/T-3)
- T-4: Wrapper admin y acciones de organizaciones/miembros/roles — archivos: `src/modules/admin/actions/run-action.ts`, `src/modules/admin/actions/admin.actions.ts`, `src/modules/admin/actions/role.actions.ts` (agrupa los ~9 call sites de `run()`; `member.add` excluye la contraseña del `input`) — tests: no (cubierto por T-3; reviewer verifica AC-5/6) — cubre: AC-5, AC-6
- T-5: Pagos y Connect (wrappers propios) — archivos: `src/modules/payments/actions/payments-admin.actions.ts`, `src/modules/payments/actions/connect.actions.ts` (rutas por confirmar con `Glob` al implementar) — tests: no — cubre: AC-5, AC-6

#### Grupo 3 (depende de T-4)
- T-6: Acciones de eventos — archivo: `src/modules/organizer/actions/event.actions.ts` (ruta real; wrapper utilizado por confirmar; si usa `run()` de `run-action.ts` consume la firma nueva de T-4, por eso va en este grupo) — tests: no — cubre: AC-5, AC-7

## Fases siguientes

### Fase 2 (detalle): impersonación, sin banner

**Decisiones del usuario (resuelven Preguntas abiertas 1-8)**: (1) terminar la impersonación exige re-login del admin; el diálogo ofrece "Abrir aquí" y "Copiar enlace"; (2) checkout/pago real se bloquea mientras se impersona (implementación en Fase 3); (3) fail-open del log salvo `impersonation.start`, fail-closed; (4) ticket 300 s, sesión 1800 s; (5) sin página `/admin/audit`; (6) solo mutaciones del super admin real, incluida la actividad impersonando; (7) sin auditar actor `"system"`; (8) sin retención.

**Hechos verificados en `node_modules`**:
- `@clerk/shared` `authObject.d.ts`: el auth object de sesión tiene `actor: ActClaim | undefined`; `ActClaim = { sub: string; type?: 'agent' }` (jwtv2.d.ts). Se lee con `(await auth()).actor?.sub`. En el auth object no autenticado el actor es `null`; usar `?.` siempre.
- `@clerk/backend` 3.21.1 `ActorTokenApi.create({ userId, actor: { sub, additionalProperties? }, expiresInSeconds?, sessionMaxDurationInSeconds? })` devuelve `ActorToken` con `url: string | null | undefined` (puede ser nulo: tratar como error) y `id`. `revoke(actorTokenId)` existe.
- `getCurrentUser` está envuelto en `cache()` de React: la memoización es por request, y el `actor` viene del JWT de esa misma request, por lo que no hay mezcla entre sesión real e impersonada. Ningún cambio de `cache()` es necesario.
- Los guards (`member-guard.ts`, `listMembers`) comparan contra `actor.id`. Con sesión impersonada `actor.id` = destino, así que las reglas "no a uno mismo / rol asignable" se evalúan sobre el destino (comportamiento deseado: el super admin actúa con los permisos del usuario). Solo auditoría y el guard de impersonación miran `impersonatedBy`.

#### Alcance Fase 2

- **Incluye**: `impersonatedBy` en `CurrentUser`; `getCurrentUser` sin efectos de login real durante la sesión impersonada; resolución del actor real en `recordAudit`; eventos `impersonation.start|end|denied`; guard + servicio; server actions start/end; botón + diálogo en `RowActions` (tabla y tarjetas móviles).
- **No incluye (Fase 3)**: banner persistente "Estás actuando como X" y botón "Dejar de impersonar" visible en las vistas (por eso en Fase 2 `endImpersonationAction` existe, probada, pero sin punto de entrada de UI), slot `banner` de `DashboardShell`, header público, bloqueo de checkout/pago real, verificación manual del flujo Stripe Connect.
- Nota de transición: entre Fase 2 y 3 el admin impersonando no tiene botón para terminar; la sesión expira a los 30 min o cierra sesión desde Clerk (`UserButton`). Por eso Fase 2 no debería desplegarse a producción sin Fase 3.

#### Criterios de aceptación (Fase 2)

- **AC-8** (tests): `assertCanImpersonate({ actor, target })` (puro, sobre datos ya cargados) devuelve `{ ok: true }` o `{ ok: false, reason }` con `reason` en `"not_super_admin" | "self" | "target_super_admin" | "nested" | "target_not_found"`. Rechaza: actor no super admin (aunque tenga `members:manage`), `target.id === actor.id`, target super admin, `actor.impersonatedBy != null` (anidado), `target` nulo (inexistente en DB). El orden de evaluación es el listado. Cada rechazo, vía `startImpersonation`, intenta registrar `impersonation.denied` con `metadata.reason`.
- **AC-9** (tests): `startImpersonationAction(targetUserId)` valida con zod, carga el destino de la DB (sin llamar a Clerk para validar), aplica AC-8, registra `impersonation.start` (fail-closed: si `recordAudit` lanza, no se llama a Clerk y se devuelve error genérico), y recién entonces crea el actor token con `expiresInSeconds: 300` y `sessionMaxDurationInSeconds: 1800` y `actor: { sub: <super admin real> }`. Devuelve `{ ok: true, url }`. Si Clerk falla o `url` es nula, registra un segundo `impersonation.start` con `result: "error"` y devuelve `{ ok: false, error }`. `metadata` del start: `{ expiresAt, sessionMaxDurationInSeconds }` (ISO, calculado por la app).
- **AC-10** (tests): con `auth().actor?.sub` presente, `getCurrentUser()` devuelve al destino (roles/permisos del destino leídos de DB) con `impersonatedBy: { id, email, fullName }` tomado de la fila del actor en DB; sin actor, `impersonatedBy: null`. En sesión impersonada **no** llama a `currentUser()`, `upsertUser`, `syncRoleMetadata` ni toca `lastSignInAt`/auto-promoción; si el destino o el actor real no existen en DB devuelve `null`. Si el actor ya no es super admin en DB, devuelve `null` (sesión inválida).
- **AC-11**: `recordAudit` resuelve al actor real en un único punto: si `user.impersonatedBy` → `actorUserId = impersonatedBy.id`, `impersonatedUserId = user.id` y audita siempre (el destino no es super admin); si no, comportamiento de Fase 1 (`user.isSuperAdmin`, `impersonatedUserId = null`). Tests de `audit.service` cubren ambas ramas, y que `auditedAction` registra con ese actor. Los intentos de impersonación de un actor que no es super admin no generan fila (`recordAudit` devuelve `null`); solo `console.warn` (ver Pregunta 9).
- **AC-14** (tests): `endImpersonationAction()` exige sesión con `impersonatedBy` (si no, `{ ok: false }`), registra `impersonation.end` (fail-open), revoca la sesión actual (`clerkClient().sessions.revokeSession(sessionId)`) y devuelve `{ ok: true }`; el cliente redirige a `/sign-in`. El admin debe volver a iniciar sesión (decisión 1).
- **AC-15**: UI en `RowActions` (tabla y tarjetas móviles): botón "Impersonar" visible solo si el visor es super admin y no se está impersonando; deshabilitado con `title` en la fila propia o de un super admin. Abre un diálogo (shadcn `Dialog`) que nombra al usuario (nombre y correo), advierte que la sesión del navegador será reemplazada y que habrá que volver a iniciar sesión, y ofrece "Abrir aquí" (`window.location.assign(url)`) y "Copiar enlace" (portapapeles, para ventana privada, con confirmación "Enlace copiado"). Estados de carga y error visibles; el ticket solo se pide al pulsar cualquiera de los dos botones (una URL por acción, no se reutiliza).
- **AC-16**: Webhook y sync: `/api/auth/sync` no requiere cambios (solo llama `getCurrentUser`, que ya no sincroniza en sesión impersonada, AC-10). El webhook de Clerk (`src/app/api/webhooks/clerk/route.ts`) no recibe el `actor` de la sesión, por lo que no puede distinguirlo; no se modifica (ver Pregunta 10). `npm run lint`, `npm run test` y `npm run build` pasan.

#### Contratos (Fase 2)

```ts
// src/modules/auth/services/current-user.service.ts
export interface ImpersonatedBy { id: string; email: string; fullName: string | null }
export interface CurrentUser extends AuthSubject {
  id: string; email: string; fullName: string | null; role: AppRole;
  impersonatedBy: ImpersonatedBy | null;   // nuevo; null fuera de impersonación
}
// getCurrentUser: const { userId, actor } = await auth(); const actorId = actor?.sub;
// Si actorId: loadUser(userId) + loadUser(actorId) (sin currentUser/upsert/sync/promoción) -> ver AC-10.
// Sin actorId: flujo actual intacto, con impersonatedBy: null.

// src/modules/audit/types/audit.types.ts
// (sin cambios de forma; las acciones nuevas son strings: "impersonation.start" | "impersonation.end" | "impersonation.denied")
// src/modules/audit/services/audit.service.ts
// recordAudit(user, entry): ver AC-11. Inserta impersonatedUserId (columna ya existente en adminAuditLog).
// `recordAudit` ya lanza si la BD falla; `safeRecord` (fail-open) sigue siendo interno. `impersonation.start` llama a recordAudit directo (fail-closed).

// src/modules/admin/services/impersonation-guard.ts   (puro, patrón de member-guard.ts)
export type ImpersonationDenyReason =
  "not_super_admin" | "self" | "target_super_admin" | "nested" | "target_not_found";
export interface ImpersonationTarget { id: string; isSuperAdmin: boolean }
export function assertCanImpersonate(input: {
  actor: CurrentUser; target: ImpersonationTarget | null;
}): { ok: true } | { ok: false; reason: ImpersonationDenyReason };

// src/modules/admin/services/impersonation.service.ts
export const ACTOR_TOKEN_TTL_SECONDS = 300;
export const IMPERSONATION_SESSION_SECONDS = 1800;
export class ImpersonationError extends Error { constructor(public reason: ImpersonationDenyReason | "audit_failed" | "token_failed") }
export function startImpersonation(actor: CurrentUser, targetUserId: string): Promise<{ url: string }>; // lanza ImpersonationError
export function endImpersonation(user: CurrentUser, sessionId: string): Promise<void>;

// src/modules/admin/actions/impersonation.actions.ts  ("use server")
export type ImpersonationResult = { ok: true; url: string } | { ok: false; error: string };
export function startImpersonationAction(targetUserId: string): Promise<ImpersonationResult>;
export function endImpersonationAction(): Promise<{ ok: true } | { ok: false; error: string }>;

// src/modules/admin/services/member-list.service.ts
// MemberListRow gana: isSuperAdmin: boolean   (del usuario de la fila; para deshabilitar el botón)

// src/modules/admin/components/impersonate-dialog.tsx
export interface ImpersonateDialogProps {
  row: Pick<MemberListRow, "userId" | "fullName" | "email">;
  open: boolean; onOpenChange: (open: boolean) => void;
}
// MembersTable gana prop: canImpersonate: boolean (page.tsx: user.isSuperAdmin && !user.impersonatedBy)
```

Notas de implementación: el helper `run()` de `run-action.ts` no encaja (exige schema y devuelve `ActionResult` de admin); las actions de impersonación tienen su propio `try/catch` y mapean `ImpersonationError.reason` a mensajes en español sin filtrar detalles (`not_found` y `denied` pueden compartir un mensaje genérico). Mensaje de denegación por usuario: "No puedes impersonar a este usuario". `denied` se registra por separado de la fila `start`. Cualquier otro `CurrentUser` construido a mano en tests existentes debe ganar `impersonatedBy: null` (el developer ajusta los helpers de test que fallen el type-check, dentro de los archivos de su tarea o reportando).

#### Reuso (Fase 2)

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Lectura del actor Clerk | `auth()` ya usado en `current-user.service.ts`; `actor` en `AuthObject` | reusar, extender `getCurrentUser` |
| Actor token | `clerkClient().actorTokens` (ya se usa `clerkClient()` en `user-sync.service.ts`) | reusar |
| Guard de reglas | `member-guard.ts` + `member-guard.test.ts` | reusar el patrón; crear `impersonation-guard.ts` (reglas distintas) |
| Registro de auditoría | `recordAudit`/`auditedAction` (Fase 1) | extender `recordAudit` (actor real) |
| Revocar sesión | `sessions.revokeSession` de `@clerk/backend` | reusar (verificar nombre exacto en el d.ts al implementar) |
| Diálogo | `components/ui/dialog` + `DeleteMemberDialog`/`MemberFormDialog` como patrón | reusar `Dialog`; crear `impersonate-dialog.tsx` (acción no destructiva, flujo distinto) |
| Botón, iconos | `Button`, `lucide-react` (`UserCheck`/`VenetianMask`) | reusar |
| Copiar al portapapeles | nada en `src/` (buscado `clipboard`) | `navigator.clipboard.writeText` inline en el diálogo; no se crea utilidad (un solo uso) |
| Mensaje de resultado | `ResultBanner` | reusar para errores en el diálogo |

#### Plan de tareas (Fase 2)

##### Grupo 0 (serial; contratos compartidos)
- T-7: `impersonatedBy` en `CurrentUser` y lectura de `auth().actor` — archivos: `src/modules/auth/services/current-user.service.ts`, `src/modules/auth/services/current-user.service.test.ts` (nuevo; mock de `@clerk/nextjs/server`, `@/db`, `user-sync.service`) — tests: sí — cubre: AC-10
- T-8: `isSuperAdmin` en la fila de miembros — archivos: `src/modules/admin/services/member-list.service.ts` (y su test co-ubicado si existe) — tests: ajustar si existe — cubre: AC-15

##### Grupo 1 (paralelo; depende de T-7)
- T-9: Resolución del actor real en auditoría — archivos: `src/modules/audit/services/audit.service.ts`, `src/modules/audit/services/audit.service.test.ts` — tests: sí — cubre: AC-11
- T-10: Guard y servicio de impersonación — archivos: `src/modules/admin/services/impersonation-guard.ts`, `src/modules/admin/services/impersonation-guard.test.ts`, `src/modules/admin/services/impersonation.service.ts`, `src/modules/admin/services/impersonation.service.test.ts` — tests: sí (guard puro; servicio con mocks de `db`, `recordAudit` y `clerkClient`: orden audit-antes-de-token, fail-closed, TTLs 300/1800, url nula, denied) — cubre: AC-8, AC-9, AC-14. Nota: `startImpersonation` usa `recordAudit` con la firma actual; T-9 solo cambia su interior, no la firma (no hay conflicto de orden).

##### Grupo 2 (depende de T-10)
- T-11: Server actions — archivos: `src/modules/admin/actions/impersonation.actions.ts`, `src/modules/admin/actions/impersonation.actions.test.ts` — tests: sí (sin sesión, no super admin, mapeo de `ImpersonationError`, `end` sin impersonación) — cubre: AC-9, AC-14

##### Grupo 3 (depende de T-8, T-11)
- T-12: UI — archivos: `src/modules/admin/components/impersonate-dialog.tsx`, `src/modules/admin/components/members-table.tsx`, `src/app/admin/users/page.tsx` — tests: no (el repo no tiene tests de componentes para esta tabla; el reviewer verifica AC-15 por lectura y `build`) — cubre: AC-15, AC-16

#### Fase 3 (resumen; sin detallar)

Slot `banner` en `DashboardShell` (usado por `src/app/admin/layout.tsx` y `src/app/organizer/layout.tsx`) con `ImpersonationBanner` y "Dejar de impersonar" (invoca `endImpersonationAction`); banner en el header público (`header-account.tsx`/`src/app/layout.tsx`) para clientes impersonados; bloqueo de checkout/pago real si `impersonatedBy != null`; verificación manual del flujo Stripe Connect (`ConnectStatusCard` redirige a Stripe y vuelve a `APP_URL/organizer?connect=return`; `ensureConnectedAccount` usa `contact_email: actor.email`, que con impersonación es el del organizador, lo deseado).

**Fase 3 (referencia original)**: slot `banner` en `DashboardShell` (usado por `src/app/admin/layout.tsx` y `src/app/organizer/layout.tsx`), banner en el header público (`header-account.tsx`/`src/app/layout.tsx`) para clientes impersonados, bloqueo de checkout real, y verificación manual del flujo Stripe Connect (`ConnectStatusCard` redirige a Stripe hosted onboarding y vuelve a `APP_URL/organizer?connect=return`; `ensureConnectedAccount` usa `contact_email: actor.email`, que con impersonación es el del organizador, lo deseado).

## Riesgos

- **Pérdida de la sesión del admin al impersonar** (navegador compartido): ver pregunta 1.
- **Fail-open vs. fail-closed del log**: una caída de BD podría dejar acciones sin registrar (pregunta 3).
- **Acciones con efectos externos** (Stripe: reembolsos, liquidaciones, onboarding) hechas como el organizador se atribuyen a él en Stripe; el log local es la única traza de que las hizo el super admin.
- **Entrada sensible en `input`**: la redacción es por lista de claves; nuevas acciones con secretos requieren revisar el catálogo.
- **Sin tabla de sesión propia**: el fin de la impersonación por expiración no genera evento `impersonation.end`; se deduce de `metadata.expiresAt` del `start`.

## Preguntas abiertas

Prioridad alta (resolver antes de empezar la Fase 2; la Fase 1 puede empezar tras aprobar la spec):

1. **Volver al admin**: terminar la impersonación cierra la sesión y exige re-login del admin. ¿Se acepta? Mitigación propuesta: diálogo con "Abrir aquí" y "Copiar enlace" para ventana privada.
2. **Bloquear checkout/pagos reales** mientras se impersona (AC-13). Propuesta: sí, bloquear. ¿De acuerdo?
3. **Fallo del registro de auditoría**: propuesta fail-open con `console.error` para acciones normales y fail-closed para `impersonation.start`. ¿O fail-closed para todo (si no se puede auditar, no se ejecuta)? Esto último requiere registrar la intención antes de ejecutar.
4. **TTL**: propuesta ticket 5 min y sesión impersonada 30 min (default de Clerk). ¿Otros valores?

Prioridad media:

5. **Visualización del log**: se propone dejarla fuera (consulta por SQL). ¿Se quiere una página de solo lectura `/admin/audit` (super admin, filtros y paginación) como Fase 4?
6. **Alcance del log**: se propone auditar solo mutaciones del super admin real (incluida la actividad mientras impersona). ¿Se quiere auditar también lecturas sensibles o acciones de admins?
7. **`settleEvent` con actor `"system"`** (cron/webhooks) queda sin auditar al no ser acción de super admin. ¿De acuerdo?
8. **Nombre de columnas/acciones**: se usa `dominio.verbo` en inglés; sin retención ni purga. ¿Se necesita política de retención?

Las preguntas 1-8 quedaron **resueltas** por el usuario (ver "Decisiones del usuario" en Fase 2). Nuevas, de Fase 2:

9. **Intentos denegados de no-super-admin**: `recordAudit` solo registra actores super admin (alcance de Fase 1), por lo que un admin/organizer que invoque `startImpersonationAction` directamente no deja fila `impersonation.denied`, solo `console.warn`. ¿Se acepta (supuesto por defecto) o se quiere registrar también esos intentos (excepción para `impersonation.denied`)?
10. **Webhook `user.updated` durante impersonación**: el payload no trae el `actor`. Si Clerk actualiza `last_sign_in_at` del destino al abrir el ticket, el webhook lo reflejará en `lastSignInAt`. No se puede evitar del lado app; supuesto: se acepta y se verifica manualmente en Fase 3. ¿De acuerdo?

La implementación de la Fase 2 no debería empezar hasta que un humano apruebe la spec y se resuelvan las preguntas 9-10 (o se acepten sus supuestos).
