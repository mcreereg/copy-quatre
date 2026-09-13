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
const POOL_SIZE = 12;

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

/** Fold-back, zig-zag, compact fill, sprawl, meander, dense hook — each yields distinct blobs. */
const STYLE_PROFILES = [
  { sideWeight: 55, turnWeight: 6, fillWeight: 8, expandPenalty: 14, preferSide: "always" as const, topK: 2 },
  { sideWeight: 25, turnWeight: 22, fillWeight: 12, expandPenalty: 10, preferSide: "sometimes" as const, topK: 3 },
  { sideWeight: 35, turnWeight: 8, fillWeight: 24, expandPenalty: 16, preferSide: "sometimes" as const, topK: 2 },
  { sideWeight: 28, turnWeight: 10, fillWeight: 5, expandPenalty: 4, preferSide: "sometimes" as const, topK: 4 },
  { sideWeight: 18, turnWeight: 16, fillWeight: 14, expandPenalty: 8, preferSide: "rarely" as const, topK: 4 },
  { sideWeight: 48, turnWeight: 12, fillWeight: 18, expandPenalty: 18, preferSide: "always" as const, topK: 2 },
  { sideWeight: 40, turnWeight: 18, fillWeight: 6, expandPenalty: 6, preferSide: "sometimes" as const, topK: 3 },
  { sideWeight: 32, turnWeight: 5, fillWeight: 16, expandPenalty: 12, preferSide: "rarely" as const, topK: 3 },
];

const CORE_TEMPLATES: PathCell[][] = [
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
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ],
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 2 },
    { row: 1, col: 1 },
    { row: 1, col: 0 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
    { row: 2, col: 1 },
    { row: 1, col: 1 },
    { row: 0, col: 1 },
  ],
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
    { row: 2, col: 0 },
    { row: 1, col: 0 },
  ],
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 0 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
    { row: 2, col: 1 },
  ],
];

type PreferSide = "always" | "sometimes" | "rarely";

type ScoringWeights = {
  sideWeight: number;
  turnWeight: number;
  fillWeight: number;
  expandPenalty: number;
};

type GrowthStyle = ScoringWeights & {
  preferSide: PreferSide;
  topK: number;
};

type SearchResult = { path: PathCell[]; sideAdj: number; compactness: number };

/** Sample density in [min, max] with linear upside-down-V bias (center 2× edges). */
function sampleTargetDensity(rng: Rng, min: number, max: number): number {
  const u = rng.next();
  const t =
    u < 0.5
      ? (-1 + Math.sqrt(1 + 6 * u)) / 2
      : 1 - (-1 + Math.sqrt(1 + 6 * (1 - u))) / 2;
  return min + t * (max - min);
}

function jitterWeight(value: number, rng: Rng, span: number): number {
  return Math.max(0, Math.round(value + (rng.next() * 2 - 1) * span));
}

function sampleStyle(rng: Rng, base?: ScoringWeights): GrowthStyle {
  const profile = rng.pick(STYLE_PROFILES);
  const sideWeight = jitterWeight(base?.sideWeight ?? profile.sideWeight, rng, 12);
  const turnWeight = jitterWeight(base?.turnWeight ?? profile.turnWeight, rng, 8);
  const fillWeight = jitterWeight(base?.fillWeight ?? profile.fillWeight, rng, 8);
  const expandPenalty = jitterWeight(base?.expandPenalty ?? profile.expandPenalty, rng, 6);
  return {
    sideWeight,
    turnWeight,
    fillWeight,
    expandPenalty,
    preferSide: profile.preferSide,
    topK: profile.topK,
  };
}

