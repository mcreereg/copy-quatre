import type { Grid } from "../../types.js";
import { isInBounds } from "../../grid.js";
import { countComponents, countOnGrid } from "./components.js";

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

export function onDegree(grid: Grid, row: number, col: number): number {
  if (!grid[row][col]) return 0;
  let degree = 0;
  for (const { dr, dc } of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (isInBounds(grid, nr, nc) && grid[nr][nc]) degree++;
  }
  return degree;
}

/** True when ON cells can be visited by a single non-revisiting orthogonal stroke. */
export function hasHamiltonianPath(grid: Grid): boolean {
  const target = countOnGrid(grid);
  if (target === 0) return false;
  if (target === 1) return true;

  const size = grid.length;
  const mask = new Uint32Array(Math.ceil((size * size) / 32) || 1);
  const idx = (row: number, col: number) => row * size + col;
  const mark = (i: number) => {
    mask[i >> 5] |= 1 << (i & 31);
  };
  const unmark = (i: number) => {
    mask[i >> 5] &= ~(1 << (i & 31));
  };
  const marked = (i: number) => (mask[i >> 5] & (1 << (i & 31))) !== 0;

  let found = false;

  function dfs(row: number, col: number, visited: number): void {
    if (found) return;
    if (visited === target) {
      found = true;
      return;
    }
    for (const { dr, dc } of DIRECTIONS) {
      const nr = row + dr;
      const nc = col + dc;
      if (!isInBounds(grid, nr, nc) || !grid[nr][nc]) continue;
      const cellIdx = idx(nr, nc);
      if (marked(cellIdx)) continue;
      mark(cellIdx);
      dfs(nr, nc, visited + 1);
      unmark(cellIdx);
      if (found) return;
    }
  }

  const starts: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col]) starts.push({ row, col });
    }
  }
  starts.sort((a, b) => onDegree(grid, a.row, a.col) - onDegree(grid, b.row, b.col));

  for (const start of starts) {
    if (found) break;
    mask.fill(0);
    mark(idx(start.row, start.col));
    dfs(start.row, start.col, 1);
  }

  return found;
}

/** Fast validation for incrementally built serpentine paths (Hamiltonian by construction). */
export function isBuiltSerpentinePath(
  grid: Grid,
  path: Array<{ row: number; col: number }>,
): boolean {
  if (path.length === 0) return false;
  if (path.length !== countOnGrid(grid)) return false;

  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (Math.abs(a.row - b.row) + Math.abs(a.col - b.col) !== 1) return false;
  }

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (!grid[row][col]) continue;
      if (onDegree(grid, row, col) > 3) return false;
    }
  }

  return true;
}

/** Serpentine references allow mild junctions when a traceable path still exists. */
export function isSerpentineReferenceGrid(grid: Grid): boolean {
  if (countOnGrid(grid) === 0) return false;
  if (countComponents(grid) !== 1) return false;

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (!grid[row][col]) continue;
      if (onDegree(grid, row, col) > 3) return false;
    }
  }

  return hasHamiltonianPath(grid);
}

/** True when ON cells form a single simple path (no junctions, no branches). */
export function isPathGraph(grid: Grid): boolean {
  let onCount = 0;
  let endpoints = 0;

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (!grid[row][col]) continue;
      onCount++;
      const degree = onDegree(grid, row, col);
      if (degree > 2) return false;
      if (degree === 1) endpoints++;
    }
  }

  if (onCount === 0) return false;
  if (countComponents(grid) !== 1) return false;
  if (onCount === 1) return true;
  return endpoints === 2;
}
