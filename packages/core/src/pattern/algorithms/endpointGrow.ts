import { createGrid, isInBounds } from "../../grid.js";
import type { Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import { countOnGrid, countOnNeighbors, removeIsolated } from "../shared/components.js";
import { shouldAcceptPattern } from "../shared/validation.js";
import {
  COMPONENT_PARAMS,
  DENSITY_PARAMS,
  paramNumber,
  resolveParams,
  type AlgorithmDefinition,
  type AlgorithmParams,
} from "./types.js";

const MAX_ATTEMPTS = 8;
const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

function growFromEndpoints(
  size: number,
  rng: Rng,
  minDensity: number,
  maxDensity: number,
  branchProbability: number,
  maxSteps: number,
): Grid {
  const grid = createGrid(size);
  const targetOn = Math.round(size * size * (minDensity + rng.next() * (maxDensity - minDensity)));

  const sr = rng.nextInt(0, size - 1);
  const sc = rng.nextInt(0, size - 1);
  grid[sr][sc] = true;

  const endpoints: Array<{ r: number; c: number }> = [{ r: sr, c: sc }];
  let steps = 0;

  while (countOnGrid(grid) < targetOn && steps < maxSteps && endpoints.length > 0) {
    steps++;
    const idx = rng.nextInt(0, endpoints.length - 1);
    const { r, c } = endpoints[idx];
    const dir = rng.pick(DIRECTIONS);
    const nr = r + dir.dr;
    const nc = c + dir.dc;

    if (!isInBounds(grid, nr, nc) || grid[nr][nc]) {
      if (countOnNeighbors(grid, r, c) > 1) {
        endpoints.splice(idx, 1);
      }
      continue;
    }

    grid[nr][nc] = true;

    if (countOnNeighbors(grid, r, c) > 1) {
      endpoints.splice(idx, 1);
    }

    if (countOnNeighbors(grid, nr, nc) <= 1) {
      endpoints.push({ r: nr, c: nc });
    }

    if (rng.next() < branchProbability) {
      const branchDir = rng.pick(DIRECTIONS);
      const br = r + branchDir.dr;
      const bc = c + branchDir.dc;
      if (isInBounds(grid, br, bc) && !grid[br][bc]) {
        grid[br][bc] = true;
        if (countOnNeighbors(grid, br, bc) <= 1) {
          endpoints.push({ r: br, c: bc });
        }
      }
    }
  }

  removeIsolated(grid);
  return grid;
}

function makeFallback(size: number): Grid {
  const grid = createGrid(size);
  const mid = Math.floor(size / 2);
  grid[mid][mid] = true;
  if (size > 1) grid[Math.min(mid + 1, size - 1)][mid] = true;
  if (size > 2) grid[Math.min(mid + 2, size - 1)][mid] = true;
  return grid;
}

export function generateEndpointGrow(size: number, rng: Rng, params: AlgorithmParams = {}): Grid {
  const p = resolveParams(endpointGrowAlgorithm.params, params);
  const minDensity = paramNumber(p, "minDensity");
  const maxDensity = paramNumber(p, "maxDensity");
  const maxComponents = paramNumber(p, "maxComponents");
  const preferredMaxComponents = paramNumber(p, "preferredMaxComponents");
  const branchProbability = paramNumber(p, "branchProbability");
  const maxSteps = paramNumber(p, "maxSteps");
  const validation = { minDensity, maxDensity, maxComponents };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const grid = growFromEndpoints(
      size,
      rng,
      minDensity,
      maxDensity,
      branchProbability,
      maxSteps,
    );
    if (
      countOnGrid(grid) > 0 &&
      shouldAcceptPattern(grid, validation, attempt, MAX_ATTEMPTS, preferredMaxComponents)
    ) {
      return grid;
    }
  }

  return makeFallback(size);
}

export const endpointGrowAlgorithm: AlgorithmDefinition = {
  id: "endpoint-grow",
  name: "Endpoint grow",
  description: "Tree-like growth extending only from endpoint cells (≤1 ON neighbor).",
  params: [
    {
      key: "branchProbability",
      label: "Branch probability",
      type: "number",
      default: 0.15,
      min: 0,
      max: 1,
      step: 0.05,
      description: "Chance of spawning a side branch from the current growth tip.",
    },
    {
      key: "maxSteps",
      label: "Max steps",
      type: "number",
      default: 500,
      min: 10,
      max: 5000,
      step: 10,
      description: "Maximum growth steps before stopping, even if density target not reached.",
    },
    ...DENSITY_PARAMS,
    ...COMPONENT_PARAMS,
  ],
  generate: generateEndpointGrow,
};
