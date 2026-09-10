import { createGrid, isInBounds } from "../../grid.js";
import type { Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import { countOnGrid, removeIsolated } from "../shared/components.js";
import {
  STRINGY_SYMMETRY_WEIGHTS,
  pickSymmetry,
  setSymmetric,
  type Symmetry,
} from "../shared/symmetry.js";
import { shouldAcceptPattern } from "../shared/validation.js";
import {
  COMPONENT_PARAMS,
  DENSITY_PARAMS,
  paramNumber,
  paramNumberArray,
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

function pickFragmentCount(rng: Rng, weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = rng.nextInt(1, total);
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i + 1;
  }
  return 1;
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
  sym: Symmetry,
  rng: Rng,
  budget: number,
  momentum: number,
): void {
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
    let steps = 0;

    while (steps < budget) {
      if (!grid[cr][cc]) steps++;
      setSymmetric(grid, cr, cc, sym, true);

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
    return;
  }
}

function growStringy(
  size: number,
  rng: Rng,
  minDensity: number,
  maxDensity: number,
  momentum: number,
  symmetryChance: number,
  fragmentWeights: number[],
): Grid {
  const grid = createGrid(size);
  const targetOn = Math.round(size * size * (minDensity + rng.next() * (maxDensity - minDensity)));
  const fragmentCount = pickFragmentCount(rng, fragmentWeights);
  const baseBudget = Math.floor(targetOn / fragmentCount);

  for (let f = 0; f < fragmentCount; f++) {
    const sym: Symmetry =
      rng.next() < symmetryChance ? pickSymmetry(rng, STRINGY_SYMMETRY_WEIGHTS) : "none";
    const jitter = rng.nextInt(-2, 2);
    const budget = Math.max(1, baseBudget + jitter);
    walkWorm(grid, sym, rng, budget, momentum);
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
  const symmetryChance = paramNumber(p, "stringySymmetryChance");
  const fragmentWeights = paramNumberArray(p, "fragmentWeights");
  const validation = { minDensity, maxDensity, maxComponents };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const grid = growStringy(
      size,
      rng,
      minDensity,
      maxDensity,
      momentum,
      symmetryChance,
      fragmentWeights,
    );
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
  description: "Momentum-biased random walks producing thin stringy fragments.",
  params: [
    {
      key: "stringyMomentum",
      label: "Momentum",
      type: "number",
      default: 0.8,
      min: 0.5,
      max: 0.99,
      step: 0.05,
      description: desc(
        "Probability of continuing straight on each step. Higher values produce longer, thinner strokes.",
        "0.75–0.92",
      ),
    },
    {
      key: "stringySymmetryChance",
      label: "Symmetry chance",
      type: "number",
      default: 0.2,
      min: 0,
      max: 1,
      step: 0.05,
      description: desc(
        "Chance each worm fragment uses light symmetry (single-axis mirror).",
        "0–0.35",
      ),
    },
    {
      key: "fragmentWeights",
      label: "Fragment weights",
      type: "numberArray",
      default: [55, 30, 12, 3],
      description: desc(
        "Relative weights for generating 1, 2, 3, or 4 disconnected worm fragments.",
        "[55,30,12,3] or [70,20,8,2] for fewer fragments",
      ),
    },
    ...DENSITY_PARAMS,
    ...COMPONENT_PARAMS,
  ],
  generate: generateWormWalk,
};
