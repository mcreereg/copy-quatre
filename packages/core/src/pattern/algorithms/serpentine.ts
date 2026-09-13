import { createGrid, density, isInBounds } from "../../grid.js";
import { createRng, type Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import { isPathGraph, onDegree } from "../shared/pathGraph.js";
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

type PathCell = { row: number; col: number };

function countLitNeighborsExcept(
  grid: Grid,
  row: number,
  col: number,
  except: PathCell,
): number {
  let count = 0;
  for (const { dr, dc } of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (!isInBounds(grid, nr, nc) || !grid[nr][nc]) continue;
    if (nr === except.row && nc === except.col) continue;
    count++;
  }
  return count;
}

function countFreeNeighbors(grid: Grid, row: number, col: number): number {
  let count = 0;
  for (const { dr, dc } of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (isInBounds(grid, nr, nc) && !grid[nr][nc]) count++;
  }
  return count;
}

/** Adding candidate must keep every ON cell at degree ≤ 2. */
function canExtendPath(grid: Grid, tail: PathCell, candidate: PathCell): boolean {
  if (onDegree(grid, tail.row, tail.col) >= 2) return false;

  let sideContacts = 0;
  for (const { dr, dc } of DIRECTIONS) {
    const nr = candidate.row + dr;
    const nc = candidate.col + dc;
    if (!isInBounds(grid, nr, nc) || !grid[nr][nc]) continue;
    if (nr === tail.row && nc === tail.col) continue;
    sideContacts++;
    if (onDegree(grid, nr, nc) >= 2) return false;
  }

  return sideContacts <= 1;
}

function scoreDenseNeighbor(
  candidate: PathCell,
  tail: PathCell,
  prev: PathCell | undefined,
  grid: Grid,
  pathLength: number,
  targetOn: number,
  sideWeight: number,
  turnWeight: number,
): number {
  let score =
    countLitNeighborsExcept(grid, candidate.row, candidate.col, tail) * sideWeight;

  if (prev) {
    const lastDr = tail.row - prev.row;
    const lastDc = tail.col - prev.col;
    const moveDr = candidate.row - tail.row;
    const moveDc = candidate.col - tail.col;
    if (moveDr !== lastDr || moveDc !== lastDc) {
      score += turnWeight;
    }
  }

  const remaining = targetOn - pathLength;
  const freeAfter = countFreeNeighbors(grid, candidate.row, candidate.col) - 1;
  if (remaining > 1 && freeAfter < 1) {
    score -= 100;
  } else if (remaining > 2 && freeAfter < 2) {
    score -= 40;
  }

  return score;
}

function pickDenseNeighbor(
  neighbors: PathCell[],
  tail: PathCell,
  prev: PathCell | undefined,
  grid: Grid,
  pathLength: number,
  targetOn: number,
  sideWeight: number,
  turnWeight: number,
  rng: Rng,
): PathCell {
  if (neighbors.length === 1) return neighbors[0];

  const scored = neighbors.map((cell) => ({
    cell,
    score: scoreDenseNeighbor(
      cell,
      tail,
      prev,
      grid,
      pathLength,
      targetOn,
      sideWeight,
      turnWeight,
    ),
  }));
  const maxScore = Math.max(...scored.map((entry) => entry.score));
  const top = scored.filter((entry) => entry.score >= maxScore - 1).map((entry) => entry.cell);
  return rng.pick(top);
}

function growDensePath(
  size: number,
  rng: Rng,
  targetOn: number,
  start: PathCell,
  sideWeight: number,
  turnWeight: number,
): Grid | null {
  const grid = createGrid(size);
  const path: PathCell[] = [start];
  grid[start.row][start.col] = true;

  while (path.length < targetOn) {
    const tail = path[path.length - 1];
    const prev = path.length >= 2 ? path[path.length - 2] : undefined;
    const neighbors = DIRECTIONS.map(({ dr, dc }) => ({
      row: tail.row + dr,
      col: tail.col + dc,
    })).filter(
      (cell) =>
        isInBounds(grid, cell.row, cell.col) &&
        !grid[cell.row][cell.col] &&
        canExtendPath(grid, tail, cell),
    );

    if (neighbors.length === 0) break;

    const next = pickDenseNeighbor(
      neighbors,
      tail,
      prev,
      grid,
      path.length,
      targetOn,
      sideWeight,
      turnWeight,
      rng,
    );
    grid[next.row][next.col] = true;
    path.push(next);
  }

  if (path.length !== targetOn || !isPathGraph(grid)) {
    return null;
  }

  return grid;
}

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
    const dirs = randomize ? rng.shuffle([...directions]) : directions;
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

function tryGrowDensePath(
  size: number,
  rng: Rng,
  targetOn: number,
  sideWeight: number,
  turnWeight: number,
): Grid | null {
  const maxSeedAttempts = Math.min(size * size, 16);

  for (let seedAttempt = 0; seedAttempt < maxSeedAttempts; seedAttempt++) {
    const start = { row: rng.nextInt(0, size - 1), col: rng.nextInt(0, size - 1) };
    const grid = growDensePath(size, rng, targetOn, start, sideWeight, turnWeight);
    if (grid) return grid;
  }

  return null;
}

/** Fraction of ON cells inside the path's bounding box — higher means tighter packing. */
export function pathCompactness(grid: Grid): number {
  let onCount = 0;
  let minRow = grid.length;
  let maxRow = 0;
  let minCol = grid.length;
  let maxCol = 0;

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (!grid[row][col]) continue;
      onCount++;
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }
  }

  if (onCount === 0) return 0;
  const bboxArea = (maxRow - minRow + 1) * (maxCol - minCol + 1);
  return onCount / bboxArea;
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
  const sideWeight = paramNumber(p, "sideWeight");
  const turnWeight = paramNumber(p, "turnWeight");

  const cellCount = size * size;
  const minOn = Math.max(1, Math.ceil(cellCount * minDensity));
  const maxOn = Math.max(minOn, Math.floor(cellCount * maxDensity));
  const sampledOn = Math.round(cellCount * sampleTargetDensity(rng, minDensity, maxDensity));
  const targetOn = Math.max(minOn, Math.min(maxOn, sampledOn));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = tryGrowDensePath(size, rng, targetOn, sideWeight, turnWeight);
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
  description: "Single self-avoiding path biased toward dense, fold-back serpentine shapes.",
  params: [
    {
      key: "sideWeight",
      label: "Side adjacency weight",
      type: "number",
      default: 10,
      min: 0,
      max: 30,
      step: 1,
      description: desc(
        "How strongly to favor next cells bordering earlier path cells. Higher values produce denser fold-back patterns.",
        "8–15",
      ),
    },
    {
      key: "turnWeight",
      label: "Turn weight",
      type: "number",
      default: 3,
      min: 0,
      max: 15,
      step: 1,
      description: desc(
        "Bonus for changing direction instead of continuing straight. Encourages zig-zag and U-turn fills.",
        "2–5",
      ),
    },
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
