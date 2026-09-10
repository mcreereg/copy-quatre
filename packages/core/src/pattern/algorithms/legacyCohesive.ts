import { createGrid, density, hasAnyOn, isInBounds } from "../../grid.js";
import type { Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import { countOnGrid, isConnected, removeIsolated } from "../shared/components.js";
import {
  DEFAULT_SYMMETRY_WEIGHTS,
  mirrorPositions,
  pickSymmetry,
  setSymmetric,
  type Symmetry,
} from "../shared/symmetry.js";

const MIN_DENSITY = 0.25;
const MAX_DENSITY = 0.65;
const MAX_ATTEMPTS = 8;

function growPattern(size: number, sym: Symmetry, rng: Rng): Grid {
  const grid = createGrid(size);
  const used = new Set<string>();

  const r = rng.nextInt(0, Math.floor(size / 2));
  const c = rng.nextInt(0, Math.floor(size / 2));
  setSymmetric(grid, r, c, sym, true);
  for (const pos of mirrorPositions(size, r, c, sym)) {
    used.add(`${pos.r},${pos.c}`);
  }

  const queue: Array<{ r: number; c: number }> = [];
  for (const key of used) {
    const [qr, qc] = key.split(",").map(Number);
    queue.push({ r: qr, c: qc });
  }

  const targetOn = Math.round(
    size * size * (MIN_DENSITY + rng.next() * (MAX_DENSITY - MIN_DENSITY)),
  );
  let attempts = 0;
  const maxAttempts = size * size * 4;

  while (countOnGrid(grid) < targetOn && attempts < maxAttempts) {
    attempts++;
    if (queue.length === 0) break;
    const idx = rng.nextInt(0, queue.length - 1);
    const { r: cr, c: cc } = queue[idx];

    const dirs = rng.shuffle([
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ]);

    for (const { dr, dc } of dirs) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (!isInBounds(grid, nr, nc)) continue;
      if (rng.next() < 0.7) {
        setSymmetric(grid, nr, nc, sym, true);
        for (const pos of mirrorPositions(size, nr, nc, sym)) {
          const k = `${pos.r},${pos.c}`;
          if (!used.has(k)) {
            used.add(k);
            queue.push(pos);
          }
        }
      }
    }
  }

  removeIsolated(grid);
  return grid;
}

function isValidPattern(grid: Grid): boolean {
  const d = density(grid);
  return hasAnyOn(grid) && d >= MIN_DENSITY && d <= MAX_DENSITY && isConnected(grid);
}

function makeFallbackPattern(size: number): Grid {
  const grid = createGrid(size);
  const targetOn = Math.max(1, Math.round(size * size * 0.45));
  const mid = Math.floor(size / 2);
  const queue: Array<{ r: number; c: number }> = [{ r: mid, c: mid }];
  grid[mid][mid] = true;
  let onCount = 1;

  while (onCount < targetOn && queue.length > 0) {
    const { r, c } = queue.shift()!;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      if (!isInBounds(grid, nr, nc) || grid[nr][nc]) continue;
      grid[nr][nc] = true;
      onCount++;
      queue.push({ r: nr, c: nc });
      if (onCount >= targetOn) break;
    }
  }

  return grid;
}

export function generateLegacyCohesivePattern(size: number, rng: Rng): Grid {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const sym = pickSymmetry(rng, DEFAULT_SYMMETRY_WEIGHTS);
    const grid = growPattern(size, sym, rng);
    if (isValidPattern(grid)) {
      return grid;
    }
  }

  const fallback = makeFallbackPattern(size);
  if (isValidPattern(fallback)) {
    return fallback;
  }

  const grid = createGrid(size);
  grid[0][0] = true;
  if (size > 1) grid[0][1] = true;
  return grid;
}
