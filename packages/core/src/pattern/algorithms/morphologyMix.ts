import type { Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import { generateBlobGrow } from "./blobGrow.js";
import { generateWormWalk } from "./wormWalk.js";
import {
  COMPONENT_PARAMS,
  DENSITY_PARAMS,
  paramNumber,
  resolveParams,
  desc,
  type AlgorithmDefinition,
  type AlgorithmParams,
} from "./types.js";

export function generateMorphologyMix(size: number, rng: Rng, params: AlgorithmParams = {}): Grid {
  const p = resolveParams(morphologyMixAlgorithm.params, params);
  const blobWeight = paramNumber(p, "blobWeight");

  const sharedParams: AlgorithmParams = {
    minDensity: p.minDensity,
    maxDensity: p.maxDensity,
    maxComponents: p.maxComponents,
    preferredMaxComponents: p.preferredMaxComponents,
  };

  if (rng.next() < blobWeight) {
    return generateBlobGrow(size, rng, {
      ...sharedParams,
      fillChance: 0.7,
    });
  }

  return generateWormWalk(size, rng, {
    ...sharedParams,
    stringyMomentum: p.stringyMomentum,
    stringySymmetryChance: p.stringySymmetryChance,
    fragmentWeights: p.fragmentWeights,
  });
}

export const morphologyMixAlgorithm: AlgorithmDefinition = {
  id: "morphology-mix",
  name: "Morphology mix",
  description: "Rolls between blob-grow and worm-walk. Default 20% blob, 80% stringy.",
  params: [
    {
      key: "blobWeight",
      label: "Blob weight",
      type: "number",
      default: 0.2,
      min: 0,
      max: 1,
      step: 0.05,
      description: desc(
        "Probability of using blob-grow instead of worm-walk for each generation attempt.",
        "0.15–0.35",
      ),
    },
    {
      key: "stringyMomentum",
      label: "Stringy momentum",
      type: "number",
      default: 0.8,
      min: 0.5,
      max: 0.99,
      step: 0.05,
      description: desc(
        "Momentum for the worm-walk branch. Higher values produce longer strokes.",
        "0.75–0.90",
      ),
    },
    {
      key: "stringySymmetryChance",
      label: "Stringy symmetry chance",
      type: "number",
      default: 0.2,
      min: 0,
      max: 1,
      step: 0.05,
      description: desc(
        "Symmetry chance when the stringy branch is selected.",
        "0.10–0.30",
      ),
    },
    {
      key: "fragmentWeights",
      label: "Fragment weights",
      type: "numberArray",
      default: [55, 30, 12, 3],
      description: desc(
        "Fragment count weights for the worm-walk branch.",
        "[55,30,12,3]",
      ),
    },
    ...DENSITY_PARAMS,
    ...COMPONENT_PARAMS,
  ],
  generate: generateMorphologyMix,
};
