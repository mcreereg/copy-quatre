import type { Grid } from "@copy-quatre/core";

export const EXPLODE_DURATION_MS = 150;
export const WAVE_MAX_DELAY_MS = 45;
export const ANGLE_NEAR_DEG = 42;
export const ANGLE_FAR_DEG = 8;
export const SPEED_NEAR_MULT = 1.4;
export const SPEED_FAR_MULT = 0.55;
export const DRAG_PER_MS = 0.003;
export const SPEED_NOISE = 0.05;
export const SPIN_MIN_DEG_PER_MS = 0.2;
export const SPIN_MAX_DEG_PER_MS = 0.55;
export const FADE_START_MS = 70;
export const FADE_DURATION_MS = 260;
export const SCALE_END = 0.72;
export const MIDLINE_DURATION_MS = 120;
export const MIDLINE_THICKNESS_PX = 8;
export const MIDLINE_OVERSHOOT_PX = 20;

export type SplitAxis = "x" | "y";
export type Rng = () => number;

export type FlyingCell = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  delayMs: number;
  spin: number;
  rotation: number;
  opacity: number;
  scale: number;
  spawnedAt: number;
};

export type MidlineBlast = {
  id: string;
  splitAxis: SplitAxis;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExplosionSpawn = {
  cells: FlyingCell[];
  midline: MidlineBlast;
};

export function getSplitAxis(sideBySide: boolean): SplitAxis {
  return sideBySide ? "y" : "x";
}

export function getCenterLine(combined: DOMRect, splitAxis: SplitAxis): number {
  return splitAxis === "x"
    ? combined.left + combined.width / 2
    : combined.top + combined.height / 2;
}

export function getCellDirection(
  cellCenter: number,
  centerLine: number,
  cellHalfSize: number,
  rng: Rng,
): -1 | 1 {
  const diff = cellCenter - centerLine;
  if (Math.abs(diff) <= cellHalfSize) {
    return rng() < 0.5 ? -1 : 1;
  }
  return diff < 0 ? -1 : 1;
}

export function getExitDistance(
  cellRect: DOMRect,
  gridRect: DOMRect,
  direction: -1 | 1,
  splitAxis: SplitAxis,
): number {
  if (splitAxis === "x") {
    return direction < 0
      ? cellRect.left - gridRect.left
      : gridRect.right - cellRect.right;
  }
  return direction < 0
    ? cellRect.top - gridRect.top
    : gridRect.bottom - cellRect.bottom;
}

export function distNorm(dist: number, maxDist: number): number {
  if (maxDist <= 0) return 0;
  return Math.min(1, dist / maxDist);
}

export function waveDelay(t: number): number {
  return t * WAVE_MAX_DELAY_MS;
}

export function speedMultiplier(t: number): number {
  return SPEED_NEAR_MULT + (SPEED_FAR_MULT - SPEED_NEAR_MULT) * t;
}

export function angleJitterRad(t: number, rng: Rng): number {
  const maxDeg = ANGLE_NEAR_DEG + (ANGLE_FAR_DEG - ANGLE_NEAR_DEG) * t;
  return (rng() * 2 - 1) * maxDeg * (Math.PI / 180);
}

export function impulseSpeed(distance: number, timeMs: number): number {
  const k = DRAG_PER_MS;
  const kt = k * timeMs;
  if (kt < 1e-4) return distance / Math.max(timeMs, 1);
  return (distance * k) / (1 - Math.exp(-kt));
}

export function applyBlastVelocity(
  baseVx: number,
  baseVy: number,
  t: number,
  rng: Rng,
): { vx: number; vy: number } {
  const speedMult = speedMultiplier(t) * (1 - SPEED_NOISE + rng() * SPEED_NOISE * 2);
  const angle = Math.atan2(baseVy, baseVx) + angleJitterRad(t, rng);
  const mag = Math.hypot(baseVx, baseVy) * speedMult;
  return {
    vx: mag * Math.cos(angle),
    vy: mag * Math.sin(angle),
  };
}

export function pickSpin(rng: Rng): number {
  const mag = SPIN_MIN_DEG_PER_MS + rng() * (SPIN_MAX_DEG_PER_MS - SPIN_MIN_DEG_PER_MS);
  return rng() < 0.5 ? -mag : mag;
}

export function fadeAmount(movingAgeMs: number): number {
  return Math.min(1, Math.max(0, (movingAgeMs - FADE_START_MS) / FADE_DURATION_MS));
}

export function buildMidlineBlast(
  combined: DOMRect,
  splitAxis: SplitAxis,
  id = "midline",
): MidlineBlast {
  const overshoot = MIDLINE_OVERSHOOT_PX;
  const thickness = MIDLINE_THICKNESS_PX;
  if (splitAxis === "x") {
    return {
      id,
      splitAxis,
      x: combined.left + combined.width / 2 - thickness / 2,
      y: combined.top - overshoot,
      width: thickness,
      height: combined.height + overshoot * 2,
    };
  }
  return {
    id,
    splitAxis,
    x: combined.left - overshoot,
    y: combined.top + combined.height / 2 - thickness / 2,
    width: combined.width + overshoot * 2,
    height: thickness,
  };
}

export function stepFlyingCell(
  cell: FlyingCell,
  now: number,
  dt: number,
): FlyingCell | null {
  const age = now - cell.spawnedAt;
  if (age < cell.delayMs) return cell;

  const movingAge = age - cell.delayMs;
  const step = Math.min(Math.max(dt, 0), Math.max(movingAge, 0));
  const drag = step > 0 ? Math.exp(-DRAG_PER_MS * step) : 1;
  const vx = cell.vx * drag;
  const vy = cell.vy * drag;
  const x = cell.x + vx * step;
  const y = cell.y + vy * step;
  const rotation = cell.rotation + cell.spin * step;
  const fade = fadeAmount(movingAge);
  const opacity = 1 - fade;
  const scale = 1 - (1 - SCALE_END) * fade;

  if (opacity <= 0.02) return null;
  if (isRectOffScreen(x, y, cell.width, cell.height)) return null;

  if (
    step === 0 &&
    fade === 0 &&
    cell.x === x &&
    cell.y === y &&
    cell.opacity === opacity &&
    cell.scale === scale
  ) {
    return cell;
  }

  return { ...cell, x, y, vx, vy, rotation, opacity, scale };
}

function combinedRect(a: DOMRect, b: DOMRect): DOMRect {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.right, b.right);
  const bottom = Math.max(a.bottom, b.bottom);
  return new DOMRect(left, top, right - left, bottom - top);
}

