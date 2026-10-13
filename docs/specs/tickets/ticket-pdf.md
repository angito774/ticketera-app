# Ticket en PDF descargable para el cliente tras la compra

**Estado**: approved
**Aprobado por**: nelson.nc421@gmail.com (2026-10-12) — aceptó todas las propuestas de "Preguntas abiertas" (1 a 12) tal como están redactadas
**Fase**: 1 de 2

## Contexto

Tras pagar con Stripe, la confirmación (`confirmation-actions.tsx`) y el visor de `/my-tickets` (`ticket-viewer.tsx`) solo ofrecen "Imprimir" (`window.print()`), que imprime la página web (cabeceras, botones, tema) y no produce un documento para entregar. Se pide un **PDF descargable** con las entradas del pedido, generado en servidor, y con un **QR real** por entrada: hoy solo existe un QR decorativo (`src/lib/decorative-qr.ts`, "no codifica ningún dato") aunque cada ticket ya tiene `tickets.qr_code` (único, 18 bytes aleatorios en base64url, ver `generateQrToken` en `purchase.mapping.ts`).

Esta fase entrega la **generación y descarga**. La validación/escaneo en puerta queda para la fase siguiente (el QR del PDF ya queda listo para ella). Diseño de sistema relacionado: `docs/specs/database/data-model.md` § `orders`, § `tickets` (solo lectura; no se modifica el esquema).

## Hallazgos verificados en el repo

- **Datos disponibles**: `getOrderForUser(actor, orderId)` (`order-read.service.ts`) filtra por `orders.user_id = actor.id` y devuelve `null` si el id no es uuid, no existe o no es del actor (404 uniforme). Devuelve `OrderView`: `id`, `number` (`TK-XXXXXXXX`), `eventSlug`, `eventTitle`, `createdAt` (ISO Lima), `total` (soles), `status`, `buyerName`, `buyerEmail` y `tickets[]` con `id`, `zoneName`, `seatLabel` (`"Fila A · Asiento 3"` o `null` en zona general), `qrCode`, `status` (`valid | redeemed | cancelled`). **No** trae estado del evento, fecha, recinto ni dirección.
- **Datos del evento (fecha, recinto, dirección, edad mínima)**: la confirmación y `/my-tickets` los leen con `getEventById(order.eventSlug)` (`events.service.ts`, `EventDetail`: `date` ISO Lima, `venue`, `city`, `address`, `doorsOpenAt`, `minAge`). El PDF usa la **misma fuente** para ser coherente con lo que el usuario ve.
- **Estado del evento**: `events.status` (`draft | published | cancelled`) existe en BD pero `OrderView` no lo expone; `cancelEvent` solo lo marca (no reembolsa las órdenes por sí mismo). Hay que exponerlo (T-1).
- **Estados de orden**: `pending | paid | cancelled | refunded`. `listOrdersForUser` lista `paid` y `refunded`; `getOrderForUser` no filtra por estado.
- **Auth**: `getCurrentUser()` (`current-user.service.ts`) devuelve `null` sin sesión. `src/proxy.ts` (Clerk) **no** incluye `/api/orders` como ruta privada y no debe hacerlo: `auth.protect()` redirigiría a HTML de login; el handler responde `401` JSON por sí mismo (patrón de `src/app/api/events/route.ts`: `Cache-Control` explícito y `console.error` + 500 genérico).
- **Formato**: `formatPrice(soles)`, `formatLongDate`, `formatTime`, `formatDate` (`src/lib/format.ts`) ya fijan `America/Lima` y `es-PE`; `OrderView.total` ya está en soles.
- **Branding**: no hay logo en `public/` (solo SVG de plantilla). El header usa el texto "Ticketera" en `--primary` `#4F46E5`. El PDF usa ese wordmark en texto, sin imagen.
- **`APP_URL`** existe como variable de entorno (Stripe), pero **no hay ninguna ruta de validación** de entradas.

## Decisiones técnicas (verificadas)

### Librería de PDF: `@react-pdf/renderer` 4.9.0 (decisión para el aprobador, ver Pregunta 1)

