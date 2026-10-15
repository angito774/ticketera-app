# Cancelación con reembolso, Fase 2: seguimiento del plazo y textos legales

**Estado**: approved
**Aprobado por**: usuario (confirmado en chat, 2026-10-14)
**Fase**: 2 de 2 (continúa `docs/specs/organizer/event-cancellation-refunds.md`, Fase 1 ya implementada)

## Contexto

La Fase 1 reembolsa automáticamente al cancelar y promete al comprador "máximo 15 días hábiles", pero el super admin no ve cuánto lleva cada evento cancelado con reembolsos sin completar, y los textos públicos (`/devoluciones`, `/terminos`) siguen diciendo que las devoluciones son manuales, por solicitud y sin proceso automático, lo que contradice el comportamiento real. Además "15 días hábiles" está escrito a mano en tres sitios (`returns.content.ts` como `REFUND_DEADLINE`, `order-ticket-card.tsx`, `refund-email.ts`).

Esta fase (a) muestra en `/admin/payments` la antigüedad en días hábiles desde `events.cancelled_at` de cada evento cancelado con reembolsos pendientes, con alerta desde 10 días hábiles y estado distinto al llegar a 15; (b) actualiza los textos legales y (c) centraliza el plazo en una sola constante.

Nota legal: los textos de esta fase **deben validarse con un abogado antes de publicarse en producción; no son asesoría legal**. Persiste la duda de la Fase 1 sobre si la enfermedad del artista califica como fuerza mayor; se mantiene el supuesto de que se devuelve igual.

## Alcance

- **Incluye**:
  - `businessDaysBetween(from, to)` en `src/lib/business-days.ts` (ya existe `addBusinessDays`/`toLimaDate`; se extiende, no se crea otro archivo).
  - Constantes y función pura del plazo de reembolso en un único lugar compartido: `src/lib/refund-policy.ts`.
  - `/admin/payments`, pestaña "Cancelados": columna de plazo con insignia accesible (texto + ícono, no solo color) y orden por antigüedad.
  - La lista de cancelados pasa a usar la misma definición de "pendiente" que el reembolso (`claimable | stripePending`), de modo que incluye órdenes `refunded` sin `stripe_refund_id`.
  - Actualización de `returns.content.ts` y `terms.content.ts` con sus tests, y migración de los tres usos hardcodeados del plazo.
- **No incluye**: reprogramación; cancelación de eventos liquidados con reversión de transferencia; reembolsos parciales; reintento automático de correos fallidos; feriados peruanos (ver Decisiones); notificaciones/correos al admin por plazos próximos a vencer; columna ni migración nueva (`cancelled_at` ya existe); cambios al flujo de reembolso o liquidación; unificar `CLAIM_RESPONSE_BUSINESS_DAYS` (plazo del Libro de Reclamaciones, otra obligación que casualmente también vale 15).

## Criterios de aceptación

