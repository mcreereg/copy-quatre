import { isInBounds } from "../../grid.js";
import type { Grid } from "../../types.js";
import type { CellCoordinate } from "../types.js";
import { validateImposterGrid } from "./validation.js";

export function coordinateKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function isImposterToggleEligible(grid: Grid, row: number, col: number): boolean {
  validateImposterGrid(grid);
  if (!Number.isInteger(row) || !Number.isInteger(col) || !isInBounds(grid, row, col)) {
    return false;
  }

  let hasOn = false;
  let hasOff = false;
  const neighbors: [number, number][] = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ];

  for (const [r, c] of neighbors) {
    if (!isInBounds(grid, r, c)) continue;
    if (grid[r][c]) {
      hasOn = true;
    } else {
      hasOff = true;
    }
  }

  return hasOn && hasOff;
}

export function listImposterToggleCandidates(
  grid: Grid,
  excluded?: ReadonlySet<string>,
): CellCoordinate[] {
  validateImposterGrid(grid);
  const candidates: CellCoordinate[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const key = coordinateKey(row, col);
      if (excluded?.has(key)) continue;
      if (isImposterToggleEligible(grid, row, col)) {
        candidates.push({ row, col });
      }
    }
  }
  return candidates;
}
