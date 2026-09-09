import { gridHash } from "../grid.js";
import type { Rng } from "../rng.js";
import type { Grid, PatternStyle } from "../types.js";
import { generateChaosPattern } from "./chaos.js";
import { generateCohesivePatternUnique } from "./cohesive.js";

export function generatePattern(
  style: PatternStyle,
  size: number,
  rng: Rng,
  avoidHash?: string,
): Grid {
  for (let attempt = 0; attempt < 3; attempt++) {
    const grid =
      style === "chaos"
        ? generateChaosPattern(size, rng)
        : generateCohesivePatternUnique(size, rng, avoidHash);
    const hash = gridHash(grid);
    if (!avoidHash || hash !== avoidHash) {
      return grid;
    }
  }

  const grid =
    style === "chaos"
      ? generateChaosPattern(size, rng)
      : generateCohesivePatternUnique(size, rng);
  return grid;
}

export { generateChaosPattern } from "./chaos.js";
export { generateCohesivePattern, generateCohesivePatternUnique } from "./cohesive.js";
