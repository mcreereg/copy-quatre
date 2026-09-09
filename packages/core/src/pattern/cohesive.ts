import { createGrid, density, gridHash, hasAnyOn, isInBounds } from "../grid.js";
import type { Rng } from "../rng.js";
import type { Grid } from "../types.js";

type Symmetry = "h" | "v" | "hv" | "rot4" | "none";

const MIN_DENSITY = 0.25;
const MAX_DENSITY = 0.65;
const MAX_ATTEMPTS = 8;

const SYMMETRY_WEIGHTS: Array<{ sym: Symmetry; weight: number }> = [
  { sym: "rot4", weight: 30 },
  { sym: "hv", weight: 25 },
  { sym: "h", weight: 20 },
  { sym: "v", weight: 15 },
  { sym: "none", weight: 10 },
];

function pickSymmetry(rng: Rng): Symmetry {
  const total = SYMMETRY_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let roll = rng.nextInt(1, total);
  for (const { sym, weight } of SYMMETRY_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return sym;
  }
  return "none";
}

function mirrorPositions(
  size: number,
  r: number,
  c: number,
  sym: Symmetry,
): Array<{ r: number; c: number }> {
  const last = size - 1;
  const positions = [{ r, c }];

  if (sym === "h" || sym === "hv" || sym === "rot4") {
    positions.push({ r: last - r, c });
  }
  if (sym === "v" || sym === "hv" || sym === "rot4") {
    positions.push({ r, c: last - c });
  }
  if (sym === "rot4") {
    positions.push({ r: last - r, c: last - c });
  }

  const seen = new Set<string>();
  return positions.filter(({ r: pr, c: pc }) => {
    const key = `${pr},${pc}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function setSymmetric(grid: Grid, r: number, c: number, sym: Symmetry, value: boolean): void {
  const size = grid.length;
  for (const pos of mirrorPositions(size, r, c, sym)) {
    if (isInBounds(grid, pos.r, pos.c)) {
      grid[pos.r][pos.c] = value;
    }
  }
}

function removeIsolated(grid: Grid): void {
  const size = grid.length;
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!grid[r][c]) continue;
        const neighbors = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ].filter(([nr, nc]) => isInBounds(grid, nr, nc) && grid[nr][nc]);
        if (neighbors.length === 0) {
          grid[r][c] = false;
          changed = true;
        }
      }
    }
  }
}

function countOnGrid(grid: Grid): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell) count++;
    }
  }
  return count;
}

function countComponents(grid: Grid): number {
  const size = grid.length;
  const seen = new Set<string>();
  let components = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) continue;
      const start = `${r},${c}`;
      if (seen.has(start)) continue;

      components++;
      const queue = [{ r, c }];
      seen.add(start);

      while (queue.length > 0) {
        const { r: cr, c: cc } = queue.pop()!;
        for (const [nr, nc] of [
          [cr - 1, cc],
          [cr + 1, cc],
          [cr, cc - 1],
          [cr, cc + 1],
        ]) {
          if (!isInBounds(grid, nr, nc) || !grid[nr][nc]) continue;
          const key = `${nr},${nc}`;
          if (seen.has(key)) continue;
          seen.add(key);
          queue.push({ r: nr, c: nc });
        }
      }
    }
  }

  return components;
}

function isConnected(grid: Grid): boolean {
  return countComponents(grid) <= 1;
}

function growPattern(size: number, sym: Symmetry, rng: Rng): Grid {
  const grid = createGrid(size);
  const seedCount = 1;
  const used = new Set<string>();

  for (let s = 0; s < seedCount; s++) {
    const r = rng.nextInt(0, Math.floor(size / 2));
    const c = rng.nextInt(0, Math.floor(size / 2));
    setSymmetric(grid, r, c, sym, true);
    for (const pos of mirrorPositions(size, r, c, sym)) {
      used.add(`${pos.r},${pos.c}`);
    }
  }

  const queue: Array<{ r: number; c: number }> = [];
  for (const key of used) {
    const [r, c] = key.split(",").map(Number);
    queue.push({ r, c });
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
    const { r, c } = queue[idx];

    const dirs = rng.shuffle([
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ]);

    for (const { dr, dc } of dirs) {
      const nr = r + dr;
      const nc = c + dc;
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

export function generateCohesivePattern(size: number, rng: Rng): Grid {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const sym = pickSymmetry(rng);
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

export function generateCohesivePatternUnique(
  size: number,
  rng: Rng,
  avoidHash?: string,
): Grid {
  for (let attempt = 0; attempt < 3; attempt++) {
    const grid = generateCohesivePattern(size, rng);
    if (!avoidHash || gridHash(grid) !== avoidHash) {
      return grid;
    }
  }
  return generateCohesivePattern(size, rng);
}
