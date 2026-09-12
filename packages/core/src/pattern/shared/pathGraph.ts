import type { Grid } from "../../types.js";
import { isInBounds } from "../../grid.js";
import { countComponents } from "./components.js";

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
