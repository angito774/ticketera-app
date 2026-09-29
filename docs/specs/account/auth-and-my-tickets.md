# Login, registro y Mis entradas (mock data)

**Estado**: done
**Aprobado por**: usuario — 2026-09-29
**Fase**: 4 de 5 del plan de features (ver `docs/specs/tickets/purchase-flow.md` › Plan de fases)

## Contexto

Las Fases 1–3 entregaron búsqueda y compra. Esta fase entrega las pantallas **7 · Login y registro** y **6 · Mis entradas** del diseño de Claude Design (escritorio 1440 + móvil 390). La confirmación de compra (Fase 2) ya enlaza a `/my-tickets`, que hoy da 404.

Sigue siendo **solo UI/UX, sin backend**: la "sesión" es un estado del navegador y las cuentas son datos mock. **No es autenticación real** y no protege nada: sirve para que el flujo se pueda recorrer y para fijar la UI que después consumirá una API.

## Alcance

- **Incluye**:
  - Ruta `/login` con pestañas "Iniciar sesión" / "Crear cuenta" (`/login?mode=register` abre la segunda), panel de marca con imagen (escritorio: columna izquierda; móvil: franja superior), mostrar/ocultar contraseña, validación con `zod` y errores por campo.
  - Cuenta demo: **`demo@ticketera.pe` / `ticketera123`**, con 2 pedidos de ejemplo. Una cuenta creada en "Crear cuenta" queda guardada en el navegador y con la sesión iniciada.
  - Tras entrar o registrarse se va a `?next=` (solo rutas internas) o a `/my-tickets`.
  - Header con sesión: "Mis entradas", iniciales del usuario y "Cerrar sesión"; sin sesión: "Iniciar sesión" (`/login`) y "Registrarse" (`/login?mode=register`).
  - Ruta `/my-tickets`: pestañas "Próximas (n)" / "Pasadas (n)", lista de pedidos (escritorio: columna; móvil: carrusel horizontal), entrada seleccionada con QR decorativo, paginador "Entrada k de N", datos (Zona, Titular, Código, Estado "Válida") y acciones "Descargar PDF" / "Agregar al calendario". Sin sesión, invita a iniciar sesión.
  - Historial de pedidos: los pedidos de la Fase 2 pasan a guardarse como lista en `localStorage`. "Mis entradas" muestra los pedidos cuyo correo de comprador coincide con el de la sesión, más los de ejemplo de la cuenta demo.
- **No incluye**:
  - Autenticación real, tokens, cookies de sesión, rutas protegidas en servidor, recuperación de contraseña ("¿Olvidaste tu contraseña?" es un enlace sin destino), login social, verificación de correo, edición de perfil.
  - **Guardar contraseñas**: las cuentas creadas se guardan sin contraseña. Por ser mock, una cuenta creada entra con cualquier contraseña válida (≥ 8 caracteres); solo la cuenta demo verifica su contraseña, para poder mostrar el error "Correo o contraseña incorrectos".
  - Exigir sesión para comprar (el diseño permite comprar como invitado).
  - Transferir o revender entradas.

## Criterios de aceptación

