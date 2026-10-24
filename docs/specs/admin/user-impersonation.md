# Impersonación de usuarios y registro de auditoría del super admin

**Estado**: approved (Fase 1: done, commit 22d1899; Fase 2: done, commit a38ddfd; Fase 3: aprobada, Preguntas 11-13 aceptadas como propuestas)
**Aprobado por**: usuario — 2026-10-23 (Fase 1) / 2026-10-24 (Fases 2 y 3)
**Fase**: 3 de 3

> Historial: la Fase 1 fue aprobada por el usuario el 2026-10-23 (aceptó todas las propuestas de Preguntas abiertas 1-8). Al detallar la Fase 2 la spec vuelve a `draft` y requiere nueva aprobación humana antes de que un developer empiece las tareas T-7 en adelante. La Fase 2 fue aprobada el 2026-10-24 (preguntas 9 y 10 aceptadas). Al detallar la Fase 3 la spec vuelve a `draft`: las tareas T-13 en adelante requieren nueva aprobación humana. Las Fases 1 y 2 están implementadas, revisadas (APPROVED) y commiteadas; su contenido no cambia.

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

### Fase 3 (detalle): banner, bloqueo de checkout y verificación del flujo Stripe Connect

Objetivo: que el super admin complete rápido el onboarding de Stripe Connect de organizadores actuando como ellos, con la impersonación siempre visible, sin poder cobrar de verdad y con un final de sesión claro. Esta sección **detalla y supera** el "Fase 3 (resumen)" de arriba (que se conserva como historial). Decisiones del usuario vigentes: terminar exige re-login del admin (revocar la sesión impersonada y redirigir a `/sign-in`); checkout/pago real bloqueado; ticket 300 s / sesión 1800 s; sin `/admin/audit`; sin retención.

#### Hechos verificados en el repo / `node_modules`

- `useAuth()` de `@clerk/nextjs` (tipos en `@clerk/shared` `hooks.d.ts`) expone `actor: ActClaim | null` en el cliente cuando hay sesión, y `useSession().session.expireAt: Date` existe (`session.d.ts`). Por lo tanto el banner puede decidirse **en el cliente, sin DB ni render dinámico**. Comportamiento exacto del claim `act` en el JWT cliente de una sesión creada con actor token: ver verificación manual V-1.
- `src/app/layout.tsx` hoy es estático (solo `ClerkProvider` + `QueryProvider`); páginas como `/events/[id]/checkout` usan `generateStaticParams`. Un server component en el root layout que llame `auth()`/`getCurrentUser()` lee cookies/headers y volvería **dinámico todo el árbol** (ver `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` y `.../02-guides/keeping-pages-static.md`), además de una consulta a DB por cada página para todo visitante con sesión. Descartado.
- El actor token de Clerk (`ActorTokenApi.create`) **no admite `redirect_url`**: tras abrir la URL, Clerk redirige a la Home URL configurada en el Dashboard, no a `/organizer`. El super admin navega a `/organizer` desde el sitio (el header público ya muestra "Mis eventos" para el rol del destino).
- Único punto que crea una sesión de cobro: `purchase.service.ts` → `getStripe().checkout.sessions.create` (llamado solo desde `purchaseTickets`, que solo invoca `purchaseTicketsAction`). No hay PaymentIntents propios; `refund.service.ts` crea reembolsos (no cobros); los webhooks de Stripe no los inicia un usuario. `reserveOrder` (reserva de asientos) corre **antes** de crear la sesión, por eso el bloqueo debe ir antes de `purchaseTickets`, no dentro del `catch` de la sesión.
- Connect: `/organizer` usa `requirePermission("events:manage")` (permisos del destino: organizador); `connect.service.ts` valida `can(actor, "events:manage", organizationId)` con el destino y crea la cuenta con `contactEmail: actor.email` = **correo del organizador (deseado)**; `return_url`/`refresh_url` = `${APP_URL}/organizer?connect=return|refresh`, rutas bajo `proxy.ts` (`/organizer(.*)` privada) que se sirven con la cookie de sesión de Clerk vigente. Si la sesión impersonada sigue viva al volver de Stripe, se conserva; si expiró, `proxy.ts` redirige a sign-in.
- `connect.actions.ts` ya audita `connect.start_onboarding` y `connect.create_account_session` con `auditedAction`; con sesión impersonada el actor registrado es el super admin real (AC-11).
- Webhook de Clerk: `route.ts` → `fromWebhookUser(event.data)` → `upsertUser(fields)` sobrescribe `lastSignInAt` con `last_sign_in_at` del payload para `user.created|updated`. El payload no incluye el `actor`, por lo que no se puede distinguir un login real de uno por ticket. No hay mitigación mínima viable en la app (descartado: ignorar `lastSignInAt` en `user.updated` rompería la columna "Último acceso" de `/admin/users` para logins reales). **Riesgo aceptado y documentado** (Pregunta 10 ya aceptada en Fase 2; se suma verificación V-6). Rastro alterno: `impersonation.start` con su `created_at` y `metadata.expiresAt` permite atribuir un `lastSignInAt` que cae en esa ventana.

