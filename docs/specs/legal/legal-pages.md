# Páginas legales: términos, privacidad, cookies y devoluciones

**Estado**: approved
**Aprobado por**: Nelson (usuario), 2026-10-07 (aprobación de la Fase 1 al responder las decisiones abiertas; la Fase 2 depende además de la spec libro-de-reclamaciones)
**Fase**: 1 de 2

## Contexto

La referencia (https://ticketera.mentec.dev/) publica cuatro páginas legales. En Ticketera solo existe `/privacidad` (política mínima de newsletter, `src/components/privacy-policy.tsx`) y en la columna "Legal" del footer las otras tres son texto sin enlace. Se pide crear `/terminos`, `/cookies` y `/devoluciones`, ampliar `/privacidad`, enlazar las cuatro desde el footer y, por decisión del usuario, corregir en el checkout y la confirmación los textos que hoy prometen un envío de correo inexistente y enlazar la casilla de aceptación a los términos y la privacidad. "Centro de ayuda" queda fuera (en la referencia `/ayuda` da 404).

Se usa la **estructura de secciones** de la referencia como modelo, **sin copiar ningún texto**. El contenido es un **borrador sin revisión legal profesional** y así se declara en cada página (el usuario no indicó que habrá revisión).

El **Libro de Reclamaciones** se especifica aparte (`docs/specs/legal/libro-de-reclamaciones.md`, ruta `/libro-de-reclamaciones`; al cierre de esta edición ese archivo aún no existe). Esta spec solo lo menciona/enlaza una vez que la ruta exista (AC-17).

## Decisiones resueltas

Resueltas por el usuario; esta spec las asume. Cualquier cambio posterior la devuelve a `draft`.

| Q | Decisión |
|---|---|
| Q-1 Pagos | Los Términos se redactan **como si hubiera pago**, con redacción genérica ("medio de pago habilitado en la plataforma"): **sin** nombrar pasarelas, cifrado, tarjetas ni certificaciones y **sin** prometer comprobantes que no existan. Riesgo advertido al usuario y aceptado (ver Riesgos R-1). |
| Q-10 Checkout | **Se incluye**: corregir "Enviaremos tus entradas al correo" (no existe envío) por algo verdadero (las entradas quedan en "Mis entradas") en `checkout-form.tsx` y `confirmation-view.tsx`, y enlazar la casilla de términos a `/terminos` y `/privacidad` en pestaña nueva con foco visible. |
| Q-2 a Q-8, Q-11 Datos de empresa | Usados **literalmente** (sin completar): razón social/proveedor "TicketYa.com"; RUC 20513249510; domicilio "Calle las Acasias Nro 1850" (el usuario no dio distrito ni ciudad: **no se agregan**); correo de atención al cliente y correo para derechos ARCO: atencion@inkasign.com; ley aplicable y jurisdicción: leyes del Perú y tribunales de Lima; conservación de datos: mientras la cuenta esté activa; hosting: Vercel (sin región ni certificaciones). Se cargan en `LEGAL_CONFIG`. |
| Q-6 Libro de Reclamaciones | Se implementa en **otra spec** (`libro-de-reclamaciones.md`). Aquí las páginas lo mencionan y enlazan a `/libro-de-reclamaciones` **solo cuando esa ruta exista** (AC-17, tarea T-8). |
| Q-7 Devoluciones | Criterio delegado por el usuario (basado en búsqueda web, **a verificar por revisión legal**): ver "Contenido de Devoluciones". |
| Q-4 ARCO | Se ejercen por escrito a atencion@inkasign.com; plazos de fuentes secundarias (ver R-6). |
| Q-9 Cookies de Clerk | No se afirman nombres ni duraciones; se describen **por función**. |
| Q-13 Revisión legal | No indicada: se mantiene el aviso de borrador (AC-2). |
| Q-17 Marca | **Confirmado**: "Ticketera" es una marca de TicketYa.com. Las cuatro páginas muestran "Ticketera es una marca de TicketYa.com" en el pie de `LegalPage` (lo más simple: aparece en todas sin depender de que exista una sección de proveedor) y TicketYa.com figura como proveedor/titular. La advertencia del RUC pendiente de verificación y la del dominio del correo (inkasign.com) se mantienen como riesgo (R-4, R-5). |
| Q-16 Confirmación | **Sí** se corrigen en `confirmation-view.tsx` "Muestra tu QR" y "descargar tus entradas" (el QR es decorativo y no hay descarga): se reemplazan por textos verdaderos (tus entradas están en "Mis entradas", con su código único). Ampliados AC-16, AC-18 y T-7. |
| Q-19 Revisión legal | Se mantiene el aviso de borrador sin revisión legal profesional en todas las páginas (AC-2). |
| Q-18 Footer y Libro | Default aceptado: el footer no enlaza al Libro; lo decide `libro-de-reclamaciones.md` (hoy en `draft`). T-8 sigue bloqueada hasta que exista la ruta `/libro-de-reclamaciones` implementada. |
| Conservación de reclamos | 2 años; solo se menciona si las páginas hablan del Libro (tras T-8), con la marca "a verificar contra el Reglamento vigente" (R-6). |
| Q-14 / Q-15 | Route group `(legal)` y sufijo `*.content.ts` aceptados; `updatedAt` = 2026-10-07. |
| Q-12 Newsletter | No respondida: se mantiene la redacción vigente aprobada en `newsletter-subscription.md` ("para enviarte novedades de eventos"). La baja **se tramita por correo** a atencion@inkasign.com (no hay automatización). |

## Verificación del producto (base de las afirmaciones)

Revisado en el código el 2026-10-07.

| Tema | Hallazgo (archivo) | Consecuencia para el texto |
|---|---|---|
| Cookies propias | Ningún `document.cookie` ni `cookies()` en `src/`. Solo `ClerkProvider` (`src/app/layout.tsx`) y `clerkMiddleware` (`src/proxy.ts`) | Solo cookies de sesión/seguridad de Clerk, descritas por función, sin nombres |
| Almacenamiento local | **Solo `sessionStorage`**: `ticketera-purchase` (`eventId`, `quantities`, `seats`; `purchase.store.ts`) y `ticketera-synced:<userId>` (marca "1"; `header-account.tsx`). Sin `localStorage` | Se describen ambas; se borran al cerrar la pestaña |
| Analítica / publicidad | Ninguna dependencia. Poppins vía `next/font/google` (descarga en build) | Se afirma que no usamos cookies de analítica ni publicidad |
| Datos del usuario | Tabla `users`: id de Clerk, correo, nombre, URL de avatar, correo verificado, proveedores de acceso, último inicio de sesión; sincronizada por webhook de Clerk y `/api/auth/sync` | Se listan |
| Datos de compra | `orders`, `order_items`, `tickets` (token `qr_code`, estado). El servidor **no guarda** nombre del comprador, documento, celular ni tarjeta (`purchase.service.ts`/`purchase.query.ts` solo usan al usuario autenticado; `PurchaseRequest` no incluye tarjeta). Reconfirmar en `purchase.actions.ts` | Se afirma que esos datos del formulario no se almacenan |
| Newsletter | `newsletter_subscribers` (`email`, `created_at`); sin baja automática ni doble opt-in | Se conserva la declaración vigente; la baja se tramita por correo |
| Pago | **No hay pasarela**: `buildPurchaseRows` crea la orden en `paid` sin cobro; Stripe solo existe como columnas del schema | **Contradice** lo que dirán los Términos por decisión de Q-1 (ver R-1) |
| Entradas / QR | QR **decorativo** (`decorative-qr.tsx`); nada escribe `redeemedAt`; no hay lectura en el ingreso | Los Términos no prometen acceso por QR validado |
| Correos | Sin dependencia de envío; `notifications` no se escribe. `checkout-form.tsx:60` ("Enviaremos tus entradas al correo...") y `confirmation-view.tsx:18,33` ("Revisa tu correo", "Enviamos tus entradas a...") afirman un envío inexistente | Se corrigen en esta spec (T-7); las páginas legales no afirman correos de entradas ni comprobantes |
| Cancelación de evento | `event_status = cancelled`; `cancelEvent` solo cambia el estado (sale del catálogo, no se puede comprar); no hay reembolso, anulación de órdenes ni aviso (`event-cancel-delete.md`) | La política de devoluciones (decisión del usuario) promete 100%: hoy no hay mecanismo automatizado, se tramita por correo (R-2) |
| Terceros | Clerk, Neon (Postgres), Unsplash (imágenes de ejemplo), Vercel (hosting, dato del usuario) | Se nombran esos cuatro |
| Rutas | `src/proxy.ts` solo protege `/admin`, `/organizer`, checkout, confirmation y `/my-tickets` | Las cuatro rutas legales son públicas, sin cambios en el proxy |
| Metadata | Raíz con `title` placeholder "Create Next App"; `/privacidad` usa `"Política de privacidad · Ticketera"` | Mismo patrón por página |
| Referencias existentes | `promo-banner.tsx` enlaza a `/privacidad`; `promo-banner.test.tsx` y `promo-banner.layout.test.tsx` renderizan solo el banner (sin Footer) y buscan el enlace "política de privacidad". **No existen tests** de `checkout-form.tsx` ni `confirmation-view.tsx`; los únicos tests de checkout (`checkout.schema.test.ts`, `purchase.*.test.ts`, `order-read.mapping.test.ts`) no dependen de estos textos | Revisados: nada se rompe por los cambios de texto; se agregan tests nuevos (T-7) |

## Decisión: ampliar `/privacidad`, no reemplazarla

La política actual es verdadera pero incompleta. Se reemplaza su contenido por una política completa **en la misma URL**, conservando la declaración sobre el newsletter. El enlace de `promo-banner.tsx` y sus tests no cambian. `src/components/privacy-policy.tsx` se elimina (su contenido migra a datos en `src/modules/legal/`).

## Alcance

- **Incluye**:
  - Cuatro páginas públicas estáticas: `/terminos`, `/privacidad` (ampliada), `/cookies`, `/devoluciones`, en español, con `h1` + `h2` numerados, columna estrecha y pie "Última actualización".
  - Aviso de borrador sin revisión legal en cada página.
  - `LegalPage` compartido, tipos, `LEGAL_CONFIG` cargado con los datos de empresa, contenido como datos tipados, layout de route group `(legal)`.
  - Enlaces `href` en el footer para los 4 ítems de "Legal" y ajuste de `footer.test.tsx`.
  - Corrección de textos de checkout y confirmación y enlaces de la casilla de términos (T-7).
  - Activación de menciones/enlaces al Libro de Reclamaciones cuando exista su ruta (T-8).
- **No incluye**: "Centro de ayuda"; Sobre nosotros, Contacto, Trabaja con nosotros; el Libro de Reclamaciones en sí (otra spec); un enlace al Libro en el footer (lo decide la spec del Libro); automatizar devoluciones, ARCO o baja del newsletter; banner de consentimiento de cookies; i18n; CMS; tabla de contenidos; versionado; cambios en `proxy.ts`, `promo-banner*` ni `layout.tsx` raíz; cambiar la lógica de compra (la orden sigue creándose `paid` sin cobro); cambiar el copyright "© Ticketera" del footer; tocar `confirmation-actions.tsx` (botón "Imprimir") ni `OrderTicketCard` (el QR decorativo sigue mostrándose).

## Criterios de aceptación

- **AC-1**: `LegalPage` recibe `{ title, intro?, updatedAt, sections }` y renderiza un `<article>` con **un único `h1`**, el aviso de borrador, la introducción opcional, una `<section aria-labelledby>` por sección con un `h2` numerado automáticamente ("1. Título", por posición en el array) y un pie con "Última actualización: <fecha>" (`formatDate` de `src/lib/format.ts`) y, si el documento trae `notice`, esa nota ("Ticketera es una marca de TicketYa.com"; los 4 builders la generan desde `LEGAL_CONFIG.brandName` + `legalName` y la omiten si falta alguno). Párrafos en `<p>`, listas en `<ul>`, enlaces opcionales (`links`) como `next/link` en una lista tras los párrafos. Sin saltos de nivel (h1 → h2).
- **AC-2**: aviso de borrador fijo en el componente ("Este documento es un borrador informativo y no ha sido revisado por un profesional legal.") visible en las cuatro páginas antes de las secciones, como texto (no solo color), contraste AA con tokens existentes.
- **AC-3**: `/terminos`: `metadata.title` "Términos y condiciones · Ticketera", `h1` "Términos y condiciones". Secciones: Información del proveedor ("Ticketera es una marca de TicketYa.com"; TicketYa.com como proveedor, RUC 20513249510, domicilio "Calle las Acasias Nro 1850", sin distrito ni ciudad), Objeto y aceptación, Cuenta de usuario, Rol de la plataforma y del organizador, Compra de entradas, Entradas digitales y acceso, Cancelaciones y devoluciones (remite a `/devoluciones`), Obligaciones del usuario, Propiedad intelectual, Datos personales (remite a `/privacidad` y `/cookies`), Atención al consumidor (correo atencion@inkasign.com; menciona el Libro solo según AC-17), Cambios en los términos, Ley aplicable y jurisdicción (leyes del Perú y tribunales de Lima).
- **AC-4**: `/privacidad`: `metadata.title` "Política de privacidad · Ticketera", `h1` "Política de privacidad". Secciones: Responsable del tratamiento (TicketYa.com, titular de la marca Ticketera, RUC, domicilio, correo), Datos que recopilamos, Finalidades, Consentimiento y base legal, Destinatarios y encargados (Clerk, Neon, Vercel, Unsplash), Transferencia internacional, Plazo de conservación ("mientras tu cuenta esté activa"), Derechos sobre tus datos y cómo ejercerlos (por escrito a atencion@inkasign.com, con los plazos de R-6), Seguridad, Cookies y almacenamiento local, Cambios. Conserva la declaración del newsletter ajustada: solo el correo, para enviar novedades, no se comparte con terceros, y la baja se tramita por correo a atencion@inkasign.com (no hay mecanismo automático). El enlace desde `promo-banner.tsx` sigue funcionando sin modificarlo.
- **AC-5**: `/cookies`: `metadata.title` "Política de cookies · Ticketera", `h1` "Política de cookies". Secciones: Qué son, Cookies que usamos, Almacenamiento local, Por qué no pedimos consentimiento, Cómo gestionarlas, Cambios. Solo lo verificado: cookies de sesión y seguridad del servicio de autenticación (Clerk) descritas por función y **sin nombres ni duraciones**; `sessionStorage` (`ticketera-purchase`, `ticketera-synced:<id de usuario>`) que se borra al cerrar la pestaña; sin `localStorage`; sin analítica ni publicidad.
- **AC-6**: `/devoluciones`: `metadata.title` "Garantía y devoluciones · Ticketera", `h1` "Garantía y devoluciones". Contenido según "Contenido de Devoluciones". Secciones: Alcance, Cancelación del evento, Reprogramación o cambios, Devolución a pedido del cliente, Cómo solicitar una devolución, Garantía legal, Reclamos.
- **AC-7** (veracidad): el contenido **no** nombra pasarelas, procesadores, cifrado/SSL, tarjetas ni certificaciones; **no** promete comprobantes de pago, envío de entradas por correo, acceso por QR validado, procesos automáticos de devolución/ARCO/baja ni cifras o plazos distintos a los de esta spec; **no** cita artículos de ley (solo las leyes con número que esta spec indica: Ley N.º 32415, Ley N.º 29571, Ley N.º 29733 y D.S. N.º 016-2024-JUS, y el Reglamento del Libro de Reclamaciones por nombre). Sí afirma lo verificado: qué datos se guardan y cuáles no, terceros, cookies/almacenamiento, y que devoluciones, ARCO y bajas se tramitan por correo. Un test impide palabras prohibidas (`Stripe`, `Culqi`, `Niubiz`, `Visa`, `Mastercard`, `SSL`, `TLS`, `cifrad`, `PCI`, `comprobante`) en todos los documentos.
- **AC-8** (datos y omisión): los datos de empresa viven en `LEGAL_CONFIG` (`src/modules/legal/content/legal-config.ts`) con los valores literales de Decisiones resueltas; los builders de contenido aceptan un `LegalConfig` parcial y, si un dato falta, omiten la frase/sección que lo requiere (nunca `[RUC]`, `TBD`, `TODO`, `undefined` ni corchetes). Los tests de contenido verifican la salida con `LEGAL_CONFIG` real **y** con `{}`.
- **AC-9**: las cuatro rutas son públicas (no están en `isPrivateRoute`; `src/proxy.ts` sin cambios), estáticas (sin base de datos, `cookies()`/`headers()` ni `"use client"` en páginas ni en `LegalPage`) y comparten `src/app/(legal)/layout.tsx` con `Header`, `<main>` (ancho y padding como el `/privacidad` actual) y `Footer`; `LegalPage` usa el contenedor `max-w-3xl`.
- **AC-10**: `FOOTER_COLUMNS` enlaza "Términos y condiciones" → `/terminos`, "Política de privacidad" → `/privacidad`, "Política de cookies" → `/cookies`, "Garantía y devoluciones" → `/devoluciones`; los demás ítems siguen como texto. `footer.test.tsx` verifica los 4 enlaces con su `href` y que el total de enlaces es 4.
- **AC-11** (tests): (a) `legal-page.test.tsx`: un `h1`, `h2` numerados consecutivos, `<section>` etiquetada por su `h2`, fecha formateada, aviso de borrador, enlaces opcionales, omitir una sección renumera. (b) Un `*.content.test.ts` por documento: títulos esperados de AC-3 a AC-6, ids únicos, `updatedAt` ISO válida, sin palabras prohibidas ni marcadores (AC-7/AC-8), con config real y con `{}`. (c) Un `page.test.tsx` por página: `h1` y `metadata.title`.
- **AC-12** (accesibilidad): un `h1` por página; `h2` por sección; títulos distintos entre páginas; contraste AA con tokens existentes; `leading-relaxed`; sin enlaces vacíos; foco visible en enlaces (los de `LegalPage` usan las clases de foco del footer).
- **AC-13**: `npm run lint`, `npm run test` y `npm run build` pasan; `promo-banner.test.tsx` y `promo-banner.layout.test.tsx` pasan sin cambios; `/privacidad` se define una sola vez (bajo `(legal)`); no queda `src/components/privacy-policy.tsx`.
- **AC-14** (checkout, texto): en `checkout-form.tsx` la frase "Enviaremos tus entradas al correo que indiques." se reemplaza por un texto verdadero: tus entradas quedarán disponibles en "Mis entradas" (conservando "Los campos con * son obligatorios"). No queda ninguna afirmación de envío de correo en el formulario.
- **AC-15** (checkout, enlaces): la casilla de aceptación muestra "Términos y condiciones" y "Política de privacidad" como `<a>`/`next/link` a `/terminos` y `/privacidad`, con `target="_blank"` y `rel="noopener noreferrer"`, subrayado y foco visible (`focus-visible:ring-2 focus-visible:ring-ring`), contraste AA, y que indiquen que abren en una pestaña nueva (texto `sr-only` "(se abre en una pestaña nueva)"). Hacer clic en los enlaces **no** marca ni desmarca la casilla (los enlaces se mantienen dentro del `<label>` solo si se evita el cambio de estado con `onClick={(e) => e.stopPropagation()}`; alternativa preferida: sacarlos del `<label>` y mantener la casilla etiquetada por un `<span id>` vía `aria-labelledby`/`aria-describedby`). Los atributos de error (`fieldA11yProps`, `FieldError`) no cambian.
- **AC-16** (confirmación, texto): en `confirmation-view.tsx` desaparecen "Enviamos tus entradas a <correo>", el paso "Revisa tu correo / el comprobante de pago", el paso "Muestra tu QR" (el QR es decorativo y no se valida en el ingreso) y la promesa de "descargar tus entradas" (no hay descarga). El encabezado dice que tus entradas están en "Mis entradas", cada una con su código único. Los pasos pasan a dos tarjetas (grid de 2 columnas en `sm`): "Todo en Mis entradas" ("Entra con tu cuenta para ver tus entradas cuando quieras.") y "Tu código único" ("Cada entrada tiene un código único que verás en Mis entradas."), con iconos `Ticket` y `Hash` de lucide. Ningún texto menciona correo, comprobante, QR como acceso ni descarga. `order.buyerEmail` deja de mostrarse (el campo del servicio no se toca). El botón "Imprimir" de `confirmation-actions.tsx` no se modifica.
- **AC-17** (Libro de Reclamaciones, dependencia): mientras `LEGAL_CONFIG.complaintsBookUrl` sea `undefined`, ningún documento menciona ni enlaza al Libro; los textos de atención/reclamos remiten solo al correo. Cuando exista la ruta `/libro-de-reclamaciones` (implementada por su propia spec), T-8 fija `complaintsBookUrl: "/libro-de-reclamaciones"` y los documentos pasan a mencionarlo con un enlace interno (Términos §Atención al consumidor, Privacidad si aplica y Devoluciones §Reclamos: "respuesta en máximo 15 días hábiles", plazo del Reglamento del Libro de Reclamaciones, ver R-6). T-8 no puede ejecutarse hasta que esa ruta exista en el repo.
- **AC-18** (tests de checkout/confirmación): `checkout-form.test.tsx` verifica que no aparece "correo" en la frase de datos del comprador, que los dos enlaces tienen `href`, `target="_blank"`, `rel` con `noopener` y que no alteran el estado de la casilla; `confirmation-view.test.tsx` (con `ConfirmationActions` y `OrderTicketCard` mockeados) verifica que no aparecen "Enviamos", "Revisa tu correo", "comprobante", "Muestra tu QR" ni "descargar", y que sí aparecen "Mis entradas" y "código único". Además, en un test de `legal-page.test.tsx` y en los `*.content.test.ts`: la nota "Ticketera es una marca de TicketYa.com" aparece en el pie de las cuatro páginas con la config real y no aparece con `{}`.

## Contratos

```ts
// src/modules/legal/types/legal.types.ts
export interface LegalLink { label: string; href: string }   // href interno

export interface LegalSection {
  /** Id estable y único dentro del documento (slug); se usa para aria-labelledby. */
  id: string;
  /** Sin número: LegalPage numera por posición. */
  title: string;
  paragraphs: string[];
  items?: string[];
  links?: LegalLink[];
}

export interface LegalDocument {
  title: string;
  intro?: string;
  /** Nota de pie, p. ej. "Ticketera es una marca de TicketYa.com". */
  notice?: string;
  /** ISO 8601 con offset de Lima (evita corrimiento de día en formatDate): "2026-10-07T12:00:00-05:00". */
  updatedAt: string;
  sections: LegalSection[];
}

// src/modules/legal/components/legal-page.tsx (server component, sin estado)
export function LegalPage(props: LegalDocument): JSX.Element;

// src/modules/legal/content/legal-config.ts
export interface LegalConfig {
  brandName?: string; legalName?: string; ruc?: string; address?: string;
  customerServiceEmail?: string; rightsEmail?: string;
  retention?: string; governingLaw?: string; hosting?: string;
  complaintsBookUrl?: string;
}
export const LEGAL_CONFIG: LegalConfig = {
  brandName: "Ticketera", // marca de TicketYa.com (confirmado por el usuario)
  legalName: "TicketYa.com",
  ruc: "20513249510", // pendiente de verificación por el titular (no confirmado en SUNAT)
  address: "Calle las Acasias Nro 1850", // sin distrito ni ciudad: el titular no los indicó
  customerServiceEmail: "atencion@inkasign.com",
  rightsEmail: "atencion@inkasign.com",
  retention: "mientras la cuenta esté activa",
  governingLaw: "leyes del Perú y tribunales de Lima",
  hosting: "Vercel",
  // complaintsBookUrl: se define en T-8 cuando exista /libro-de-reclamaciones
};

// src/modules/legal/content/{terms,privacy,cookies,returns}.content.ts
export function buildTermsDocument(config?: LegalConfig): LegalDocument;   // idem Privacy, Cookies, Returns
export const TERMS_DOCUMENT: LegalDocument;                                  // = buildTermsDocument(LEGAL_CONFIG)
```

Convenciones nuevas aceptadas (Q-14): route group `(legal)` y sufijo `*.content.ts` en `src/modules/legal/content/` (no están en `SETUP.md`; actualizarlo es decisión del usuario).

### Contenido de Devoluciones (criterio delegado; a verificar por revisión legal)

1. **Cancelación del evento por el organizador**: devolución del **100% del valor pagado**.
2. **Reprogramación o cambio de fecha, lugar u objeto del evento**: si el comprador no acepta el cambio, puede pedir la devolución del **100%**.
3. **Plazo**: máximo **15 días hábiles desde la solicitud**. Texto: para conciertos, la Ley N.º 32415 regula la venta y devolución de entradas y establece ese plazo; esa ley no aplica a eventos teatrales ni auspiciados por el Ministerio de Cultura; para teatro y otros eventos no cubiertos por esa ley, TicketYa.com aplica el **mismo criterio por decisión comercial** (se dice así, sin atribuirlo a la ley).
4. **Devolución a pedido sin que el evento cambie**: no procede, salvo lo que la ley reconozca al consumidor. Sin citar artículos.
5. **Cómo solicitarla**: por correo a atencion@inkasign.com indicando el **"Pedido N.º" de la confirmación de compra**, el nombre del evento y el código de las entradas (visible en "Mis entradas"). *Corregido tras la revisión: "Mis entradas" NO muestra el número de pedido, solo la confirmación de compra.*. Las devoluciones se tramitan manualmente: no hay un proceso automático.
6. **Reclamos**: Libro de Reclamaciones solo según AC-17; respuesta en máximo 15 días hábiles (plazo del Reglamento del Libro de Reclamaciones). Hasta entonces: reclamos por correo, sin plazo prometido distinto al de las devoluciones.
7. **Garantía legal**: remisión general al Código de Protección y Defensa del Consumidor (Ley N.º 29571); sin artículos.

### Contenido por documento: reglas

- **Términos §Compra** (Q-1): lenguaje de compra con pago pero genérico: "pagas con el medio de pago habilitado en la plataforma"; sin pasarelas/cifrado/tarjetas/certificaciones ni comprobantes. §Entradas: se ven en "Mis entradas"; sin promesa de correo ni de validación de QR. Cancelación/devolución: remite a `/devoluciones`.
- **Privacidad §Datos**: lista de la tabla de verificación; el formulario del checkout pide nombre, documento, celular y método de pago pero **no se guardan**. §Destinatarios: Clerk (autenticación), Neon (base de datos), Vercel (hosting; sin región ni certificaciones) y Unsplash (imágenes). §Derechos: plazos de R-6, contados desde el día siguiente a la recepción. §Seguridad: genérica (acceso protegido por sesión y permisos en servidor; ninguna medida es infalible), sin cifrado ni certificaciones.
- **Cookies**: como AC-5. No nombrar cookies de Clerk (Q-9).

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Política `/privacidad` | `src/components/privacy-policy.tsx` + `src/app/privacidad/page.tsx` | **extender/generalizar**: su estructura y estilos pasan a `LegalPage` + `privacy.content.ts`; se eliminan ambos archivos |
| Cascarón de página | `src/app/privacidad/page.tsx`, `src/app/events/page.tsx`; `Header`, `Footer` | **reusar** `Header`/`Footer`; cascarón en `src/app/(legal)/layout.tsx` |
| `PageSection` | `src/components/page-section.tsx` (h2 de landing, `max-w-7xl`) | **no reusar** (no encaja en columna legal ni numera) |
| Formato de fecha | `formatDate` en `src/lib/format.ts` | **reusar** |
| Enlaces del footer | `FOOTER_COLUMNS` + `FooterItem.href` | **reusar** (solo datos) |
| Enlace en pestaña nueva con foco | clases de foco del `<Link>` del footer; `next/link` | **reusar** el patrón en checkout y `LegalPage` |
| Casilla y errores del checkout | `fieldA11yProps`, `FieldError`, `RequiredMark` de `src/components/form-field.tsx` | **reusar**, sin cambios |
| Componentes shadcn | `npx shadcn@latest search @shadcn -q "legal"` / `"prose"` / `"typography"`: sin componente aplicable; `@tailwindcss/typography` no instalado | **ninguno a agregar** (YAGNI) |
| Fuente única de datos de empresa | nada en `src/` | **crear** `LEGAL_CONFIG` |
| Contenido legal tipado | nada en `src/` | **crear** `src/modules/legal/` |
| Tests de componente | patrón RTL + Vitest de `footer.test.tsx` | **reusar** |

## Plan de tareas

### Fase 1 (6 tareas)

#### Grupo 0 (serial: contratos, componente compartido y cascarón)
- T-1: Tipos, `LEGAL_CONFIG` con los datos de empresa, `LegalPage` con test y layout del route group — archivos: `src/modules/legal/types/legal.types.ts`, `src/modules/legal/content/legal-config.ts`, `src/modules/legal/components/legal-page.tsx`, `src/modules/legal/components/legal-page.test.tsx`, `src/app/(legal)/layout.tsx` — tests: sí — cubre: AC-1, AC-2, AC-8, AC-9, AC-11a, AC-12

#### Grupo 1 (paralelo; archivos disjuntos)
- T-2: Términos y condiciones — archivos: `src/modules/legal/content/terms.content.ts`, `src/modules/legal/content/terms.content.test.ts`, `src/app/(legal)/terminos/page.tsx`, `src/app/(legal)/terminos/page.test.tsx` — tests: sí — cubre: AC-3, AC-7, AC-8, AC-11b/c, AC-17 (rama sin Libro)
- T-3: Política de privacidad (migra y amplía; elimina `src/components/privacy-policy.tsx` y `src/app/privacidad/page.tsx`) — archivos: `src/modules/legal/content/privacy.content.ts`, `src/modules/legal/content/privacy.content.test.ts`, `src/app/(legal)/privacidad/page.tsx`, `src/app/(legal)/privacidad/page.test.tsx`, y eliminación de los 2 archivos antiguos (6 archivos tocados; excepción justificada: el movimiento de una sola ruta debe ir junto para no duplicar `/privacidad`) — tests: sí — cubre: AC-4, AC-7, AC-8, AC-11b/c, AC-13, AC-17
- T-4: Política de cookies — archivos: `src/modules/legal/content/cookies.content.ts`, `src/modules/legal/content/cookies.content.test.ts`, `src/app/(legal)/cookies/page.tsx`, `src/app/(legal)/cookies/page.test.tsx` — tests: sí — cubre: AC-5, AC-7, AC-11b/c
- T-5: Garantía y devoluciones — archivos: `src/modules/legal/content/returns.content.ts`, `src/modules/legal/content/returns.content.test.ts`, `src/app/(legal)/devoluciones/page.tsx`, `src/app/(legal)/devoluciones/page.test.tsx` — tests: sí — cubre: AC-6, AC-7, AC-8, AC-11b/c, AC-17

#### Grupo 2 (serial: requiere que existan las rutas)
- T-6: Enlaces del footer — archivos: `src/components/footer.tsx`, `src/components/footer.test.tsx` — tests: sí — cubre: AC-10, AC-13

### Fase 2 (2 tareas; tras cerrar la fase 1)

#### Grupo 3 (paralelo; archivos disjuntos de todo lo anterior; T-7 enlaza a `/terminos` y `/privacidad`, que ya existen)
- T-7: Corrección de textos y enlaces del checkout/confirmación (incluye QR y descarga en la confirmación) — archivos: `src/modules/checkout/components/checkout-form.tsx`, `src/modules/checkout/components/checkout-form.test.tsx`, `src/modules/checkout/components/confirmation-view.tsx`, `src/modules/checkout/components/confirmation-view.test.tsx` — tests: sí (nuevos; no existían) — cubre: AC-14, AC-15, AC-16, AC-18

#### Grupo 4 (bloqueada: solo cuando exista la ruta `/libro-de-reclamaciones` en el repo)
- T-8: Activar menciones y enlaces al Libro de Reclamaciones — archivos: `src/modules/legal/content/legal-config.ts`, `src/modules/legal/content/legal-config.test.ts` — tests: sí (si `complaintsBookUrl` está definido, empieza con "/" y coincide con la ruta existente; los `*.content.test.ts` ya cubren ambas ramas) — cubre: AC-17. Si la spec del Libro cambia la ruta, se ajusta aquí.

Orden de dependencias: T-1 → T-2..T-5 → T-6; T-7 después de T-2/T-3; T-8 después de la implementación completa de `libro-de-reclamaciones.md`. El footer (T-6) no enlaza al Libro.

## Riesgos

- **R-1 (decisión explícita del usuario, Q-1)**: los Términos se redactan como si hubiera pago, pero **lo verificado es que la orden se crea `paid` sin cobro** (no hay pasarela ni cobro real). La mitigación acordada (redacción genérica, sin pasarelas, cifrado, tarjetas, certificaciones ni comprobantes) reduce pero no elimina el riesgo de que el texto sea engañoso para el consumidor. Queda como decisión del usuario.
- **R-2**: la política de devolución del 100% depende de un proceso manual por correo; no existe en el código ningún mecanismo de reembolso, anulación de órdenes (`refunded` sin uso) ni aviso al cancelar un evento. El texto lo dice así (AC-6).
- **R-3 (marca vs razón social)**: resuelto. El usuario confirmó que "Ticketera" es una marca de TicketYa.com; las páginas lo declaran en el pie y usan TicketYa.com como proveedor. El copyright del footer del sitio ("© Ticketera") no se modifica.
- **R-4 (RUC)**: 20513249510 **no se pudo verificar en SUNAT** (la búsqueda no devolvió datos); queda como "pendiente de verificación por el titular". Se carga literal; no se agrega nada más.
- **R-5 (correo)**: atencion@inkasign.com pertenece al dominio inkasign.com, distinto de TicketYa.com; posible discrepancia a confirmar con el titular (Q-17).
- **R-6 (plazos y leyes de fuentes secundarias, verificar en el texto oficial)**: ARCO (Ley N.º 29733 y Reglamento D.S. N.º 016-2024-JUS): información 8 días hábiles, acceso 20, rectificación/cancelación/oposición 10, desde el día siguiente a la recepción. Devoluciones: Ley N.º 32415 (conciertos; 15 días hábiles; excluye teatro y eventos auspiciados por el Ministerio de Cultura). Libro de Reclamaciones: respuesta en 15 días hábiles; conservación de reclamos 2 años (solo se menciona tras T-8; "a verificar contra el Reglamento vigente"). Código de Protección y Defensa del Consumidor, Ley N.º 29571. Todo se publica como borrador sin revisión legal.
- **R-7 (honestidad residual)**: se prometen devoluciones, ARCO y bajas por correo; si nadie atiende ese buzón, el texto sería falso. Responsabilidad operativa del titular.
- **R-8**: resuelto por Q-16 (T-7 corrige los textos de QR y descarga). El QR decorativo sigue mostrándose en `OrderTicketCard`; no se toca.
- **R-9**: `promo-banner*` no se modifica; sus tests renderizan solo el banner. Solo hay que conservar la ruta `/privacidad` (una sola definición, bajo `(legal)`).
- **R-10 (accesibilidad)**: un `h1`, `h2` por sección, landmarks del layout, contraste con tokens, enlaces nuevos del checkout con foco visible y aviso de pestaña nueva.
- **R-11**: páginas estáticas; `Header` contiene componentes cliente de Clerk como hoy en `/privacidad`. Los tests de página importan solo `page.tsx` (sin layout) para no mockear Clerk. Verificar en `npm run build` que no consultan la base.

## Preguntas abiertas

Ninguna bloqueante para la fase 1.

- **Q-12** (sin respuesta): redacción de la finalidad del newsletter; se mantiene el default (la vigente).
- Pendientes no bloqueantes, ya cubiertos por riesgos: verificación del RUC (R-4), dominio del correo (R-5) y revisión legal de leyes y plazos (R-6).
- T-8 (fase 2) depende de que se apruebe e implemente `libro-de-reclamaciones.md`.
