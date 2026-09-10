import { gridHash } from "../grid.js";
import type { Rng } from "../rng.js";
import type { Grid } from "../types.js";
import { generateWormWalk } from "./algorithms/wormWalk.js";

/** Game "cohesive" style — worm-walk with default algorithm params. */
export function generateCohesivePattern(size: number, rng: Rng): Grid {
  return generateWormWalk(size, rng);
}

export function generateCohesivePatternUnique(
  size: number,
  rng: Rng,
  avoidHash?: string,
): Grid {
  for (let attempt = 0; attempt < 3; attempt++) {
    const grid = generateWormWalk(size, rng);
    if (!avoidHash || gridHash(grid) !== avoidHash) {
      return grid;
    }
  }
  return generateWormWalk(size, rng);
}