#### Alcance Fase 3

- **Incluye**: `ImpersonationBanner` único (cliente) montado en el root layout; offsets CSS para que `DashboardShell`, `Header` y `PurchaseHeader` convivan con él; bloqueo server-side del checkout con auditoría del intento y UX en `checkout-view`; limpieza de `safeRecord`; tests del servicio de Connect; checklist de verificación manual de Stripe Connect.
- **No incluye**: slot `banner?: ReactNode` en `DashboardShell` (innecesario: un único banner global evita duplicarlo en cada layout; `admin/layout.tsx` y `organizer/layout.tsx` no se tocan); consulta de DB para el banner; página `/admin/audit`; redirección a `/organizer` tras abrir el ticket (Clerk no lo permite); bloquear reembolsos/liquidaciones del panel; "volver al admin" sin re-login.

#### Decisiones

- **D-1 Punto único del banner**: componente cliente en `src/components/impersonation-banner.tsx`, hijo de `ClerkProvider` en `src/app/layout.tsx` (antes de `children`, dentro de `QueryProvider`). Decide con `useAuth().actor` (sin DB), toma el nombre y correo del destino de `useUser()` (el destino es el usuario de la sesión), sin actor devuelve `null`. Costo: cero render dinámico y cero consultas; el banner aparece tras la hidratación de Clerk (parpadeo aceptable, su ausencia nunca habilita nada: la autorización es de servidor). Es **solo UX**; el bloqueo y la auditoría se hacen en servidor con `getCurrentUser().impersonatedBy`.
- **D-2 Layout/offsets**: el banner es `sticky top-0 z-[60]` en el flujo del `<body>` (flex column). Mide su altura con `ResizeObserver` y publica `--impersonation-banner-h` (px) en `document.documentElement`; al desmontar la elimina. `aside` fijo y headers sticky pasan de `top-0`/`inset-y-0` a `top-[var(--impersonation-banner-h,0px)]` (y `bottom-0` en el `aside`), de modo que sin impersonación el valor es `0px` y nada cambia. El `dialog` del menú móvil es top layer y no necesita offset.
- **D-3 Terminar**: "Dejar de impersonar" llama `endImpersonationAction()`; si `ok`, `useClerk().signOut({ redirectUrl: "/sign-in" })` y, si `signOut` falla (la sesión ya fue revocada en servidor), `window.location.assign("/sign-in")`. Si `ok: false`, muestra el error en el banner (`role="alert"`) y no redirige.
- **D-4 Aviso de expiración**: el banner muestra la hora de expiración de la sesión (`session.expireAt`) y, a < 5 min, un aviso "Tu sesión de impersonación está por expirar" (reevaluado cada 30 s). Lógica pura en `src/lib/session-expiry.ts`. Si Stripe hosted onboarding tarda más de 30 min, la sesión expira: al volver a `/organizer?connect=return` el usuario cae en sign-in; la cuenta Connect igual se actualiza por el webhook `account.*`, así que no se pierde progreso en Stripe (V-5).
- **D-5 Pagos permitidos/bloqueados impersonando**: **bloqueado** `purchaseTicketsAction` (cobro real). **Permitidos**: `startOnboardingAction`, `createAccountSessionAction` (el objetivo del feature) y las acciones de `payments-admin.actions.ts` (liquidación, reintentos, reembolsos): solo funcionan si los permisos del destino las permiten (las reglas se evalúan sobre el destino, ver Fase 2) y todas ya quedan auditadas con el super admin real como actor. Reembolsar/liquidar no cobra al comprador, por eso no se bloquean.
- **D-6 Bloqueo de checkout**: guard puro `checkoutBlockReason(user)` → `"impersonating" | null`; `purchaseTicketsAction` lo evalúa tras validar el schema y **antes** de `purchaseTickets` (nada se reserva ni se crea en Stripe). Si bloquea, registra `checkout.blocked_impersonation` (`result: "denied"`, `errorCode: "impersonation"`, `targetType: "event"`, `targetId: eventSlug`, fail-open con `safeRecord`) y devuelve `{ ok: false, error: IMPERSONATION_CHECKOUT_MESSAGE }`. `purchaseTickets` queda intacto (la action es su único llamador).
- **D-7 `safeRecord` único**: se exporta desde `audit.service.ts` y `impersonation.service.ts` deja de tener su copia.
- **D-8 Cerrar la pestaña**: no hay evento al cerrar el navegador. La sesión expira sola (≤ 1800 s; el ticket no usado, a los 300 s). **No se registra `impersonation.end`**; el fin se deduce de `impersonation.start.metadata` (`expiresAt` del ticket + `sessionMaxDurationInSeconds`). Si el admin vuelve al sitio antes, ve el banner y puede terminar de forma explícita. Aceptado (ya listado en Riesgos).
- **D-9 Correcciones de contrato de Fase 2** (la implementación ya las cumple; se documentan): `MembersTable` recibe `{ rows, organizations, canImpersonate: boolean, currentUserId: string }` (`currentUserId` = `user.id` del visor, para marcar `isSelf` y deshabilitar el botón en la fila propia). El motivo `nested` del guard es **inalcanzable en la práctica**: con sesión impersonada `actor` es el destino, que nunca es super admin (se rechaza antes por `target_super_admin`), así que `not_super_admin` (orden previo) lo captura; se conserva como defensa en profundidad y no requiere más cambios ni tests.

