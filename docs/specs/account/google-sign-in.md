# "Continuar con Google" en login y registro (simulado)

**Estado**: done
**Aprobado por**: usuario — 2026-09-29
**Fase**: 1 de 1

## Contexto

El usuario pidió sumar Google a login y registro (`docs/specs/account/auth-and-my-tickets.md`). Eligió la opción **simulada** (2026-09-29): se agrega la UI completa del acceso con Google, pero sin OAuth real. Mantiene el alcance "solo UI/UX, sin backend" y usa la misma sesión simulada del navegador (`useSessionStore`).

## Alcance

- **Incluye**:
  - Botón **"Continuar con Google"** en las pestañas de login y de registro, arriba del formulario, con el estilo de marca de Google: fondo blanco, borde gris, logo "G" a color y texto en Poppins. Debajo, un separador "o con tu correo".
  - Al pulsarlo se abre un **selector de cuenta simulado**, que imita el de Google: "Elige una cuenta para continuar a Ticketera". Es un `<dialog>` nativo con foco atrapado y cierre con Escape o con "Cancelar".
    - Muestra 3 cuentas mock con avatar de iniciales, nombre y correo. Una es la cuenta demo (`demo@ticketera.pe`, con pedidos de ejemplo).
    - Incluye el aviso "Simulación: no se conecta con Google".
  - Al elegir una cuenta se muestra "Conectando con Google…" por un momento. Después se inicia sesión: si el correo ya tenía cuenta, entra con ella; si no, se crea. Se sigue a `next` o a `/my-tickets`, igual que con correo y contraseña.
- **No incluye**:
  - OAuth real, Auth.js/NextAuth, rutas de servidor, cookies, variables de entorno ni credenciales de Google Cloud.
  - Vincular o desvincular Google en una cuenta existente, "Usar otra cuenta" con correo libre, One Tap.

## Criterios de aceptación

- **AC-1**: Login y registro muestran "Continuar con Google" (botón de ancho completo, logo de Google, `type="button"`) y el separador "o con tu correo" antes de los campos.
- **AC-2**: El botón abre el selector modal (`aria-labelledby` con su título), con 3 cuentas como botones (nombre + correo), "Cancelar" y el aviso de simulación. Escape o "Cancelar" lo cierran sin iniciar sesión y devuelven el foco al botón.
- **AC-3** (con tests): Elegir una cuenta inicia la sesión. Si el correo ya existe (incluida la cuenta demo, o una creada con correo y contraseña), usa esa cuenta con su nombre. Si no existe, la registra (`isNew: true`). El correo se compara normalizado.
- **AC-4**: Mientras "conecta", las cuentas quedan deshabilitadas y se muestra "Conectando con Google…" (`aria-live`). Al terminar se navega a `next` o a `/my-tickets`, y el header refleja la sesión.
- **AC-5**: Sin scroll horizontal en 375 px. Los colores del logo de Google son la única excepción a "solo tokens", porque son de marca.

## Contratos

```ts
// src/modules/account/services/google-auth.service.ts
export interface GoogleAccount { name: string; email: string }
export const MOCK_GOOGLE_ACCOUNTS: GoogleAccount[];           // 3 cuentas, una es demo@ticketera.pe
export function signInWithGoogle(account: GoogleAccount, registeredUsers: User[]): { user: User; isNew: boolean };
```

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Sesión, registro de cuentas | `useSessionStore` (`signIn`, `signUp`), `normalizeEmail`, `DEMO_ACCOUNT`, `getInitials` | reusar |
| Modal | shadcn `dialog`: registro bloqueado en este entorno | `<dialog>` nativo (mismo patrón que filtros y menú del organizador) |
| Redirección tras entrar | `AuthPanel` (`onSuccess` → `safeNextPath`) | reusar: el botón recibe el mismo `onSuccess` |

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Cuentas mock y lógica de acceso. — archivos: `src/modules/account/services/google-auth.service.ts` (+ `.test.ts`) — tests: sí — cubre: AC-3

### Grupo 1 (serial)

- **T-2**: Botón + selector de cuenta, e integración en login y registro. — archivos: `src/modules/account/components/google-sign-in.tsx`, `src/modules/account/components/login-form.tsx`, `src/modules/account/components/register-form.tsx` — tests: no — cubre: AC-1, AC-2, AC-4, AC-5

## Verificación

`npm run lint`, `npm run test` y `npm run build` en verde. Recorrido con Playwright en 1440 px y 390 px:
- El selector abre con 3 cuentas; Escape lo cierra y devuelve el foco al botón.
- Con la cuenta demo se ve "Conectando con Google…", redirige a `next` (`/events`), el header muestra la sesión y Mis entradas trae sus 2 pedidos.
- Desde registro, con una cuenta nueva, se crea la cuenta (queda en `registeredUsers`) y Mis entradas aparece vacía.
- La regresión del recorrido de cuenta pasa, sin errores de consola ni scroll horizontal.

## Preguntas abiertas

Ninguna.
