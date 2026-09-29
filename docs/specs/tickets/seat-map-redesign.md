# Rediseño visual: "Elige tu zona" y mapa de asientos

**Estado**: done
**Aprobado por**: usuario — 2026-09-29 (con estilo "modo noche")
**Fase**: 1 de 1

## Contexto

La Fase 1 (`purchase-flow.md`) dibujó el recinto con **rectángulos** (fiel al diseño de Claude Design) y los asientos como **círculos en una grilla recta**. Funciona, pero se ve esquemático. El usuario pidió buscar referencias más modernas y aplicarlas a "Elige tu zona" y al mapa de asientos.

### Referencias revisadas (septiembre 2026)

- **Geometría real**: los mapas actuales alinean las filas a la forma real del recinto (tribunas y filas **curvas** alrededor del escenario o la cancha) y dibujan contornos limpios por sección ([Seatmap.pro — Features](https://seatmap.pro/features/), [vivenu — seat map accuracy](https://vivenu.com/blog/best-ticketing-system-seat-map-accuracy)).
- **Dos niveles**: primero se ve la disponibilidad por sección y después se entra a una sección para elegir asientos, con zoom y selección táctil ([Seatmap.pro — Stadium seat selection](https://seatmap.pro/blog/real-time-seat-selection-for-sports-venues-and-stadiums/)). Ya lo hacemos; se mantiene.
- **Información al pasar el mouse**: sección y asiento muestran precio y detalle en un tooltip; lo no disponible queda en gris y sin interacción ([Ticketmaster — Interactive seat map](https://blog.ticketmaster.com/interactive-seating-chart/), [Ticketmaster Help](https://help.ticketmaster.com/hc/en-us/articles/9786899270545-What-is-the-interactive-seat-map-and-how-do-I-use-it)).
- **Color por categoría de precio con leyenda** y colores distinguibles también con daltonismo; etiquetas de fila legibles a cualquier zoom ([Seatmap.pro — Features](https://seatmap.pro/features/)).

## Alcance

- **Incluye**:
  - **Mapa de zonas**:
    - **Estadio**: cancha/campo con escenario al frente, **tribunas curvas** (Occidente, Oriente y Norte como bandas de arco que abrazan el campo) y zonas de campo (VIP, General) redondeadas frente al escenario.
    - **Teatro**: escenario arriba y zonas como **bandas concéntricas en abanico** (Preferencial, Platea, Mezzanine, Balcón), como una sala real.
    - Etiqueta de cada zona con nombre + **pastilla de precio**; zona agotada con **rayado diagonal**; zona seleccionada con borde blanco y sombra, y las demás atenuadas; hover con leve realce.
    - **Tooltip** al pasar el mouse (escritorio): nombre, precio, estado ("Quedan pocas" / "Agotado") y tipo ("Asientos numerados" / "General de pie").
    - **Leyenda de precios** sobre el mapa: una pastilla por zona con su color y precio; pasar el mouse o enfocar una pastilla resalta su zona en el mapa.
  - **Mapa de asientos**:
    - **Filas curvas** (arcos centrados frente al escenario) en lugar de grilla recta; etiqueta de fila a ambos lados.
    - Asientos con **forma de butaca** (respaldo + asiento) coloreados con el tono de la zona; seleccionados en el color primario con el número; ocupados como un punto gris pequeño (lo disponible resalta más).
    - Tooltip "Fila B · Asiento 7 · S/ 448" en hover (escritorio).
    - Escenario con un leve brillo y la leyenda rediseñada.
    - Debajo del mapa, **chips de los asientos elegidos** ("Fila B · 7 ✕") para quitarlos sin buscar en el mapa.
    - Controles de zoom agrupados en una barra flotante.
  - Transiciones de 150–200 ms, respetando `prefers-reduced-motion`.
- **No incluye**:
  - WebGL o canvas (seguimos con SVG + `react-zoom-pan-pinch`, suficiente para cientos de asientos por zona).
  - Vista desde el asiento, "mejores asientos disponibles" automáticos, filtros por precio o por cantidad de asientos juntos.
  - Cambios de precios, zonas, disponibilidad o reglas de selección (máx. 6 por zona): solo cambia la geometría y el aspecto.

## Criterios de aceptación

- **AC-1**: En el estadio, las tribunas Occidente, Oriente y Norte se dibujan como bandas curvas alrededor del campo; VIP y General como zonas redondeadas frente al escenario. En el teatro, las 4 zonas se dibujan como bandas concéntricas en abanico frente al escenario. Ninguna forma se superpone con otra.
- **AC-2**: Cada zona muestra su nombre (corto si no entra) y una pastilla con el precio o "Agotado". Las zonas agotadas tienen un patrón rayado y no son interactivas. Con una zona seleccionada, esa zona tiene borde y sombra y el resto baja su opacidad.
- **AC-3**: En escritorio, pasar el mouse sobre una zona disponible muestra un tooltip con nombre, precio, estado y tipo de ubicación. En táctil no hay tooltip: el toque selecciona, como hoy.
- **AC-4**: Sobre el mapa hay una leyenda con una pastilla por zona (color + nombre corto + precio). Pasar el mouse o enfocar una pastilla resalta su zona; hacer clic la selecciona (salvo agotadas).
- **AC-5**: En el mapa de asientos las filas se dibujan como arcos concéntricos frente al escenario, con la etiqueta de fila en ambos extremos. Los asientos tienen forma de butaca con el color de la zona; seleccionados en color primario con su número; ocupados como punto gris no interactivo.
- **AC-6**: En escritorio, el hover sobre un asiento libre muestra "Fila X · Asiento N · S/ precio". Debajo del mapa hay un chip por asiento elegido que lo quita al hacer clic (`aria-label` "Quitar Fila B, asiento 7").
- **AC-7**: Se mantiene todo lo de la Fase 1: selección con teclado (`role="button"`, `aria-pressed`, `aria-label`), zoom con pinch/arrastre/rueda y botones, máximo 6 por zona, ancho mínimo táctil en móvil y sin scroll horizontal de página en 375 px.
- **AC-8** (con tests): las formas y los asientos se generan desde el service de forma determinística; ninguna zona del estadio ni del teatro se superpone con otra ni con el escenario (verificado con las cajas de sus contornos); las filas son curvas (la `y` de los asientos de una fila varía) y los asientos de una fila no se superponen entre sí. Los tests existentes de precios, ocupación y selección siguen pasando.

## Contratos

### Tipos (`src/modules/tickets/types/venue.types.ts`)

```ts
/** Contorno de una zona o del escenario en unidades del viewBox. */
export interface ZoneShape {
  path: string;                 // "d" de un <path> SVG
  label: { x: number; y: number };
  bounds: Rect;                 // caja que contiene el contorno (tests y tooltip)
}

export interface Seat { id; row; number; status; x: number; y: number; angle: number } // angle: rotación de la butaca (grados) para mirar al escenario

export interface VenueZone { ...; shape: ZoneShape }      // antes: Rect
export interface VenueLayout { ...; stage: ZoneShape }     // antes: Rect
```

### Geometría (`src/modules/tickets/services/venue-geometry.ts`, nuevo)

```ts
export function arcBandPath(cx: number, cy: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number): string;
export function roundedRectPath(rect: Rect, radius: number): string;
export function arcBandBounds(...): Rect;
/** Asientos de una fila sobre un arco: separación constante a lo largo del arco, centrados. */
export function placeSeatsOnArc(cx: number, cy: number, radius: number, count: number, spacing: number): { x: number; y: number; angle: number }[];
```

`venues.service.ts` usa estas funciones para las formas de ambos layouts y para ubicar los asientos. `SeatMap` calcula su `viewBox` a partir de los asientos (ya no asume una grilla).

## Reuso

| Necesidad | Encontrado | Decisión |
|---|---|---|
| Render y zoom | `VenueMap`, `SeatMap`, `react-zoom-pan-pinch` | reusar y rediseñar |
| Colores por zona | `zone-tones.ts` + tokens `--zone-1…5` | reusar; se agrega el patrón rayado para agotadas |
| Tooltip | shadcn `tooltip`: registro bloqueado en este entorno | tooltip propio y liviano (posicionado sobre el SVG, solo con puntero fino `hover: hover`) |
| Estado de selección | `usePurchaseStore` | sin cambios |

## Plan de tareas

### Grupo 0 (serial)

- **T-1**: Geometría y nuevos contratos. — archivos: `src/modules/tickets/types/venue.types.ts`, `src/modules/tickets/services/venue-geometry.ts` (+ `.test.ts`), `src/modules/tickets/services/venues.service.ts`, `src/modules/tickets/services/venues.service.test.ts` — tests: sí — cubre: AC-1, AC-5, AC-8

### Grupo 1 (paralelo)

- **T-2**: Mapa de zonas rediseñado + leyenda + tooltip. — archivos: `src/modules/tickets/components/venue-map.tsx`, `src/modules/tickets/components/zone-legend.tsx`, `src/modules/tickets/components/map-tooltip.tsx`, `src/modules/tickets/components/zone-tones.ts` — tests: no — cubre: AC-1, AC-2, AC-3, AC-4
- **T-3**: Mapa de asientos rediseñado + chips de asientos elegidos. — archivos: `src/modules/tickets/components/seat-map.tsx`, `src/modules/tickets/components/selected-seat-chips.tsx` — tests: no — cubre: AC-5, AC-6, AC-7

### Grupo 2 (serial)

- **T-4**: Integración en la pantalla de entradas. — archivos: `src/modules/tickets/components/ticket-selection.tsx` — tests: no — cubre: AC-4, AC-6, AC-7

## Notas de implementación (desvíos menores respecto de la spec)

- **Asiento seleccionado en blanco** (no en el color primario): sobre el fondo índigo del modo noche, el primario se confundía con los tonos de las zonas; el blanco con el número en índigo es el que más contrasta. La leyenda lo refleja.
- `ZoneShape` incluye además `geometry` (la forma lógica: rectángulo o banda de arco) y `SeatRow` incluye `labelPositions`. La no superposición se verifica por muestreo de puntos (`shapesOverlap`), no con las cajas: las cajas de bandas curvas se superponen aunque las bandas no.
- El tooltip solo reacciona al mouse (`pointerType === "mouse"`); en táctil el toque selecciona.
- Para centrar el mapa de asientos en móvil, el contenido del zoom mide lo que mide el SVG (`min-w-full` en vez de `w-full`), y así `centerOnInit` lo centra en el escenario.
- En escritorio la leyenda de precios pasa a otra línea; en móvil se desplaza horizontalmente.

Verificado: `npm run lint`, `npm run test` (170 tests) y `npm run build` en verde; capturas en 1440 px y 390 px de estadio y teatro (zonas, hover con tooltip, selección con atenuado del resto, asientos con filas curvas, chips que quitan asientos); regresión de los recorridos de compra y cuenta sin errores de consola ni scroll horizontal.

## Preguntas abiertas

Ninguna. *(Resuelta: el usuario eligió **modo noche** — contenedores de ambos mapas en `--brand-deep` con escenario y zonas con brillo; el resto de la página sigue clara.)*
