import { allOff } from "@copy-quatre/core";
import { describe, expect, it } from "vitest";
import {
  ANGLE_FAR_DEG,
  ANGLE_NEAR_DEG,
  applyBlastVelocity,
  buildExplosion,
  buildFlyingCells,
  buildMidlineBlast,
  DRAG_PER_MS,
  EXPLODE_DURATION_MS,
  FADE_START_MS,
  getCellDirection,
  getExitDistance,
  getSplitAxis,
  impulseSpeed,
  MIDLINE_OVERSHOOT_PX,
  MIDLINE_THICKNESS_PX,
  pickSpin,
  SPEED_FAR_MULT,
  SPEED_NEAR_MULT,
  SPIN_MAX_DEG_PER_MS,
  SPIN_MIN_DEG_PER_MS,
  stepFlyingCell,
  WAVE_MAX_DELAY_MS,
  type FlyingCell,
} from "./explodeAnimation.js";

function gridWithOn(size: number, cells: Array<[number, number]>) {
  const grid = allOff(size);
  for (const [r, c] of cells) {
    grid[r][c] = true;
  }
  return grid;
}

function mockGridElement(
  left: number,
  top: number,
  size: number,
  cellSize: number,
  gap = 0,
): HTMLElement {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    new DOMRect(left, top, size * cellSize + gap * (size - 1), size * cellSize + gap * (size - 1));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement("div");
      cell.dataset.cell = "true";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      const cellLeft = left + c * (cellSize + gap);
      const cellTop = top + r * (cellSize + gap);
      cell.getBoundingClientRect = () => new DOMRect(cellLeft, cellTop, cellSize, cellSize);
      el.appendChild(cell);
    }
  }

  return el;
}

function steadyRng(value = 0.5): () => number {
  return () => value;
}

