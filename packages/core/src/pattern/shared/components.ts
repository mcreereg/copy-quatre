import { isInBounds } from "../../grid.js";
import type { Grid } from "../../types.js";

export function countOnGrid(grid: Grid): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell) count++;
    }
  }
  return count;
}

export function countOnNeighbors(grid: Grid, r: number, c: number): number {
  let count = 0;
  for (const [nr, nc] of [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ]) {
    if (isInBounds(grid, nr, nc) && grid[nr][nc]) count++;
  }
  return count;
}

export function removeIsolated(grid: Grid): void {
  const size = grid.length;
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!grid[r][c]) continue;
        if (countOnNeighbors(grid, r, c) === 0) {
          grid[r][c] = false;
          changed = true;
        }
      }
    }
  }
}

export function countComponents(grid: Grid): number {
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

export function isConnected(grid: Grid): boolean {
  return countComponents(grid) <= 1;
}
