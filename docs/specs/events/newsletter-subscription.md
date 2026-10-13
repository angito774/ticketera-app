# Suscripción real del banner promocional (newsletter)

**Estado**: done
**Aprobado por**: Nelson (2026-10-05, tras resolver las 7 preguntas abiertas)
**Fase**: 1 de 2

## Contexto

`src/modules/events/components/promo-banner.tsx` tiene un formulario (correo requerido + "Suscribirse") que no guarda nada: muestra "Las suscripciones todavía no están disponibles." en un `<p role="status">`. Origen: `docs/specs/shared/accesibilidad-correcciones.md` punto 16 (pendiente "Decidir la suscripción del banner"). Decisión del usuario: implementar la suscripción real, guardando los correos en la base (Drizzle + Neon), y publicar una página de política de privacidad enlazada desde el banner. Trello T-5.

## Alcance

- **Incluye**:
  - Tabla `newsletter_subscribers` (migración Drizzle) con correo único normalizado a minúsculas.
  - Schema zod compartido (cliente y servidor) que recorta, normaliza y valida el correo.
  - Server action `subscribeToNewsletterAction` + service de servidor que inserta de forma idempotente.
  - `PromoBanner` conectado a la acción, con estados enviando / éxito / correo inválido / error de servidor, accesibles y en español.
  - Texto breve de consentimiento bajo el formulario con un `<Link>` real a la política de privacidad.
  - Página pública `/privacidad` con política breve en español (Header y Footer de la landing).
  - Fase 2: actualizar `docs/specs/database/data-model.md` con la entidad nueva.
- **No incluye**: doble opt-in y envío de cualquier correo (ni de bienvenida), envío de campañas, baja/unsubscribe (ni flujo ni promesa de baja), panel admin para ver/exportar suscriptores, rate limit o captcha, asociar el suscriptor con `users`, columna `source`, convertir en enlace el texto "Privacidad" del `footer.tsx` (queda como texto; se puede enlazar en un cambio aparte), páginas de términos y condiciones.

## Riesgos aceptados (decisión del usuario)

- **Sin doble opt-in**: cualquiera puede suscribir el correo de un tercero.
- **Sin rate limit ni captcha**: la acción es pública y permite inserciones masivas de correos arbitrarios.
- **Sin baja en v1**: no hay mecanismo para darse de baja; la política de privacidad lo dice con honestidad.

## Criterios de aceptación