#### Criterios de aceptación (Fase 3)

Banner (AC-12 refinado):

- **AC-17** (tests): `ImpersonationBanner` no renderiza nada si `useAuth().actor` es `null`/ausente o la sesión no está cargada; con actor renderiza un elemento `role="status"` ámbar con "Estás actuando como {nombre} ({correo})" (nombre = `user.fullName`, con respaldo al correo) y un botón "Dejar de impersonar".
- **AC-18** (tests): pulsar el botón llama una sola vez a `endImpersonationAction` (deshabilitado y con "Cerrando…" mientras corre); con `{ ok: true }` ejecuta `signOut({ redirectUrl: "/sign-in" })` (y `window.location.assign("/sign-in")` si `signOut` rechaza); con `{ ok: false, error }` muestra el error con `role="alert"` y no redirige.
- **AC-19**: Un único banner aparece en todas las rutas (sitio público, `/admin`, `/organizer`, checkout) sin duplicarse; `DashboardShell` no gana props. Con banner visible, el `aside` y los headers sticky de `DashboardShell`, `Header` y `PurchaseHeader` quedan debajo de él (offset `--impersonation-banner-h`); sin impersonación el layout es idéntico al actual (variable no definida => `0px`). El root layout sigue sin leer cookies/headers (no pasa a dinámico): `npm run build` mantiene `/events/[id]/checkout` como SSG.
- **AC-20** (tests): `getSessionExpiryInfo(expireAt, now)` devuelve `{ label, expiringSoon }`: `expiringSoon` verdadero a < 5 min o ya vencida; `label` "HH:MM" local; tolera `undefined`/`null`. El banner muestra la hora y el aviso de expiración (D-4).

Bloqueo de checkout (AC-13 refinado):

