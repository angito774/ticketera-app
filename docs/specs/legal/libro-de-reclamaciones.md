# Libro de Reclamaciones virtual

**Estado**: draft
**Aprobado por**: —
**Fase**: 1 de 2

## Contexto

Se pide un Libro de Reclamaciones virtual en la ruta pública `/libro-de-reclamaciones` (sin login), con un acceso "Libro de Reclamaciones" (icono de libro abierto) en la franja inferior del footer, como en la referencia (https://ticketera.mentec.dev/libro-de-reclamaciones). El reclamo se guarda en una tabla nueva de Postgres (Neon + Drizzle) con un código único, estado inicial "recibido" y fecha límite de respuesta a 15 días hábiles. Datos del proveedor indicados por el usuario: **TicketYa.com**, RUC **20513249510**, domicilio **Calle las Acasias Nro 1850**, correo **atencion@inkasign.com**.

**Fuentes normativas**: lo que se sabe del Reglamento proviene de **fuentes secundarias** (INDECOPI, La Ley, RPP), no del texto oficial. Todo requisito legal de esta spec (obligatoriedad, plazo de 15 días hábiles, contenido de la hoja, constancia/copia al consumidor, aviso con el formato del Anexo III, plazo de conservación) está marcado como **"verificar contra el Reglamento del Libro de Reclamaciones vigente"** antes de publicar. Esta spec no es asesoría legal.

## Verificación del producto (base de las decisiones)

Revisado en el código el 2026-10-07.

| Tema | Hallazgo | Consecuencia |
|---|---|---|
| Correo | No hay dependencia ni servicio de envío (`package.json` sin `resend`/`nodemailer`; `notifications` no se escribe). | **No se puede enviar la copia por correo.** Alternativa: pantalla de constancia con código y datos, imprimible / "guardar como PDF" desde el navegador. Se dice con honestidad en la UI que no se envía correo. |
| Newsletter (patrón a reutilizar) | Vive en `src/modules/events/` (no hay módulo `newsletter`): `schemas/newsletter.schema.ts`, `services/newsletter.service.ts`, `actions/newsletter.actions.ts` (`"use server"`, `safeParse` en servidor, resultado `{ok}`/`{ok:false,error}`, `console.error` + mensaje genérico) y tests co-ubicados con `@/db` mockeado vía `vi.hoisted` + `vi.mock("@/db")`. | Mismo patrón: action valida con zod, delega a un service, no filtra errores internos. |
| Tabla / migraciones | `src/db/schema/*.ts` (uuid `defaultRandom()`, `createdAt()`/`timestamps()` de `columns.ts`, `casing: "snake_case"` en `src/db/index.ts` y `drizzle.config.ts`, export desde `schema/index.ts`). Migraciones `drizzle/0000..0002` (+`meta/`). Flujo: `npm run db:generate` y luego `db:migrate`. | La siguiente migración será `0003_*`. |
| Rutas públicas | `src/proxy.ts`: solo `/admin`, `/organizer`, `/events/:id/checkout`, `/events/:id/confirmation`, `/my-tickets` exigen sesión. | `/libro-de-reclamaciones` ya es pública; **no se toca `proxy.ts`**. |
| Panel `/admin` y permisos | `src/app/admin/layout.tsx` exige `requirePermission("members:manage")`. En `permissions.ts`, `can()` solo da permisos **no asignables** (`organizations:manage`, `roles:manage`, `events:feature`) al super admin. `dashboard-nav.ts` arma la navegación. | La consulta de reclamos (datos personales) en `/admin` es **fase 2** y, si se hace, solo para super admin. No hay panel ni estado de atención hoy. |
| Anti-abuso | No hay rate limit, captcha ni Upstash/Redis en el repo (el newsletter lo aceptó como riesgo). `src/lib/pg-errors.ts` solo traduce errores de Postgres. | Honeypot + tope por correo consultando la propia base. Sin servicios externos. |
| Reuso de formularios | `src/components/form-field.tsx` (`FormField`, `fieldA11yProps`, `FieldError`, `RequiredMark`, `FIELD_INPUT_CLASSES` con `h-12`). `checkout.schema.ts` exporta `DOCUMENT_TYPES` y `DOCUMENT_TYPE_LABELS` (DNI/CE/Pasaporte), y tiene `DOCUMENT_RULES` **sin exportar**. `payment-method-field.tsx` usa radios nativos con apariencia de tarjeta. `checkout-form.tsx` usa `Select` de `src/components/ui/select.tsx`. | Reusar todo esto; exportar `DOCUMENT_RULES`. |
| Componentes UI presentes | `src/components/ui/`: card, badge, input, separator, select, table, checkbox, carousel, popover, calendar, button, date-picker, dialog, tabs. **Faltan `textarea` y `radio-group`** (no hay `label.tsx`). El registro de shadcn tiene `@shadcn/textarea` y `@shadcn/radio-group`. | Agregar `textarea` de shadcn. Para tipo reclamo/queja y producto/servicio se reusa el patrón de radios nativos de `payment-method-field.tsx` (accesible, sin dependencia nueva): no se instala `radio-group` (YAGNI; ver Q-9). |
| Fechas | `src/lib/format.ts`: `formatDate(iso)` en zona `America/Lima`. `date-fns` está instalado pero no se usa en `src/`. Los eventos usan ISO con offset de Lima. | Fecha límite como **fecha de calendario de Lima** (`date`, string `YYYY-MM-DD`); al formatear, pasar `YYYY-MM-DDT12:00:00-05:00` a `formatDate` para no correr de día. |
| Home y footer | `src/app/page.tsx` renderiza `Footer`; el footer ya está en la mayoría de páginas públicas. `footer.tsx` hoy: `FOOTER_COLUMNS` + franja inferior con el copyright (`<p>` bajo un `Separator`). El test `footer.test.tsx` cuenta enlaces. | El acceso va en la franja inferior de `footer.tsx` (ver Dependencias). |
| Proveedor | Los datos del usuario nombran al proveedor "TicketYa.com"; el sitio se llama **Ticketera** (marca de TicketYa.com, confirmado) y el correo es de otro dominio (`inkasign.com`). | Se usan tal cual como configuración (`CLAIMS_PROVIDER`); ver Decisiones resueltas (Q-1). |

## Alcance

- **Incluye**:
  - Página pública `/libro-de-reclamaciones` (shell estático + formulario cliente) con: identificación del proveedor, formulario de la hoja de reclamación y aviso de plazo de respuesta.
  - Hoja de reclamación: consumidor (nombre, tipo y número de documento, domicilio, teléfono, correo; datos del padre/madre/tutor si es menor), bien contratado (producto o servicio, descripción, monto reclamado opcional, referencia opcional de orden), tipo (reclamo o queja), detalle y pedido del consumidor, aceptación de la política de privacidad.
  - Tabla `claims` con migración **solo generada**, código correlativo (`LR-AAAA-NNNNNN`), estado inicial `received`, fecha límite = 15 días hábiles (sábado y domingo excluidos) desde el registro, en hora de Lima.
  - Server action + service + schema zod compartido (cliente y servidor).
  - Pantalla de constancia tras enviar: código, fecha de registro, fecha límite, datos del reclamo, datos del proveedor, botón "Imprimir o guardar como PDF" y aviso explícito de que **no se envía correo**.
  - Anti-abuso básico: honeypot y tope de reclamos por correo en 24 h (consulta a la base).
  - Acceso "Libro de Reclamaciones" (icono `BookOpen` de lucide) en la franja inferior del footer, enlazando a `/libro-de-reclamaciones`.
  - Consulta interna **hoy**: directamente en la base (Neon SQL editor / `npm run db:studio`). Ver Fase 2.
- **No incluye**: envío de correo (copia o notificaciones); panel `/admin` para ver/responder reclamos y cambio de estado (Fase 2); respuesta del proveedor dentro del sistema; consulta pública del reclamo por código (evita exponer datos personales); feriados (Q-3); captcha/rate limit por IP o servicios externos; cuentas de usuario o vínculo con `users`/`orders` (la referencia de orden es texto libre); adjuntos; cambios en `proxy.ts` o `layout.tsx`; reescribir las páginas legales (son de `legal-pages.md`); notificación a INDECOPI ni integración con su sistema.

## Dependencias y orden con `docs/specs/legal/legal-pages.md`

Ambas specs editan `src/components/footer.tsx` y `src/components/footer.test.tsx`. Regla: **`footer.tsx` se toca en una sola tarea por spec, la última de cada una, y las dos specs nunca modifican el footer en paralelo.**

- Orden **decidido (Q-10)**: primero `legal-pages` (su T-6 pasa los enlaces de "Legal" a 4 y deja `footer.test.tsx` esperando 4 enlaces); luego esta spec (T-6, última), que añade el acceso al libro en la franja inferior y actualiza el conteo del test a 5. Si por alguna razón esta spec se implementa antes, su T-6 deja el conteo en 2 y `legal-pages` T-6 lo lleva a 5; en ambos casos el developer **lee el estado vigente del archivo y del test** antes de editar y el reviewer verifica el conteo final.
- Efecto en `legal-pages`: su contenido por defecto dice "no disponemos de un Libro de Reclamaciones" (`complaintsBookUrl` indefinido). Al publicar esta feature eso deja de ser verdadero: al implementar esta spec se debe fijar `complaintsBookUrl = "/libro-de-reclamaciones"` y `contactEmail`, `legalName`, `ruc`, `address` en `LEGAL_CONFIG` de `legal-pages`. Para evitar duplicar los datos del proveedor (DRY), **la fuente única es `CLAIMS_PROVIDER`** (esta spec) y `LEGAL_CONFIG` debe importarlos. Eso es un cambio de `legal-pages` (se marca como `SPEC_ISSUE`/tarea de seguimiento, no se hace aquí; tocaría una spec en `draft` de otro flujo).
- Datos que se guardan (para que la política de privacidad de `legal-pages` los mencione): ver "Datos personales" más abajo. Hasta que esa política los incluya, publicar el libro dejaría la política incompleta (riesgo en Riesgos).

## Criterios de aceptación

- **AC-1** (tabla): existe la tabla `claims` según el esquema de Contratos (exportada desde `src/db/schema/index.ts`), con migración `drizzle/0003_*.sql` + snapshot + journal generados con `npm run db:generate`. La tarea **no ejecuta `db:migrate` ni `db:push`** (ver "Migración": acción de alto impacto). Incluye el `CHECK` que exige datos del apoderado si `is_minor` y el `CHECK` de longitud de textos.
- **AC-2** (tests, schema zod): `claimSubmitSchema` valida y normaliza (trim; correo en minúsculas): tipo `claim|complaint`; nombre completo (mín. 3); `documentType` en `DOCUMENT_TYPES` y `documentNumber` según `DOCUMENT_RULES` de `checkout.schema.ts` (DNI 8 dígitos, CE 9, pasaporte 6-12 alfanum.); domicilio (mín. 5, máx. 200); teléfono (7 a 15 dígitos, admite `+` y espacios que se limpian); correo (`z.email`, máx. 254); `itemType` `product|service`; descripción del bien (mín. 3, máx. 300); `claimedAmount` opcional, número >= 0 con hasta 2 decimales; `orderReference` opcional (máx. 100); `detail` (mín. 10, máx. 2000); `consumerRequest` (mín. 10, máx. 1000); `acceptedPrivacy` debe ser `true`; si `isMinor` es `true`, `guardianFullName`, `guardianDocumentType` y `guardianDocumentNumber` son obligatorios y válidos; si es `false`, se ignoran. Un mensaje en español por caso, sin romper los demás errores (se informan todos a la vez, como `checkout.schema.ts`).
- **AC-3** (tests, util): `addBusinessDays(isoDate, n)` (en `src/lib/business-days.ts`) recibe una fecha de calendario `YYYY-MM-DD` y devuelve otra, excluyendo sábado y domingo, sin depender de la zona horaria del proceso (usa `Date.UTC`/`getUTCDay`). La fecha de inicio no cuenta; si cae en fin de semana, el día 1 es el lunes siguiente. Casos: `2026-10-05` (lunes) + 15 = `2026-10-26`; `2026-10-09` (viernes) + 1 = `2026-10-12`; `2026-10-10` (sábado) + 1 = `2026-10-12`; `n = 0` devuelve la misma fecha. `toLimaDate(now: Date)` devuelve la fecha `YYYY-MM-DD` en `America/Lima` (un instante a las 03:00 UTC del sábado es aún viernes en Lima).
- **AC-4** (tests, service): `createClaim(input, now?)` en `claims.service.ts` calcula la fecha de registro en Lima y `dueDate = addBusinessDays(registro, CLAIM_RESPONSE_BUSINESS_DAYS)` (constante = 15, un solo lugar), convierte el monto a centavos enteros (`Math.round(amount * 100)`; sin monto = `null`), inserta una fila con `status` por defecto `received` y devuelve un `ClaimReceipt` con el código `LR-<año de Lima>-<número a 6 dígitos>` (el número viene de la columna identity vía `returning`). Propaga errores de base. `formatClaimCode(number, year)` es pura y está testeada (`1` -> `LR-2026-000001`).
- **AC-5** (tests, anti-abuso en service): `countRecentClaimsByEmail(email, now?)` cuenta reclamos de ese correo de las últimas 24 h; la action rechaza (sin insertar) si el conteo ya es >= `MAX_CLAIMS_PER_EMAIL_PER_DAY` (= 3, constante; Q-6) con el mensaje "Ya registraste varios reclamos hoy con este correo. Inténtalo de nuevo mañana." Es una barrera simple, no un rate limit real (no protege contra variación de correos; Riesgos).
- **AC-6** (tests, action): `submitClaimAction(raw)` (`"use server"`): (a) si el honeypot `website` viene con contenido, devuelve `{ ok: false, error: <mensaje genérico de servidor> }` sin llamar al service; (b) valida con `claimSubmitSchema` en servidor y, si falla, devuelve `{ ok: false, error, fieldErrors }` con el primer mensaje y el mapa campo -> mensaje; (c) aplica el tope de AC-5; (d) en éxito devuelve `{ ok: true, receipt }`; (e) si la base falla devuelve el mensaje genérico "No pudimos registrar tu reclamo. Inténtalo de nuevo más tarde." sin filtrar detalles (el error real solo va a `console.error`). No exige sesión. El mensaje de éxito no depende de que el correo exista en otra tabla.
- **AC-7** (tests, formulario): `ClaimForm` (cliente) renderiza todos los campos de la hoja, cada uno con `<label>` visible asociado (`FormField`); los obligatorios llevan `RequiredMark` y `aria-required`; con datos inválidos **no llama a la action**, muestra los errores del schema asociados al campo (`aria-invalid`, `aria-describedby` al `FieldError`) y mueve el foco al primer campo inválido; los errores de campo que devuelve la action también se asocian a su campo. El bloque de apoderado solo aparece (y solo se valida) cuando se marca "Soy menor de edad". Mientras se envía, el botón queda `aria-disabled` con texto "Enviando…", se anuncia vía `role="status"` y no permite doble envío; un error de servidor (`role="alert"`) conserva lo escrito y permite reintentar.
- **AC-8** (accesibilidad): campos con altura >= 44 px (usar `FIELD_INPUT_CLASSES`, `h-12`), radios y checkboxes con zona de toque >= 44 px (`min-h-11`), foco visible (`focus-visible:ring`), `fieldset` + `legend` para los grupos de radios (tipo y bien contratado), `autocomplete` correcto (`name`, `email`, `tel`, `street-address`), el honeypot oculto a lectores de pantalla y a teclado (contenedor `aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`, posicionado fuera de pantalla; el reviewer valida que no sea alcanzable por Tab), un único `h1` y `h2` por bloque, contraste con tokens existentes, `lang="es"` ya viene del layout raíz.
- **AC-9** (tests, constancia): tras `{ ok: true }` el formulario es reemplazado por `ClaimReceipt` con foco movido a su encabezado (`tabIndex={-1}`), que muestra: código, fecha de registro, fecha límite de respuesta (`formatDate`, ver nota de zona), tipo, datos del consumidor y del bien, detalle y pedido, datos del proveedor, y el texto: "Guarda este código. No enviamos copia por correo electrónico." Botón "Imprimir o guardar como PDF" que llama a `window.print()`; con `print:` de Tailwind se oculta header/footer/botón y queda solo la constancia. No se vuelve a mostrar el formulario con los datos (sin persistir en `sessionStorage`).
- **AC-10** (página): `src/app/libro-de-reclamaciones/page.tsx` exporta `metadata.title` "Libro de Reclamaciones · Ticketera", compone `Header` + `<main>` + `Footer` (mismo cascarón que `src/app/events/page.tsx`/`/privacidad`), un único `h1` "Libro de Reclamaciones", el bloque de datos del proveedor (`CLAIMS_PROVIDER`: razón social, RUC, domicilio, correo), el texto del plazo ("responderemos en un plazo máximo de 15 días hábiles") y el formulario. Es pública (no está en `isPrivateRoute`; `proxy.ts` sin cambios), no usa `cookies()`/`headers()` ni consultas a base en el render, y no es `"use client"` (solo el formulario lo es). Los datos del proveedor salen únicamente de `CLAIMS_PROVIDER` (sin duplicarlos en JSX).
- **AC-11** (footer): en la franja inferior de `footer.tsx` (bajo el `Separator`, junto al copyright) hay un enlace `next/link` a `/libro-de-reclamaciones` con icono `BookOpen` (`aria-hidden`) y el texto visible "Libro de Reclamaciones", con foco visible y objetivo >= 44 px de alto. `footer.test.tsx` verifica el enlace por nombre y `href`, y el conteo total de enlaces vigente (ver Dependencias). El enlace no depende de la sesión.
- **AC-12** (aviso en el inicio): el footer del home (`src/app/page.tsx` ya renderiza `Footer`) hace visible el acceso al libro en la página de inicio. Si la validación legal (Q-4) exige un aviso más prominente con el formato del Anexo III, se hará en otra spec; esta no modifica `page.tsx`.
- **AC-13** (veracidad y privacidad): la UI y la constancia no afirman envío de correo, ni que el reclamo fue "notificado a INDECOPI", ni plazos distintos al de 15 días hábiles; no se exponen datos personales fuera de la respuesta del propio envío (no hay consulta pública por código); los errores de servidor no filtran detalles internos; los datos guardados son exactamente los listados en "Datos personales".
- **AC-14**: `npm run lint`, `npm run test` y `npm run build` pasan. Los tests de la action y el service mockean `@/db` como los del newsletter; ningún test ni tarea ejecuta migraciones contra la base.

## Contratos

### Esquema SQL (Drizzle) — `src/db/schema/claims.ts`

Los enums se declaran dentro de `claims.ts` (no en `enums.ts`) para que la tarea de schema posea todos sus archivos y evitar tocar un archivo compartido. Si el reviewer prefiere el patrón de `enums.ts`, se mueven en la misma tarea.

```ts
import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, tstz } from "./columns";

export const claimType = pgEnum("claim_type", ["claim", "complaint"]); // reclamo | queja
export const claimStatus = pgEnum("claim_status", ["received", "in_progress", "answered"]);
export const claimItemType = pgEnum("claim_item_type", ["product", "service"]);

export const claims = pgTable(
  "claims",
  {
    id: uuid().primaryKey().defaultRandom(),
    number: integer().notNull().unique().generatedAlwaysAsIdentity(), // correlativo -> LR-AAAA-NNNNNN
    type: claimType().notNull(),
    status: claimStatus().notNull().default("received"),
    // Consumidor
    fullName: text().notNull(),
    documentType: text().notNull(), // DNI | CE | PASSPORT
    documentNumber: text().notNull(),
    address: text().notNull(),
    phone: text().notNull(),
    email: text().notNull(), // normalizado en minúsculas
    isMinor: boolean().notNull().default(false),
    guardianFullName: text(),
    guardianDocumentType: text(),
    guardianDocumentNumber: text(),
    // Bien contratado
    itemType: claimItemType().notNull(),
    itemDescription: text().notNull(),
    claimedAmountCents: integer(), // PEN en centavos, como orders
    orderReference: text(),
    // Hoja
    detail: text().notNull(),
    consumerRequest: text().notNull(),
    dueDate: date({ mode: "string" }).notNull(), // fecha de Lima, 15 días hábiles
    createdAt: createdAt(),
    // Respuesta del proveedor: columnas previstas para la Fase 2 (ver Q-8)
    response: text(),
    answeredAt: tstz(),
  },
  (t) => [
    index("claims_email_created_at_idx").on(t.email, t.createdAt),
    check("claims_email_lower_ck", sql`${t.email} = lower(${t.email})`),
    check(
      "claims_guardian_required_ck",
      sql`${t.isMinor} = false or (${t.guardianFullName} is not null and ${t.guardianDocumentType} is not null and ${t.guardianDocumentNumber} is not null)`,
    ),
    check("claims_detail_len_ck", sql`char_length(${t.detail}) <= 2000 and char_length(${t.consumerRequest}) <= 1000`),
  ],
);
```

Notas: ids `uuid` y `createdAt()` como el resto; `casing: "snake_case"` las convierte a `full_name`, `claimed_amount_cents`, etc. `generatedAlwaysAsIdentity` es soportado por Drizzle para PG; el developer verifica que el SQL generado quede correcto antes de dejarlo. Sin FK a `users`/`orders` (sin cuenta). No hay `updatedAt` hasta que exista un flujo de actualización (Fase 2).

### Configuración del proveedor — `src/modules/claims/config/claims-provider.ts`

```ts
export const CLAIMS_PROVIDER = {
  legalName: "TicketYa.com",
  ruc: "20513249510",
  address: "Calle las Acasias Nro 1850",
  email: "atencion@inkasign.com",
} as const; // Q-1 resuelta: "Ticketera" es marca de TicketYa.com; RUC pendiente de verificar en SUNAT

export const CLAIM_RESPONSE_BUSINESS_DAYS = 15; // verificar contra el Reglamento vigente
export const MAX_CLAIMS_PER_EMAIL_PER_DAY = 3;  // Q-6
```

(Carpeta `config/` nueva dentro del módulo; no figura en `SETUP.md` §1, igual que `content/` en `legal-pages`. El reviewer la acepta o pide moverla a `types/`.)

### Schema zod — `src/modules/claims/schemas/claim.schema.ts` (puro, cliente y servidor)

```ts
export const CLAIM_TYPES = ["claim", "complaint"] as const;
export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = { claim: "Reclamo", complaint: "Queja" };
export const CLAIM_ITEM_TYPES = ["product", "service"] as const;
export const CLAIM_ITEM_TYPE_LABELS: Record<ClaimItemType, string> = { product: "Producto", service: "Servicio" };

// Entrada del formulario (strings del DOM); `website` es el honeypot (siempre "" en uso legítimo).
export const claimSubmitSchema: z.ZodType<ClaimSubmitInput>; // ver AC-2
export type ClaimSubmitInput = {
  type: ClaimType;
  fullName: string;
  documentType: DocumentType;        // de checkout.schema
  documentNumber: string;
  address: string;
  phone: string;
  email: string;
  isMinor: boolean;
  guardianFullName?: string;
  guardianDocumentType?: DocumentType;
  guardianDocumentNumber?: string;
  itemType: ClaimItemType;
  itemDescription: string;
  claimedAmount?: number;            // soles; el form lo envía como string y el schema lo convierte
  orderReference?: string;
  detail: string;
  consumerRequest: string;
  acceptedPrivacy: true;
  website?: string;                  // honeypot
};
```

Las reglas cruzadas (documento por tipo, apoderado si es menor) se evalúan aparte de la base para informar todos los errores a la vez, como en `checkout.schema.ts`.

### Tipos — `src/modules/claims/types/claim.types.ts`

```ts
export interface ClaimReceipt {
  code: string;            // "LR-2026-000123"
  type: ClaimType;
  createdAt: string;       // ISO
  dueDate: string;         // "YYYY-MM-DD" (Lima)
  fullName: string; documentType: DocumentType; documentNumber: string;
  address: string; phone: string; email: string;
  isMinor: boolean; guardianFullName?: string; guardianDocumentNumber?: string;
  itemType: ClaimItemType; itemDescription: string;
  claimedAmountCents: number | null; orderReference?: string;
  detail: string; consumerRequest: string;
}
export type SubmitClaimResult =
  | { ok: true; receipt: ClaimReceipt }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof ClaimSubmitInput, string>> };
```

### Utilidades — `src/lib/business-days.ts`

```ts
export function toLimaDate(now: Date): string;                       // "YYYY-MM-DD" en America/Lima
export function addBusinessDays(isoDate: string, days: number): string; // excluye sáb y dom; sin feriados (Q-3)
```

### Service (solo servidor) — `src/modules/claims/services/claims.service.ts`

```ts
export function formatClaimCode(number: number, year: number): string;
export function countRecentClaimsByEmail(email: string, now?: Date): Promise<number>;
export function createClaim(input: ClaimSubmitInput, now?: Date): Promise<ClaimReceipt>;
```

### Server action — `src/modules/claims/actions/claims.actions.ts` (`"use server"`)

```ts
export async function submitClaimAction(raw: unknown): Promise<SubmitClaimResult>;
```

Mecanismo: **server action**, como el newsletter y `purchaseTicketsAction`. Antes de implementar, el developer consulta `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` (AGENTS.md: esta versión de Next difiere de lo conocido).

### Componentes (módulo `claims`)

```ts
// Cliente. Estado: formulario | enviando | constancia. Llama a submitClaimAction.
export function ClaimForm(): JSX.Element;
// Presentacional. Recibe la constancia y llama window.print() desde su botón.
export function ClaimReceipt(props: { receipt: ClaimReceipt }): JSX.Element;
```

## Datos personales (para `legal-pages` / política de privacidad)

Se guardan en `claims`: tipo de reclamo, nombre completo, tipo y número de documento, domicilio, teléfono, correo, indicador de menor de edad y (solo si es menor) nombre, tipo y número de documento del apoderado, tipo y descripción del bien contratado, monto reclamado (opcional), referencia de orden (opcional, texto libre), detalle del reclamo/queja, pedido del consumidor, fecha de registro, fecha límite y estado. **No se guarda**: IP, user agent, cookies ni datos de pago. Finalidad: atender y responder el reclamo (obligación del proveedor) y conservar el registro. Plazo de conservación: **2 años** (decisión del usuario; **a verificar contra el Reglamento vigente**), sin eliminación automática en la Fase 1; la política de privacidad lo menciona de forma coherente. Acceso interno hoy: quien tenga acceso a la base de datos (Neon). El tratamiento se limita a lo necesario (minimización): no se pide fecha de nacimiento ni otros datos no previstos por la hoja.

## Migración (acción de alto impacto)

La migración `0003_*` crea tablas, enums y un identity en la base **compartida**. Reglas:

- La tarea T-1 **solo genera** los archivos con `npm run db:generate`.
- **Ni el developer ni el reviewer ejecutan `npm run db:migrate` ni `npm run db:push`** como parte de la implementación automática. Solo el usuario, tras revisar el SQL generado, lo aplica de forma explícita y lo confirma (`db:migrate` aplica contra `DATABASE_URL`).
- Los tests no requieren la tabla creada (mockean `@/db`); `npm run build` no consulta la base en esta ruta. Si `db:generate` pide decisiones interactivas, el developer se detiene y consulta al orquestador.
- Antes de aplicar, el usuario revisa que el SQL solo contenga la creación de `claims`, sus enums e índices (sin `DROP`/`ALTER` sobre tablas existentes).

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Patrón action + service + test | `src/modules/events/{actions,services}/newsletter.*` (+ tests con `vi.hoisted` y `vi.mock("@/db")`) | **reusar el patrón** en `src/modules/claims/` (dominio propio) |
| Columnas/timestamps Drizzle | `src/db/schema/columns.ts` (`createdAt`, `tstz`) | **reusar** |
| Cliente DB | `src/db/index.ts` (neon-http, `casing: snake_case`) | **reusar** |
| Campos accesibles | `src/components/form-field.tsx` (`FormField`, `fieldA11yProps`, `FieldError`, `RequiredMark`, `FIELD_INPUT_CLASSES`) | **reusar** |
| Documento (tipo y reglas) | `DOCUMENT_TYPES`, `DOCUMENT_TYPE_LABELS` ya exportados; `DOCUMENT_RULES` privado en `checkout.schema.ts` | **extender**: exportar `DOCUMENT_RULES` (cambio de una palabra, T-2) y consumirlo desde `claim.schema.ts` (dependencia de lectura entre módulos; si se quiere desacoplar, mover a `src/lib/` en otra spec) |
| Selector de tipo de documento | `Select*` de `src/components/ui/select.tsx` como en `checkout-form.tsx` | **reusar** |
| Radios (reclamo/queja, producto/servicio) | `payment-method-field.tsx` (radios nativos con `fieldset`/`legend` y tarjeta seleccionable) | **reusar el patrón** (no se extrae un componente genérico hasta que haya un tercer uso; si el reviewer ve duplicación de markup, se generaliza en `src/components/`) |
| Casilla (menor de edad, privacidad) | `src/components/ui/checkbox.tsx` | **reusar** |
| Textarea | `@shadcn/textarea` en el registro; no existe en `src/components/ui/` | **agregar de shadcn** (`npx shadcn@latest add textarea`) |
| RadioGroup | `@shadcn/radio-group` en el registro | **no agregar** (los radios nativos del repo cubren el caso; Q-9) |
| Fecha formateada | `formatDate` en `src/lib/format.ts` (zona Lima) | **reusar** (pasando `YYYY-MM-DDT12:00:00-05:00`); moneda con `formatPrice` |
| Días hábiles | nada en `src/`; `date-fns` instalado pero sin uso | **crear** `src/lib/business-days.ts` (corto, sin zona local; `addBusinessDays` de date-fns usa hora local del servidor y no sirve para Lima) |
| Errores de Postgres | `src/lib/pg-errors.ts` | no necesario (el correlativo es identity, sin colisiones) |
| Anti-abuso | nada en el repo (sin rate limit/captcha) | **crear** honeypot + conteo por correo en `claims.service.ts` |
| Aviso/ícono | `lucide-react` (ya en el repo) -> `BookOpen` | **reusar** |
| Cascarón de página | `src/app/privacidad/page.tsx`, `src/app/events/page.tsx` (`Header` + `<main>` + `Footer`) | **reusar la estructura** |
| Imprimir | `window.print()` + variantes `print:` de Tailwind | **crear** (sin librería de PDF: YAGNI) |
| Proveedor / datos legales | `LEGAL_CONFIG` en `legal-pages.md` (aún no implementado) | **crear** `CLAIMS_PROVIDER` como fuente única; `LEGAL_CONFIG` la importará (ver Dependencias) |
| Panel de consulta | `src/app/admin/*`, `dashboard-nav.ts`, `requirePermission` | **diferir a Fase 2** (reusar `DashboardShell`, `Table`, `Pagination`) |

## Plan de tareas

Fase 1: 6 tareas.

### Grupo 0 (serial: schema + migración, dependencia, contratos compartidos)
- T-1: Tabla `claims` (con enums) y migración **solo generada** con `npm run db:generate` (no `db:migrate`) — archivos: `src/db/schema/claims.ts`, `src/db/schema/index.ts`, `drizzle/0003_<nombre>.sql`, `drizzle/meta/0003_snapshot.json`, `drizzle/meta/_journal.json` — tests: no (schema declarativo; igual que newsletter) — cubre: AC-1, AC-14
- T-2: `npx shadcn@latest add textarea`; exportar `DOCUMENT_RULES` en `checkout.schema.ts`; configuración del proveedor y constantes — archivos: `src/components/ui/textarea.tsx`, `src/modules/checkout/schemas/checkout.schema.ts`, `src/modules/claims/config/claims-provider.ts` — tests: no (el `checkout.schema.test.ts` existente debe seguir pasando; no se añade lógica) — cubre: AC-2 (prerrequisito), AC-10 (datos del proveedor)

### Grupo 1 (lógica pura; depende de T-2)
- T-3: Schema zod del reclamo, tipos y utilidad de días hábiles — archivos: `src/modules/claims/schemas/claim.schema.ts`, `src/modules/claims/schemas/claim.schema.test.ts`, `src/modules/claims/types/claim.types.ts`, `src/lib/business-days.ts`, `src/lib/business-days.test.ts` — tests: sí (schema: cada regla, menor de edad, documento por tipo, normalización; business-days: casos de AC-3, incluido el borde UTC/Lima) — cubre: AC-2, AC-3

### Grupo 2 (serial: depende de T-1 y T-3)
- T-4: Service y server action — archivos: `src/modules/claims/services/claims.service.ts`, `src/modules/claims/services/claims.service.test.ts`, `src/modules/claims/actions/claims.actions.ts`, `src/modules/claims/actions/claims.actions.test.ts` — tests: sí (service con `@/db` mockeado: inserta la fila con `dueDate`, centavos y `returning`, formato del código, conteo por correo, propaga errores; action con el service mockeado: honeypot, validación con `fieldErrors`, tope por correo, éxito, error de base sin filtrar) — cubre: AC-4, AC-5, AC-6, AC-13

### Grupo 3 (serial: depende de T-4 y T-2)
- T-5: Formulario y constancia — archivos: `src/modules/claims/components/claim-form.tsx`, `src/modules/claims/components/claim-form.test.tsx`, `src/modules/claims/components/claim-receipt.tsx`, `src/modules/claims/components/claim-receipt.test.tsx` — tests: sí (formulario con la action mockeada: validación, foco al primer inválido, bloque de apoderado condicional, estado enviando, error de servidor, paso a constancia; constancia: contenido, aviso de "no enviamos correo", `window.print` mockeado) — cubre: AC-7, AC-8, AC-9, AC-13

### Grupo 4 (paralelo: archivos disjuntos; `footer.tsx` solo aquí)
- T-6a: Página `/libro-de-reclamaciones` — archivos: `src/app/libro-de-reclamaciones/page.tsx`, `src/app/libro-de-reclamaciones/page.test.tsx` — tests: sí (renderiza `h1`, datos del proveedor, plazo; `metadata.title`; no se renderizan `Header`/`Footer` con Clerk: el test importa la página con mocks mínimos o comprueba solo `metadata` y el contenido propio, como en `legal-pages`) — cubre: AC-10, AC-13
- T-6b: Acceso en el footer — archivos: `src/components/footer.tsx`, `src/components/footer.test.tsx` — tests: sí (enlace por nombre y `href`, conteo vigente, `BookOpen` con `aria-hidden`) — cubre: AC-11, AC-12

Nota de conteo: T-6a y T-6b son dos tareas del último grupo (7 tareas en total); si el reviewer exige el máximo de ~6, fusionarlas en una tarea de 4 archivos (disjunta del resto, sin pérdida). `footer.tsx` queda en una sola tarea y debe ejecutarse después de la T-6 de `legal-pages` si esa spec ya está aprobada y en curso.

## Riesgos

- **Datos personales sensibles**: documento, domicilio, teléfono y correo. Mitigaciones: minimización, sin consulta pública por código, sin logs de datos del formulario (solo `console.error` del error), y no se guardan IP ni user agent. Depende de que la política de privacidad (otra spec) los declare antes de publicar. Los reclamos solo son accesibles hoy por quien tenga acceso a Neon.
- **Migración sobre base compartida**: ver "Migración". Riesgo de aplicar una migración con efectos no previstos; se mitiga con revisión del SQL y aplicación manual por el usuario.
- **No hay correo ni panel (riesgo ACEPTADO por el usuario, Q-2)**: el consumidor no recibe copia automática, lo cual puede no cumplir la obligación de entregar copia/constancia del reglamento (verificar si imprimir/PDF basta). El proveedor tampoco recibe alerta: **nadie se entera de un reclamo salvo que el titular revise la tabla en Neon**, con riesgo de incumplir el plazo de 15 días hábiles. El usuario aceptó explícitamente este riesgo, con el compromiso de revisar la tabla con frecuencia; una spec de correo/panel es fase siguiente.
- **RUC sin verificar**: el titular debe verificar el RUC 20513249510 en SUNAT; el domicilio se publica sin distrito/ciudad. Datos incorrectos en un documento de consumo pueden ser engañosos.
- **Duplicados / abuso**: sin captcha ni rate limit real; el tope por correo no frena a quien varía el correo y un bot puede llenar la tabla. Honeypot atrapa solo bots simples. Se acepta para la Fase 1 (igual que el newsletter); mejora recomendada: rate limit por IP o captcha en otra spec.
- **Jurisdicción / validez legal**: normativa peruana tomada de fuentes secundarias, sin verificar; el formato del Anexo III, el plazo, la forma de entregar la copia y la conservación deben revisarse contra el Reglamento vigente. Hay riesgo de incumplir si el libro no cumple requisitos formales.
- **Identidad del proveedor**: "Ticketera" es marca de TicketYa.com (confirmado, Q-1); la constancia y la página deben mostrar al proveedor como "TicketYa.com" para evitar confusión. El correo es de otro dominio (`inkasign.com`), confirmado por el usuario.
- **Plazo calculado sin feriados**: la fecha límite mostrada puede ser anterior a la real (por ejemplo, del 5 al 26 de octubre de 2026 cae el feriado del 8 de octubre en Perú; con ese feriado el vencimiento sería el 27). Aceptado por el usuario como supuesto por defecto (Q-3); se comunica en UI como "aproximada" solo si se resuelve Q-3 en ese sentido.
- **Coordinación de `footer.tsx`**: ver Dependencias; el conteo de enlaces del test puede romperse si se invierte el orden.
- **Contradicción con `legal-pages`**: ver Dependencias; sus páginas dirán "no hay Libro" si no se actualiza `LEGAL_CONFIG`.
- **Aviso en la página de inicio**: el footer puede no bastar para la exigencia formal (Q-4).

## Fases siguientes

### Fase 2 (propuesta, se especifica aparte; requiere nueva aprobación)
- Vista `/admin/claims` solo para super admin (`requirePermission("organizations:manage")`, no asignable a roles de organización, por los datos personales) con tabla (código, tipo, consumidor, estado, fecha límite, indicador de vencido), filtros, detalle y cambio de estado/respuesta (columnas `response` y `answeredAt` ya existen). Entrada en `dashboard-nav.ts`. Reusar `Table`, `Pagination`, `DashboardShell`.
- Integración de correo (copia al consumidor + aviso al proveedor) en una spec propia (Q-2).
- Feriados nacionales en el cálculo (Q-3), rate limit/captcha, retención/eliminación.

## Decisiones resueltas

El usuario resolvió estas preguntas; la spec sigue en `draft` hasta su aprobación.

- **Q-1** (proveedor): **confirmado** que "Ticketera" es una marca de TicketYa.com. Proveedor: TicketYa.com, RUC 20513249510, domicilio "Calle las Acasias Nro 1850" (sin distrito ni ciudad), correo atencion@inkasign.com. Se usan tal cual en `CLAIMS_PROVIDER`. **Pendiente del titular**: verificar el RUC en SUNAT (riesgo en Riesgos). El domicilio sin distrito/ciudad puede ser insuficiente para la identificación del proveedor; se publica como lo dio el usuario.
- **Q-2** (sin correo ni panel): **aceptado**. No hay aviso por correo ni panel; el titular revisa la tabla `claims` en Neon con frecuencia. El riesgo de incumplir el plazo de 15 días hábiles queda documentado en Riesgos como aceptado por el usuario. Una spec de correo/panel es fase siguiente.
- **Q-3** (feriados): se mantiene el default: solo sábado y domingo.
- **Q-4** (aviso en el inicio): se mantiene el default: el enlace en el footer del home; a validar contra el Reglamento vigente.
- **Q-5** (conservación): **2 años**, **a verificar contra el Reglamento vigente**. Sin eliminación automática en la Fase 1; el texto de la política de privacidad se coordina con `legal-pages`.
- **Q-6** (tope anti-abuso): se mantiene 3 reclamos por correo en 24 h.
- **Q-7** (quién atiende): se mantiene el default: consulta manual en Neon por el titular.
- **Q-8** (columnas de respuesta): se mantiene el default: `response` y `answeredAt` se incluyen ya en la migración `0003` para evitar una segunda migración.
- **Q-9** (radios): se mantiene el default: radios nativos, sin `radio-group` de shadcn.
- **Q-10** (orden con `legal-pages`): **aprobado**. `LEGAL_CONFIG` de `legal-pages` importará `CLAIMS_PROVIDER`, y esta spec se implementa **después** de `legal-pages`: primero la T-6 de `legal-pages` (footer) y luego el cambio de footer de esta spec.

## Aprobaciones distintas

- Aprobar **esta spec** (`Estado: approved`) autoriza implementar el código y **generar** el archivo de migración `0003_*`.
- Aprobar **aplicar la migración** es una decisión distinta: `npm run db:migrate` (y `db:push`) **no se ejecuta** sin aprobación explícita del usuario en el chat, después de revisar el SQL generado. Aprobar la spec no equivale a esa aprobación.

## Preguntas abiertas

Ninguna bloqueante.