- **AC-1** (tests): `newsletterSubscribeSchema` recibe `{ email }`; recorta espacios, pasa a minúsculas y valida formato (`z.email`) con máximo 254 caracteres. Vacío o inválido produce un mensaje en español por caso ("Ingresa tu correo." / "Ingresa un correo válido."). `" Ana@Mail.COM "` produce `"ana@mail.com"`.
- **AC-2**: existe la tabla `newsletter_subscribers` (`id` uuid PK default aleatorio, `email` text NOT NULL UNIQUE, `created_at` timestamptz NOT NULL default now()) con `CHECK (email = lower(email))`, sin columna `source`, exportada desde `src/db/schema/index.ts` y con migración `drizzle/0002_*.sql` + snapshot + journal generados con `npm run db:generate`.
- **AC-3** (tests): `subscribeToNewsletter(email)` inserta `{ email }` con `onConflictDoNothing` sobre `email`. Un correo nuevo crea una fila; el mismo correo dos veces no crea duplicado ni lanza error. El service no devuelve si la fila ya existía y propaga errores de base.
- **AC-4** (tests): `subscribeToNewsletterAction(raw)` valida con el schema del AC-1 en servidor (no confía en el cliente) y devuelve `{ ok: true }` tanto si el correo es nuevo como si ya existía (misma respuesta: no revela si ya estaba suscrito). Si el schema falla devuelve `{ ok: false, error }` con el primer mensaje. Si la base falla devuelve `{ ok: false, error: "No pudimos completar tu suscripción. Inténtalo de nuevo más tarde." }` sin filtrar detalles internos (el error real solo va a `console.error`). No exige sesión.
- **AC-5**: en `PromoBanner`, al enviar un correo válido se muestra en el `<p role="status">` "¡Listo! Te suscribiste a nuestras novedades." (única variante de éxito), el campo se vacía y el mensaje se anuncia al lector de pantalla.
- **AC-6**: mientras la acción se ejecuta, el botón queda `aria-disabled`, el campo no pierde lo escrito, el texto del botón pasa a "Suscribiendo…" y el estado se anuncia ("Enviando tu suscripción…") vía `role="status"`; no se permite doble envío.
- **AC-7**: un correo inválido o vacío no llama al servidor; muestra el mensaje del schema asociado al campo (`aria-invalid="true"`, `aria-describedby` hacia el mensaje) y devuelve el foco al campo. Los errores usan `role="alert"`; los estados no erróneos usan `role="status"`. Un error de servidor conserva lo escrito y permite reintentar.
- **AC-8** (accesibilidad, punto 16): el campo tiene `<label>` asociado (`sr-only`, no solo `aria-label`/placeholder), el botón sigue siendo "Suscribirse", y la región de estado existe en el DOM antes del primer mensaje (`sr-only` cuando está vacía). Se elimina el mensaje "Las suscripciones todavía no están disponibles."
- **AC-9**: bajo el formulario el banner muestra "Al suscribirte aceptas recibir novedades de eventos por correo. Consulta nuestra política de privacidad." donde "política de privacidad" es un `<Link href="/privacidad">` de `next/link`, con foco visible y distinguible por más que el color (subrayado). El texto no promete ni menciona la posibilidad de darse de baja.
- **AC-10**: `/privacidad` es una ruta pública (no exige sesión ni está en el matcher privado de `src/proxy.ts`), renderiza `Header` y `Footer`, un `<main>` con un único `<h1>` ("Política de privacidad") y `metadata.title` "Política de privacidad · Ticketera", y usa los tokens/estilos existentes (`text-foreground`, `text-muted-foreground`, contenedor `max-w-*` centrado como las demás páginas públicas).
- **AC-11**: el contenido de `/privacidad` es breve, en español, con secciones de encabezado (`h2`) que dicen: qué dato se recoge (solo el correo electrónico; sin otros datos), para qué se usa (enviar novedades de eventos por correo), que no se comparte con terceros, y que **por ahora no hay un mecanismo para darse de baja** (declarado de forma honesta, sin inventar canales de contacto). No afirma retención, plazos ni derechos que el pedido no defina.
- **AC-12**: `npm run lint`, `npm run test` y `npm run build` pasan; la migración queda generada y versionada. Los developers **nunca** ejecutan `npm run db:migrate`/`db:push`: el usuario aplica la migración en Neon.
- **AC-13** (fase 2): `docs/specs/database/data-model.md` documenta `newsletter_subscribers` (columnas, unicidad y `CHECK` de minúsculas, sin FK a `users`), la agrega al diagrama ER/lista de entidades y al listado de archivos de schema (`newsletter.ts`), manteniendo el estilo del documento.

## Contratos

```ts
// src/db/schema/newsletter.ts
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  createdAt: createdAt(),
}, (t) => [check("newsletter_subscribers_email_lower_ck", sql`${t.email} = lower(${t.email})`)]);

// src/modules/events/schemas/newsletter.schema.ts (puro, usable en cliente y servidor)
export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Ingresa tu correo.").max(254, "Ingresa un correo válido.").pipe(z.email("Ingresa un correo válido.")),
});
export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;

// src/modules/events/services/newsletter.service.ts (solo servidor)
export function subscribeToNewsletter(email: string): Promise<void>; // email ya normalizado

// src/modules/events/actions/newsletter.actions.ts ("use server")
export type SubscribeActionResult = { ok: true } | { ok: false; error: string };
export function subscribeToNewsletterAction(raw: unknown): Promise<SubscribeActionResult>;

// src/components/privacy-policy.tsx (presentacional, sin props)
export function PrivacyPolicy(): JSX.Element;
// src/app/privacidad/page.tsx: export const metadata; default export compone Header + <main><PrivacyPolicy /></main> + Footer
```

Mecanismo: **server action**, como `purchaseTicketsAction` y las acciones de organizer/admin (action valida con zod + delega a un service; los route handlers del repo son solo webhooks y sync). Antes de implementar, el developer consulta `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` para la API de esta versión.