- **AC-1**: `/login` muestra el panel de marca ("Tus entradas, siempre a mano.") y el formulario con dos pestañas accesibles (`aria-pressed`). "Hola de nuevo" pide correo y contraseña; "Crea tu cuenta" pide nombre completo, correo, contraseña y aceptación de términos. Los enlaces "Crea una gratis" / "Inicia sesión" cambian de pestaña. `?mode=register` abre directamente el registro.
- **AC-2**: El botón del ojo alterna mostrar/ocultar la contraseña (`aria-label` "Mostrar contraseña"/"Ocultar contraseña", `aria-pressed`).
- **AC-3** (con tests del schema): Validación al enviar, errores bajo cada campo (`aria-invalid`, `aria-describedby`) y foco en el primero inválido. Login: correo válido y contraseña no vacía. Registro: nombre ≥ 3 caracteres, correo válido, contraseña ≥ 8 caracteres con al menos una letra y un número, términos aceptados.
- **AC-4** (con tests del service): Login con la cuenta demo y contraseña correcta, o con una cuenta registrada, inicia la sesión; con la cuenta demo y otra contraseña, o con un correo no registrado, muestra "Correo o contraseña incorrectos." (mensaje general, `role="alert"`). Registro con un correo ya existente (incluida la demo) muestra "Ya existe una cuenta con este correo.". El correo se compara sin mayúsculas ni espacios.
- **AC-5**: Tras entrar o registrarse se navega a `next` si es una ruta interna (empieza con `/` y no con `//`), si no a `/my-tickets`. Si ya hay sesión al abrir `/login`, se muestra "Ya iniciaste sesión como X" con enlaces a Mis entradas y "Cerrar sesión".
- **AC-6**: El `Header` refleja la sesión (tras hidratar, sin parpadeo de desajuste): con sesión muestra "Mis entradas" (`aria-current="page"` en esa ruta), las iniciales del usuario (con su nombre como texto accesible) y "Cerrar sesión"; sin sesión, "Iniciar sesión" → `/login` y "Registrarse" → `/login?mode=register`. "Cerrar sesión" borra la sesión y lleva a `/`.
- **AC-7**: `/my-tickets` sin sesión muestra "Inicia sesión para ver tus entradas" con enlace a `/login?next=/my-tickets`.
- **AC-8**: Con sesión, `/my-tickets` muestra pestañas "Próximas (n)" y "Pasadas (n)" (según la fecha del evento frente a la fecha actual). Cada pedido de la lista muestra imagen, título, fecha corta · ciudad y "N entradas · zona"; el seleccionado se marca (`aria-current`). Sin pedidos en una pestaña: "Aún no tienes eventos pasados" / "Aún no tienes entradas" con "Explorar eventos" (`/events`).
- **AC-9**: La entrada seleccionada muestra imagen con fecha, título, fecha larga · hora, recinto y ciudad, QR decorativo, "Entrada k de N" con anterior/siguiente, Zona (con fila y asiento si es numerada), Titular (nombre del comprador), Código (`TK-24817-01`) y Estado "Válida", y las acciones "Descargar PDF" (`window.print()`) y "Agregar al calendario" (`.ics`, mismo helper que la confirmación). Cambiar de pedido vuelve a la entrada 1.
- **AC-10** (con tests): el store de pedidos guarda un historial (`orders`, en `localStorage`) y el último pedido confirmado (`lastOrderNumber`); la confirmación de la Fase 2 sigue funcionando igual (AC-8 de esa spec). `getOrdersForUser` devuelve los pedidos del correo indicado (sin mayúsculas) más los de ejemplo si es la cuenta demo, sin duplicados, ordenados por fecha del evento.
- **AC-11**: Sin scroll horizontal en 375 px (el carrusel de pedidos scrollea dentro de su contenedor); todo con tokens; ninguna llamada de red.

## Contratos

### Schemas (`src/modules/account/schemas/auth.schema.ts`)

```ts
export interface LoginValues { email: string; password: string }
export interface RegisterValues { fullName: string; email: string; password: string; acceptedTerms: boolean }
export function getLoginErrors(values: LoginValues): Partial<Record<keyof LoginValues, string>>;
export function getRegisterErrors(values: RegisterValues): Partial<Record<keyof RegisterValues, string>>;
```

### Cuentas mock (`src/modules/account/services/auth.service.ts`)

```ts
export interface User { name: string; email: string }
export const DEMO_ACCOUNT: { user: User; password: string };  // demo@ticketera.pe / ticketera123
export type AuthResult = { ok: true; user: User } | { ok: false; error: string };
export function authenticate(email: string, password: string, registeredUsers: User[]): AuthResult;
export function register(values: RegisterValues, registeredUsers: User[]): AuthResult; // no guarda contraseña
export function safeNextPath(next: string | null | undefined, fallback?: string): string; // default "/my-tickets"
export function getInitials(name: string): string; // "Ana Quispe" → "AQ"
```

### Sesión (`src/modules/account/store/session.store.ts`)

```ts
interface SessionState {
  user: User | null;
  registeredUsers: User[];
  signIn(user: User): void;
  signUp(user: User): void;   // agrega a registeredUsers e inicia sesión
  signOut(): void;
}
```

Persistido en `localStorage` (`ticketera-session`).

### Pedidos (cambios a `src/modules/checkout/`)

```ts
// order.store.ts — reemplaza `order: Order | null` (sessionStorage)
interface OrderState {
  orders: Order[];                 // historial, más reciente primero
  lastOrderNumber: string | null;  // lo que muestra la confirmación
  reservationExpiresAt: Record<string, string>;
  startReservation(...); resetReservation(...);
  completeOrder(order: Order): void;  // agrega al historial, fija lastOrderNumber, libera la reserva
}
// persistencia: localStorage (`ticketera-orders`)

// orders.service.ts — se agregan
export const DEMO_ORDERS: Order[];   // 2 pedidos de ejemplo del usuario demo
export function getOrdersForUser(email: string, stored: Order[]): Order[];
export function getTicketCode(order: Order, index: number): string; // "TK-24817-01"
```

### Componentes compartidos nuevos