- **AC-21** (tests): `purchaseTicketsAction` con `impersonatedBy != null` devuelve `{ ok: false, error: IMPERSONATION_CHECKOUT_MESSAGE }` (español), **no** llama a `purchaseTickets` y registra una vez `checkout.blocked_impersonation` con `result: "denied"` y el actor real (vía `safeRecord`, que ya resuelve `impersonatedBy`); si el registro falla, igualmente devuelve el bloqueo. Sin impersonación el comportamiento es idéntico al actual (el test existente de la ruta feliz/errores sigue pasando o se cubre en el test nuevo). Un `eventSlug` inválido sigue devolviendo el error de validación existente.
- **AC-22** (tests): `checkoutBlockReason(user)` devuelve `"impersonating"` solo si `user.impersonatedBy` existe, `null` si no hay impersonación o `user` es `null`.
- **AC-23**: `checkout-view.tsx` con `useAuth().actor` presente deshabilita los dos botones de pago y muestra un aviso (`role="status"`) con `IMPERSONATION_CHECKOUT_MESSAGE`; sin actor no cambia nada. El servidor sigue siendo la barrera real.

Connect de punta a punta (AC-13 refinado):

- **AC-24** (tests): `connect.service.test.ts` (mocks de `db`, `getStripe`, `APP_URL`) verifica: `ensureConnectedAccount` crea la cuenta con `contactEmail` igual al `email` del `CurrentUser` recibido (el organizador, también cuando trae `impersonatedBy`) y con `idempotencyKey` `connect-account-{orgId}`; usa la cuenta existente si ya hay `stripeAccountId`; `createOnboardingLink` pide `refresh_url`/`return_url` `${APP_URL}/organizer?connect=refresh|return`; lanza si `APP_URL` falta; un actor sin `events:manage` sobre esa organización recibe `AdminError("Organización no encontrada")` sin llamar a Stripe.
- **AC-25** (verificación manual, la hace el humano en Stripe test mode; checklist abajo): el flujo completo funciona y deja filas de auditoría correctas.
- **AC-26** (limpieza): `safeRecord` se exporta de `audit.service.ts` (test: no lanza si `recordAudit` falla y hace `console.error`); `impersonation.service.ts` lo importa y no define copia; sus tests existentes siguen pasando; `npm run lint`, `npm run test`, `npm run build` pasan.

#### Checklist de verificación manual (AC-25; Stripe test mode, instancia Clerk de desarrollo o producción de prueba)

- V-1: Como super admin, impersona a un organizador desde `/admin/users` ("Abrir aquí"). Tras aterrizar en la Home URL de Clerk aparece el banner ámbar con el nombre y correo del organizador (confirma que `useAuth().actor` llega al cliente). Si el banner **no** aparece, parar: ver Pregunta 11 (alternativa servidor).
- V-2: El banner aparece (y una sola vez) en `/`, `/events`, `/my-tickets`, `/organizer`, `/admin` (si el destino tiene acceso) y en el checkout; en móvil el menú del panel y el header sticky no quedan tapados.
- V-3: En `/organizer`, la tarjeta Connect arranca el onboarding (`startOnboardingAction`): la cuenta se crea con el correo del organizador (revisar en el Dashboard de Stripe) y redirige a Stripe hosted onboarding.
- V-4: Completar el onboarding en Stripe test mode y volver a `/organizer?connect=return`: se sigue viendo el banner (sesión conservada) y el estado Connect pasa a activo (por webhook). Probar también `createAccountSessionAction` (onboarding embebido).
- V-5: Dejar vencer la sesión (o esperar 30 min) y volver desde Stripe: se redirige a sign-in sin error 500; el aviso de expiración apareció a < 5 min; el estado Connect se actualiza por webhook igualmente.
- V-6: En la BD, `admin_audit_log` tiene `impersonation.start` y `connect.*` con `actor_user_id` = super admin y `impersonated_user_id` = organizador; comprobar si `users.last_sign_in_at` del organizador cambió por el ticket (riesgo aceptado, Pregunta 10).
- V-7: Intentar pagar en el checkout impersonando: botón deshabilitado con aviso; forzar la action (p. ej. DevTools) devuelve el mensaje y deja `checkout.blocked_impersonation` con `result = 'denied'`; no se crean pedidos ni sesiones de Stripe.
- V-8: "Dejar de impersonar": registra `impersonation.end`, revoca la sesión y redirige a `/sign-in`; confirmar que `/sign-in` no reenvía al panel por una sesión revocada residual y que el admin puede volver a entrar.
- V-9: Cerrar la pestaña sin terminar: tras ≤ 30 min la sesión expira y no hay `impersonation.end` (esperado, D-8).

