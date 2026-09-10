import type { Grid } from "@copy-quatre/core";

export const EXPLODE_DURATION_MS = 150;
export const GRIDS_SIDE_BY_SIDE_QUERY = "(min-width: 640px)";

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

export function applyVelocityJitter(
  baseVx: number,
  baseVy: number,
  rng: Rng,
): { vx: number; vy: number } {
  const baseAngle = Math.atan2(baseVy, baseVx);
  const speedMult = 0.9 + rng() * 0.2;
  const angleJitter = (rng() * 2 - 1) * (10 * Math.PI / 180);
  const mag = Math.hypot(baseVx, baseVy) * speedMult;
  const angle = baseAngle + angleJitter;
  return {
    vx: mag * Math.cos(angle),
    vy: mag * Math.sin(angle),
  };
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

  const maxExit = Math.max(...candidates.map((c) => c.exitDistance));
  const baseSpeed = maxExit / EXPLODE_DURATION_MS;

  return candidates.map((candidate) => {
    const baseVx = splitAxis === "x" ? baseSpeed * candidate.direction : 0;
    const baseVy = splitAxis === "y" ? baseSpeed * candidate.direction : 0;
    const { vx, vy } = applyVelocityJitter(baseVx, baseVy, rng);

    return {
      id: candidate.id,
      x: candidate.rect.left,
      y: candidate.rect.top,
      width: candidate.rect.width,
      height: candidate.rect.height,
      vx,
      vy,
    };
  });
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