| Candidata | Versión / mantenimiento (`npm view`) | Compatibilidad | Veredicto |
|---|---|---|---|
| `@react-pdf/renderer` | 4.9.0, modificado 2026-08-27; `peerDependencies.react: ^16.8 \|\| … \|\| ^19.0.0` (cubre React 19.2.8) | Next 16 la trae en su lista **automática** de `serverExternalPackages` (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md`), así que **no hace falta tocar `next.config.ts`**. Se renderiza con `renderToBuffer` desde un Route Handler (Node runtime, el default). JSX/flexbox, texto real seleccionable, fuente base Helvetica (cubre tildes, ñ, "·", "—" de WinAnsi). | **Elegida** |
| `pdf-lib` | 1.17.1, **última publicación 2022-05** | JS puro, sin problemas de bundling, pero sin mantenimiento y con layout 100 % manual | Descartada |
| `pdfkit` | 0.20.2 (mantenida) | Necesita acceder a archivos de fuentes (`.afm`) del disco: suele requerir `serverExternalPackages` y es la base de react-pdf (ya es dependencia de react-pdf 4.9.0). Coordenadas manuales | Descartada: react-pdf da lo mismo con JSX y sin config extra |

Riesgo conocido: hubo incompatibilidades históricas de react-pdf con React/Next nuevos. **No se pudo instalar en esta fase de spec**; por eso T-1 es un Grupo 0 serial y el Reviewer debe ejecutar `npm run build` y el test de `%PDF-` (AC-12). Si `build` fallara, el plan de contingencia es agregar `serverExternalPackages: ["@react-pdf/renderer"]` en `next.config.ts` y, si persiste, reabrir la decisión con `pdfkit` (spec editada → `draft`).

### QR: paquete `qrcode` 1.5.4 + `@types/qrcode`

`QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 320 })` genera un PNG como data URL que se incrusta con `<Image src=…>` de react-pdf (react-pdf no admite SVG en `Image`). Un QR **por entrada**.

### Contenido codificado en el QR: el valor crudo de `tickets.qr_code` (decisión para el aprobador, ver Pregunta 2)

- Propuesta: `payload = ticket.qrCode` (24 caracteres, único por entrada, no adivinable).
- Por qué no una URL de validación (`${APP_URL}/t/<token>`): no existe esa ruta; el QR apuntaría a un 404, ataría el QR al dominio y un escáner genérico de teléfono abriría una URL pública con el token. La validación real ocurrirá en una app/pantalla de puerta que consulta por `qr_code` (la tabla ya tiene `redeemed_at`/`redeemed_by` y el permiso `tickets:redeem` existe en el modelo de roles).
- Seguridad: es un secreto portador; quien lo copie entra una vez. Por eso la mitigación esencial (un solo uso por token, `status: valid → redeemed`) es la **fase siguiente**; este PDF se entrega sin ella y la spec lo declara explícitamente. Por la misma razón el PDF no se genera con datos de otros pedidos y se sirve con cabeceras privadas.
- El PDF también imprime el **código corto** (`shortTicketCode`, 8 caracteres) para verificación manual.

### Un PDF por pedido, una página por entrada

Un solo archivo (`entradas-TK-XXXXXXXX.pdf`) con una página **A4 vertical** por entrada: un único botón de descarga, cabe en un solo adjunto y se imprime página a página. Formato "ticket" (p. ej. 80×200 mm) descartado: incómodo de imprimir y de revisar en pantalla. Se incluyen las entradas con `status !== "cancelled"`.

### Reglas de elegibilidad (`canDownloadTicketPdf`)

Un pedido es descargable si `order.status === "paid"` **y** `order.eventStatus !== "cancelled"` **y** tiene al menos una entrada no cancelada. Pedidos `pending`, `cancelled` o `refunded` y eventos cancelados **no generan PDF** (no se usa marca de agua: un PDF con QR de una entrada reembolsada o de un evento cancelado no debe circular). Solo el **comprador dueño** descarga; el admin no (ver Pregunta 5).

### Descarga en cliente

`axios` (`responseType: "blob"`) dentro de un `useMutation` (React Query ya está provisto), luego `URL.createObjectURL` + `<a download>` (mismo patrón que `add-to-calendar-button.tsx`). **No** se abre pestaña nueva ni se navega a la URL del PDF: un error de la API no deja una pestaña rota, se muestra en la propia UI.

## Alcance

- **Incluye**:
  - Ruta `GET /api/orders/[orderId]/tickets/pdf` que devuelve `application/pdf` (adjunto) del pedido del usuario autenticado.
  - Documento PDF A4, una página por entrada, con QR real por entrada.
  - Exponer `eventStatus` en `OrderView`.
  - Botón "Descargar PDF" con estado de carga y error accesibles en la confirmación y en el visor de `/my-tickets`, que **reemplaza** a "Imprimir" en ambos.
  - Tests (SETUP §3) de mapping, elegibilidad, QR, autorización y generación.
- **No incluye (YAGNI / fases siguientes)**:
  - Validación/escaneo en puerta, canje de un solo uso (`redeemed_at`), pantalla de portería (**siguiente fase razonable**).
  - Envío del PDF por correo; wallet (Apple/Google); códigos rotativos/firmados; marca de agua.
  - Reemplazar el QR decorativo de la UI por el real (Pregunta 3) y retocar los textos "Muestra tu QR"/"Enviamos tus entradas" de la confirmación.
  - Logo en imagen, fuentes personalizadas, PDF para admin/soporte, cambios de esquema de BD, rutas de validación, internacionalización.

## Criterios de aceptación

- **AC-1 (acceso)**: `GET /api/orders/{id}/tickets/pdf` sin sesión responde `401` JSON `{ error }`; con sesión de otro usuario, con id no uuid o inexistente responde `404` (mismo cuerpo, sin revelar si el pedido existe). El pedido se obtiene con `getOrderForUser(actor, id)`; nunca se consultan pedidos por id sin filtrar por el actor.
- **AC-2 (elegibilidad)**: pedido `pending`, `cancelled` o `refunded`, evento con `status = "cancelled"`, o sin entradas no canceladas → `409` JSON `{ error }` sin generar PDF. `canDownloadTicketPdf(order)` es la única fuente de esta regla (la usan la ruta y la UI).
- **AC-3 (datos de OrderView)**: `OrderView` incluye `eventStatus: "draft" | "published" | "cancelled"` leído de `events.status`; los usos existentes de `OrderView` siguen compilando y sus tests pasan.
- **AC-4 (respuesta)**: éxito → `200`, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="entradas-TK-XXXXXXXX.pdf"` (número de pedido, solo ASCII), `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`. Errores también con `Cache-Control: no-store`. Un fallo inesperado responde `500` con mensaje genérico y `console.error`, sin filtrar detalles.
- **AC-5 (contenido por página)**: cada entrada ocupa una página A4 con: marca "Ticketera"; título del evento; fecha larga y hora (`formatLongDate` + `formatTime`, hora Lima) y apertura de puertas si existe; recinto, dirección y ciudad; zona y, si hay `seatLabel`, fila/asiento (zona general: solo zona, sin asiento); titular (`buyerName`); n.º de pedido; "Entrada N de M"; código corto; estado si no es válida ("Usada"); edad mínima solo si `minAge !== null`; total del pedido en PEN con `formatPrice` (solo en la primera página o en todas, ver mapping); condiciones breves de ingreso (texto fijo, sin reglas de negocio nuevas). No hay datos de otros pedidos ni de otros usuarios (sin correo del titular en el PDF).
- **AC-6 (QR real)**: cada página incluye un QR cuyo contenido es **exactamente** `ticket.qrCode` de esa entrada (una entrada = un QR distinto). Nivel de corrección `M`, margen de zona silenciosa y tamaño mínimo de 35 mm en el documento.
- **AC-7 (validez del archivo)**: el buffer generado empieza por `%PDF-`, tiene tantas páginas como entradas incluidas y su tamaño es razonable (< 1 MB para un pedido de 10 entradas).
- **AC-8 (accesibilidad del documento)**: metadatos `title` ("Entradas · <evento> · <n.º pedido>"), `author` ("Ticketera"), idioma `es` si la versión instalada lo soporta (verificar); todo el texto es texto real (seleccionable/legible por lector de pantalla, no imagen salvo el QR); el código corto se imprime en texto como alternativa al QR; contraste de texto ≥ 4.5:1 (texto oscuro sobre blanco; `#4F46E5` solo en wordmark/acentos grandes).
- **AC-9 (UI de descarga)**: en la confirmación y en `ticket-viewer` el botón "Imprimir" se reemplaza por "Descargar PDF" (icono `Download`). Solo se muestra si `canDownloadTicketPdf(order)`. Al hacer clic: botón `disabled` + `aria-busy` y texto "Generando PDF…" con spinner; al terminar se descarga `entradas-TK-XXXXXXXX.pdf` en la misma pestaña; no se abre ninguna pestaña nueva.
- **AC-10 (errores accesibles)**: si la API falla muestra un mensaje en un `role="alert"` junto al botón (401: "Inicia sesión para descargar tus entradas"; 404: "No encontramos este pedido"; 409: "Este pedido no tiene entradas descargables"; otro/red: "No pudimos generar tu PDF. Inténtalo de nuevo."), el botón vuelve a habilitarse y se puede reintentar. Foco visible (`focus-visible:ring-3`) igual que los botones vecinos.
- **AC-11 (zona horaria y moneda)**: fecha/hora en `America/Lima` y moneda `PEN` formateadas solo con los helpers de `src/lib/format.ts` (sin `toLocaleString` suelto); un evento a las 20:00 -05:00 muestra "20:00" aunque el servidor corra en UTC.
- **AC-12 (calidad)**: `npm run lint`, `npm run test` y `npm run build` pasan; hay tests Vitest para el mapping y elegibilidad, el payload/imagen del QR, el servicio de acceso (autorización) y el render del PDF (`%PDF-`).