function cellElement(gridEl: HTMLElement, row: number, col: number): HTMLElement | null {
  return gridEl.querySelector(`[data-cell][data-row="${row}"][data-col="${col}"]`);
}

type CellCandidate = {
  id: string;
  rect: DOMRect;
  gridRect: DOMRect;
  direction: -1 | 1;
  exitDistance: number;
  dist: number;
};

function collectLitCells(
  grid: Grid,
  gridEl: HTMLElement,
  prefix: string,
  centerLine: number,
  splitAxis: SplitAxis,
  rng: Rng,
): CellCandidate[] {
  const gridRect = gridEl.getBoundingClientRect();
  const cells: CellCandidate[] = [];

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r][c]) continue;

      const el = cellElement(gridEl, r, c);
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      const cellCenter =
        splitAxis === "x" ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
      const cellHalfSize = splitAxis === "x" ? rect.width / 2 : rect.height / 2;
      const direction = getCellDirection(cellCenter, centerLine, cellHalfSize, rng);
      const exitDistance = getExitDistance(rect, gridRect, direction, splitAxis);

      cells.push({
        id: `${prefix}-${r}-${c}`,
        rect,
        gridRect,
        direction,
        exitDistance,
        dist: Math.abs(cellCenter - centerLine),
      });
    }
  }

  return cells;
}

export function buildFlyingCells(
  matchedReference: Grid,
  matchedInteractive: Grid,
  referenceEl: HTMLElement,
  interactiveEl: HTMLElement,
  sideBySide: boolean,
  rng: Rng = Math.random,
  now = 0,
  idPrefix = "",
): FlyingCell[] {
  const refRect = referenceEl.getBoundingClientRect();
  const intRect = interactiveEl.getBoundingClientRect();
  const combined = combinedRect(refRect, intRect);
  const splitAxis = getSplitAxis(sideBySide);
  const centerLine = getCenterLine(combined, splitAxis);

  const candidates = [
    ...collectLitCells(matchedReference, referenceEl, "ref", centerLine, splitAxis, rng),
    ...collectLitCells(matchedInteractive, interactiveEl, "int", centerLine, splitAxis, rng),
  ];

  if (candidates.length === 0) return [];

  const maxDist = Math.max(...candidates.map((c) => c.dist));
  const cellSpan = splitAxis === "x" ? candidates[0].rect.width : candidates[0].rect.height;
  const maxExit = Math.max(...candidates.map((c) => c.exitDistance), cellSpan);
  const baseSpeed = impulseSpeed(maxExit, EXPLODE_DURATION_MS);

  return candidates.map((candidate) => {
    const t = distNorm(candidate.dist, maxDist);
    const baseVx = splitAxis === "x" ? baseSpeed * candidate.direction : 0;
    const baseVy = splitAxis === "y" ? baseSpeed * candidate.direction : 0;
    const { vx, vy } = applyBlastVelocity(baseVx, baseVy, t, rng);

    return {
      id: `${idPrefix}${candidate.id}`,
      x: candidate.rect.left,
      y: candidate.rect.top,
      width: candidate.rect.width,
      height: candidate.rect.height,
      vx,
      vy,
      delayMs: waveDelay(t),
      spin: pickSpin(rng),
      rotation: 0,
      opacity: 1,
      scale: 1,
      spawnedAt: now,
    };
  });
}

export function buildExplosion(
  matchedReference: Grid,
  matchedInteractive: Grid,
  referenceEl: HTMLElement,
  interactiveEl: HTMLElement,
  sideBySide: boolean,
  rng: Rng = Math.random,
  now = 0,
  idPrefix = "",
): ExplosionSpawn | null {
  const cells = buildFlyingCells(
    matchedReference,
    matchedInteractive,
    referenceEl,
    interactiveEl,
    sideBySide,
    rng,
    now,
    idPrefix,
  );
  if (cells.length === 0) return null;

  const refRect = referenceEl.getBoundingClientRect();
  const intRect = interactiveEl.getBoundingClientRect();
  const combined = combinedRect(refRect, intRect);
  const splitAxis = getSplitAxis(sideBySide);

  return {
    cells,
    midline: buildMidlineBlast(combined, splitAxis, `${idPrefix}midline`),
  };
}

export function isRectOffScreen(
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return (
    x + width < 0 ||
    x > window.innerWidth ||
    y + height < 0 ||
    y > window.innerHeight
  );
}