- **AC-1 (días hábiles, puro, tests)**: `businessDaysBetween(from: Date, to: Date): number` cuenta los días hábiles (lunes a viernes) transcurridos entre las fechas de calendario de `from` y `to` en `America/Lima` (vía `toLimaDate`): excluye el día de `from` e incluye el de `to`, igual que `addBusinessDays`, de modo que `businessDaysBetween(d, addBusinessDays(d, n)) === n` para todo `n ≥ 0`. Devuelve `0` si `to` es el mismo día o anterior a `from`. Sábado y domingo no suman (desde sábado, el lunes siguiente es 1). Cruza fin de mes, de año y febrero bisiesto. No depende de la zona horaria del proceso. Lanza error si alguna fecha es inválida (`NaN`). No modela feriados (documentado en el JSDoc: lo hace conservador, porque cuenta más días y alerta antes).
- **AC-2 (plazo, puro, tests)**: `src/lib/refund-policy.ts` es la única fuente del plazo: `REFUND_MAX_BUSINESS_DAYS = 15`, `REFUND_WARNING_BUSINESS_DAYS = 10` y `REFUND_DEADLINE_TEXT = "máximo 15 días hábiles"` (derivado de la constante, sin repetir el número). `getRefundDeadline(cancelledAt, now)` devuelve `{ state, businessDays }`: `cancelledAt === null` → `unknown` con `businessDays: null`; `< 10` → `on_track`; `10..14` → `warning`; `>= 15` → `overdue`. Los límites 9/10/14/15 están probados.
- **AC-3 (lista admin)**: `listCancelledEventsWithPendingRefunds(actor, now?)` (renombra `listCancelledEventsWithPaidOrders`) exige `organizations:manage`, lista eventos `cancelled` sin liquidación con al menos una orden pendiente (`claimable | stripePending`, las mismas constantes que usa `refundEventOrdersCore`), devuelve `pendingOrders` (cuenta con esa misma definición), `cancelledAt` y `deadline`, y ordena por `cancelled_at` ascendente con nulos al final. Un evento con todas sus órdenes reembolsadas con `stripe_refund_id` desaparece de la lista.
- **AC-4 (eventos antiguos)**: un evento con `cancelled_at` nulo (cancelado antes de la Fase 1) aparece con estado `unknown`: la celda dice "Sin fecha de cancelación", sin alarma ni conteo de días, y no se estima a partir de otra columna (`updated_at` cambia con cualquier edición y sería engañosa).
- **AC-5 (UI accesible)**: en la pestaña "Cancelados" una columna "Plazo de reembolso" muestra por fila una insignia con ícono y texto, nunca solo color: `on_track` "N de 15 días hábiles", `warning` "Por vencer: N de 15 días hábiles" (ícono de advertencia), `overdue` "Plazo vencido: N de 15 días hábiles" (variante destructiva, ícono distinto), `unknown` "Sin fecha de cancelación". Un texto de resumen sobre la tabla indica cuántos eventos están por vencer y cuántos vencidos (solo si hay alguno). El encabezado de la columna de conteo pasa a "Órdenes pendientes". Si un lector de pantalla recorre la fila, el estado y los días se anuncian como texto.
- **AC-6 (constante única)**: `order-ticket-card.tsx` (`EventCancelledNotice`), `refund-email.ts` y `returns.content.ts` usan `REFUND_DEADLINE_TEXT`/`REFUND_MAX_BUSINESS_DAYS` de `@/lib/refund-policy`; no queda ningún "15 días hábiles" literal para el reembolso en esos archivos (el del Libro de Reclamaciones en `returns.content.ts` y `claims-provider.ts` es otra obligación y se conserva). `src/lib/refund-policy.ts` solo importa `./business-days` (hermano en `src/lib/`, que no importa nada del proyecto), por lo que no hay ciclos. Los tests existentes de `refund-email` y del aviso siguen pasando sin cambiar el texto visible.
- **AC-7 (returns, tests)**: `returns.content.ts` deja de decir que las devoluciones son manuales y sin proceso automático para el caso de cancelación, y dice, solo en términos de lo que el sistema hace: motivos de cancelación (artista enfermo o no disponible, desastre natural o sismo, orden de una autoridad, problema con el recinto, riesgo para la seguridad, otro motivo), devolución del 100% del precio de la entrada, reembolso automático sin que el comprador lo solicite, aviso por correo electrónico, plazo "máximo 15 días hábiles desde la cancelación" y reembolso al medio de pago original. Una sección propia aclara que los gastos adicionales del comprador (viaje, hospedaje y similares) no se reembolsan. Reprogramación, "Devolución a pedido del cliente", "Cómo solicitar una devolución" (aplica a casos que no son cancelación) y Garantía legal se conservan. Cada etiqueta de `CANCELLATION_REASON_LABELS` aparece en el texto (test que importa las etiquetas solo como guarda de deriva; el contenido legal no importa del módulo organizer). Siguen sin aparecer las palabras prohibidas del test actual (Stripe, comprobante, etc.) ni marcadores (`[`, `]`, TODO). Se actualiza `updatedAt`.
- **AC-8 (terms, tests)**: la sección "Cancelaciones y devoluciones" de `terms.content.ts` resume, en un párrafo propio, que si un evento se cancela se devuelve el 100% del precio de la entrada de forma automática al medio de pago original, con aviso por correo y plazo máximo de 15 días hábiles (con `REFUND_DEADLINE_TEXT`), que no incluye gastos adicionales del comprador, y conserva el enlace a `/devoluciones`. Se conservan los títulos y el orden de las demás secciones, y se actualiza `updatedAt` (formato `-05:00` exigido por el test).
- **AC-9 (calidad)**: `lint`, `test` y `build` pasan; no se modifica la lógica de reembolso ni la de liquidación; no se agrega dependencia ni migración; el reviewer valida contra la base (solo lectura) que la consulta de AC-3 cuenta las mismas órdenes que `refundEventOrdersCore` y que la nota legal figura en el comentario de cabecera de ambos archivos de contenido.