## Contratos

```ts
// src/modules/checkout/services/order-read.mapping.ts (extender)
export type EventStatusView = "draft" | "published" | "cancelled";
// OrderRow y OrderView ganan: eventStatus: EventStatusView

// src/modules/tickets/types/ticket-pdf.types.ts
export interface TicketPdfPage {
  ticketId: string;
  zoneName: string;
  seatLabel: string | null;       // null = zona general
  shortCode: string;              // shortTicketCode(qrCode)
  qrPayload: string;              // === ticket.qrCode
  statusLabel: string | null;     // null si valid; "Usada" si redeemed
  position: { index: number; total: number }; // 1-based
}

export interface TicketPdfData {
  orderNumber: string;            // "TK-1A2B3C4D"
  fileName: string;               // "entradas-TK-1A2B3C4D.pdf"
  title: string;                  // metadato del documento
  eventTitle: string;
  dateLine: string;               // "sábado, 14 de noviembre · 20:00 h"
  doorsLine: string | null;       // "Puertas: 18:00 h"
  venueLine: string;              // "Estadio Nacional"
  addressLine: string;            // "Av. ..., Lima"
  holderName: string;
  totalLabel: string;             // "S/ 350"
  minAgeLabel: string | null;     // "Mayores de 18 años" | null
  pages: TicketPdfPage[];
}

export type TicketPdfFailure = "unauthenticated" | "not_found" | "not_downloadable";
export type TicketPdfResult =
  | { ok: true; buffer: Buffer; fileName: string }
  | { ok: false; reason: TicketPdfFailure; status: 401 | 404 | 409 };
```

