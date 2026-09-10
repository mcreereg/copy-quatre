import { describe, expect, it } from "vitest";
import { WAVE_MAX_DELAY_MS } from "../hooks/explodeAnimation.js";
import {
  buildGridShake,
  SHAKE_FAR_PX,
  SHAKE_NEAR_PX,
  shakeOffset,
} from "./gridShake.js";

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

describe("gridShake", () => {
  it("buildGridShake collects every cell in both grids", () => {
    const refEl = mockGridElement(0, 0, 3, 20);
    const intEl = mockGridElement(0, 80, 3, 20);

    const { ref, int } = buildGridShake(refEl, intEl, false, steadyRng());

    expect(ref.size).toBe(9);
    expect(int.size).toBe(9);
  });

  it("near-midline cells delay less and shake harder than far cells", () => {
    const refEl = mockGridElement(0, 0, 3, 20);
    const intEl = mockGridElement(0, 80, 3, 20);

    const { ref, int } = buildGridShake(refEl, intEl, false, steadyRng());

    const near = ref.get("1-1");
    const far = int.get("1-2");

    expect(near).toBeDefined();
    expect(far).toBeDefined();
    expect(near!.delayMs).toBe(0);
    expect(far!.delayMs).toBe(WAVE_MAX_DELAY_MS);
    expect(Math.hypot(near!.dx, near!.dy)).toBeGreaterThan(Math.hypot(far!.dx, far!.dy));
  });

  it("shakeOffset pushes primarily along split axis away from center", () => {
    const stackedNear = shakeOffset(0, 1, "x", steadyRng());
    const stackedFar = shakeOffset(1, -1, "x", steadyRng());
    const sideNear = shakeOffset(0, -1, "y", steadyRng());

    expect(Math.abs(stackedNear.dx)).toBeGreaterThan(Math.abs(stackedNear.dy));
    expect(stackedNear.dx).toBeGreaterThan(0);
    expect(Math.abs(stackedFar.dx)).toBeLessThan(SHAKE_NEAR_PX);
    expect(Math.abs(sideNear.dy)).toBeGreaterThan(Math.abs(sideNear.dx));
    expect(sideNear.dy).toBeLessThan(0);
  });

  it("shakeOffset amplitude falls off with distance norm", () => {
    const near = shakeOffset(0, 1, "x", () => 0.5);
    const far = shakeOffset(1, 1, "x", () => 0.5);

    expect(Math.abs(near.dx)).toBeCloseTo(SHAKE_NEAR_PX, 5);
    expect(Math.abs(far.dx)).toBeCloseTo(SHAKE_FAR_PX, 5);
  });
});
