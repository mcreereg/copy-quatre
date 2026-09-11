import { describe, expect, it } from "vitest";
import {
  maxSquareGridSize,
  preferSideBySideLayout,
  type GridAreaMetrics,
} from "./gridLayout.js";

const label = 20;
const gap = 12;

function metrics(width: number, height: number): GridAreaMetrics {
  return { width, height, gapPx: gap, labelAllowancePx: label };
}

describe("maxSquareGridSize", () => {
  it("sizes side-by-side from width or height", () => {
    expect(maxSquareGridSize(metrics(820, 336), true)).toBe(316);
    expect(maxSquareGridSize(metrics(400, 800), true)).toBe(194);
  });

  it("sizes stacked from width or split height", () => {
    expect(maxSquareGridSize(metrics(676, 850), false)).toBe(399);
    expect(maxSquareGridSize(metrics(300, 900), false)).toBe(300);
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
    const tied = metrics(460, 500);
    expect(maxSquareGridSize(tied, false)).toBe(224);
    expect(maxSquareGridSize(tied, true)).toBe(224);
    expect(preferSideBySideLayout(tied)).toBe(false);
  });
});