```ts
// src/modules/tickets/services/ticket-pdf.mapping.ts (puro)
export function canDownloadTicketPdf(order: Pick<OrderView, "status" | "eventStatus" | "tickets">): boolean;
export function ticketPdfFileName(orderNumber: string): string;  // `entradas-${orderNumber}.pdf`
export function buildTicketPdfData(order: OrderView, event: EventDetail): TicketPdfData; // excluye tickets cancelled
export function ticketPdfErrorMessage(status: number | undefined): string; // textos de AC-10

// src/modules/tickets/services/ticket-qr.service.ts
export async function ticketQrDataUrl(payload: string): Promise<string>; // PNG data URL, nivel M

// src/modules/tickets/services/ticket-pdf.service.ts (solo servidor)
export interface TicketPdfRenderInput { data: TicketPdfData; qrDataUrls: Record<string, string> } // por ticketId
export async function renderTicketPdf(input: TicketPdfRenderInput): Promise<Buffer>; // renderToBuffer

// src/modules/tickets/services/ticket-pdf-access.service.ts (solo servidor)
export async function generateTicketPdfForUser(actor: CurrentUser | null, orderId: string): Promise<TicketPdfResult>;
```

Ruta (`src/app/api/orders/[orderId]/tickets/pdf/route.ts`): `GET(_req, ctx: RouteContext<"/api/orders/[orderId]/tickets/pdf">)` → `await ctx.params` (en Next 16 `params` es `Promise`), `getCurrentUser()`, `generateTicketPdfForUser`, y arma la `Response` (`new Response(new Uint8Array(buffer), { headers })` o `Response.json({ error }, { status })`). Sin lógica de negocio.