La política vive en `src/components/` (no en un módulo de dominio) por ser contenido legal transversal, igual que `header.tsx`/`footer.tsx`; la ruta solo compone, según `docs/SETUP.md` §1.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Validación de correo | `z.email` en `checkout.schema.ts`; zod 4 | reusar zod; schema nuevo y mínimo (no hay uno de solo correo) |
| Patrón action + service + test | `purchase.actions.ts`, `purchase.service.ts`, `src/modules/admin/services/*` | reusar el patrón |
| Columnas/timestamps Drizzle | `src/db/schema/columns.ts` (`createdAt`) | reusar |
| Errores de Postgres | `src/lib/pg-errors.ts` | no hace falta: `onConflictDoNothing` evita el 23505 |
| Cliente DB | `src/db/index.ts` (neon-http, lanza sin `DATABASE_URL`) | reusar; los tests lo mockean con `vi.mock("@/db")` |
| Input y Button | `src/components/ui/input.tsx`, `button.tsx` | reusar (ya en el banner) |
| Campo accesible | `@shadcn/field` en el registro; no hay `label.tsx` en `src/components/ui` | `<label className="sr-only">` nativo (un solo campo, KISS) |
| Estado de envío | `useTransition` en `assign-customer-dialog.tsx` | reusar el patrón |
| Composición de página pública | `src/app/events/page.tsx` (`Header` + `<main className="mx-auto max-w-7xl ...">` + `Footer`, `metadata`); `src/components/header.tsx`, `footer.tsx` | reusar la estructura; página y contenido nuevos |
| Enlace | `next/link` (usado en el repo) | reusar |
| Página de privacidad | nada en `src/app` ni `src/components` | crear `src/components/privacy-policy.tsx` y `src/app/privacidad/page.tsx` |
| Rate limit / captcha | nada en `src/` | fuera de alcance (riesgo aceptado) |

## Plan de tareas

Fase 1: 6 tareas.

### Grupo 0 (serial)
- T-1: Tabla `newsletter_subscribers`, export en el índice del schema y migración generada con `npm run db:generate` (sin aplicarla) — archivos: `src/db/schema/newsletter.ts`, `src/db/schema/index.ts`, `drizzle/0002_<nombre>.sql`, `drizzle/meta/0002_snapshot.json`, `drizzle/meta/_journal.json` — tests: no (schema declarativo) — cubre: AC-2, AC-12

### Grupo 1 (paralelo)
- T-2: Schema zod compartido + tests (normalización, vacío, formato, longitud) — archivos: `src/modules/events/schemas/newsletter.schema.ts`, `src/modules/events/schemas/newsletter.schema.test.ts` — tests: sí — cubre: AC-1
- T-3: Service de suscripción idempotente + tests con `@/db` mockeado (`insert(...).values({ email }).onConflictDoNothing`, propaga errores) — archivos: `src/modules/events/services/newsletter.service.ts`, `src/modules/events/services/newsletter.service.test.ts` — tests: sí — cubre: AC-3
- T-4: Página y contenido de la política de privacidad — archivos: `src/components/privacy-policy.tsx`, `src/app/privacidad/page.tsx` — tests: no (presentacional) — cubre: AC-10, AC-11

### Grupo 2 (paralelo)
- T-5: Server action + tests (válido, ya existente = mismo resultado, inválido, error de base sin filtrar detalles) — archivos: `src/modules/events/actions/newsletter.actions.ts`, `src/modules/events/actions/newsletter.actions.test.ts` — tests: sí — cubre: AC-4
- T-6: Conectar `PromoBanner` (label, estados, validación cliente con el schema de T-2, llamada a la acción de T-5, texto de consentimiento con `<Link href="/privacidad">`) + test de comportamiento (acción mockeada) — archivos: `src/modules/events/components/promo-banner.tsx`, `src/modules/events/components/promo-banner.test.tsx` — tests: sí — cubre: AC-5, AC-6, AC-7, AC-8, AC-9

T-6 depende de T-2 (grupo 1) y consume la firma de T-5 definida en Contratos; si se prefiere dependencia estricta, mover T-6 a un Grupo 3.

## Fases siguientes

### Fase 2 (1 tarea; se ejecuta tras cerrar la fase 1)
- T-7: Actualizar `docs/specs/database/data-model.md` con la entidad `newsletter_subscribers` (sección de entidades, diagrama/lista, enumeración de archivos de `src/db/schema/`) — archivos: `docs/specs/database/data-model.md` — tests: no — cubre: AC-13. Es la excepción explícita a "no modificar data-model.md": la pide el usuario.

Candidatas futuras, fuera de esta spec: baja con token, doble opt-in con correo, rate limit, vista admin de suscriptores, enlazar "Privacidad" del footer.

## Preguntas abiertas

Todas resueltas por el usuario; no hay bloqueantes.

1. Doble opt-in: **resuelta**, no en v1 (riesgo aceptado).
2. Baja/unsubscribe: **resuelta**, sin baja en v1; el texto del banner no la promete y la política declara que aún no está disponible.
3. Rate limit/captcha: **resuelta**, fuera de alcance (riesgo aceptado).
4. Migración: **resuelta**, el usuario aplica `npm run db:migrate` en Neon; los developers solo la generan.
5. Columna `source`: **resuelta**, eliminada (YAGNI).
6. Política de privacidad: **resuelta**, nueva página `/privacidad` enlazada desde el banner (AC-9 a AC-11).
7. `data-model.md`: **resuelta**, tarea final T-7 en la fase 2.
