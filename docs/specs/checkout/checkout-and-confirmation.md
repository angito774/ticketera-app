# Checkout y confirmación de compra (mock data)

**Estado**: done
**Aprobado por**: usuario — 2026-09-29
**Fase**: 2 de 5 del flujo de compra (ver `docs/specs/tickets/purchase-flow.md` › Plan de fases)

## Contexto

La Fase 1 (`docs/specs/tickets/purchase-flow.md`, `done`) entregó el detalle de evento y la selección de entradas; su botón "Continuar" enlaza a `/events/[id]/checkout`, que hoy da 404. Esta fase entrega las pantallas **5 · Checkout y pago** y **6 · Confirmación de compra** del diseño de Claude Design (escritorio 1440 + móvil 390), con el mismo alcance: solo UI/UX, sin backend, pagos ni envío de correos. El "pago" solo valida el formulario y genera un pedido mock en el cliente.

## Alcance

- **Incluye**:
  - Ruta `/events/[id]/checkout`: header de compra en paso 2, aviso de reserva con cuenta regresiva, "Datos del comprador", "Método de pago" (Tarjeta / Yape / PagoEfectivo), aceptación de términos y resumen con "Pagar S/ X". En escritorio el resumen es lateral; en móvil es un bloque plegable arriba y el botón de pago va en la barra fija inferior (`StickyBottomBar`).
  - Validación del formulario con `zod` (primer schema del repo: fija la convención).
  - Ruta `/events/[id]/confirmation`: header en paso 3, "¡Compra confirmada!", número de pedido, tarjeta de entrada con QR decorativo y paginador "Entrada 1 de N", acciones y bloque "Qué sigue".
  - Persistencia de la selección y del pedido en `sessionStorage` para que recargar el checkout o la confirmación no pierda los datos.
  - Módulo nuevo `src/modules/checkout/`.
- **No incluye**:
  - Pasarela de pago real, tokenización de tarjetas, QR de Yape ni código de PagoEfectivo reales. Los datos de tarjeta **no se guardan** en ningún store ni en `sessionStorage`: solo se validan en memoria.
  - Envío de correo, generación real de PDF (el botón "Descargar PDF" abre el diálogo de impresión del navegador), bloqueo real de asientos en un servidor.
  - "Mis entradas" (Fase 4): el botón "Ver mis entradas" enlaza a `/my-tickets`, ruta que entrega la Fase 4.
  - Cupones, costos de servicio, facturación.
  - Dark mode.

## Criterios de aceptación