function templateBounds(template: PathCell[]): { height: number; width: number } {
  let maxRow = 0;
  let maxCol = 0;
  for (const cell of template) {
    maxRow = Math.max(maxRow, cell.row);
    maxCol = Math.max(maxCol, cell.col);
  }
  return { height: maxRow + 1, width: maxCol + 1 };
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

function pickCandidate(candidates: PathCell[], rng: Rng, topK: number): PathCell {
  const k = Math.min(Math.max(1, topK), candidates.length);
  if (k === 1) return candidates[0];
  const slice = candidates.slice(0, k);
  return rng.pick(slice);
}

function filterBySidePreference(
  candidates: PathCell[],
  grid: Grid,
  tail: PathCell,
  preferSide: PreferSide,
  rng: Rng,
): PathCell[] {
  const withSide = candidates.filter((cell) => sideContactsWithPath(grid, cell, tail) > 0);
  if (withSide.length === 0) return candidates;

  if (preferSide === "always") return withSide;
  if (preferSide === "sometimes" && rng.next() < 0.65) return withSide;
  if (preferSide === "rarely" && rng.next() < 0.25) return withSide;
  return candidates;
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

function extendFromCore(
  size: number,
  rng: Rng,
  targetOn: number,
  originRow: number,
  originCol: number,
  template: PathCell[],
  style: GrowthStyle,
  minSideAdj: number,
): SearchResult | null {
  if (targetOn < template.length) return null;
  const bounds = templateBounds(template);
  if (originRow + bounds.height > size || originCol + bounds.width > size) return null;

  const grid = createGrid(size);
  const path: PathCell[] = [];
  seedCoreAt(originRow, originCol, template, grid, path);

  const weights: ScoringWeights = {
    sideWeight: style.sideWeight,
    turnWeight: style.turnWeight,
    fillWeight: style.fillWeight,
    expandPenalty: style.expandPenalty,
  };

  while (path.length < targetOn) {
    const tail = path[path.length - 1];
    const prev = path.length >= 2 ? path[path.length - 2] : undefined;
    let candidates = getExtensions(grid, tail);
    if (candidates.length === 0) return null;

    candidates = filterBySidePreference(candidates, grid, tail, style.preferSide, rng);

    const ordered = orderCandidates(
      candidates,
      tail,
      prev,
      path,
      grid,
      path.length,
      targetOn,
      weights,
      rng,
    );
    const next = pickCandidate(ordered, rng, style.topK);

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

function buildBlobPool(
  size: number,
  rng: Rng,
  targetOn: number,
  baseWeights: ScoringWeights | undefined,
  minSideAdj: number,
  poolSize: number,
): SearchResult[] {
  if (targetOn < 3) return [];

  const pool: SearchResult[] = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < poolSize && pool.length < poolSize; attempt++) {
    const style = sampleStyle(rng, baseWeights);
    const template = rng.pick(CORE_TEMPLATES);
    const bounds = templateBounds(template);
    const maxOriginRow = size - bounds.height;
    const maxOriginCol = size - bounds.width;
    if (maxOriginRow < 0 || maxOriginCol < 0) continue;

    const origin = {
      row: rng.nextInt(0, maxOriginRow),
      col: rng.nextInt(0, maxOriginCol),
    };

    const result = extendFromCore(
      size,
      rng,
      targetOn,
      origin.row,
      origin.col,
      template,
      style,
      minSideAdj,
    );
    if (!result) continue;

    const key = result.path.map((c) => `${c.row},${c.col}`).join(";");
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(result);
  }

  return pool;
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

function pickFromPool(rng: Rng, pool: SearchResult[]): SearchResult {
  return rng.pick(pool);
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
  const baseWeights = resolveScoringWeights(p);
  const hasCustomWeights =
    baseWeights.sideWeight !== 40 ||
    baseWeights.turnWeight !== 8 ||
    baseWeights.fillWeight !== 10 ||
    baseWeights.expandPenalty !== 12;

  const cellCount = size * size;
  const minOn = Math.max(1, Math.ceil(cellCount * minDensity));
  const maxOn = Math.max(minOn, Math.floor(cellCount * maxDensity));
  const sampledOn = Math.round(cellCount * sampleTargetDensity(rng, minDensity, maxDensity));
  const targetOn = Math.max(minOn, Math.min(maxOn, sampledOn));
  const minSideAdj = minSideAdjForLength(targetOn);

  if (targetOn >= 4 && size >= 2) {
    const effectiveAttempts = size >= 8 ? 4 : size >= 6 ? 8 : maxAttempts;
    const poolTarget = size <= 5 ? POOL_SIZE : Math.max(6, Math.floor(POOL_SIZE / 2));
    const allCandidates: SearchResult[] = [];
    const seen = new Set<string>();

    for (let attempt = 0; attempt < effectiveAttempts; attempt++) {
      const batch = buildBlobPool(
        size,
        rng,
        targetOn,
        hasCustomWeights ? baseWeights : undefined,
        minSideAdj,
        poolTarget,
      );
      for (const result of batch) {
        const key = result.path.map((c) => `${c.row},${c.col}`).join(";");
        if (seen.has(key)) continue;
        seen.add(key);
        allCandidates.push(result);
      }
    }

    if (allCandidates.length > 0) {
      return pathToGrid(size, pickFromPool(rng, allCandidates).path);
    }

    if (size <= 6) {
      for (let length = targetOn - 1; length >= Math.max(4, minOn); length--) {
        const shorterSide = minSideAdjForLength(length);
        const pool = buildBlobPool(
          size,
          rng,
          length,
          hasCustomWeights ? baseWeights : undefined,
          shorterSide,
          poolTarget,
        );
        if (pool.length === 0) continue;
        const grid = pathToGrid(size, pickFromPool(rng, pool).path);
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
    "Traceable blob paths from varied cores and growth styles, pooled for high visual diversity.",
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
