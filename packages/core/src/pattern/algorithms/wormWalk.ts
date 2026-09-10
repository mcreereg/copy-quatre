import { createGrid, isInBounds } from "../../grid.js";
import type { Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import { countOnGrid, removeIsolated } from "../shared/components.js";
import { shouldAcceptPattern } from "../shared/validation.js";
import {
  COMPONENT_PARAMS,
  paramNumber,
  resolveParams,
  desc,
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

/** Sample density in [min, max] with linear upside-down-V bias (center 2× edges). */
function sampleTargetDensity(rng: Rng, min: number, max: number): number {
  const u = rng.next();
  const t =
    u < 0.5
      ? (-1 + Math.sqrt(1 + 6 * u)) / 2
      : 1 - (-1 + Math.sqrt(1 + 6 * (1 - u))) / 2;
  return min + t * (max - min);
}

function turnDirection(
  dr: number,
  dc: number,
  rng: Rng,
): { dr: number; dc: number } {
  const turns = [
    { dr: -dc, dc: dr },
    { dr: dc, dc: -dr },
  ];
  return rng.pick(turns);
}

function walkWorm(
  grid: Grid,
  rng: Rng,
  targetOn: number,
  momentum: number,
): boolean {
  const size = grid.length;
  let attempts = 0;
  const maxSeedAttempts = size * size;

  while (attempts < maxSeedAttempts) {
    attempts++;
    const r = rng.nextInt(0, size - 1);
    const c = rng.nextInt(0, size - 1);
    if (grid[r][c]) continue;

    const dir = rng.pick(DIRECTIONS);
    let dr = dir.dr;
    let dc = dir.dc;
    let cr = r;
    let cc = c;

    while (true) {
      grid[cr][cc] = true;
      if (countOnGrid(grid) >= targetOn) return true;

      if (rng.next() >= momentum) {
        const turned = turnDirection(dr, dc, rng);
        dr = turned.dr;
        dc = turned.dc;
      }

      const nr = cr + dr;
      const nc = cc + dc;
      if (!isInBounds(grid, nr, nc) || grid[nr][nc]) break;
      cr = nr;
      cc = nc;
    }
    return true;
  }
  return false;
}

function growStringy(
  size: number,
  rng: Rng,
  minDensity: number,
  maxDensity: number,
  momentum: number,
): Grid {
  const grid = createGrid(size);
  const targetOn = Math.round(size * size * sampleTargetDensity(rng, minDensity, maxDensity));

  while (countOnGrid(grid) < targetOn) {
    if (!walkWorm(grid, rng, targetOn, momentum)) break;
  }

  removeIsolated(grid);
  return grid;
}

function makeStringyFallback(size: number): Grid {
  const grid = createGrid(size);
  const mid = Math.floor(size / 2);
  for (let c = 0; c < size; c++) {
    grid[mid][c] = true;
  }
  if (size > 2) {
    const row = Math.min(size - 1, mid + 1);
    for (let c = 0; c < size; c++) {
      grid[row][c] = true;
    }
  }
  return grid;
}

export function generateWormWalk(size: number, rng: Rng, params: AlgorithmParams = {}): Grid {
  const p = resolveParams(wormWalkAlgorithm.params, params);
  const minDensity = paramNumber(p, "minDensity");
  const maxDensity = paramNumber(p, "maxDensity");
  const maxComponents = paramNumber(p, "maxComponents");
  const preferredMaxComponents = paramNumber(p, "preferredMaxComponents");
  const momentum = paramNumber(p, "stringyMomentum");
  const validation = { minDensity, maxDensity, maxComponents };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const grid = growStringy(size, rng, minDensity, maxDensity, momentum);
    if (
      countOnGrid(grid) > 0 &&
      shouldAcceptPattern(grid, validation, attempt, MAX_ATTEMPTS, preferredMaxComponents)
    ) {
      return grid;
    }
  }

  return makeStringyFallback(size);
}

export const wormWalkAlgorithm: AlgorithmDefinition = {
  id: "worm-walk",
  name: "Worm walk",
  description:
    "Momentum-biased random walks that spawn worm fragments until a center-biased target density is reached.",
  params: [
    {
      key: "stringyMomentum",
      label: "Momentum",
      type: "number",
      default: 0.3,
      min: 0.05,
      max: 0.99,
      step: 0.05,
      description: desc(
        "Probability of continuing straight on each step. Higher values produce longer, thinner strokes.",
        "0.25–0.85",
      ),
    },
    {
      key: "minDensity",
      label: "Min density",
      type: "number",
      default: 0.25,
      min: 0.05,
      max: 0.95,
      step: 0.05,
      description: desc(
        "Lower bound for target density sampling. Mid-range values are sampled more often than this edge.",
        "0.20–0.35",
      ),
    },
    {
      key: "maxDensity",
      label: "Max density",
      type: "number",
      default: 0.75,
      min: 0.05,
      max: 0.95,
      step: 0.05,
      description: desc(
        "Upper bound for target density sampling. Mid-range values are sampled more often than this edge.",
        "0.55–0.75",
      ),
    },
    ...COMPONENT_PARAMS,
  ],
  generate: generateWormWalk,
};
