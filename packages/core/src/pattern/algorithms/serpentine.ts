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

export const MAX_SERPENTINE_ATTEMPTS = 4;
const COMPACTNESS_EARLY_EXIT = 0.78;
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

function pathCentroid(path: PathCell[]): PathCell {
  let rowSum = 0;
  let colSum = 0;
  for (const cell of path) {
    rowSum += cell.row;
    colSum += cell.col;
  }
  return { row: rowSum / path.length, col: colSum / path.length };
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

type ScoringWeights = {
  sideWeight: number;
  turnWeight: number;
  uTurnWeight: number;
  endpointWeight: number;
  fillWeight: number;
  expandPenalty: number;
  centroidWeight: number;
};

function scoreDenseNeighbor(
  candidate: PathCell,
  tail: PathCell,
  prev: PathCell | undefined,
  start: PathCell,
  path: PathCell[],
  grid: Grid,
  pathLength: number,
  targetOn: number,
  weights: ScoringWeights,
): number {
  let score =
    countLitNeighborsExcept(grid, candidate.row, candidate.col, tail) * weights.sideWeight;

  if (prev) {
    const lastDr = tail.row - prev.row;
    const lastDc = tail.col - prev.col;
    const moveDr = candidate.row - tail.row;
    const moveDc = candidate.col - tail.col;
    if (moveDr !== lastDr || moveDc !== lastDc) {
      score += weights.turnWeight;
    }
    if (moveDr === -lastDr && moveDc === -lastDc) {
      score += weights.uTurnWeight;
    }
  }

  if (pathLength > 3) {
    for (const { dr, dc } of DIRECTIONS) {
      const nr = candidate.row + dr;
      const nc = candidate.col + dc;
      if (nr === start.row && nc === start.col) {
        score += weights.endpointWeight;
        break;
      }
    }
  }

  const areaBefore = pathBboxArea(path);
  const areaAfter = pathBboxArea(path, candidate);
  if (areaAfter === areaBefore) {
    score += weights.fillWeight;
  } else if (areaAfter > areaBefore) {
    score -= (areaAfter - areaBefore) * weights.expandPenalty;
  }

  const centroid = pathCentroid(path);
  const tailDist =
    Math.abs(tail.row - centroid.row) + Math.abs(tail.col - centroid.col);
  const candidateDist =
    Math.abs(candidate.row - centroid.row) + Math.abs(candidate.col - centroid.col);
  if (candidateDist < tailDist) {
    score += weights.centroidWeight;
  }

  const compactBefore = pathLength / pathBboxArea(path);
  const compactAfter = (pathLength + 1) / pathBboxArea(path, candidate);
  score += (compactAfter - compactBefore) * 40;
  if (compactAfter >= compactBefore) {
    score += 15;
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
  start: PathCell,
  path: PathCell[],
  grid: Grid,
  pathLength: number,
  targetOn: number,
  weights: ScoringWeights,
  rng: Rng,
): PathCell {
  if (neighbors.length === 1) return neighbors[0];

  const scored = neighbors.map((cell) => ({
    cell,
    score: scoreDenseNeighbor(
      cell,
      tail,
      prev,
      start,
      path,
      grid,
      pathLength,
      targetOn,
      weights,
    ),
  }));
  const maxScore = Math.max(...scored.map((entry) => entry.score));
  const top = scored.filter((entry) => entry.score >= maxScore - 2).map((entry) => entry.cell);
  return rng.pick(top);
}

function growDensePath(
  size: number,
  rng: Rng,
  targetOn: number,
  start: PathCell,
  weights: ScoringWeights,
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
      start,
      path,
      grid,
      path.length,
      targetOn,
      weights,
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

function pickCenterBiasedStart(size: number, rng: Rng): PathCell {
  const center = (size - 1) / 2;
  const maxDist = Math.max(1, Math.ceil(size / 2));
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = rng.nextInt(0, size - 1);
    const col = rng.nextInt(0, size - 1);
    const dist = Math.abs(row - center) + Math.abs(col - center);
    if (dist <= maxDist || rng.next() < 0.25) {
      return { row, col };
    }
  }
  return { row: rng.nextInt(0, size - 1), col: rng.nextInt(0, size - 1) };
}

function seedBlobCoreAt(
  originRow: number,
  originCol: number,
  template: PathCell[],
  grid: Grid,
  path: PathCell[],
): PathCell | null {
  const cells = template.map((cell) => ({
    row: originRow + cell.row,
    col: originCol + cell.col,
  }));

  if (cells.some((cell) => grid[cell.row][cell.col])) return null;

  for (const cell of cells) {
    grid[cell.row][cell.col] = true;
    path.push(cell);
  }
  return cells[0];
}

function resetGridState(grid: Grid, path: PathCell[]): void {
  for (const cell of path) {
    grid[cell.row][cell.col] = false;
  }
  path.length = 0;
}

function orderNeighborsForSearch(
  neighbors: PathCell[],
  tail: PathCell,
  prev: PathCell | undefined,
  start: PathCell,
  path: PathCell[],
  grid: Grid,
  pathLength: number,
  targetOn: number,
  weights: ScoringWeights,
  rng: Rng,
): PathCell[] {
  if (neighbors.length <= 1) return neighbors;

  const scored = neighbors.map((cell) => ({
    cell,
    score: scoreDenseNeighbor(
      cell,
      tail,
      prev,
      start,
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

function runCompactPathSearch(
  grid: Grid,
  path: PathCell[],
  start: PathCell,
  targetOn: number,
  minCompactness: number,
  weights: ScoringWeights,
  rng: Rng,
  maxNodes: number,
): { grid: Grid | null; compactness: number; nodesUsed: number } {
  let best: Grid | null = null;
  let bestCompactness = -1;
  let nodes = 0;

  function cloneGrid(): Grid {
    return grid.map((row) => [...row]);
  }

  function dfs(): void {
    if (nodes++ > maxNodes) return;

    if (path.length === targetOn) {
      if (!isPathGraph(grid)) return;
      const compact = pathCompactness(grid);
      if (compact > bestCompactness) {
        bestCompactness = compact;
        best = cloneGrid();
      }
      return;
    }

    const bboxArea = pathBboxArea(path);
    if (bboxArea > 0 && targetOn / bboxArea < minCompactness * 0.92) {
      return;
    }
    if (bboxArea > Math.ceil(targetOn / minCompactness) + 1) {
      return;
    }

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

    const ordered = orderNeighborsForSearch(
      neighbors,
      tail,
      prev,
      start,
      path,
      grid,
      path.length,
      targetOn,
      weights,
      rng,
    );

    for (const next of ordered) {
      grid[next.row][next.col] = true;
      path.push(next);
      dfs();
      path.pop();
      grid[next.row][next.col] = false;
      if (bestCompactness >= COMPACTNESS_EARLY_EXIT) return;
      if (nodes > maxNodes) return;
    }
  }

  dfs();
  return { grid: best, compactness: bestCompactness, nodesUsed: nodes };
}

function growCompactPathSearch(
  size: number,
  rng: Rng,
  targetOn: number,
  weights: ScoringWeights,
  minCompactness: number,
): Grid | null {
  if (targetOn < 1) return null;

  const grid = createGrid(size);
  const path: PathCell[] = [];
  const maxNodes = Math.min(12000, size * size * targetOn * 12);
  let best: Grid | null = null;
  let bestCompactness = -1;
  let nodesUsed = 0;

  const considerSearch = (start: PathCell): void => {
    if (nodesUsed >= maxNodes) return;
    const remaining = maxNodes - nodesUsed;
    const result = runCompactPathSearch(
      grid,
      path,
      start,
      targetOn,
      minCompactness,
      weights,
      rng,
      remaining,
    );
    nodesUsed += result.nodesUsed;
    if (result.grid && result.compactness > bestCompactness) {
      best = result.grid;
      bestCompactness = result.compactness;
    }
    resetGridState(grid, path);
  };

  if (targetOn === 1) {
    const start = pickCenterBiasedStart(size, rng);
    grid[start.row][start.col] = true;
    return grid;
  }

  if (targetOn >= 4 && size >= 2) {
    const maxOrigin = size - 2;
    const coreOrigins: PathCell[] = [];
    if (size <= 5) {
      for (let originRow = 0; originRow <= maxOrigin; originRow++) {
        for (let originCol = 0; originCol <= maxOrigin; originCol++) {
          coreOrigins.push({ row: originRow, col: originCol });
        }
      }
    } else {
      for (let attempt = 0; attempt < 8; attempt++) {
        coreOrigins.push({
          row: rng.nextInt(0, maxOrigin),
          col: rng.nextInt(0, maxOrigin),
        });
      }
    }

    for (const origin of coreOrigins) {
      for (const template of CORE_2X2_PATHS) {
        const start = seedBlobCoreAt(origin.row, origin.col, template, grid, path);
        if (!start) continue;
        considerSearch(start);
        if (bestCompactness >= minCompactness) return best;
        if (bestCompactness >= COMPACTNESS_EARLY_EXIT) return best;
      }
    }
  }

  for (let attempt = 0; attempt < 4 && nodesUsed < maxNodes; attempt++) {
    const start = pickCenterBiasedStart(size, rng);
    grid[start.row][start.col] = true;
    path.push(start);
    considerSearch(start);
    if (bestCompactness >= COMPACTNESS_EARLY_EXIT) return best;
  }

  return best;
}

function growDensePathFromCore(
  size: number,
  rng: Rng,
  targetOn: number,
  weights: ScoringWeights,
): Grid | null {
  if (targetOn < 4 || size < 2) return null;

  const grid = createGrid(size);
  const path: PathCell[] = [];
  const maxOrigin = size - 2;
  const originRow = rng.nextInt(0, maxOrigin);
  const originCol = rng.nextInt(0, maxOrigin);
  const start = seedBlobCoreAt(originRow, originCol, rng.pick(CORE_2X2_PATHS), grid, path);
  if (!start) return null;

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
      start,
      path,
      grid,
      path.length,
      targetOn,
      weights,
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

function tryGrowDensePath(
  size: number,
  rng: Rng,
  targetOn: number,
  weights: ScoringWeights,
): Grid | null {
  const minCompactness = Math.min(0.72, Math.max(0.58, targetOn / (size * size) + 0.12));

  if (size <= 5) {
    return growCompactPathSearch(size, rng, targetOn, weights, minCompactness);
  }

  let best: Grid | null = null;
  let bestCompactness = -1;
  const attempts = size >= 8 ? 12 : 8;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const grid =
      targetOn >= 4
        ? growDensePathFromCore(size, rng, targetOn, weights)
        : growDensePath(size, rng, targetOn, pickCenterBiasedStart(size, rng), weights);
    if (!grid) continue;
    const compact = pathCompactness(grid);
    if (compact > bestCompactness) {
      best = grid;
      bestCompactness = compact;
    }
    if (bestCompactness >= minCompactness) break;
  }

  return best;
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

function resolveScoringWeights(params: Record<string, unknown>): ScoringWeights {
  return {
    sideWeight: paramNumber(params, "sideWeight"),
    turnWeight: paramNumber(params, "turnWeight"),
    uTurnWeight: paramNumber(params, "uTurnWeight"),
    endpointWeight: paramNumber(params, "endpointWeight"),
    fillWeight: paramNumber(params, "fillWeight"),
    expandPenalty: paramNumber(params, "expandPenalty"),
    centroidWeight: paramNumber(params, "centroidWeight"),
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
  const minCompactness = Math.min(0.72, Math.max(0.58, targetOn / cellCount + 0.12));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = tryGrowDensePath(size, rng, targetOn, weights);
    if (!grid) continue;

    const d = density(grid);
    if (d < minDensity || d > maxDensity || !isPathGraph(grid)) continue;

    const compact = pathCompactness(grid);
    if (compact >= minCompactness * 0.95) return grid;
  }

  for (let length = targetOn - 1; length >= minOn; length--) {
    const shorterMin = Math.min(0.72, Math.max(0.58, length / cellCount + 0.12));
    for (let attempt = 0; attempt < 2; attempt++) {
      const grid = tryGrowDensePath(size, rng, length, weights);
      if (!grid) continue;
      const d = density(grid);
      if (d < minDensity || d > maxDensity || !isPathGraph(grid)) continue;
      if (pathCompactness(grid) >= shorterMin * 0.95) return grid;
    }
  }

  return makeDeterministicPathFallback(size, targetOn, minOn);
}

export const serpentineAlgorithm: AlgorithmDefinition = {
  id: "serpentine",
  name: "Serpentine",
  description: "Single self-avoiding path biased toward dense, blobby fold-back serpentine shapes.",
  params: [
    {
      key: "sideWeight",
      label: "Side adjacency weight",
      type: "number",
      default: 35,
      min: 0,
      max: 50,
      step: 1,
      description: desc(
        "How strongly to favor next cells bordering earlier path cells. Higher values produce denser fold-back patterns.",
        "20–35",
      ),
    },
    {
      key: "turnWeight",
      label: "Turn weight",
      type: "number",
      default: 10,
      min: 0,
      max: 25,
      step: 1,
      description: desc(
        "Bonus for changing direction instead of continuing straight. Encourages zig-zag and U-turn fills.",
        "8–15",
      ),
    },
    {
      key: "uTurnWeight",
      label: "U-turn weight",
      type: "number",
      default: 18,
      min: 0,
      max: 40,
      step: 1,
      description: desc(
        "Extra bonus for reversing the previous step direction. Drives tight row/column doubling-back.",
        "12–25",
      ),
    },
    {
      key: "endpointWeight",
      label: "Endpoint wrap weight",
      type: "number",
      default: 14,
      min: 0,
      max: 30,
      step: 1,
      description: desc(
        "Bonus for touching the path start cell while growing. Encourages C-shapes and closed blobs.",
        "10–20",
      ),
    },
    {
      key: "fillWeight",
      label: "Interior fill weight",
      type: "number",
      default: 12,
      min: 0,
      max: 30,
      step: 1,
      description: desc(
        "Bonus when a step fills inside the current bounding box instead of expanding it.",
        "8–18",
      ),
    },
    {
      key: "expandPenalty",
      label: "BBox expand penalty",
      type: "number",
      default: 18,
      min: 0,
      max: 20,
      step: 1,
      description: desc(
        "Penalty per cell of bounding-box growth. Keeps blobs compact instead of sprawling.",
        "4–10",
      ),
    },
    {
      key: "centroidWeight",
      label: "Centroid pull weight",
      type: "number",
      default: 5,
      min: 0,
      max: 20,
      step: 1,
      description: desc(
        "Bonus for steps that move toward the path centroid. Clusters growth in one region.",
        "3–8",
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
        "Maximum generation attempts before using a deterministic snake fallback. Best-scoring attempt is kept.",
        "30–80",
      ),
    },
  ],
  generate: generateSerpentinePattern,
};
