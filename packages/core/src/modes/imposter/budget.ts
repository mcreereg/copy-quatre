import type { Rng } from "../../rng.js";
import { GRID_SIZE_MAX, GRID_SIZE_MIN } from "../../settings.js";

export function getImposterToggleBounds(gridSize: number): { min: number; max: number } {
  if (!Number.isInteger(gridSize) || gridSize < GRID_SIZE_MIN || gridSize > GRID_SIZE_MAX) {
    throw new RangeError(`Invalid grid size: ${gridSize}`);
  }
  const cells = gridSize * gridSize;
  const x = Math.log(cells) - 1;
  const min = Math.max(1, Math.floor(x));
  const max = Math.ceil(x * x);
  return { min, max };
}

export function sampleImposterToggleCount(gridSize: number, rng: Rng): number {
  const { min, max } = getImposterToggleBounds(gridSize);
  return rng.nextInt(min, max);
}

const SHIFT_COUNT_WEIGHTS: Record<number, readonly [0 | 1 | 2 | 3, number][]> = {
  2: [[0, 100]],
  3: [[0, 75], [1, 25]],
  4: [[0, 50], [1, 50]],
  5: [[0, 50], [1, 40], [2, 10]],
  6: [[0, 50], [1, 30], [2, 20]],
  7: [[0, 25], [1, 30], [2, 30], [3, 15]],
};

const DEFAULT_SHIFT_WEIGHTS: readonly [0 | 1 | 2 | 3, number][] = [
  [0, 25],
  [1, 25],
  [2, 25],
  [3, 25],
];

export function sampleImposterShiftCount(gridSize: number, rng: Rng): 0 | 1 | 2 | 3 {
  if (!Number.isInteger(gridSize) || gridSize < GRID_SIZE_MIN || gridSize > GRID_SIZE_MAX) {
    throw new RangeError(`Invalid grid size: ${gridSize}`);
  }
  const weights = SHIFT_COUNT_WEIGHTS[gridSize] ?? DEFAULT_SHIFT_WEIGHTS;
  const roll = rng.nextInt(1, 100);
  let cumulative = 0;
  for (const [count, weight] of weights) {
    cumulative += weight;
    if (roll <= cumulative) {
      return count;
    }
  }
  return weights[weights.length - 1][0];
}
