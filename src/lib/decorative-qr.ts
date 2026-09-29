const FINDER_SIZE = 7;

/**
 * Patrón con forma de código QR (tres marcas de esquina + módulos pseudoaleatorios).
 * Es decorativo: no codifica ningún dato. Devuelve `size * size` celdas por filas; true = oscura.
 */
export function buildDecorativeQr(seed: number, size = 21): boolean[] {
  let state = Math.abs(Math.trunc(seed)) % 233280;
  const random = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };

  const corners = [
    [0, 0],
    [0, size - FINDER_SIZE],
    [size - FINDER_SIZE, 0],
  ];

  const cells: boolean[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      let finder: boolean | null = null;
      for (const [cornerRow, cornerCol] of corners) {
        const r = row - cornerRow;
        const c = col - cornerCol;
        // Incluye el margen blanco de 1 módulo alrededor de cada marca.
        if (r >= -1 && r <= FINDER_SIZE && c >= -1 && c <= FINDER_SIZE) {
          const inside = r >= 0 && r < FINDER_SIZE && c >= 0 && c < FINDER_SIZE;
          const ring = r === 0 || r === FINDER_SIZE - 1 || c === 0 || c === FINDER_SIZE - 1;
          const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          finder = inside && (ring || core);
        }
      }
      cells.push(finder ?? random() > 0.52);
    }
  }
  return cells;
}