#### Contratos (Fase 3)

```ts
// src/lib/session-expiry.ts  (puro)
export const EXPIRY_WARNING_MS = 5 * 60_000;
export interface SessionExpiryInfo { label: string | null; expiringSoon: boolean } // label "HH:MM" local; null si no hay fecha
export function getSessionExpiryInfo(expireAt: Date | null | undefined, now?: Date): SessionExpiryInfo;

// src/components/impersonation-banner.tsx  ("use client"; sin props)
export function ImpersonationBanner(): JSX.Element | null;
// Hooks: useAuth() { isLoaded, actor }, useUser() { user }, useSession() { session?.expireAt }, useClerk() { signOut }.
// Publica --impersonation-banner-h (px) en document.documentElement mientras está montado/visible.

// src/modules/audit/services/audit.service.ts
export function safeRecord(user: CurrentUser, entry: AuditEntry): Promise<void>; // fail-open: console.error si recordAudit lanza

// src/modules/checkout/services/checkout-guard.ts  (puro, sin imports de servidor)
export const IMPERSONATION_CHECKOUT_MESSAGE =
  "No puedes comprar entradas mientras actúas como otro usuario. Termina la impersonación para continuar.";
export type CheckoutBlockReason = "impersonating";
export function checkoutBlockReason(user: CurrentUser | null): CheckoutBlockReason | null;

// src/modules/checkout/actions/purchase.actions.ts
// Sin cambio de tipo PurchaseActionResult. Tras parsear el schema:
//   if (checkoutBlockReason(actor)) {
//     await safeRecord(actor!, { action: "checkout.blocked_impersonation", targetType: "event",
//       targetId: parsed.data.eventSlug, result: "denied", errorCode: "impersonation",
//       metadata: { reason: "impersonating" } });
//     return { ok: false, error: IMPERSONATION_CHECKOUT_MESSAGE };
//   }
```

Catálogo de auditoría: se suma `checkout.blocked_impersonation` (result `denied`) a la tabla de acciones.

#### Reuso (Fase 3)

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Detectar impersonación en el cliente | `useAuth().actor`, `useUser`, `useSession().expireAt` de `@clerk/nextjs` | reusar (sin DB, sin render dinámico) |
| Terminar impersonación | `endImpersonationAction` (Fase 2) | reusar |
| Banner / estilo ámbar | `ResultBanner`, `StatusLabel` (ámbar), shadcn `alert` (no instalado) | crear `impersonation-banner.tsx` con las clases ámbar existentes; no se agrega `alert` (YAGNI: un solo uso, necesita altura medida y sticky) |
| Slot en `DashboardShell` | `dashboard-shell.tsx` | **no** se agrega (banner global único); solo se ajustan offsets |
| Registro fail-open | `safeRecord` interno en `audit.service.ts` y copia en `impersonation.service.ts` | generalizar: exportar uno y borrar la copia |
| Guard de pagos | nada (`grep` de `impersonatedBy` en `checkout/` y `payments/`: sin resultados) | crear `checkout-guard.ts` |
| Auditoría del intento | `recordAudit`/`safeRecord` | reusar |
| Tests de Connect | `connect-account.adapter.test.ts`, `connect-status.mapping.test.ts` (sin test de `connect.service`) | crear `connect.service.test.ts` |
| Mock de Clerk en tests de componentes | `footer.test.tsx` (RTL + Vitest ya configurados) | reusar el patrón |

#### Plan de tareas (Fase 3)