## Contratos

### `src/lib/business-days.ts` (se agrega; lo existente no cambia)

```ts
/** Días hábiles (lun-vie, sin feriados) entre las fechas de Lima de `from` y `to`; excluye `from`, incluye `to`. */
export function businessDaysBetween(from: Date, to: Date): number;
```

### `src/lib/refund-policy.ts` (nuevo, sin imports de módulos)

```ts
export const REFUND_MAX_BUSINESS_DAYS = 15;
export const REFUND_WARNING_BUSINESS_DAYS = 10;
export const REFUND_DEADLINE_TEXT: string; // `máximo ${REFUND_MAX_BUSINESS_DAYS} días hábiles`

export type RefundDeadlineState = "unknown" | "on_track" | "warning" | "overdue";
export interface RefundDeadline { state: RefundDeadlineState; businessDays: number | null }
export function getRefundDeadline(cancelledAt: Date | null, now: Date): RefundDeadline;
```

### `src/modules/payments/types/payments-admin.types.ts`

```ts
import type { RefundDeadline } from "@/lib/refund-policy";

export interface CancelledEventRow {
  eventId: string;
  eventTitle: string;
  organizationName: string;
  pendingOrders: number;        // antes `paidOrders`
  cancelledAt: Date | null;
  deadline: RefundDeadline;
}
```

### `src/modules/payments/services/refund.service.ts`

```ts
export async function listCancelledEventsWithPendingRefunds(actor: CurrentUser, now?: Date): Promise<CancelledEventRow[]>;
// reemplaza a listCancelledEventsWithPaidOrders; el único consumidor es src/app/admin/payments/page.tsx (verificado con grep)
```

`now` se calcula en servidor (una vez por request) y la insignia no calcula fechas en el cliente, para evitar desajustes de hidratación.

### `src/modules/payments/components/refund-deadline-badge.tsx` (presentacional)

```tsx
export function RefundDeadlineBadge(props: { deadline: RefundDeadline }): JSX.Element;
```

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Utilidad de días hábiles | `src/lib/business-days.ts` (`addBusinessDays`, `toLimaDate`) + test; no existe `businessDaysBetween` | **extender** el mismo archivo y su test (no crear archivo nuevo) |
| Plazo de reembolso (constante) | `REFUND_DEADLINE` privada en `returns.content.ts`; literales en `order-ticket-card.tsx` y `refund-email.ts`; `CLAIM_RESPONSE_BUSINESS_DAYS` en `modules/claims/config/claims-provider.ts` (otro concepto) | **crear** `src/lib/refund-policy.ts` (neutral, sin dependencias, importable desde legal, checkout y payments sin ciclos); no tocar `claims-provider.ts` |
| Definición de "pendiente de reembolso" | `claimable`, `stripePending` en `refund.service.ts` | reusar en la consulta de la lista; no duplicar SQL |
| Lista de cancelados | `listCancelledEventsWithPaidOrders` en `refund.service.ts` (solo órdenes `paid` sin liquidar) | **extender y renombrar** |
| Tabla, pestañas, insignia, botón | `table`, `tabs`, `badge`, `button` en `src/components/ui/` y `settlements-table.tsx` (patrón de `STATUS_VARIANT`) | reusar; sin `shadcn add` (verificado: no hay `alert`/`tooltip` instalados y no hacen falta) |
| Íconos | `lucide-react` (ya usado en `order-ticket-card.tsx`: `CircleAlert`) | reusar |
| Banner de mensajes | `ResultBanner` en `src/components/result-banner` | no se usa para el resumen (es de resultado de acciones); el resumen es un `<p>` simple |
| Etiquetas de motivo | `CANCELLATION_REASON_LABELS` en `organizer/schemas/cancellation.schema.ts` | reusar solo en el test de returns |
| Formato legal | `LegalDocument`/`LegalSection` (`items`, `links`) en `legal.types.ts`; tests `returns.content.test.ts`, `terms.content.test.ts` | reusar; actualizar tests |
| Formato de fechas | `formatDate` en `src/lib/format.ts` | reusar si se muestra la fecha de cancelación en la fila |