- **AC-1**: `/events/[id]/checkout` muestra el `PurchaseHeader` en paso 2 (paso 1 con check), con "Volver a entradas" hacia `/events/[id]/tickets`. Un `id` inexistente responde con 404.
- **AC-2**: Si no hay entradas seleccionadas para ese evento (acceso directo o selección vacía), se muestra un estado vacío con un enlace "Elegir entradas" a `/events/[id]/tickets`, en lugar del formulario.
- **AC-3**: Un aviso muestra "Reservamos tus entradas por MM:SS" con cuenta regresiva de 10 minutos desde que se entra al checkout; la reserva sobrevive a recargas (misma hora de vencimiento). Al llegar a 00:00 el aviso cambia a "Tu reserva expiró", el botón de pago queda deshabilitado y se ofrece "Volver a elegir entradas" (reinicia la reserva y vuelve a la selección).
- **AC-4**: "Datos del comprador" tiene nombre completo, correo, tipo de documento (DNI / CE / Pasaporte) + número, y celular, con `label` visible y `autocomplete` adecuado. "Método de pago" es un grupo de radios accesible con Tarjeta (muestra número, vencimiento MM/AA, CVV y nombre en la tarjeta), Yape y PagoEfectivo (cada uno muestra su texto informativo del diseño).
- **AC-5** (con tests del schema): al pulsar "Pagar" el formulario se valida con `zod`; los errores se muestran debajo de cada campo (`aria-invalid`, `aria-describedby`) y el foco va al primer campo inválido. Reglas: nombre ≥ 3 caracteres; correo válido; DNI = 8 dígitos, CE = 9 dígitos, Pasaporte = 6–12 alfanuméricos; celular peruano de 9 dígitos que empieza en 9; con Tarjeta: número de 16 dígitos (se aceptan espacios), vencimiento `MM/AA` no vencido, CVV de 3–4 dígitos, nombre ≥ 3 caracteres. Los campos de tarjeta no se validan con Yape/PagoEfectivo.
- **AC-6**: El botón "Pagar S/ X" está deshabilitado hasta aceptar términos y condiciones (con el texto "Acepta los términos para continuar."). Con datos válidos, "Pagar" muestra un estado "Procesando…" breve, crea el pedido mock y navega a `/events/[id]/confirmation`; la selección de entradas se limpia.
- **AC-7**: El resumen muestra imagen, título, fecha corta y recinto del evento, las líneas de `buildPurchaseSummary` (con asientos por fila en zonas numeradas), "Cambiar entradas" (vuelve a `/events/[id]/tickets` conservando la selección) y el total. En móvil el resumen es plegable (`aria-expanded`) y muestra "N entradas · S/ X" cerrado.
- **AC-8**: `/events/[id]/confirmation` muestra el header en paso 3, ícono de éxito, "¡Compra confirmada!", texto de envío al correo ingresado y "Pedido N.º TK-XXXXX". Si no hay pedido para ese evento, muestra un estado vacío con enlace al evento.
- **AC-9**: La tarjeta de entrada muestra categoría, título, fecha larga y recinto, zona, cantidad y total pagado, y un QR decorativo (21×21 con las tres marcas de esquina, `aria-hidden`, no es un QR real). Con más de una entrada, botones "Entrada anterior" / "Entrada siguiente" y el texto "Entrada k de N" recorren las entradas; cada una muestra su zona y, si es numerada, "Fila B · Asiento 7", y un patrón de QR distinto.
- **AC-10**: Acciones: "Ver mis entradas" (enlace a `/my-tickets`, Fase 4), "Agregar al calendario" (descarga un `.ics` con título, inicio, lugar y dirección del evento) y "Descargar PDF" (abre `window.print()`). Debajo, "Qué sigue" con los 3 pasos del diseño.
- **AC-11** (con tests): `createOrder` arma el pedido a partir del layout, la selección y el comprador: número `TK-` + 5 dígitos, una entrada por unidad (zonas generales repetidas por cantidad; zonas numeradas con su fila y asiento), totales iguales a `buildPurchaseSummary`, y sin datos de tarjeta. `buildDecorativeQr` es determinístico por semilla y conserva las marcas de esquina. `buildCalendarFile` genera un iCalendar válido (`BEGIN:VCALENDAR`, `DTSTART` en UTC, texto escapado).
- **AC-12** (con tests): `useCountdown` devuelve los segundos restantes hasta una fecha, llega a 0 sin valores negativos y marca `isExpired`.
- **AC-13**: Sin scroll horizontal en 375 px; todo con tokens de `globals.css` (paleta índigo, CTA naranja solo en "Pagar"); ninguna llamada de red.

## Contratos

### Schema del comprador y pago (`src/modules/checkout/schemas/checkout.schema.ts`)

```ts
export const DOCUMENT_TYPES = ["DNI", "CE", "PASSPORT"] as const;   // etiquetas: DNI, CE, Pasaporte
export const PAYMENT_METHODS = ["card", "yape", "cash"] as const;    // Tarjeta, Yape, PagoEfectivo

export const checkoutSchema: z.ZodType<CheckoutFormValues>; // objeto + superRefine para documento y tarjeta
export type CheckoutFormValues = {
  fullName: string;
  email: string;
  documentType: (typeof DOCUMENT_TYPES)[number];
  documentNumber: string;
  phone: string;
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  card: { number: string; expiry: string; cvv: string; holder: string }; // solo se valida si paymentMethod === "card"
  acceptedTerms: true;
};
export function getFieldErrors(values: unknown, now?: Date): Partial<Record<CheckoutField, string>>; // "card.number" → mensaje
```

`now` es inyectable para testear el vencimiento de la tarjeta.

### Pedido (`src/modules/checkout/types/order.types.ts` + `services/orders.service.ts`)

