import { createGrid, density, hasAnyOn } from "../grid.js";
import type { Rng } from "../rng.js";
import type { Grid } from "../types.js";

const MIN_DENSITY = 0.25;
const MAX_DENSITY = 0.65;
const MAX_ATTEMPTS = 12;

export function generateChaosPattern(size: number, rng: Rng): Grid {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const p = 0.35 + rng.next() * 0.3;
    const grid = createGrid(size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        grid[r][c] = rng.next() < p;
      }
    }
    const d = density(grid);
    if (hasAnyOn(grid) && d >= MIN_DENSITY && d <= MAX_DENSITY) {
      return grid;
    }
  }

  // Fallback: force at least one cell on with mid density
  const grid = createGrid(size);
  const onCount = Math.max(1, Math.round(size * size * 0.45));
  const positions = rng.shuffle(
    Array.from({ length: size * size }, (_, i) => ({
      r: Math.floor(i / size),
      c: i % size,
    })),
  );
  for (let i = 0; i < onCount; i++) {
    grid[positions[i].r][positions[i].c] = true;
  }
  return grid;
}
