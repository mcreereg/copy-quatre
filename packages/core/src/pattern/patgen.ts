import { createRng } from "../rng.js";
import type { Grid } from "../types.js";
import { getAlgorithm, PATTERN_ALGORITHMS, DEFAULT_ALGORITHM_ID } from "./algorithms/registry.js";
import { desc, resolveParams, type AlgorithmParams, type ParamDef } from "./algorithms/types.js";

export const RANDOM_PATGEN_SEED = -1;

export type PatgenBatchOptions = {
  algorithmId?: string;
  gridSize: number;
  count: number;
  seed: number;
  params?: AlgorithmParams;
};

export type PatgenBatchResult = {
  grids: Grid[];
  seed: number;
};

export type PatgenGlobalParamDef = {
  key: string;
  label: string;
  type: "number";
  default: number;
  min: number;
  max: number;
  step: number;
  description: string;
};

export const PATGEN_GLOBAL_PARAMS: PatgenGlobalParamDef[] = [
  {
    key: "gridSize",
    label: "Grid size",
    type: "number",
    default: 10,
    min: 2,
    max: 20,
    step: 1,
    description: desc("Width and height of the square grid in cells.", "6–12"),
  },
  {
    key: "count",
    label: "Count",
    type: "number",
    default: 16,
    min: 1,
    max: 100,
    step: 1,
    description: desc("How many example patterns to generate in one batch.", "8–32"),
  },
  {
    key: "seed",
    label: "Seed",
    type: "number",
    default: 1,
    min: RANDOM_PATGEN_SEED,
    max: 999_999_999,
    step: 1,
    description: desc(
      "PRNG seed. Each pattern uses seed + index for reproducibility. Use -1 for a random seed.",
      "1–100 for quick iteration, -1 for random",
    ),
  },
];

export function resolvePatgenSeed(seed: number): number {
  if (seed !== RANDOM_PATGEN_SEED) {
    return seed;
  }
  return Math.floor(Math.random() * 999_999_999);
}

export function runPatgenBatch(options: PatgenBatchOptions): PatgenBatchResult {
  const algorithmId = options.algorithmId ?? DEFAULT_ALGORITHM_ID;
  const algorithm = getAlgorithm(algorithmId);
  if (!algorithm) {
    throw new RangeError(`Unknown algorithm: ${algorithmId}`);
  }

  const params = resolveParams(algorithm.params, options.params ?? {});
  const seed = resolvePatgenSeed(options.seed);
  const grids: Grid[] = [];

  for (let i = 0; i < options.count; i++) {
    const rng = createRng(seed + i);
    grids.push(algorithm.generate(options.gridSize, rng, params));
  }

  return { grids, seed };
}

export { getAlgorithm, PATTERN_ALGORITHMS, DEFAULT_ALGORITHM_ID };
export type { AlgorithmParams, ParamDef };
