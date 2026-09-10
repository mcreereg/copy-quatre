import { isInBounds } from "../../grid.js";
import type { Rng } from "../../rng.js";
import type { Grid } from "../../types.js";

export type Symmetry = "h" | "v" | "hv" | "rot4" | "none";

export const DEFAULT_SYMMETRY_WEIGHTS: Array<{ sym: Symmetry; weight: number }> = [
  { sym: "rot4", weight: 25 },
  { sym: "hv", weight: 10 },
  { sym: "h", weight: 15 },
  { sym: "v", weight: 15 },
  { sym: "none", weight: 35 },
];

export function pickSymmetry(
  rng: Rng,
  weights: Array<{ sym: Symmetry; weight: number }> = DEFAULT_SYMMETRY_WEIGHTS,
): Symmetry {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  let roll = rng.nextInt(1, total);
  for (const { sym, weight } of weights) {
    roll -= weight;
    if (roll <= 0) return sym;
  }
  return "none";
}

export function mirrorPositions(
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

export function setSymmetric(grid: Grid, r: number, c: number, sym: Symmetry, value: boolean): void {
  const size = grid.length;
  for (const pos of mirrorPositions(size, r, c, sym)) {
    if (isInBounds(grid, pos.r, pos.c)) {
      grid[pos.r][pos.c] = value;
    }
  }
}
