import { createGrid, density, isInBounds } from "../../grid.js";
import { createRng, type Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import { isPathGraph } from "../shared/pathGraph.js";
import {
  desc,
  paramNumber,
  resolveParams,
  type AlgorithmDefinition,
  type AlgorithmParams,
} from "./types.js";

export const MAX_SERPENTINE_ATTEMPTS = 50;
const MIN_DENSITY = 0.25;
const MAX_DENSITY = 0.75;

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

const FALLBACK_DIRECTIONS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: -1, dc: 0 },
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

function shuffleDirections(rng: Rng): Array<{ dr: number; dc: number }> {
  const dirs = [...DIRECTIONS];
  for (let i = dirs.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
  }
  return dirs;
}

type PathCell = { row: number; col: number };

function growTailPath(
  size: number,
  rng: Rng,
  targetOn: number,
  start: PathCell,
  randomize: boolean,
  directions: Array<{ dr: number; dc: number }> = DIRECTIONS,
): Grid | null {
  const grid = createGrid(size);
  const path: PathCell[] = [start];
  grid[start.row][start.col] = true;

  while (path.length < targetOn) {
    const tail = path[path.length - 1];
    const dirs = randomize ? shuffleDirections(rng) : directions;
    const neighbors = dirs
      .map(({ dr, dc }) => ({ row: tail.row + dr, col: tail.col + dc }))
      .filter((cell) => isInBounds(grid, cell.row, cell.col) && !grid[cell.row][cell.col]);

    if (neighbors.length === 0) break;

    const next = randomize ? rng.pick(neighbors) : neighbors[0];
    grid[next.row][next.col] = true;
    path.push(next);
  }

  if (path.length !== targetOn || !isPathGraph(grid)) {
    return null;
  }

  return grid;
}

function tryGrowRandomPath(size: number, rng: Rng, targetOn: number): Grid | null {
  const maxSeedAttempts = Math.min(size * size, 24);

  for (let seedAttempt = 0; seedAttempt < maxSeedAttempts; seedAttempt++) {
    const start = { row: rng.nextInt(0, size - 1), col: rng.nextInt(0, size - 1) };
    const grid = growTailPath(size, rng, targetOn, start, true);
    if (grid) return grid;
  }

  return null;
}

function makeDeterministicPathFallback(size: number, targetOn: number, minOn: number): Grid {
  for (let length = targetOn; length >= minOn; length--) {
    const grid = growTailPath(
      size,
      createRng(0),
      length,
      { row: 0, col: 0 },
      false,
      FALLBACK_DIRECTIONS,
    );
    if (grid) return grid;
  }

  const fallback = createGrid(size);
  fallback[0][0] = true;
  return fallback;
}

export function generateSerpentinePattern(
  size: number,
  rng: Rng,
  params: AlgorithmParams = {},
): Grid {
  const p = resolveParams(serpentineAlgorithm.params, params);
  const minDensity = paramNumber(p, "minDensity");
  const maxDensity = paramNumber(p, "maxDensity");
  const maxAttempts = paramNumber(p, "maxAttempts");

  const cellCount = size * size;
  const minOn = Math.max(1, Math.ceil(cellCount * minDensity));
  const maxOn = Math.max(minOn, Math.floor(cellCount * maxDensity));
  const sampledOn = Math.round(cellCount * sampleTargetDensity(rng, minDensity, maxDensity));
  const targetOn = Math.max(minOn, Math.min(maxOn, sampledOn));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = tryGrowRandomPath(size, rng, targetOn);
    if (!grid) continue;

    const d = density(grid);
    if (d >= minDensity && d <= maxDensity && isPathGraph(grid)) {
      return grid;
    }
  }

  return makeDeterministicPathFallback(size, targetOn, minOn);
}

export const serpentineAlgorithm: AlgorithmDefinition = {
  id: "serpentine",
  name: "Serpentine",
  description: "Single self-avoiding path at cohesive-like density.",
  params: [
    {
      key: "minDensity",
      label: "Min density",
      type: "number",
      default: MIN_DENSITY,
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
      default: MAX_DENSITY,
      min: 0.05,
      max: 0.95,
      step: 0.05,
      description: desc(
        "Upper bound for target density sampling. Mid-range values are sampled more often than this edge.",
        "0.55–0.75",
      ),
    },
    {
      key: "maxAttempts",
      label: "Max attempts",
      type: "number",
      default: MAX_SERPENTINE_ATTEMPTS,
      min: 1,
      max: 200,
      step: 1,
      description: desc(
        "Maximum generation attempts before using a deterministic snake fallback.",
        "30–80",
      ),
    },
  ],
  generate: generateSerpentinePattern,
};
