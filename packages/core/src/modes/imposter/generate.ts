import { cloneGrid, gridsEqual, toggleCell } from "../../grid.js";
import { generatePattern } from "../../pattern/index.js";
import type { Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import type { RoundGenerationContext } from "../types.js";
import type { CellCoordinate, ChunkShift, ImposterRound } from "../types.js";
import { sampleImposterShiftCount, sampleImposterToggleCount } from "./budget.js";
import { coordinateKey, listImposterToggleCandidates } from "./boundary.js";
import { applyChunkShift, listValidChunkShifts, sampleAndApplyChunkShift } from "./shift.js";

const MAX_RANDOM_ATTEMPTS = 64;
const MAX_FALLBACK_TARGETS = 64;

export class ImposterGenerationError extends Error {
  readonly gridSize: number;
  readonly patternStyle: string;
  readonly shiftCount: number;
  readonly toggleCount: number;

  constructor(
    gridSize: number,
    patternStyle: string,
    shiftCount: number,
    toggleCount: number,
  ) {
    super(
      `Failed to generate imposter round (size=${gridSize}, style=${patternStyle}, shifts=${shiftCount}, toggles=${toggleCount})`,
    );
    this.name = "ImposterGenerationError";
    this.gridSize = gridSize;
    this.patternStyle = patternStyle;
    this.shiftCount = shiftCount;
    this.toggleCount = toggleCount;
  }
}

function hammingDistance(a: Grid, b: Grid): number {
  let count = 0;
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) count++;
    }
  }
  return count;
}

function applyShifts(
  grid: Grid,
  shiftCount: number,
  rng: Rng,
): { grid: Grid; shifts: ChunkShift[] } | null {
  let current = grid;
  const shifts: ChunkShift[] = [];
  for (let i = 0; i < shiftCount; i++) {
    const result = sampleAndApplyChunkShift(current, rng);
    if (!result) return null;
    current = result.grid;
    shifts.push(result.shift);
  }
  return { grid: current, shifts };
}

function applyToggles(
  grid: Grid,
  toggleCount: number,
  rng: Rng,
): { grid: Grid; toggledCells: CellCoordinate[] } | null {
  let current = grid;
  const used = new Set<string>();
  const toggledCells: CellCoordinate[] = [];

  for (let i = 0; i < toggleCount; i++) {
    const candidates = listImposterToggleCandidates(current, used);
    if (candidates.length === 0) return null;
    const cell = rng.pick(candidates);
    current = toggleCell(current, cell.row, cell.col);
    used.add(coordinateKey(cell.row, cell.col));
    toggledCells.push(cell);
  }

  return { grid: current, toggledCells };
}

function findShiftSequence(
  grid: Grid,
  shiftCount: number,
  maxEdge: number,
): ChunkShift[] | null {
  if (shiftCount === 0) return [];

  function dfs(current: Grid, remaining: number): ChunkShift[] | null {
    if (remaining === 0) return [];
    for (let height = 1; height <= maxEdge; height++) {
      for (let width = 1; width <= maxEdge; width++) {
        const valid = listValidChunkShifts(current, height, width);
        for (const shift of valid) {
          const next = applyChunkShift(current, shift);
          const rest = dfs(next, remaining - 1);
          if (rest !== null) {
            return [shift, ...rest];
          }
        }
      }
    }
    return null;
  }

  return dfs(grid, shiftCount);
}

function findToggleSequence(
  grid: Grid,
  toggleCount: number,
): CellCoordinate[] | null {
  if (toggleCount === 0) return [];

  function dfs(current: Grid, remaining: number, used: Set<string>): CellCoordinate[] | null {
    if (remaining === 0) return [];
    const candidates = listImposterToggleCandidates(current, used);
    for (const cell of candidates) {
      const key = coordinateKey(cell.row, cell.col);
      const next = toggleCell(current, cell.row, cell.col);
      const nextUsed = new Set(used);
      nextUsed.add(key);
      const rest = dfs(next, remaining - 1, nextUsed);
      if (rest !== null) {
        return [cell, ...rest];
      }
    }
    return null;
  }

  return dfs(grid, toggleCount, new Set());
}

function deterministicFallback(
  context: RoundGenerationContext,
  shiftCount: number,
  toggleCount: number,
): ImposterRound {
  const { settings, rng, avoidReferenceHash } = context;
  const maxEdge = Math.ceil(settings.gridSize / 2);

  for (let targetAttempt = 0; targetAttempt < MAX_FALLBACK_TARGETS; targetAttempt++) {
    const reference = generatePattern(
      settings.patternStyle,
      settings.gridSize,
      rng,
      avoidReferenceHash,
    );
    const shifts = findShiftSequence(cloneGrid(reference), shiftCount, maxEdge);
    if (!shifts) continue;

    let interactive = cloneGrid(reference);
    for (const shift of shifts) {
      interactive = applyChunkShift(interactive, shift);
    }

    const toggledCells = findToggleSequence(interactive, toggleCount);
    if (!toggledCells) continue;

    interactive = cloneGrid(reference);
    for (const shift of shifts) {
      interactive = applyChunkShift(interactive, shift);
    }
    for (const cell of toggledCells) {
      interactive = toggleCell(interactive, cell.row, cell.col);
    }

    if (gridsEqual(reference, interactive)) continue;

    return {
      reference,
      interactive,
      metadata: {
        toggleCount,
        toggledCells,
        shiftCount,
        shifts,
        hammingDistance: hammingDistance(reference, interactive),
      },
    };
  }

  throw new ImposterGenerationError(
    settings.gridSize,
    settings.patternStyle,
    shiftCount,
    toggleCount,
  );
}

export function generateImposterRound(context: RoundGenerationContext): ImposterRound {
  const { settings, rng, avoidReferenceHash } = context;
  const shiftCount = sampleImposterShiftCount(settings.gridSize, rng);
  const toggleCount = sampleImposterToggleCount(settings.gridSize, rng);

  for (let attempt = 0; attempt < MAX_RANDOM_ATTEMPTS; attempt++) {
    const reference = generatePattern(
      settings.patternStyle,
      settings.gridSize,
      rng,
      avoidReferenceHash,
    );
    let interactive = cloneGrid(reference);

    const shiftResult = applyShifts(interactive, shiftCount, rng);
    if (!shiftResult) continue;
    interactive = shiftResult.grid;

    const toggleResult = applyToggles(interactive, toggleCount, rng);
    if (!toggleResult) continue;
    interactive = toggleResult.grid;

    if (gridsEqual(reference, interactive)) continue;

    return {
      reference,
      interactive,
      metadata: {
        toggleCount,
        toggledCells: toggleResult.toggledCells,
        shiftCount,
        shifts: shiftResult.shifts,
        hammingDistance: hammingDistance(reference, interactive),
      },
    };
  }

  return deterministicFallback(context, shiftCount, toggleCount);
}