## Plan de tareas

### Grupo 0 (serial: utilidades y contratos compartidos)

- **T-1**: Utilidad de días hábiles, política de plazo y tipo de fila — archivos: `src/lib/business-days.ts`, `src/lib/business-days.test.ts`, `src/lib/refund-policy.ts`, `src/lib/refund-policy.test.ts`, `src/modules/payments/types/payments-admin.types.ts` — tests: sí (`businessDaysBetween`: mismo día, lun→vie, vie→lun = 1, sáb→lun = 1, sáb→dom = 0, `to` anterior = 0, cruces de mes/año/bisiesto, invariante con `addBusinessDays` para n = 0..30, sin depender de `TZ`, fecha inválida; `getRefundDeadline`: nulo, 9, 10, 14, 15 y 20 días, texto derivado de la constante) — cubre: AC-1, AC-2, AC-4 (tipo)

### Grupo 1 (paralelo; dependen de T-1; archivos disjuntos)

- **T-2**: Lista de cancelados con plazo — archivos: `src/modules/payments/services/refund.service.ts`, `src/app/admin/payments/page.tsx` — tests: no (consulta SQL; la lógica pura está en T-1 y el reviewer valida el SQL contra la base, como en la Fase 1) — cubre: AC-3, AC-4, AC-9
- **T-3**: Insignia y tabla — archivos: `src/modules/payments/components/refund-deadline-badge.tsx`, `src/modules/payments/components/refund-deadline-badge.test.tsx`, `src/modules/payments/components/settlements-table.tsx` — tests: sí, en la insignia (cada estado muestra su texto y días, `unknown` no muestra días; verifica que el estado se comunica con texto, no solo clase) — cubre: AC-5
- **T-4**: Política de devoluciones — archivos: `src/modules/legal/content/returns.content.ts`, `src/modules/legal/content/returns.content.test.ts` — tests: sí (motivos y etiquetas, 100% del precio, automático, correo, plazo desde `REFUND_DEADLINE_TEXT`, gastos no reembolsables, medio de pago original, títulos de sección actualizados, ya no dice "proceso automático no existe", prohibidas y marcadores) — cubre: AC-6 (returns), AC-7
- **T-5**: Términos y condiciones — archivos: `src/modules/legal/content/terms.content.ts`, `src/modules/legal/content/terms.content.test.ts` — tests: sí (párrafo de cancelación con 100%, automático, correo, plazo, medio original, sin gastos adicionales; enlace a `/devoluciones` conservado; resto de las pruebas intactas) — cubre: AC-8
- **T-6**: Migrar usos hardcodeados — archivos: `src/modules/checkout/components/order-ticket-card.tsx`, `src/modules/payments/services/refund-email.ts` — tests: no nuevos (el `refund-email.test.ts` existente afirma "máximo 15 días hábiles" y debe seguir pasando sin editarse) — cubre: AC-6

> T-2, T-3, T-4, T-5 y T-6 tocan conjuntos de archivos disjuntos; T-3 depende solo del tipo de T-1 y T-2 renombra la función y su único consumidor (`page.tsx`) en la misma tarea, así que ninguna depende de otra del mismo grupo. El reviewer revisa al final la ausencia de literales duplicados (`rg "15 días hábiles" src`).