```ts
// src/modules/checkout/components/add-to-calendar-button.tsx — extraído de confirmation-actions.tsx
interface AddToCalendarButtonProps { order: Order; event: Pick<EventDetail, "title" | "date" | "venue" | "address" | "city">; label?: string; className?: string }
```

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| QR decorativo, `.ics` | `DecorativeQr`, `buildCalendarFile` (Fase 2) | reusar; el botón de calendario se extrae a `AddToCalendarButton` para usarlo en confirmación y Mis entradas |
| Campos con error accesible | `FormField` + `fieldA11yProps` en `checkout/components/form-field.tsx` | generalizar: mover a `src/components/form-field.tsx` con prefijo de id configurable (lo usan checkout y account) |
| Espera de hidratación | `useHydrated` | reusar |
| Formato de fechas/precios | `src/lib/format.ts` | reusar |
| Eventos de cada pedido | `getEventById` | reusar |
| Pestañas | shadcn `tabs`: registro bloqueado en este entorno | botones con `aria-pressed` (como en el diseño) |
| Menú de cuenta | shadcn `dropdown-menu`: registro bloqueado | sin menú: iniciales + botón "Cerrar sesión" visibles (KISS) |

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Schemas, cuentas mock y store de sesión. — archivos: `src/modules/account/schemas/auth.schema.ts` (+ `.test.ts`), `src/modules/account/services/auth.service.ts` (+ `.test.ts`), `src/modules/account/store/session.store.ts` (+ `.test.ts`) — tests: sí — cubre: AC-3, AC-4, AC-5
- **T-2**: Historial de pedidos, pedidos demo, código de entrada; `FormField` compartido; adaptar confirmación y checkout. — archivos: `src/modules/checkout/store/order.store.ts` (+ `.test.ts`), `src/modules/checkout/services/orders.service.ts` (+ `.test.ts`), `src/components/form-field.tsx` (movido desde `checkout/components/form-field.tsx`), `src/modules/checkout/components/checkout-form.tsx`, `src/modules/checkout/components/checkout-view.tsx`, `src/modules/checkout/components/confirmation-view.tsx` — tests: sí — cubre: AC-10

### Grupo 1 (paralelo)

- **T-3**: UI de login/registro. — archivos: `src/modules/account/components/auth-panel.tsx`, `src/modules/account/components/login-form.tsx`, `src/modules/account/components/register-form.tsx`, `src/modules/account/components/password-input.tsx` — tests: no — cubre: AC-1, AC-2, AC-3, AC-4, AC-5
- **T-4**: Header con sesión. — archivos: `src/components/header.tsx`, `src/modules/account/components/header-account.tsx` — tests: no — cubre: AC-6
- **T-5**: Componentes de Mis entradas + botón de calendario compartido. — archivos: `src/modules/checkout/components/add-to-calendar-button.tsx`, `src/modules/checkout/components/confirmation-actions.tsx`, `src/modules/account/components/order-list.tsx`, `src/modules/account/components/ticket-viewer.tsx` — tests: no — cubre: AC-8, AC-9

### Grupo 2 (serial)

- **T-6**: Contenedor de Mis entradas y rutas. — archivos: `src/modules/account/components/my-tickets-view.tsx`, `src/app/login/page.tsx`, `src/app/my-tickets/page.tsx` — tests: no — cubre: AC-5, AC-7, AC-8, AC-11

### Notas de implementación (desvíos menores respecto del plan)

- `DEMO_ORDERS`, `getOrdersForUser` y `splitOrdersByDate` viven en `src/modules/account/services/my-tickets.service.ts` (no en `checkout/services/orders.service.ts`): dependen de la cuenta demo, y así `checkout` no importa de `account`. `getTicketCode` sí quedó en `orders.service.ts`.
- `FormField` compartido recibe el `id` completo del control (en lugar de un nombre de campo con prefijo fijo) y admite `labelAside` para "¿Olvidaste tu contraseña?". El checkout exporta su propio `checkoutFieldId`.
- `selectLastOrder` (selector del store) reemplaza al antiguo campo `order` en la confirmación.
- El login muestra la cuenta de prueba debajo del botón, para que se pueda recorrer sin leer la spec.
- En el talón de la entrada las acciones usan las etiquetas cortas del diseño móvil ("PDF", "Calendario") para que entren en la columna de 300 px.

Verificado: `npm run lint`, `npm run test` (132 tests) y `npm run build` en verde; recorrido con Playwright en 1440 px y 390 px: `/my-tickets` sin sesión, login con errores y foco, contraseña visible, credenciales incorrectas, entrada con la cuenta demo y redirección a `next`, header con sesión, pedidos y paginador de entradas con códigos, pestaña de pasadas vacía, cierre de sesión, registro con correo repetido y correcto, compra con el correo nuevo que aparece en Mis entradas; sin scroll horizontal ni errores de consola.

## Fases siguientes

Fase 5: panel de organizador y crear evento.

## Preguntas abiertas

Ninguna bloqueante. Decisiones de autoría: cuenta demo `demo@ticketera.pe` / `ticketera123`; las cuentas creadas no guardan contraseña; los pedidos se asocian a la cuenta por el correo usado en el checkout; historial en `localStorage` (antes `sessionStorage`) para que "Mis entradas" persista entre pestañas.