```ts
export interface OrderTicket { id: string; zoneName: string; seatLabel: string | null } // "Fila B · Asiento 7"
export interface Order {
  number: string;              // "TK-24817"
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  paymentMethod: PaymentMethod;
  lines: PurchaseLine[];       // de tickets/store
  ticketCount: number;
  total: number;
  tickets: OrderTicket[];
  createdAt: string;           // ISO
}
export function createOrder(input: {
  eventId: string; layout: VenueLayout; selection: PurchaseSelection;
  buyer: Pick<CheckoutFormValues, "fullName" | "email" | "paymentMethod">;
  now?: Date; random?: () => number;   // inyectables para tests
}): Order;
```

### Store del pedido (`src/modules/checkout/store/order.store.ts`)

```ts
interface OrderState {
  order: Order | null;
  reservationExpiresAt: Record<string, string>;   // eventId → ISO
  startReservation(eventId: string, now?: Date): string;   // crea si no existe o si expiró; devuelve el vencimiento
  resetReservation(eventId: string): void;
  completeOrder(order: Order): void;               // guarda el pedido y borra la reserva de ese evento
}
```

Persistido con `zustand/middleware` `persist` + `createJSONStorage(() => sessionStorage)`. `usePurchaseStore` (Fase 1) pasa a persistir también en `sessionStorage` solo `eventId`, `quantities` y `seats`. Para evitar desajustes de hidratación, los componentes que leen stores persistidos esperan a `useHydrated()` (nuevo hook compartido) antes de decidir entre formulario y estado vacío.

### Utilidades

```ts
// src/lib/decorative-qr.ts
export function buildDecorativeQr(seed: number, size?: number /* 21 */): boolean[]; // size*size celdas, true = oscura

// src/lib/calendar.ts
export function buildCalendarFile(event: { id: string; title: string; start: string; durationMinutes?: number; location: string; description?: string }): string;

// src/hooks/use-countdown.ts
export function useCountdown(target: string | null): { secondsLeft: number; isExpired: boolean; label: string /* "09:48" */ };

// src/hooks/use-hydrated.ts
export function useHydrated(): boolean;
```

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Header de pasos | `src/components/purchase-header.tsx` | reusar (pasos 2 y 3) |
| Barra fija móvil | `src/components/sticky-bottom-bar.tsx` | reusar |
| Líneas y totales | `buildPurchaseSummary` en `tickets/store/purchase.store.ts` | reusar (resumen y `createOrder`) |
| Selección de entradas | `usePurchaseStore` | extender: persistencia en `sessionStorage` |
| Formato de precio/fecha | `src/lib/format.ts` | reusar |
| Inputs de texto / select de documento | `src/components/ui/input.tsx`, `select.tsx` | reusar |
| Radio, checkbox, label | shadcn `radio-group`, `checkbox`, `label` | **no se pueden agregar**: el registro de shadcn está bloqueado por la red de este entorno. Se usan `<input type="radio|checkbox">` y `<label>` nativos estilizados con Tailwind (accesibles por defecto). Si luego se agregan los de shadcn, solo cambian `payment-method-field.tsx` y `checkout-form.tsx` |
| Validación de formularios | `zod` instalado sin uso | crear primer schema; sin `react-hook-form` (no está instalado; el formulario es chico: estado local + `safeParse` al enviar) |
| Cuenta regresiva / hidratación | nada en `src/hooks/` | crear `use-countdown.ts` y `use-hydrated.ts` compartidos |

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Contratos y lógica pura: schema zod, tipos de pedido, `createOrder`, `buildDecorativeQr`, `buildCalendarFile`. — archivos: `src/modules/checkout/schemas/checkout.schema.ts` (+ `.test.ts`), `src/modules/checkout/types/order.types.ts`, `src/modules/checkout/services/orders.service.ts` (+ `.test.ts`), `src/lib/decorative-qr.ts` (+ `.test.ts`), `src/lib/calendar.ts` (+ `.test.ts`) — tests: sí — cubre: AC-5, AC-11
- **T-2**: Stores y hooks: `order.store.ts` persistido, persistencia de `usePurchaseStore`, `useCountdown`, `useHydrated`. — archivos: `src/modules/checkout/store/order.store.ts` (+ `.test.ts`), `src/modules/tickets/store/purchase.store.ts`, `src/hooks/use-countdown.ts` (+ `.test.ts`), `src/hooks/use-hydrated.ts` — tests: sí — cubre: AC-3, AC-12

