import { density } from "../../grid.js";
import type { Grid } from "../../types.js";
import { countComponents } from "./components.js";

export function gridToAscii(grid: Grid, on = "#", off = "."): string {
  return grid.map((row) => row.map((cell) => (cell ? on : off)).join("")).join("\n");
}

export function formatPatternBlock(
  grid: Grid,
  index: number,
  total: number,
  on = "#",
  off = ".",
): string {
  const d = density(grid);
  const components = countComponents(grid);
  const header = `=== pattern ${index}/${total} (density ${d.toFixed(2)}, components ${components}) ===`;
  return `${header}\n${gridToAscii(grid, on, off)}`;
}