Componentes cliente: `DownloadTicketsButton({ orderId, orderNumber, className? })` y `useTicketPdfDownload(orderId)` → `{ download(), isPending, error: string | null }`.

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Generación de PDF | Nada en `src/`; sin librerías PDF en `package.json` | **agregar** `@react-pdf/renderer` (justificación arriba) |
| QR real | Solo `src/lib/decorative-qr.ts` (decorativo, no codifica datos); sin librería QR | **agregar** `qrcode` + `@types/qrcode`; el decorativo se conserva intacto en esta fase |
| Obtener pedido propio con 404 uniforme | `getOrderForUser` (`order-read.service.ts`) | **reusar**; **extender** `OrderView` con `eventStatus` (una columna más en `selectOrders`) |
| Usuario de sesión | `getCurrentUser` (`current-user.service.ts`); `requirePermission` redirige (inadecuado para API) | **reusar** `getCurrentUser`, responder 401 en el handler |
| Datos del evento | `getEventById` (`events.service.ts`) | **reusar** (misma fuente que la UI) |
| Fecha/hora/moneda | `formatLongDate`, `formatTime`, `formatPrice`, `formatDate` (`src/lib/format.ts`) | **reusar**, sin helpers nuevos |
| Código corto y etiqueta de estado | `shortTicketCode`, `ticketStatusLabel` en `order-ticket-card.tsx` (componente cliente) | **extender/generalizar**: mover `shortTicketCode` (lógica pura) a `order-read.mapping.ts` y re-exportarla desde el componente, para no importar un `"use client"` desde el servicio ni duplicar (Pregunta 7); el texto "Usada" del PDF sale de `ticketStatusLabel` solo si T-2 lo importa de un módulo sin React; si no, se define el mapa de 1 línea en `ticket-pdf.mapping.ts` |
| Número de pedido | `orderNumberFromId` / `OrderView.number` | **reusar** |
| Patrón de descarga por `<a download>` | `add-to-calendar-button.tsx` | **reusar el patrón** en el hook nuevo |
| Botón | `src/components/ui/button.tsx` (`buttonVariants`) y las clases secundarias `SECONDARY_CLASSES` / `ACTION_CLASSES` de los componentes vecinos; spinner `Loader2` y `Download` de `lucide-react` (ya usado) | **reusar** (no hay componente shadcn nuevo que agregar; un botón con spinner es `button` + icono) |
| Cliente HTTP / estado de petición | `axios` y `@tanstack/react-query` (provider ya montado) | **reusar** en `useTicketPdfDownload` |
| Route handler de referencia | `src/app/api/events/route.ts` (cabeceras `Cache-Control`, `console.error`, 500 genérico) | **reusar el patrón** |
| Registro shadcn | No se necesita ningún componente nuevo | n/a |

> `shortTicketCode` pasa a vivir en `order-read.mapping.ts` (T-1, que por eso tiene 6 archivos: el máximo tolerable; si el aprobador elige duplicar, ver Pregunta 7 y T-1 baja a 5).

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Dependencias y exposición del estado del evento. `npm install @react-pdf/renderer qrcode` y `npm install -D @types/qrcode`; `eventStatus` en `OrderRow`/`OrderView`/`selectOrders` (columna `events.status`), mover `shortTicketCode` a `order-read.mapping.ts` y re-exportarla desde `order-ticket-card.tsx`; actualizar fixtures del test. — archivos: `package.json`, `package-lock.json`, `src/modules/checkout/services/order-read.mapping.ts`, `src/modules/checkout/services/order-read.mapping.test.ts`, `src/modules/checkout/services/order-read.service.ts`, `src/modules/checkout/components/order-ticket-card.tsx` (re-export) — tests: sí (mapping: `eventStatus` se propaga; `shortTicketCode`) — cubre: AC-3, AC-12
- **T-2**: Contratos y lógica pura del PDF. Tipos, `canDownloadTicketPdf`, `ticketPdfFileName`, `buildTicketPdfData` (fecha/hora/moneda con los helpers de `format.ts`, un asiento vs zona general, estado "Usada", exclusión de cancelled, `minAge` nulo, puertas opcional), `ticketPdfErrorMessage`. — archivos: `src/modules/tickets/types/ticket-pdf.types.ts`, `src/modules/tickets/services/ticket-pdf.mapping.ts`, `src/modules/tickets/services/ticket-pdf.mapping.test.ts` — tests: sí (todas las reglas de AC-2, AC-5, AC-10, AC-11; un evento 20:00 -05:00 con `TZ=UTC` → "20:00") — cubre: AC-2, AC-5, AC-10, AC-11

