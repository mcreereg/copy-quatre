import { isInBounds } from "../../grid.js";
import type { Grid } from "../../types.js";
import type { ChunkShift, ShiftDirection } from "../types.js";
import { validateImposterGrid } from "./validation.js";

export class InvalidChunkShiftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidChunkShiftError";
  }
}

const DIRECTIONS: ShiftDirection[] = ["north", "east", "south", "west"];

export function getMaxChunkEdge(gridSize: number): number {
  if (!Number.isInteger(gridSize) || gridSize < 1) {
    throw new RangeError(`Invalid grid size: ${gridSize}`);
  }
  return Math.ceil(gridSize / 2);
}

function destinationRect(shift: ChunkShift): {
  destRow: number;
  destCol: number;
  height: number;
  width: number;
} {
  const { sourceRow, sourceCol, height, width, direction } = shift;
  switch (direction) {
    case "north":
      return { destRow: sourceRow - 1, destCol: sourceCol, height, width };
    case "south":
      return { destRow: sourceRow + 1, destCol: sourceCol, height, width };
    case "west":
      return { destRow: sourceRow, destCol: sourceCol - 1, height, width };
    case "east":
      return { destRow: sourceRow, destCol: sourceCol + 1, height, width };
  }
}

function leadingStripCells(shift: ChunkShift): CellRect[] {
  const { sourceRow, sourceCol, height, width, direction } = shift;
  const cells: CellRect[] = [];
  switch (direction) {
    case "north":
      for (let c = sourceCol; c < sourceCol + width; c++) {
        cells.push({ row: sourceRow - 1, col: c });
      }
      break;
    case "south":
      for (let c = sourceCol; c < sourceCol + width; c++) {
        cells.push({ row: sourceRow + height, col: c });
      }
      break;
    case "west":
      for (let r = sourceRow; r < sourceRow + height; r++) {
        cells.push({ row: r, col: sourceCol - 1 });
      }
      break;
    case "east":
      for (let r = sourceRow; r < sourceRow + height; r++) {
        cells.push({ row: r, col: sourceCol + width });
      }
      break;
  }
  return cells;
}

type CellRect = { row: number; col: number };

function sourceCells(shift: ChunkShift): CellRect[] {
  const cells: CellRect[] = [];
  for (let r = shift.sourceRow; r < shift.sourceRow + shift.height; r++) {
    for (let c = shift.sourceCol; c < shift.sourceCol + shift.width; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

function validateShiftGeometry(grid: Grid, shift: ChunkShift): void {
  const size = grid.length;
  const maxEdge = getMaxChunkEdge(size);
  const { sourceRow, sourceCol, height, width, direction } = shift;

  if (
    !Number.isInteger(sourceRow) ||
    !Number.isInteger(sourceCol) ||
    !Number.isInteger(height) ||
    !Number.isInteger(width)
  ) {
    throw new RangeError("Chunk shift fields must be integers");
  }
  if (height < 1 || height > maxEdge || width < 1 || width > maxEdge) {
    throw new RangeError("Chunk dimensions out of range");
  }
  if (!DIRECTIONS.includes(direction)) {
    throw new RangeError(`Unsupported direction: ${direction}`);
  }

  for (const { row, col } of sourceCells(shift)) {
    if (!isInBounds(grid, row, col)) {
      throw new RangeError("Chunk source out of bounds");
    }
  }

  const dest = destinationRect(shift);
  for (let r = dest.destRow; r < dest.destRow + dest.height; r++) {
    for (let c = dest.destCol; c < dest.destCol + dest.width; c++) {
      if (!isInBounds(grid, r, c)) {
        throw new RangeError("Chunk destination out of bounds");
      }
    }
  }
}

export function isValidChunkShift(grid: Grid, shift: ChunkShift): boolean {
  validateImposterGrid(grid);
  try {
    validateShiftGeometry(grid, shift);
  } catch {
    return false;
  }

  let hasOn = false;
  for (const { row, col } of sourceCells(shift)) {
    if (grid[row][col]) hasOn = true;
  }
  if (!hasOn) return false;

  for (const { row, col } of leadingStripCells(shift)) {
    if (grid[row][col]) return false;
  }

  return true;
}

export function listValidChunkShifts(
  grid: Grid,
  height: number,
  width: number,
): ChunkShift[] {
  validateImposterGrid(grid);
  const size = grid.length;
  const maxEdge = getMaxChunkEdge(size);
  if (
    !Number.isInteger(height) ||
    !Number.isInteger(width) ||
    height < 1 ||
    height > maxEdge ||
    width < 1 ||
    width > maxEdge
  ) {
    throw new RangeError("Chunk dimensions out of range");
  }

  const shifts: ChunkShift[] = [];
  for (let sourceRow = 0; sourceRow <= size - height; sourceRow++) {
    for (let sourceCol = 0; sourceCol <= size - width; sourceCol++) {
      for (const direction of DIRECTIONS) {
        const shift: ChunkShift = { sourceRow, sourceCol, height, width, direction };
        if (isValidChunkShift(grid, shift)) {
          shifts.push(shift);
        }
      }
    }
  }
  return shifts;
}

export function applyChunkShift(grid: Grid, shift: ChunkShift): Grid {
  validateImposterGrid(grid);
  validateShiftGeometry(grid, shift);
  if (!isValidChunkShift(grid, shift)) {
    throw new InvalidChunkShiftError("Invalid chunk shift for current grid");
  }

  const snapshot = sourceCells(shift).map(({ row, col }) => grid[row][col]);
  const next = grid.map((row) => [...row]);

  for (const { row, col } of sourceCells(shift)) {
    next[row][col] = false;
  }

  const dest = destinationRect(shift);
  let idx = 0;
  for (let r = 0; r < shift.height; r++) {
    for (let c = 0; c < shift.width; c++) {
      next[dest.destRow + r][dest.destCol + c] = snapshot[idx];
      idx++;
    }
  }

  return next;
}

export function sampleAndApplyChunkShift(
  grid: Grid,
  rng: import("../../rng.js").Rng,
): { grid: Grid; shift: ChunkShift } | null {
  validateImposterGrid(grid);
  const maxEdge = getMaxChunkEdge(grid.length);
  const feasibleHeights: number[] = [];
  const widthsByHeight = new Map<number, number[]>();

  for (let height = 1; height <= maxEdge; height++) {
    const feasibleWidths: number[] = [];
    for (let width = 1; width <= maxEdge; width++) {
      if (listValidChunkShifts(grid, height, width).length > 0) {
        feasibleWidths.push(width);
      }
    }
    if (feasibleWidths.length > 0) {
      feasibleHeights.push(height);
      widthsByHeight.set(height, feasibleWidths);
    }
  }

  if (feasibleHeights.length === 0) return null;

  const height = rng.pick(feasibleHeights);
  const width = rng.pick(widthsByHeight.get(height)!);
  const validShifts = listValidChunkShifts(grid, height, width);
  const shift = rng.pick(validShifts);
  return { grid: applyChunkShift(grid, shift), shift };
}
