import { createGrid, density, isInBounds } from "../../grid.js";
import { createRng, type Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import { isBuiltSerpentinePath, onDegree } from "../shared/pathGraph.js";
import { countPathSideAdjacencies, type PathCell } from "../shared/pathSideAdjacency.js";
import {
  desc,
  paramNumber,
  resolveParams,
  type AlgorithmDefinition,
  type AlgorithmParams,
} from "./types.js";

export const MAX_SERPENTINE_ATTEMPTS = 16;
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

const CORE_2X2_PATHS: PathCell[][] = [
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 1, col: 0 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 0, col: 1 },
  ],
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

function pathToGrid(size: number, path: PathCell[]): Grid {
  const grid = createGrid(size);
  for (const cell of path) {
    grid[cell.row][cell.col] = true;
  }
  return grid;
}

function pathBboxArea(path: PathCell[], extra?: PathCell): number {
  const cells = extra ? [...path, extra] : path;
  if (cells.length === 0) return 0;
  let minRow = cells[0].row;
  let maxRow = cells[0].row;
  let minCol = cells[0].col;
  let maxCol = cells[0].col;
  for (const cell of cells) {
    minRow = Math.min(minRow, cell.row);
    maxRow = Math.max(maxRow, cell.row);
    minCol = Math.min(minCol, cell.col);
    maxCol = Math.max(maxCol, cell.col);
  }
  return (maxRow - minRow + 1) * (maxCol - minCol + 1);
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

function sideContactsWithPath(
  grid: Grid,
  candidate: PathCell,
  tail: PathCell,
): number {
  let count = 0;
  for (const { dr, dc } of DIRECTIONS) {
    const nr = candidate.row + dr;
    const nc = candidate.col + dc;
    if (!isInBounds(grid, nr, nc) || !grid[nr][nc]) continue;
    if (nr === tail.row && nc === tail.col) continue;
    count++;
  }
  return count;
}

/** Traceable serpentine blobs may touch earlier path cells (degree up to 3). */
function canExtendPath(grid: Grid, tail: PathCell, candidate: PathCell): boolean {
  const sideContacts = sideContactsWithPath(grid, candidate, tail);
  if (1 + sideContacts > 3) return false;

  for (const { dr, dc } of DIRECTIONS) {
    const nr = candidate.row + dr;
    const nc = candidate.col + dc;
    if (!isInBounds(grid, nr, nc) || !grid[nr][nc]) continue;
    if (nr === tail.row && nc === tail.col) continue;
    if (onDegree(grid, nr, nc) >= 3) return false;
  }

  return true;
}

type ScoringWeights = {
  sideWeight: number;
  turnWeight: number;
  fillWeight: number;
  expandPenalty: number;
};

function scoreExtension(
  candidate: PathCell,
  tail: PathCell,
  prev: PathCell | undefined,
  path: PathCell[],
  grid: Grid,
  pathLength: number,
  targetOn: number,
  weights: ScoringWeights,
): number {
  let score = sideContactsWithPath(grid, candidate, tail) * weights.sideWeight;

  if (prev) {
    const lastDr = tail.row - prev.row;
    const lastDc = tail.col - prev.col;
    const moveDr = candidate.row - tail.row;
    const moveDc = candidate.col - tail.col;
    if (moveDr !== lastDr || moveDc !== lastDc) {
      score += weights.turnWeight;
    }
  }

  const areaBefore = pathBboxArea(path);
  const areaAfter = pathBboxArea(path, candidate);
  if (areaAfter === areaBefore) {
    score += weights.fillWeight;
  } else if (areaAfter > areaBefore) {
    score -= (areaAfter - areaBefore) * weights.expandPenalty;
  }

  const remaining = targetOn - pathLength;
  const freeAfter = countFreeNeighbors(grid, candidate.row, candidate.col) - 1;
  if (remaining > 2 && freeAfter < 2) score -= 25;
  if (remaining > 1 && freeAfter < 1) score -= 80;

  return score;
}

function orderCandidates(
  candidates: PathCell[],
  tail: PathCell,
  prev: PathCell | undefined,
  path: PathCell[],
  grid: Grid,
  pathLength: number,
  targetOn: number,
  weights: ScoringWeights,
  rng: Rng,
): PathCell[] {
  if (candidates.length <= 1) return candidates;
  const scored = candidates.map((cell) => ({
    cell,
    score: scoreExtension(
      cell,
      tail,
      prev,
      path,
      grid,
      pathLength,
      targetOn,
      weights,
    ),
  }));
  scored.sort((a, b) => b.score - a.score || rng.next() - 0.5);
  return scored.map((entry) => entry.cell);
}

function getExtensions(grid: Grid, tail: PathCell): PathCell[] {
  return DIRECTIONS.map(({ dr, dc }) => ({
    row: tail.row + dr,
    col: tail.col + dc,
  })).filter(
    (cell) =>
      isInBounds(grid, cell.row, cell.col) &&
      !grid[cell.row][cell.col] &&
      canExtendPath(grid, tail, cell),
  );
}

function seedCoreAt(
  originRow: number,
  originCol: number,
  template: PathCell[],
  grid: Grid,
  path: PathCell[],
): void {
  for (const cell of template) {
    const placed = { row: originRow + cell.row, col: originCol + cell.col };
    grid[placed.row][placed.col] = true;
    path.push(placed);
  }
}

function minSideAdjForLength(targetOn: number): number {
  if (targetOn >= 12) return 2;
  if (targetOn >= 6) return 1;
  return 0;
}

type SearchResult = { path: PathCell[]; sideAdj: number; compactness: number };

function extendFromCore(
  size: number,
  rng: Rng,
  targetOn: number,
  originRow: number,
  originCol: number,
  template: PathCell[],
  weights: ScoringWeights,
  minSideAdj: number,
): SearchResult | null {
  if (targetOn < 4) return null;
  if (originRow + 1 >= size || originCol + 1 >= size) return null;

  const grid = createGrid(size);
  const path: PathCell[] = [];
  seedCoreAt(originRow, originCol, template, grid, path);

  while (path.length < targetOn) {
    const tail = path[path.length - 1];
    const prev = path.length >= 2 ? path[path.length - 2] : undefined;
    let candidates = getExtensions(grid, tail);
    if (candidates.length === 0) return null;

    const withSide = candidates.filter((cell) => sideContactsWithPath(grid, cell, tail) > 0);
    if (withSide.length > 0) {
      candidates = withSide;
    }

    const next = orderCandidates(
      candidates,
      tail,
      prev,
      path,
      grid,
      path.length,
      targetOn,
      weights,
      rng,
    )[0];

    grid[next.row][next.col] = true;
    path.push(next);
  }

  const sideAdj = countPathSideAdjacencies(path);
  if (sideAdj < minSideAdj) return null;
  if (!isBuiltSerpentinePath(grid, path)) return null;

  return {
    path: [...path],
    sideAdj,
    compactness: path.length / pathBboxArea(path),
  };
}

function buildBlobPath(
  size: number,
  rng: Rng,
  targetOn: number,
  weights: ScoringWeights,
  minSideAdj: number,
): SearchResult | null {
  if (targetOn < 4) return null;

  let best: SearchResult | null = null;
  const maxOrigin = size - 2;
  const originAttempts = size <= 5 ? (maxOrigin + 1) * (maxOrigin + 1) : 1;

  for (let attempt = 0; attempt < originAttempts; attempt++) {
    const origin =
      size <= 5
        ? { row: Math.floor(attempt / (maxOrigin + 1)), col: attempt % (maxOrigin + 1) }
        : {
            row: rng.nextInt(0, maxOrigin),
            col: rng.nextInt(0, maxOrigin),
          };

    for (const template of CORE_2X2_PATHS) {
      const result = extendFromCore(
        size,
        rng,
        targetOn,
        origin.row,
        origin.col,
        template,
        weights,
        minSideAdj,
      );
      if (!result) continue;
      if (
        !best ||
        result.sideAdj > best.sideAdj ||
        (result.sideAdj === best.sideAdj && result.compactness > best.compactness)
      ) {
        best = result;
      }
      if (best.sideAdj >= minSideAdj) return best;
    }
  }

  return best;
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

  if (path.length !== targetOn || !isBuiltSerpentinePath(grid, path)) {
    return null;
  }

  return grid;
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

function resolveScoringWeights(params: AlgorithmParams): ScoringWeights {
  return {
    sideWeight: paramNumber(params, "sideWeight"),
    turnWeight: paramNumber(params, "turnWeight"),
    fillWeight: paramNumber(params, "fillWeight"),
    expandPenalty: paramNumber(params, "expandPenalty"),
  };
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
  const weights = resolveScoringWeights(p);

  const cellCount = size * size;
  const minOn = Math.max(1, Math.ceil(cellCount * minDensity));
  const maxOn = Math.max(minOn, Math.floor(cellCount * maxDensity));
  const sampledOn = Math.round(cellCount * sampleTargetDensity(rng, minDensity, maxDensity));
  const targetOn = Math.max(minOn, Math.min(maxOn, sampledOn));
  const minSideAdj = minSideAdjForLength(targetOn);

  if (targetOn >= 4 && size >= 2) {
    const effectiveAttempts = size >= 8 ? 4 : size >= 6 ? 8 : maxAttempts;

    for (let attempt = 0; attempt < effectiveAttempts; attempt++) {
      const result = buildBlobPath(size, rng, targetOn, weights, minSideAdj);
      if (result) {
        return pathToGrid(size, result.path);
      }
    }

    if (size <= 6) {
      for (let length = targetOn - 1; length >= Math.max(4, minOn); length--) {
        const shorterSide = minSideAdjForLength(length);
        const result = buildBlobPath(size, rng, length, weights, shorterSide);
        if (!result) continue;
        const grid = pathToGrid(size, result.path);
        const d = density(grid);
        if (d >= minDensity && d <= maxDensity) return grid;
      }
    }
  }

  return makeDeterministicPathFallback(size, targetOn, minOn);
}

export const serpentineAlgorithm: AlgorithmDefinition = {
  id: "serpentine",
  name: "Serpentine",
  description:
    "Traceable blob paths seeded from 2x2 folds, then extended with side-contact bias.",
  params: [
    {
      key: "sideWeight",
      label: "Side adjacency weight",
      type: "number",
      default: 40,
      min: 0,
      max: 80,
      step: 1,
      description: desc(
        "Bonus when the next step borders an earlier path cell (not just the tail). This is the main blob control.",
        "30–60",
      ),
    },
    {
      key: "turnWeight",
      label: "Turn weight",
      type: "number",
      default: 8,
      min: 0,
      max: 25,
      step: 1,
      description: desc(
        "Bonus for changing direction instead of continuing straight. Encourages zig-zag fills.",
        "6–12",
      ),
    },
    {
      key: "fillWeight",
      label: "Interior fill weight",
      type: "number",
      default: 10,
      min: 0,
      max: 30,
      step: 1,
      description: desc(
        "Bonus when a step fills inside the current bounding box instead of expanding it.",
        "6–15",
      ),
    },
    {
      key: "expandPenalty",
      label: "BBox expand penalty",
      type: "number",
      default: 12,
      min: 0,
      max: 20,
      step: 1,
      description: desc(
        "Penalty per cell of bounding-box growth. Keeps blobs compact instead of sprawling.",
        "8–15",
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
        "Maximum blob search attempts before falling back to shorter lengths or a snake.",
        "12–24",
      ),
    },
  ],
  generate: generateSerpentinePattern,
};
