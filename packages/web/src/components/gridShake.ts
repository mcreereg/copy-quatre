import {
  distNorm,
  getCenterLine,
  getCellDirection,
  getSplitAxis,
  waveDelay,
  WAVE_MAX_DELAY_MS,
  type Rng,
  type SplitAxis,
} from "../hooks/explodeAnimation.js";

export const SHAKE_DURATION_MS = 450;
export const SHAKE_NEAR_PX = 10;
export const SHAKE_FAR_PX = 3.5;
export const SHAKE_NEAR_DEG = 6;
export const SHAKE_FAR_DEG = 2;
export const SHAKE_JITTER = 0.35;

export type CellShakeSpec = {
  delayMs: number;
  dx: number;
  dy: number;
  rotDeg: number;
};

export type GridShakeMaps = {
  ref: Map<string, CellShakeSpec>;
  int: Map<string, CellShakeSpec>;
};

function combinedRect(a: DOMRect, b: DOMRect): DOMRect {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.right, b.right);
  const bottom = Math.max(a.bottom, b.bottom);
  return new DOMRect(left, top, right - left, bottom - top);
}

function shakePx(t: number): number {
  return SHAKE_NEAR_PX + (SHAKE_FAR_PX - SHAKE_NEAR_PX) * t;
}

function shakeRotDeg(t: number): number {
  return SHAKE_NEAR_DEG + (SHAKE_FAR_DEG - SHAKE_NEAR_DEG) * t;
}

export function shakeOffset(
  t: number,
  direction: -1 | 1,
  splitAxis: SplitAxis,
  rng: Rng,
): { dx: number; dy: number; rotDeg: number } {
  const px = shakePx(t);
  const rot = shakeRotDeg(t) * direction;
  const jitter = 1 - SHAKE_JITTER + rng() * SHAKE_JITTER * 2;

  if (splitAxis === "x") {
    return {
      dx: direction * px * jitter,
      dy: (rng() * 2 - 1) * px * SHAKE_JITTER,
      rotDeg: rot * (0.85 + rng() * 0.3),
    };
  }

  return {
    dx: (rng() * 2 - 1) * px * SHAKE_JITTER,
    dy: direction * px * jitter,
    rotDeg: rot * (0.85 + rng() * 0.3),
  };
}

type CellCandidate = {
  key: string;
  dist: number;
  direction: -1 | 1;
};

function collectAllCells(
  gridEl: HTMLElement,
  centerLine: number,
  splitAxis: SplitAxis,
  rng: Rng,
): CellCandidate[] {
  const cells: CellCandidate[] = [];

  for (const el of gridEl.querySelectorAll("[data-cell]")) {
    const cell = el as HTMLElement;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (!Number.isInteger(row) || !Number.isInteger(col)) continue;

    const rect = cell.getBoundingClientRect();
    const cellCenter =
      splitAxis === "x" ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
    const cellHalfSize = splitAxis === "x" ? rect.width / 2 : rect.height / 2;
    const direction = getCellDirection(cellCenter, centerLine, cellHalfSize, rng);

    cells.push({
      key: `${row}-${col}`,
      dist: Math.abs(cellCenter - centerLine),
      direction,
    });
  }

  return cells;
}

function buildShakeMap(
  candidates: CellCandidate[],
  maxDist: number,
  splitAxis: SplitAxis,
  rng: Rng,
): Map<string, CellShakeSpec> {
  const map = new Map<string, CellShakeSpec>();

  for (const candidate of candidates) {
    const t = distNorm(candidate.dist, maxDist);
    const { dx, dy, rotDeg } = shakeOffset(t, candidate.direction, splitAxis, rng);
    map.set(candidate.key, {
      delayMs: waveDelay(t),
      dx,
      dy,
      rotDeg,
    });
  }

  return map;
}

export function buildGridShake(
  referenceEl: HTMLElement,
  interactiveEl: HTMLElement,
  sideBySide: boolean,
  rng: Rng = Math.random,
): GridShakeMaps {
  const refRect = referenceEl.getBoundingClientRect();
  const intRect = interactiveEl.getBoundingClientRect();
  const combined = combinedRect(refRect, intRect);
  const splitAxis = getSplitAxis(sideBySide);
  const centerLine = getCenterLine(combined, splitAxis);

  const refCandidates = collectAllCells(referenceEl, centerLine, splitAxis, rng);
  const intCandidates = collectAllCells(interactiveEl, centerLine, splitAxis, rng);
  const allCandidates = [...refCandidates, ...intCandidates];
  const maxDist = allCandidates.length > 0 ? Math.max(...allCandidates.map((c) => c.dist)) : 0;

  return {
    ref: buildShakeMap(refCandidates, maxDist, splitAxis, rng),
    int: buildShakeMap(intCandidates, maxDist, splitAxis, rng),
  };
}

export function shakeClearDelayMs(): number {
  return SHAKE_DURATION_MS + WAVE_MAX_DELAY_MS + 30;
}
