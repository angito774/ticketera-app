import type { Point, Rect, ShapeGeometry } from "@/modules/tickets/types/venue.types";

/**
 * Geometría de los mapas de recinto, en unidades del viewBox (y hacia abajo).
 * Los ángulos están en grados, medidos desde +x en sentido horario (90° = hacia abajo).
 */

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const round = (value: number) => Math.round(value * 100) / 100;

export function pointOnCircle(cx: number, cy: number, radius: number, angle: number): Point {
  const radians = toRadians(angle);
  return { x: round(cx + radius * Math.cos(radians)), y: round(cy + radius * Math.sin(radians)) };
}

/** "d" de una banda de anillo entre dos radios y dos ángulos (tribuna curva). */
export function arcBandPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = pointOnCircle(cx, cy, outerRadius, startAngle);
  const outerEnd = pointOnCircle(cx, cy, outerRadius, endAngle);
  const innerEnd = pointOnCircle(cx, cy, innerRadius, endAngle);
  const innerStart = pointOnCircle(cx, cy, innerRadius, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

/** "d" de un rectángulo con esquinas redondeadas. */
export function roundedRectPath({ x, y, width, height }: Rect, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M ${x + r} ${y}`,
    `H ${x + width - r}`,
    `A ${r} ${r} 0 0 1 ${x + width} ${y + r}`,
    `V ${y + height - r}`,
    `A ${r} ${r} 0 0 1 ${x + width - r} ${y + height}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + height - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

/** Puntos de muestra dentro de la figura (para detectar superposiciones y calcular la caja). */
export function samplePoints(geometry: ShapeGeometry, steps = 12): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const u = i / steps;
      const v = j / steps;
      if (geometry.kind === "rect") {
        const { x, y, width, height } = geometry.rect;
        points.push({ x: x + u * width, y: y + v * height });
      } else {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = geometry;
        points.push(
          pointOnCircle(cx, cy, innerRadius + u * (outerRadius - innerRadius), startAngle + v * (endAngle - startAngle))
        );
      }
    }
  }
  return points;
}

const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;

/** ¿El punto está dentro de la figura? (con un margen hacia adentro para ignorar bordes compartidos). */
export function containsPoint(geometry: ShapeGeometry, { x, y }: Point, inset = 0.5): boolean {
  if (geometry.kind === "rect") {
    const { rect } = geometry;
    return (
      x > rect.x + inset && x < rect.x + rect.width - inset && y > rect.y + inset && y < rect.y + rect.height - inset
    );
  }
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = geometry;
  const radius = Math.hypot(x - cx, y - cy);
  if (radius <= innerRadius + inset || radius >= outerRadius - inset) return false;
  const angle = normalizeAngle((Math.atan2(y - cy, x - cx) * 180) / Math.PI);
  const start = normalizeAngle(startAngle);
  const span = endAngle - startAngle;
  const offset = normalizeAngle(angle - start);
  return offset > 0.5 && offset < span - 0.5;
}

/** Dos figuras se superponen si algún punto de muestra de una cae dentro de la otra. */
export function shapesOverlap(a: ShapeGeometry, b: ShapeGeometry): boolean {
  return samplePoints(a).some((point) => containsPoint(b, point)) || samplePoints(b).some((point) => containsPoint(a, point));
}

export function boundsOf(geometry: ShapeGeometry): Rect {
  if (geometry.kind === "rect") return geometry.rect;
  const points = samplePoints(geometry, 24);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Punto donde va la etiqueta: centro del rectángulo o del medio de la banda. */
export function labelPoint(geometry: ShapeGeometry): Point {
  if (geometry.kind === "rect") {
    const { x, y, width, height } = geometry.rect;
    return { x: x + width / 2, y: y + height / 2 };
  }
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = geometry;
  return pointOnCircle(cx, cy, (innerRadius + outerRadius) / 2, (startAngle + endAngle) / 2);
}

export function pathOf(geometry: ShapeGeometry): string {
  return geometry.kind === "rect"
    ? roundedRectPath(geometry.rect, geometry.radius)
    : arcBandPath(geometry.cx, geometry.cy, geometry.innerRadius, geometry.outerRadius, geometry.startAngle, geometry.endAngle);
}

/**
 * Posiciones de `count` asientos sobre un arco de radio `radius` centrado hacia abajo (90°),
 * con `spacing` de separación medida sobre el arco. `angle` es la rotación de cada butaca
 * para que mire al centro (el escenario).
 */
export function placeSeatsOnArc(
  cx: number,
  cy: number,
  radius: number,
  count: number,
  spacing: number
): { x: number; y: number; angle: number }[] {
  const step = (spacing / radius) * (180 / Math.PI);
  const start = 90 + ((count - 1) * step) / 2;
  return Array.from({ length: count }, (_, index) => {
    const angle = start - index * step;
    const point = pointOnCircle(cx, cy, radius, angle);
    return { ...point, angle: round(angle - 90) };
  });
}
