import { gridHash } from "../grid.js";
import type { Rng } from "../rng.js";
import type { Grid } from "../types.js";
import { generateSerpentinePattern } from "./algorithms/serpentine.js";

export function generateSerpentinePatternUnique(
  size: number,
  rng: Rng,
  avoidHash?: string,
): Grid {
  for (let attempt = 0; attempt < 3; attempt++) {
    const grid = generateSerpentinePattern(size, rng);
    if (!avoidHash || gridHash(grid) !== avoidHash) {
      return grid;
    }
  }
  return generateSerpentinePattern(size, rng);
}