describe("explodeAnimation", () => {
  it("uses x split when stacked and y split when side by side", () => {
    expect(getSplitAxis(false)).toBe("x");
    expect(getSplitAxis(true)).toBe("y");
  });

  it("assigns direction from center line with random tie-break on center cells", () => {
    expect(getCellDirection(84, 100, 10, () => 0.5)).toBe(-1);
    expect(getCellDirection(116, 100, 10, () => 0.5)).toBe(1);
    expect(getCellDirection(100, 100, 10, () => 0.1)).toBe(-1);
    expect(getCellDirection(100, 100, 10, () => 0.9)).toBe(1);
  });

  it("computes axis-aligned exit distance", () => {
    const cell = new DOMRect(10, 20, 10, 10);
    const grid = new DOMRect(0, 0, 100, 100);
    expect(getExitDistance(cell, grid, -1, "x")).toBe(10);
    expect(getExitDistance(cell, grid, 1, "x")).toBe(80);
    expect(getExitDistance(cell, grid, -1, "y")).toBe(20);
    expect(getExitDistance(cell, grid, 1, "y")).toBe(70);
  });

  it("applyBlastVelocity uses wider angle near the line and higher speed", () => {
    const nearMin = applyBlastVelocity(100, 0, 0, () => 0);
    const nearMax = applyBlastVelocity(100, 0, 0, () => 1);
    const farMin = applyBlastVelocity(100, 0, 1, () => 0);
    const farMax = applyBlastVelocity(100, 0, 1, () => 1);

    expect(Math.hypot(nearMin.vx, nearMin.vy)).toBeCloseTo(100 * SPEED_NEAR_MULT * 0.95, 5);
    expect(Math.hypot(farMax.vx, farMax.vy)).toBeCloseTo(100 * SPEED_FAR_MULT * 1.05, 5);
    expect(Math.hypot(nearMin.vx, nearMin.vy)).toBeGreaterThan(Math.hypot(farMax.vx, farMax.vy));

    expect(Math.atan2(nearMin.vy, nearMin.vx)).toBeCloseTo(-ANGLE_NEAR_DEG * (Math.PI / 180), 5);
    expect(Math.atan2(nearMax.vy, nearMax.vx)).toBeCloseTo(ANGLE_NEAR_DEG * (Math.PI / 180), 5);
    expect(Math.atan2(farMin.vy, farMin.vx)).toBeCloseTo(-ANGLE_FAR_DEG * (Math.PI / 180), 5);
    expect(Math.atan2(farMax.vy, farMax.vx)).toBeCloseTo(ANGLE_FAR_DEG * (Math.PI / 180), 5);
  });

  it("pickSpin stays in configured bounds", () => {
    const min = pickSpin(() => 0);
    const max = pickSpin(() => 1);
    expect(Math.abs(min)).toBeCloseTo(SPIN_MIN_DEG_PER_MS, 5);
    expect(Math.abs(max)).toBeCloseTo(SPIN_MAX_DEG_PER_MS, 5);
  });

  it("impulseSpeed accounts for drag so travel still covers distance", () => {
    const distance = 120;
    const v0 = impulseSpeed(distance, EXPLODE_DURATION_MS);
    const traveled = (v0 / DRAG_PER_MS) * (1 - Math.exp(-DRAG_PER_MS * EXPLODE_DURATION_MS));
    expect(traveled).toBeCloseTo(distance, 5);
  });

  it("buildFlyingCells spawns only lit cells with stacked horizontal motion", () => {
    const refEl = mockGridElement(0, 0, 3, 20);
    const intEl = mockGridElement(0, 80, 3, 20);
    const reference = gridWithOn(3, [[1, 0]]);
    const interactive = gridWithOn(3, [[1, 2]]);

    const cells = buildFlyingCells(reference, interactive, refEl, intEl, false, steadyRng());

    expect(cells).toHaveLength(2);
    expect(cells.every((cell) => Math.abs(cell.vx) > Math.abs(cell.vy))).toBe(true);
    expect(cells.some((cell) => cell.vx < 0)).toBe(true);
    expect(cells.some((cell) => cell.vx > 0)).toBe(true);
    expect(cells.every((cell) => cell.spin !== 0)).toBe(true);
  });

  it("buildFlyingCells uses vertical motion when side by side", () => {
    const refEl = mockGridElement(0, 0, 3, 20);
    const intEl = mockGridElement(80, 0, 3, 20);
    const reference = gridWithOn(3, [[0, 1]]);
    const interactive = gridWithOn(3, [[2, 1]]);

    const cells = buildFlyingCells(reference, interactive, refEl, intEl, true, steadyRng());

    expect(cells).toHaveLength(2);
    expect(cells.every((cell) => Math.abs(cell.vy) > Math.abs(cell.vx))).toBe(true);
    expect(cells.some((cell) => cell.vy < 0)).toBe(true);
    expect(cells.some((cell) => cell.vy > 0)).toBe(true);
  });

  it("near-line cells start sooner and fly faster than far cells", () => {
    const refEl = mockGridElement(0, 0, 3, 20);
    const intEl = mockGridElement(0, 80, 3, 20);
    const reference = gridWithOn(3, [[1, 1]]);
    const interactive = gridWithOn(3, [[1, 2]]);

    const cells = buildFlyingCells(reference, interactive, refEl, intEl, false, steadyRng());
    const near = cells.find((cell) => cell.id.endsWith("ref-1-1"));
    const far = cells.find((cell) => cell.id.endsWith("int-1-2"));

    expect(near).toBeDefined();
    expect(far).toBeDefined();
    expect(near!.delayMs).toBe(0);
    expect(far!.delayMs).toBe(WAVE_MAX_DELAY_MS);
    expect(Math.hypot(near!.vx, near!.vy)).toBeGreaterThan(Math.hypot(far!.vx, far!.vy));
  });

  it("buildExplosion includes a midline blast along the split axis", () => {
    const refEl = mockGridElement(0, 0, 3, 20);
    const intEl = mockGridElement(0, 80, 3, 20);
    const reference = gridWithOn(3, [[1, 0]]);
    const interactive = gridWithOn(3, [[1, 2]]);

    const stacked = buildExplosion(reference, interactive, refEl, intEl, false, steadyRng());
    expect(stacked).not.toBeNull();
    expect(stacked!.midline.splitAxis).toBe("x");
    expect(stacked!.midline.width).toBe(MIDLINE_THICKNESS_PX);
    expect(stacked!.midline.height).toBe(140 + MIDLINE_OVERSHOOT_PX * 2);
    expect(stacked!.midline.x).toBeCloseTo(30 - MIDLINE_THICKNESS_PX / 2);

    const sideRef = mockGridElement(0, 0, 3, 20);
    const sideInt = mockGridElement(80, 0, 3, 20);
    const side = buildExplosion(reference, interactive, sideRef, sideInt, true, steadyRng());
    expect(side!.midline.splitAxis).toBe("y");
    expect(side!.midline.height).toBe(MIDLINE_THICKNESS_PX);
    expect(side!.midline.width).toBe(140 + MIDLINE_OVERSHOOT_PX * 2);
  });

  it("buildMidlineBlast centers a vertical line for x split", () => {
    const combined = new DOMRect(10, 20, 100, 80);
    const line = buildMidlineBlast(combined, "x");
    expect(line.x).toBe(10 + 50 - MIDLINE_THICKNESS_PX / 2);
    expect(line.y).toBe(20 - MIDLINE_OVERSHOOT_PX);
  });

  it("stepFlyingCell waits out delay then applies drag and fade", () => {
    const cell: FlyingCell = {
      id: "c",
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      vx: 1,
      vy: 0,
      delayMs: 40,
      spin: 0.3,
      rotation: 0,
      opacity: 1,
      scale: 1,
      spawnedAt: 0,
    };

    const waiting = stepFlyingCell(cell, 20, 16);
    expect(waiting).toBe(cell);

    const moving = stepFlyingCell(cell, 56, 16);
    expect(moving).not.toBeNull();
    expect(moving!.x).toBeGreaterThan(10);
    expect(moving!.vx).toBeLessThan(1);
    expect(moving!.rotation).toBeGreaterThan(0);

    const faded = stepFlyingCell({ ...cell, delayMs: 0 }, FADE_START_MS + 50, 16);
    expect(faded).not.toBeNull();
    expect(faded!.opacity).toBeLessThan(1);
    expect(faded!.scale).toBeLessThan(1);
  });
});
