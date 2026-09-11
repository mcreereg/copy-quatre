import { describe, expect, it } from "vitest";
import {
  maxSquareGridSize,
  preferSideBySideLayout,
  type GridAreaMetrics,
} from "./gridLayout.js";

const label = 20;
const stackedGap = 12;
const besideGap = 25;

function metrics(width: number, height: number): GridAreaMetrics {
  return { width, height, gapPx: stackedGap, labelAllowancePx: label };
}

function dimensions(width: number, height: number) {
  return { width, height, labelAllowancePx: label };
}

describe("maxSquareGridSize", () => {
  it("sizes side-by-side from width or height", () => {
    expect(maxSquareGridSize(dimensions(820, 336), true, besideGap)).toBe(316);
    expect(maxSquareGridSize(dimensions(400, 800), true, besideGap)).toBe(187.5);
  });

  it("sizes stacked from width or split height", () => {
    expect(maxSquareGridSize(dimensions(676, 850), false, stackedGap)).toBe(399);
    expect(maxSquareGridSize(dimensions(300, 900), false, stackedGap)).toBe(300);
  });
});

describe("preferSideBySideLayout", () => {
  it("prefers stacked when taller than wide", () => {
    expect(preferSideBySideLayout(metrics(676, 850))).toBe(false);
  });

  it("prefers side-by-side in landscape phone play area", () => {
    expect(preferSideBySideLayout(metrics(820, 336))).toBe(true);
  });

  it("prefers stacked on tie", () => {
    const tied = dimensions(460, 500);
    expect(maxSquareGridSize(tied, false, stackedGap)).toBe(224);
    expect(maxSquareGridSize(tied, true, stackedGap)).toBe(224);
    expect(preferSideBySideLayout(metrics(460, 500))).toBe(false);
  });
});
