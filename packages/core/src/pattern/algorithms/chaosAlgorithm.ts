import { createGrid, density, hasAnyOn } from "../../grid.js";
import type { Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import {
  DENSITY_PARAMS,
  paramNumber,
  resolveParams,
  type AlgorithmDefinition,
  type AlgorithmParams,
} from "./types.js";

const MAX_ATTEMPTS = 12;

export function generateChaosAlgorithm(
  size: number,
  rng: Rng,
  params: AlgorithmParams = {},
): Grid {
  const p = resolveParams(chaosAlgorithm.params, params);
  const minDensity = paramNumber(p, "minDensity");
  const maxDensity = paramNumber(p, "maxDensity");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const fillP = 0.35 + rng.next() * 0.3;
    const grid = createGrid(size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        grid[r][c] = rng.next() < fillP;
      }
    }
    const d = density(grid);
    if (hasAnyOn(grid) && d >= minDensity && d <= maxDensity) {
      return grid;
    }
  }

  const grid = createGrid(size);
  const onCount = Math.max(1, Math.round(size * size * 0.45));
  const positions = rng.shuffle(
    Array.from({ length: size * size }, (_, i) => ({
      r: Math.floor(i / size),
      c: i % size,
    })),
  );
  for (let i = 0; i < onCount; i++) {
    grid[positions[i].r][positions[i].c] = true;
  }
  return grid;
}

export const chaosAlgorithm: AlgorithmDefinition = {
  id: "chaos",
  name: "Chaos (random fill)",
  description: "Independent random cell fill with density bounds. Same logic as the game chaos mode.",
  params: [...DENSITY_PARAMS],
  generate: generateChaosAlgorithm,
};

/** Game-facing chaos with fixed density bounds (unchanged behavior). */
export function generateChaosPatternGame(size: number, rng: Rng): Grid {
  return generateChaosAlgorithm(size, rng, { minDensity: 0.25, maxDensity: 0.65 });
}