### Grupo 1 (paralelo)

- **T-3**: Generación servidor: QR y render del documento. `ticketQrDataUrl`; componente `TicketPdfDocument` (`Document title/author`, `Page size="A4"`, una por `pages[]`, QR `Image`, Helvetica, wordmark "Ticketera" `#4F46E5`, texto real, condiciones breves); `renderTicketPdf` con `renderToBuffer`. — archivos: `src/modules/tickets/services/ticket-qr.service.ts`, `src/modules/tickets/services/ticket-qr.service.test.ts`, `src/modules/tickets/components/ticket-pdf-document.tsx`, `src/modules/tickets/services/ticket-pdf.service.ts`, `src/modules/tickets/services/ticket-pdf.service.test.ts` — tests: sí (QR: devuelve `data:image/png;base64,` y el contenido codificado es exactamente el payload, verificado con la API de `qrcode` —`QRCode.create(payload).segments`— y que dos payloads distintos dan imágenes distintas; render: buffer comienza por `%PDF-`, N páginas = N entradas, `// @vitest-environment node` al inicio porque el entorno por defecto es jsdom) — cubre: AC-5, AC-6, AC-7, AC-8
- **T-4**: Descarga en cliente. Servicio axios (blob + nombre de archivo + status del error), hook con `useMutation` y mensaje de error, y botón. — archivos: `src/modules/tickets/services/ticket-pdf-download.service.ts`, `src/modules/tickets/services/ticket-pdf-download.service.test.ts`, `src/modules/tickets/hooks/use-ticket-pdf-download.ts`, `src/modules/tickets/hooks/use-ticket-pdf-download.test.ts`, `src/modules/tickets/components/download-tickets-button.tsx` — tests: sí (servicio: pide `/api/orders/{id}/tickets/pdf` con `responseType: "blob"`; hook: estado pending/error con el mensaje de `ticketPdfErrorMessage`, crea y revoca la URL del objeto, sin `window.open`) — cubre: AC-9, AC-10

### Grupo 2 (paralelo)

- **T-5**: Acceso y ruta. `generateTicketPdfForUser` (actor `null` → 401; `getOrderForUser` null → 404; `!canDownloadTicketPdf` → 409; event no encontrado en `getEventById` → 404; arma datos, QR y render) y el Route Handler con cabeceras. — archivos: `src/modules/tickets/services/ticket-pdf-access.service.ts`, `src/modules/tickets/services/ticket-pdf-access.service.test.ts`, `src/app/api/orders/[orderId]/tickets/pdf/route.ts` — tests: sí (servicio con `getOrderForUser`/`getEventById` mockeados: sin sesión, pedido de otro usuario = null → 404 sin llamar a render, `pending`/`refunded`/evento cancelado/ sin tickets → 409, éxito → buffer `%PDF-` y `fileName`; el handler es composición) — cubre: AC-1, AC-2, AC-4, AC-7, AC-12
- **T-6**: Integración UI. Reemplazar "Imprimir" por `DownloadTicketsButton` (condicionado a `canDownloadTicketPdf`) en la confirmación y en el visor; quitar el import de `Printer`. — archivos: `src/modules/checkout/components/confirmation-actions.tsx`, `src/modules/account/components/ticket-viewer.tsx` — tests: no (composición; la lógica está en T-2/T-4) — cubre: AC-9

> T-5 y T-6 tocan archivos disjuntos y dependen solo de T-1 a T-4. `ConfirmationActions` recibe hoy `order: Pick<OrderView, "number" | "tickets">`: T-6 amplía el `Pick` con `id`, `status` y `eventStatus` (los pasa `ConfirmationView`, que ya tiene el `OrderView` completo, sin tocar ese archivo).

## Riesgos

