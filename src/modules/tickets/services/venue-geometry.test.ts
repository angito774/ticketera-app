import { describe, expect, it } from "vitest";

import {
  arcBandPath,
  boundsOf,
  containsPoint,
  labelPoint,
  placeSeatsOnArc,
  pointOnCircle,
  roundedRectPath,
  shapesOverlap,
} from "@/modules/tickets/services/venue-geometry";
import type { ShapeGeometry } from "@/modules/tickets/types/venue.types";

const band: ShapeGeometry = { kind: "arc", cx: 0, cy: 0, innerRadius: 100, outerRadius: 150, startAngle: 60, endAngle: 120 };
const rect: ShapeGeometry = { kind: "rect", rect: { x: -20, y: -20, width: 40, height: 40 }, radius: 8 };

describe("pointOnCircle", () => {
  it("uses 90° as straight down", () => {
    expect(pointOnCircle(10, 10, 5, 90)).toEqual({ x: 10, y: 15 });
    expect(pointOnCircle(10, 10, 5, 0)).toEqual({ x: 15, y: 10 });
  });
});

describe("paths", () => {
  it("builds a closed arc band with two arcs", () => {
    const path = arcBandPath(0, 0, 100, 150, 60, 120);
    expect(path.startsWith("M ")).toBe(true);
    expect(path.match(/A /g)).toHaveLength(2);
    expect(path.endsWith("Z")).toBe(true);
  });

  it("builds a rounded rect with four corner arcs", () => {
    expect(roundedRectPath({ x: 0, y: 0, width: 40, height: 20 }, 6).match(/A /g)).toHaveLength(4);
  });
});

describe("containsPoint", () => {
  it("detects points inside an arc band", () => {
    expect(containsPoint(band, pointOnCircle(0, 0, 125, 90))).toBe(true);
    expect(containsPoint(band, pointOnCircle(0, 0, 90, 90))).toBe(false); // radio menor
    expect(containsPoint(band, pointOnCircle(0, 0, 125, 30))).toBe(false); // fuera del ángulo
  });

  it("handles bands that cross 0°", () => {
    const crossing: ShapeGeometry = { ...band, startAngle: -40, endAngle: 50 } as ShapeGeometry;
    expect(containsPoint(crossing, pointOnCircle(0, 0, 125, 0))).toBe(true);
    expect(containsPoint(crossing, pointOnCircle(0, 0, 125, 180))).toBe(false);
  });
});

describe("shapesOverlap", () => {
  it("detects overlapping and separate shapes", () => {
    expect(shapesOverlap(rect, band)).toBe(false);
    expect(shapesOverlap(band, { ...band, startAngle: 100, endAngle: 140 } as ShapeGeometry)).toBe(true);
    expect(shapesOverlap(band, { ...band, startAngle: 120, endAngle: 160 } as ShapeGeometry)).toBe(false);
  });
});

describe("boundsOf and labelPoint", () => {
  it("returns the rect itself and its center", () => {
    expect(boundsOf(rect)).toEqual({ x: -20, y: -20, width: 40, height: 40 });
    expect(labelPoint(rect)).toEqual({ x: 0, y: 0 });
  });

  it("puts the band label in the middle of the band", () => {
    expect(labelPoint(band)).toEqual(pointOnCircle(0, 0, 125, 90));
    const bounds = boundsOf(band);
    expect(bounds.y).toBeCloseTo(Math.sin((60 * Math.PI) / 180) * 100, 0);
    expect(bounds.y + bounds.height).toBeCloseTo(150, 0);
  });
});

describe("placeSeatsOnArc", () => {
  const seats = placeSeatsOnArc(0, 0, 260, 5, 24);

  it("centers the row below the arc center", () => {
    expect(seats[2]).toEqual({ x: 0, y: 260, angle: 0 });
    expect(seats[0].x).toBeCloseTo(-seats[4].x, 5);
  });

  it("keeps a constant distance between neighbours and bends the row", () => {
    for (let i = 1; i < seats.length; i++) {
      expect(Math.hypot(seats[i].x - seats[i - 1].x, seats[i].y - seats[i - 1].y)).toBeCloseTo(24, 0);
    }
    expect(seats[0].y).toBeLessThan(seats[2].y);
  });

  it("rotates each seat to face the center", () => {
    expect(seats[0].angle).toBeGreaterThan(0);
    expect(seats[4].angle).toBeLessThan(0);
  });
});
