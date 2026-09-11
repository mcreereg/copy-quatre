import type { Grid } from "../../types.js";

export function validateImposterGrid(grid: Grid): void {
  if (!Array.isArray(grid) || grid.length === 0) {
    throw new RangeError("Grid must be a non-empty square boolean[][]");
  }
  const size = grid.length;
  for (let row = 0; row < size; row++) {
    if (!Array.isArray(grid[row]) || grid[row].length !== size) {
      throw new RangeError("Grid must be a non-empty square boolean[][]");
    }
    for (let col = 0; col < size; col++) {
      if (typeof grid[row][col] !== "boolean") {
        throw new TypeError(`Grid cell (${row}, ${col}) must be boolean`);
      }
    }
  }
}