### Grupo 1 (paralelo)

- **T-3**: Formulario de checkout: datos del comprador, método de pago, términos, errores y foco. — archivos: `src/modules/checkout/components/checkout-form.tsx`, `src/modules/checkout/components/payment-method-field.tsx`, `src/modules/checkout/components/form-field.tsx` — tests: no (la lógica está en el schema) — cubre: AC-4, AC-5
- **T-4**: Resumen del checkout (lateral y plegable móvil) y aviso de reserva. — archivos: `src/modules/checkout/components/checkout-summary.tsx`, `src/modules/checkout/components/reservation-notice.tsx` — tests: no — cubre: AC-3, AC-7
- **T-5**: Confirmación: tarjeta de entrada con QR y paginador, acciones, "Qué sigue". — archivos: `src/modules/checkout/components/order-ticket-card.tsx`, `src/modules/checkout/components/decorative-qr.tsx`, `src/modules/checkout/components/confirmation-actions.tsx`, `src/modules/checkout/components/confirmation-view.tsx` — tests: no — cubre: AC-8, AC-9, AC-10

### Grupo 2 (serial)

- **T-6**: Contenedor cliente del checkout (stores + reserva + envío) y las dos rutas. — archivos: `src/modules/checkout/components/checkout-view.tsx`, `src/app/events/[id]/checkout/page.tsx`, `src/app/events/[id]/confirmation/page.tsx` — tests: no — cubre: AC-1, AC-2, AC-6, AC-13

### Notas de implementación (desvíos menores respecto del plan)

- `superRefine` de zod no corre si el objeto base es inválido; para mostrar todos los errores de una vez, las reglas cruzadas (documento según tipo, campos de tarjeta) viven en `crossFieldIssues` y `getFieldErrors` combina ambas. `checkoutSchema` (base + `superRefine`) se exporta igual.
- La selección de entradas se limpia al montar la confirmación (no al pagar), para no mostrar un resumen en S/ 0 durante la navegación.
- `TicketSelection` (Fase 1) también espera a `useHydrated()`, porque su store ahora se persiste en `sessionStorage`.
- `form-field.tsx` exporta además los helpers `checkoutFieldId` / `fieldA11yProps` que usan el formulario y el foco al primer error.

Verificado: `npm run lint`, `npm run test` (82 tests) y `npm run build` en verde; recorrido completo con Playwright en 1440 px y 390 px: estado vacío por acceso directo, errores + foco al primer campo, pago con Tarjeta y Yape, confirmación con 3 entradas paginables, descarga del `.ics`, recarga del checkout (misma reserva) y de la confirmación, reserva vencida (pago deshabilitado y vuelta a la selección), sin scroll horizontal ni errores de consola.

### Cambio posterior (2026-09-29, pedido por el usuario): obligatorios en rojo

- Todos los campos obligatorios llevan un asterisco rojo (`RequiredMark`) y `aria-required`; el formulario aclara "Los campos con * son obligatorios.".
- Un campo se marca en rojo (etiqueta, borde y fondo suave, más el mensaje con ícono) al salir de él si quedó incompleto o inválido, y todos los que falten al pulsar "Pagar". El rojo desaparece en vivo al corregir.
- **Reemplaza a AC-6 en lo del botón deshabilitado**: "Pagar" ya no se deshabilita por no aceptar los términos (solo durante el pago o con la reserva vencida). Al pulsarlo con datos incompletos marca en rojo lo que falta —incluida la casilla de términos—, lleva el foco al primero y muestra "Completa los N campos marcados en rojo para continuar." (`role="alert"`) junto al botón.
- `FormField` compartido suma `required`, `RequiredMark` y `FieldError`; los inputs inválidos tienen fondo rojo suave en toda la app.

## Fases siguientes

Fase 3 (búsqueda), Fase 4 (login/registro + Mis entradas: consumirá `Order` del store), Fase 5 (organizador). Ver `docs/specs/tickets/purchase-flow.md`.

## Preguntas abiertas

Ninguna bloqueante. Decisiones de autoría tomadas (se pueden cambiar al revisar): reserva de 10 min; "Descargar PDF" = `window.print()`; "Agregar al calendario" descarga un `.ics` real; "Ver mis entradas" apunta a la ruta de la Fase 4.
