import { allOff } from "@copy-quatre/core";
import { describe, expect, it } from "vitest";
import {
  applyVelocityJitter,
  buildFlyingCells,
  getCellDirection,
  getExitDistance,
  getSplitAxis,
  EXPLODE_DURATION_MS,
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

  it("applyVelocityJitter stays within speed and angle bounds", () => {
    const rng = () => 0;
    const { vx, vy } = applyVelocityJitter(100, 0, rng);
    const mag = Math.hypot(vx, vy);
    expect(mag).toBeCloseTo(90, 5);
    expect(Math.atan2(vy, vx)).toBeCloseTo(-10 * (Math.PI / 180), 5);

    const rngMax = () => 1;
    const max = applyVelocityJitter(100, 0, rngMax);
    expect(Math.hypot(max.vx, max.vy)).toBeCloseTo(110, 5);
    expect(Math.atan2(max.vy, max.vx)).toBeCloseTo(10 * (Math.PI / 180), 5);
  });

  it("buildFlyingCells spawns only lit cells with stacked horizontal motion", () => {
    const refEl = mockGridElement(0, 0, 3, 20);
    const intEl = mockGridElement(0, 80, 3, 20);
    const reference = gridWithOn(3, [[1, 1]]);
    const interactive = gridWithOn(3, [[1, 2]]);
    let roll = 0;
    const rng = () => [0.1, 0.5, 0.5, 0.5, 0.5][roll++ % 5];

    const cells = buildFlyingCells(reference, interactive, refEl, intEl, false, rng);

    expect(cells).toHaveLength(2);
    expect(cells.every((cell) => Math.abs(cell.vx) > Math.abs(cell.vy))).toBe(true);
    expect(cells.some((cell) => cell.vx < 0)).toBe(true);
    expect(cells.some((cell) => cell.vx > 0)).toBe(true);

    const baseSpeed = 20 / EXPLODE_DURATION_MS;
    expect(Math.max(...cells.map((cell) => Math.hypot(cell.vx, cell.vy)))).toBeCloseTo(baseSpeed, 5);
  });

  it("buildFlyingCells uses vertical motion when side by side", () => {
    const refEl = mockGridElement(0, 0, 3, 20);
    const intEl = mockGridElement(80, 0, 3, 20);
    const reference = gridWithOn(3, [[1, 1]]);
    const interactive = gridWithOn(3, [[1, 1]]);
    let roll = 0;
    const rng = () => [0.1, 0.5, 0.5, 0.9, 0.5, 0.5][roll++ % 6];

    const cells = buildFlyingCells(reference, interactive, refEl, intEl, true, rng);

    expect(cells).toHaveLength(2);
    expect(cells.every((cell) => Math.abs(cell.vy) > Math.abs(cell.vx))).toBe(true);
    expect(cells.some((cell) => cell.vy < 0)).toBe(true);
    expect(cells.some((cell) => cell.vy > 0)).toBe(true);
  });
});