- **Compatibilidad react-pdf / Next 16 / React 19.2**: peer dependency y lista de externos verificadas en docs/`npm view`, pero no instalada ni compilada todavía (ver contingencia arriba).
- **Fuentes**: Helvetica estándar; caracteres fuera de WinAnsi (emoji, flechas) no se renderizan. El texto del PDF solo usa tildes, ñ, "·", "—".
- **Fuente de eventos estática**: `getEventById` es un catálogo en memoria; un evento creado por un organizador en BD y ausente del catálogo hará que la ruta responda `404`, igual que la confirmación hoy (Pregunta 6).
- **QR estático copiable** (mitigación = canje de un solo uso, fase siguiente).
- **Rendimiento**: render síncrono en la petición; para pedidos de pocas entradas es aceptable. Sin caché del PDF (es privado y barato).

## Fases siguientes

**Fase 2 (se detalla al cerrar la Fase 1)**: validación/escaneo en puerta con permiso `tickets:redeem` (consulta por `qr_code`, marca `status: redeemed`, `redeemed_at`, `redeemed_by`, rechazo de doble uso con mensaje claro), y, junto con ello, **QR real también en la UI** (Pregunta 3) para que lo que se ve en pantalla sea lo mismo que se escanea.

## Preguntas abiertas / decisiones para el aprobador

Ninguna bloquea la Fase 1 si se acepta la propuesta por defecto.

1. **Librería de PDF**: se propone `@react-pdf/renderer` 4.9.0 (JSX, React 19 en peer, en la lista automática de externos de Next 16, sin cambios en `next.config.ts`). Alternativas: `pdfkit` (más bajo nivel) o `pdf-lib` (sin mantenimiento desde 2022). Riesgo: no se pudo compilar en la fase de spec; contingencia descrita. **Por defecto: react-pdf.**
2. **Contenido del QR**: valor crudo de `tickets.qr_code` vs URL de validación. **Por defecto: valor crudo** (no hay ruta de validación; sin atadura al dominio). Si prefieres URL, hay que especificar la ruta pública de validación en esta u otra fase.
3. **QR decorativo de la UI**: ¿reemplazarlo ahora por el real? **Por defecto: no** (fuera de alcance; se hace en Fase 2 junto al escaneo). Riesgo aceptado: hasta entonces la pantalla muestra un QR no escaneable mientras el PDF trae el real, y el texto "Muestra tu QR" de la confirmación es engañoso hasta esa fase. Alternativa: incluir en esta fase un componente `TicketQr` cliente con `qrcode` (suma ~3 tareas).
4. **Conservar "Imprimir"**: **Por defecto: se elimina** en la confirmación y el visor (imprime la página web con el QR decorativo; el PDF es el documento imprimible). Alternativa: mantenerlo como acción secundaria.
5. **Quién descarga**: **Por defecto: solo el comprador dueño** (`getOrderForUser` ya lo restringe). Admin/soporte descargando pedidos ajenos queda fuera (requeriría permiso explícito y auditoría).
6. **Fuente de datos del evento**: **Por defecto: `getEventById` (catálogo actual)**, como la UI. Si ya se quiere leer fecha/recinto/dirección de BD (`events`, `venues.address_line`), es otra spec previa y el PDF la consumiría después.
7. **`shortTicketCode`**: **Por defecto: moverlo a `order-read.mapping.ts` y re-exportarlo desde `order-ticket-card.tsx`** (T-1 con 6 archivos). Alternativa: duplicar la regla de una línea en `ticket-pdf.mapping.ts` (evita tocar el componente pero duplica).
8. **Pedido reembolsado / evento cancelado**: **Por defecto: no se genera PDF (409)** y la UI oculta el botón. Alternativa: generarlo con marca de agua "ANULADA".
9. **Entradas ya usadas (`redeemed`)**: **Por defecto: se incluyen** con la etiqueta "Usada"; las `cancelled` se excluyen.
10. **Tamaño y paginación**: **Por defecto: A4 vertical, una entrada por página, un PDF por pedido.** Alternativa: un PDF por entrada o formato ticket.
11. **Condiciones del PDF**: se propone solo un texto genérico fijo ("Presenta este código QR en el ingreso. Cada código es único: no lo compartas ni lo publiques."). Si existen términos legales por evento, indícalos (no se inventan reglas de negocio).
12. **Idioma/accesibilidad del PDF**: el atributo de idioma `es` y el etiquetado PDF/UA dependen de lo que soporte react-pdf 4.9.0; **por defecto** se entregan título, autor, texto real seleccionable y código corto, y no se promete PDF/UA.
