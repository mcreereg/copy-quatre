import type { Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import { generateLegacyCohesivePattern } from "./legacyCohesive.js";
import type { AlgorithmDefinition, AlgorithmParams } from "./types.js";

export const legacyCohesiveAlgorithm: AlgorithmDefinition = {
  id: "legacy-cohesive",
  name: "Legacy cohesive blob",
  description:
    "Original game cohesive algorithm: symmetric blob growth, always single connected component. Same output as game cohesive mode.",
  params: [],
  generate: (size: number, rng: Rng, _params: AlgorithmParams): Grid =>
    generateLegacyCohesivePattern(size, rng),
};
