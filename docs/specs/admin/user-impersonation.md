# Impersonación de usuarios y registro de auditoría del super admin

**Estado**: approved (Fase 1; Fases 2-3 se detallan al cerrar la Fase 1)
**Aprobado por**: usuario — 2026-10-23 (aceptó todas las propuestas de Preguntas abiertas 1-8)
**Fase**: 1 de 3

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

Fases 2-3 (impersonación; se detallarán al cerrar la Fase 1):

- **AC-8** (tests): `assertCanImpersonate({ actor, target, currentActor })` rechaza: actor no super admin (aunque tenga `members:manage`), target = actor, target super admin, sesión ya impersonada (anidado), target inexistente/no sincronizado en DB. Cada rechazo registra `impersonation.denied` con el motivo.
- **AC-9**: `startImpersonationAction(targetUserId)` crea un actor token de Clerk con `expiresInSeconds` corto (300) y `sessionMaxDurationInSeconds` explícito (1800 propuesto), registra `impersonation.start` (fail-closed: si no se puede registrar, no se emite el token) y devuelve la URL del ticket.
- **AC-10**: Durante la sesión impersonada, `getCurrentUser()` devuelve al usuario destino con `impersonatedBy: { id, email, fullName }` (tomado de `auth().actor.sub`); `getCurrentUser` no ejecuta upsert/auto-promoción sobre el destino ni actualiza `lastSignInAt`; toda mutación auditada registra `actor_user_id` = super admin real e `impersonated_user_id` = destino.
- **AC-11**: "Impersonar" aparece en `RowActions` (tabla y tarjetas móviles) solo para super admin, deshabilitado con `title` en filas propias o de super admin; abre un diálogo de confirmación que nombra al usuario y explica que la sesión del navegador será reemplazada, con "Abrir aquí" y "Copiar enlace" (para ventana privada).
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

**Fase 2 (impersonación, ≤6 tareas)**: G0: añadir `impersonatedBy` a `CurrentUser` y extender la resolución del actor en `audit.service.ts`. G1: `impersonation.service.ts` + guard + tests (AC-8); `getCurrentUser` lee `auth().actor` y omite upsert/promoción/`lastSignInAt` para sesiones impersonadas (AC-10). G2: `startImpersonationAction`/`endImpersonationAction` y diálogo + botón en `members-table.tsx` (AC-9, AC-11). Notas técnicas: el ticket reemplaza la sesión del navegador y Clerk no ofrece volver a la sesión original sin re-login; mitigación: "Copiar enlace" para ventana privada/otro perfil. El webhook `user.updated` y `/api/auth/sync` no deben tratar al destino como un login real (actualizar `lastSignInAt`) cuando la sesión es impersonada.

**Fase 3**: slot `banner` en `DashboardShell` (usado por `src/app/admin/layout.tsx` y `src/app/organizer/layout.tsx`), banner en el header público (`header-account.tsx`/`src/app/layout.tsx`) para clientes impersonados, bloqueo de checkout real, y verificación manual del flujo Stripe Connect (`ConnectStatusCard` redirige a Stripe hosted onboarding y vuelve a `APP_URL/organizer?connect=return`; `ensureConnectedAccount` usa `contact_email: actor.email`, que con impersonación es el del organizador, lo deseado).

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

La implementación de la Fase 2 no debería empezar hasta resolver las preguntas 1-4; la Fase 1 solo depende de la 3 (el comportamiento fail-open propuesto es el supuesto por defecto).