##### Grupo 0 (serial; archivos compartidos/globales)
- T-13: Exportar un único `safeRecord` — archivos: `src/modules/audit/services/audit.service.ts`, `src/modules/audit/services/audit.service.test.ts`, `src/modules/admin/services/impersonation.service.ts`, `src/modules/admin/services/impersonation.service.test.ts` (ajustar el mock de `audit.service` para incluir `safeRecord`) — tests: sí — cubre: AC-26
- T-14: Helper de expiración y componente del banner — archivos: `src/lib/session-expiry.ts`, `src/lib/session-expiry.test.ts`, `src/components/impersonation-banner.tsx`, `src/components/impersonation-banner.test.tsx` (mock de `@clerk/nextjs` y de `endImpersonationAction`) — tests: sí — cubre: AC-17, AC-18, AC-20
- T-15: Montaje global y offsets — archivos: `src/app/layout.tsx` (monta `<ImpersonationBanner />` dentro de `QueryProvider`, antes de `children`), `src/components/dashboard/dashboard-shell.tsx`, `src/components/header.tsx`, `src/components/purchase-header.tsx` (cambian `top-0`/`inset-y-0` por `top-[var(--impersonation-banner-h,0px)]`) — tests: no (CSS/composición; el reviewer verifica por lectura y `npm run build` que el checkout sigue SSG; `footer.test.tsx` y otros no se afectan) — cubre: AC-19

##### Grupo 1 (paralelo; disjuntos; dependen de T-13)
- T-16: Bloqueo server-side del checkout — archivos: `src/modules/checkout/services/checkout-guard.ts`, `src/modules/checkout/services/checkout-guard.test.ts`, `src/modules/checkout/actions/purchase.actions.ts`, `src/modules/checkout/actions/purchase.actions.test.ts` (mock de `getCurrentUser`, `purchaseTickets`, `safeRecord`, `revalidatePath`) — tests: sí — cubre: AC-21, AC-22
- T-17: Tests del servicio de Connect — archivos: `src/modules/payments/services/connect.service.test.ts` (sin cambios de código de producción; si el test revela un bug, el developer lo reporta como `SPEC_ISSUE`) — tests: sí — cubre: AC-24

##### Grupo 2 (depende de T-16)
- T-18: UX del checkout impersonando — archivos: `src/modules/checkout/components/checkout-view.tsx` (importa `IMPERSONATION_CHECKOUT_MESSAGE` de `checkout-guard.ts`; `useAuth().actor` deshabilita `canPay` y muestra aviso `role="status"`) — tests: no (el repo no testea esta vista; verificado por lectura y V-7) — cubre: AC-23

AC-25 se cubre con la checklist V-1..V-9 (humano). Fase 3 es la última: no hay fases siguientes.

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

### Riesgos y preguntas de la Fase 3

Riesgos:

- **Banner dependiente del cliente**: si Clerk no expone `act` en el JWT del cliente, el banner no aparecería (la autorización y el bloqueo de checkout siguen siendo de servidor). Se verifica primero (V-1).
- **Parpadeo**: el banner aparece tras la hidratación de Clerk y desplaza el contenido (altura medida con `ResizeObserver`).
- **Aterrizaje tras el ticket**: Clerk redirige a la Home URL, no a `/organizer`; el admin navega manualmente.
- **Instancia de desarrollo de Clerk**: el flujo de ticket y cookies de sesión puede comportarse distinto que en producción (dominio/cookies de terceros); probar en ambos si es posible.
- **Expiración a mitad del onboarding en Stripe**: el usuario cae en sign-in al volver; el estado Connect se actualiza por webhook.
- **`lastSignInAt` del destino** puede reflejar el login por ticket vía webhook (aceptado, V-6).
- **`useSyncUserOnSignIn`** (`header-account.tsx`) llama `/api/auth/sync` con la sesión impersonada; es inocuo porque `getCurrentUser` no sincroniza en ese caso (AC-10).

Preguntas abiertas (Fase 3):

11. **Banner por cliente vs servidor**: se propone `useAuth().actor` (cero costo, sin dinamizar el layout). Si V-1 muestra que `actor` no llega al cliente, la alternativa es un `GET /api/auth/impersonation` mínimo (sin DB, solo `auth().actor`) consultado por el banner, sin tocar el layout. ¿De acuerdo con la propuesta y el plan B?
12. **Pagos del panel impersonando**: se proponen permitidos (reembolsos/liquidaciones) por estar auditados y limitados a los permisos del destino. ¿O se prefiere bloquearlos también durante la impersonación?
13. **`lastSignInAt`**: ¿se acepta el riesgo documentado (sin mitigación en el webhook)?

La implementación de la Fase 3 no debería empezar hasta que un humano apruebe la spec y se resuelvan (o acepten) las preguntas 11-13.
