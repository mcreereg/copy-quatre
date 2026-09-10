import { blobGrowAlgorithm } from "./blobGrow.js";
import { chaosAlgorithm } from "./chaosAlgorithm.js";
import { endpointGrowAlgorithm } from "./endpointGrow.js";
import { legacyCohesiveAlgorithm } from "./legacyCohesiveAlgorithm.js";
import { morphologyMixAlgorithm } from "./morphologyMix.js";
import { skeletonErosionAlgorithm } from "./skeletonErosion.js";
import type { AlgorithmDefinition } from "./types.js";
import { wormWalkAlgorithm } from "./wormWalk.js";

export const PATTERN_ALGORITHMS: AlgorithmDefinition[] = [
  legacyCohesiveAlgorithm,
  chaosAlgorithm,
  blobGrowAlgorithm,
  wormWalkAlgorithm,
  morphologyMixAlgorithm,
  endpointGrowAlgorithm,
  skeletonErosionAlgorithm,
];

export function getAlgorithm(id: string): AlgorithmDefinition | undefined {
  return PATTERN_ALGORITHMS.find((a) => a.id === id);
}

export const DEFAULT_ALGORITHM_ID = "morphology-mix";