## Riesgos

- **Feriados**: sin modelar, un feriado de lunes a viernes cuenta como día hábil, por lo que la antigüedad mostrada es igual o mayor a la real y la alerta salta antes (lado conservador). El plazo legal real puede ser algo más largo que el mostrado.
- **Eventos antiguos sin `cancelled_at`**: no se les puede medir plazo (estado `unknown`); un super admin debe revisarlos a mano. Al ordenar con nulos al final podrían quedar tras eventos recientes aunque sean más antiguos en realidad.
- **Cambio de significado de la lista**: pasa de "órdenes `paid`" a "órdenes pendientes de reembolso". Dejan de contarse las órdenes `paid` con entradas canjeadas o sin `stripe_payment_intent_id` (el reembolso automático las omite y quedan para gestión manual, Fase 1); se incorporan las `refunded` sin `stripe_refund_id`. Un evento que solo tiene órdenes canjeadas ya no aparece en esta lista.
- **El plazo corre desde la cancelación**: el comprador lo ve así (Fase 1) y ahora también el texto legal; si el abogado indica otro punto de partida (por ejemplo desde el aviso o desde la acreditación) hay que ajustar `getRefundDeadline` y los textos.
- **Legal**: los textos (motivos, 100%, plazo, exclusión de gastos extra) son un borrador técnico; requieren revisión de un abogado antes de producción. La referencia a la Ley N.º 32415 sigue marcada "a verificar".
- **Deriva de motivos**: si se agrega un motivo a `CANCELLATION_REASONS`, el texto legal no se actualiza solo; el test de AC-7 lo detecta.
- **Hidratación**: la insignia no debe llamar a `new Date()`; recibe `deadline` ya calculado en servidor.

## Decisiones y supuestos (cambiables por el usuario)

- **Umbrales**: alerta con `>= 10` días hábiles; vencido con `>= 15` (los 15 días transcurridos sin terminar). Es conservador: se marca vencido el día 15 aunque el plazo legal aún alcanzaría ese día.
- **Eventos con `cancelled_at` nulo**: estado `unknown` sin alarma ni estimación; orden al final de la lista.
- **Orden de la lista**: más antiguos primero.
- **Dónde vive el plazo**: `src/lib/refund-policy.ts` (neutral; legal, checkout y payments lo importan sin depender entre sí). `src/lib/` ya aloja `business-days.ts`, `format.ts` y `application-fee.ts`.
- **Zona horaria**: las fechas de calendario se evalúan en `America/Lima` (como `addBusinessDays`/`toLimaDate`).
- **Texto del plazo**: en los textos legales y de cancelación el plazo corre "desde la cancelación"; para reprogramación y devoluciones por solicitud se conserva "desde la solicitud".
- **Monto "100% del precio de la entrada"**: el comprador no paga cargos adicionales de la plataforma (decisión 2 de la spec de pagos), por lo que reembolsar el total de la orden equivale al precio de las entradas.
- **Aviso legal**: la nota "validar con un abogado / no es asesoría legal" va en esta spec y como comentario de cabecera en `returns.content.ts` y `terms.content.ts`; no se publica en la página para el consumidor.
- **Sin resumen en la pestaña**: no se cambia el `TabsTrigger` (solo el conteo existente); el resumen de por vencer/vencidos va sobre la tabla.

## Preguntas abiertas

Ninguna bloquea el inicio de la implementación (T-1 a T-6 se pueden ejecutar tras la aprobación con los supuestos de arriba).

Condición previa a **publicar en producción** (no a implementar): revisión de los textos de `/devoluciones` y `/terminos` por un abogado, incluyendo (a) si la enfermedad del artista exime o no la devolución, (b) desde cuándo corre el plazo de 15 días hábiles, y (c) la redacción sobre gastos adicionales no reembolsables.

No bloqueantes, para decidir si el supuesto no sirve: (1) umbral de "vencido" en `>= 15` o `> 15`; (2) tratamiento de eventos con `cancelled_at` nulo (alternativa: asignarles una fecha manualmente con un script de datos).
