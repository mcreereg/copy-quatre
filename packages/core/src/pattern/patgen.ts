import { createRng } from "../rng.js";
import type { Grid } from "../types.js";
import { getAlgorithm, PATTERN_ALGORITHMS, DEFAULT_ALGORITHM_ID } from "./algorithms/registry.js";
import { desc, resolveParams, type AlgorithmParams, type ParamDef } from "./algorithms/types.js";

export type PatgenBatchOptions = {
  algorithmId?: string;
  gridSize: number;
  count: number;
  seed: number;
  params?: AlgorithmParams;
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
    min: 0,
    max: 999_999_999,
    step: 1,
    description: desc(
      "PRNG seed. Each pattern uses seed + index for reproducibility.",
      "1–100 for quick iteration",
    ),
  },
];

export function runPatgenBatch(options: PatgenBatchOptions): Grid[] {
  const algorithmId = options.algorithmId ?? DEFAULT_ALGORITHM_ID;
  const algorithm = getAlgorithm(algorithmId);
  if (!algorithm) {
    throw new RangeError(`Unknown algorithm: ${algorithmId}`);
  }

  const params = resolveParams(algorithm.params, options.params ?? {});
  const grids: Grid[] = [];

  for (let i = 0; i < options.count; i++) {
    const rng = createRng(options.seed + i);
    grids.push(algorithm.generate(options.gridSize, rng, params));
  }

  return grids;
}

export { getAlgorithm, PATTERN_ALGORITHMS, DEFAULT_ALGORITHM_ID };
export type { AlgorithmParams, ParamDef };
