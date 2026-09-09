import type { Grid } from "./types.js";

export function createGrid(size: number, fill = false): Grid {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`Grid size must be a positive integer, got ${size}`);
  }
  return Array.from({ length: size }, () => Array(size).fill(fill));
}

export function allOff(size: number): Grid {
  return createGrid(size, false);
}

export function isInBounds(grid: Grid, row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length;
}

export function toggleCell(grid: Grid, row: number, col: number): Grid {
  if (!isInBounds(grid, row, col)) {
    throw new RangeError(`Cell out of bounds: (${row}, ${col})`);
  }
  const next = grid.map((r) => [...r]);
  next[row][col] = !next[row][col];
  return next;
}

export function setCell(grid: Grid, row: number, col: number, value: boolean): Grid {
  if (!isInBounds(grid, row, col)) {
    throw new RangeError(`Cell out of bounds: (${row}, ${col})`);
  }
  const next = grid.map((r) => [...r]);
  next[row][col] = value;
  return next;
}

export function gridsEqual(a: Grid, b: Grid): boolean {
  if (a.length !== b.length || a[0].length !== b[0].length) {
    return false;
  }
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) {
        return false;
      }
    }
  }
  return true;
}

export function gridHash(grid: Grid): string {
  return grid.map((row) => row.map((c) => (c ? "1" : "0")).join("")).join("|");
}

export function countOn(grid: Grid): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell) count++;
    }
  }
  return count;
}

export function hasAnyOn(grid: Grid): boolean {
  return countOn(grid) > 0;
}

export function density(grid: Grid): number {
  const total = grid.length * grid[0].length;
  return countOn(grid) / total;
}
