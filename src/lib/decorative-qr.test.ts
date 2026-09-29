import { describe, expect, it } from "vitest";

import { buildDecorativeQr } from "@/lib/decorative-qr";

const SIZE = 21;
const cell = (cells: boolean[], row: number, col: number) => cells[row * SIZE + col];

describe("buildDecorativeQr", () => {
  it("returns size * size cells", () => {
    expect(buildDecorativeQr(1)).toHaveLength(SIZE * SIZE);
  });

  it("is deterministic per seed and differs between seeds", () => {
    expect(buildDecorativeQr(24817)).toEqual(buildDecorativeQr(24817));
    expect(buildDecorativeQr(24817)).not.toEqual(buildDecorativeQr(24818));
  });

  it.each([
    [0, 0],
    [0, SIZE - 7],
    [SIZE - 7, 0],
  ])("draws the finder pattern at corner (%i, %i)", (top, left) => {
    const cells = buildDecorativeQr(99);
    // Borde exterior oscuro, anillo interior claro, núcleo 3×3 oscuro, margen claro.
    expect(cell(cells, top, left)).toBe(true);
    expect(cell(cells, top + 6, left + 6)).toBe(true);
    expect(cell(cells, top + 1, left + 1)).toBe(false);
    expect(cell(cells, top + 3, left + 3)).toBe(true);
  });

  it("leaves a light separator around the top-left finder", () => {
    const cells = buildDecorativeQr(5);
    for (let i = 0; i <= 7; i++) {
      expect(cell(cells, 7, i)).toBe(false);
      expect(cell(cells, i, 7)).toBe(false);
    }
  });
});
