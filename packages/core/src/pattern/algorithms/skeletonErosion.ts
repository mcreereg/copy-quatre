import { createGrid, density, hasAnyOn } from "../../grid.js";
import type { Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import { countOnNeighbors, removeIsolated } from "../shared/components.js";
import { shouldAcceptPattern } from "../shared/validation.js";
import {
  COMPONENT_PARAMS,
  DENSITY_PARAMS,
  paramNumber,
  resolveParams,
  desc,
  type AlgorithmDefinition,
  type AlgorithmParams,
} from "./types.js";

const MAX_ATTEMPTS = 8;

function erodeJunctions(grid: Grid, maxPasses: number): void {
  const size = grid.length;
  for (let pass = 0; pass < maxPasses; pass++) {
    const toRemove: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!grid[r][c]) continue;
        if (countOnNeighbors(grid, r, c) >= 3) {
          toRemove.push({ r, c });
        }
      }
    }
    if (toRemove.length === 0) break;
    for (const { r, c } of toRemove) {
      grid[r][c] = false;
    }
  }
  removeIsolated(grid);
}

function generateSkeleton(
  size: number,
  rng: Rng,
  initialDensity: number,
  maxErosionPasses: number,
): Grid {
  const grid = createGrid(size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      grid[r][c] = rng.next() < initialDensity;
    }
  }
  erodeJunctions(grid, maxErosionPasses);
  return grid;
}

function makeFallback(size: number): Grid {
  const grid = createGrid(size);
  const mid = Math.floor(size / 2);
  for (let i = 0; i < size; i++) {
    grid[mid][i] = true;
  }
  return grid;
}

export function generateSkeletonErosion(
  size: number,
  rng: Rng,
  params: AlgorithmParams = {},
): Grid {
  const p = resolveParams(skeletonErosionAlgorithm.params, params);
  const minDensity = paramNumber(p, "minDensity");
  const maxDensity = paramNumber(p, "maxDensity");
  const maxComponents = paramNumber(p, "maxComponents");
  const preferredMaxComponents = paramNumber(p, "preferredMaxComponents");
  const initialDensity = paramNumber(p, "initialDensity");
  const maxErosionPasses = paramNumber(p, "maxErosionPasses");
  const validation = { minDensity, maxDensity, maxComponents };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const grid = generateSkeleton(size, rng, initialDensity, maxErosionPasses);
    const d = density(grid);
    if (
      hasAnyOn(grid) &&
      d >= minDensity &&
      d <= maxDensity &&
      shouldAcceptPattern(grid, validation, attempt, MAX_ATTEMPTS, preferredMaxComponents)
    ) {
      return grid;
    }
  }

  return makeFallback(size);
}

export const skeletonErosionAlgorithm: AlgorithmDefinition = {
  id: "skeleton-erosion",
  name: "Skeleton erosion",
  description: "Random fill then erode cells with 3+ ON neighbors, leaving thin filaments.",
  params: [
    {
      key: "initialDensity",
      label: "Initial density",
      type: "number",
      default: 0.55,
      min: 0.2,
      max: 0.9,
      step: 0.05,
      description: desc(
        "Starting fill probability before erosion passes.",
        "0.45–0.70",
      ),
    },
    {
      key: "maxErosionPasses",
      label: "Max erosion passes",
      type: "number",
      default: 20,
      min: 1,
      max: 100,
      step: 1,
      description: desc(
        "How many times to remove junction cells (3+ neighbors).",
        "10–35",
      ),
    },
    ...DENSITY_PARAMS,
    ...COMPONENT_PARAMS,
  ],
  generate: generateSkeletonErosion,
};
