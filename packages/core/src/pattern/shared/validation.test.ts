import { describe, expect, it } from "vitest";
import { createGrid } from "../../grid.js";
import { isValidPattern, shouldAcceptPattern } from "./validation.js";

describe("validation", () => {
  it("rejects empty and out-of-range density", () => {
    const empty = createGrid(4);
    expect(isValidPattern(empty, { minDensity: 0.25, maxDensity: 0.65 })).toBe(false);

    const sparse = createGrid(4);
    sparse[0][0] = true;
    expect(isValidPattern(sparse, { minDensity: 0.25, maxDensity: 0.65 })).toBe(false);

    const full = createGrid(2);
    full[0][0] = full[0][1] = full[1][0] = full[1][1] = true;
    expect(isValidPattern(full, { minDensity: 0.25, maxDensity: 0.65 })).toBe(false);
  });

  it("checks connectivity when required", () => {
    const disconnected = createGrid(3);
    disconnected[0][0] = true;
    disconnected[0][2] = true;
    expect(
      isValidPattern(disconnected, {
        minDensity: 0.2,
        maxDensity: 0.5,
        requireConnected: true,
      }),
    ).toBe(false);

    const connected = createGrid(3);
    connected[1][0] = connected[1][1] = connected[1][2] = true;
    expect(
      isValidPattern(connected, { minDensity: 0.2, maxDensity: 0.5, requireConnected: true }),
    ).toBe(true);
  });

  it("checks max components", () => {
    const grid = createGrid(3);
    grid[0][0] = true;
    grid[2][2] = true;
    expect(
      isValidPattern(grid, { minDensity: 0.2, maxDensity: 0.5, maxComponents: 1 }),
    ).toBe(false);
    expect(
      isValidPattern(grid, { minDensity: 0.2, maxDensity: 0.5, maxComponents: 2 }),
    ).toBe(true);
  });

  it("accepts valid patterns without component limits", () => {
    const grid = createGrid(2);
    grid[0][0] = grid[1][1] = true;
    expect(isValidPattern(grid, { minDensity: 0.25, maxDensity: 0.75 })).toBe(true);
  });

  it("shouldAcceptPattern defers high component count to late attempts", () => {
    const grid = createGrid(4);
    grid[0][0] = true;
    grid[3][3] = true;
    grid[0][3] = true;
    grid[3][0] = true;
    const options = { minDensity: 0.2, maxDensity: 0.5, maxComponents: 4 };

    expect(shouldAcceptPattern(grid, options, 0, 8, 2)).toBe(false);
    expect(shouldAcceptPattern(grid, options, 6, 8, 2)).toBe(true);
  });

  it("shouldAcceptPattern skips preferred check when undefined", () => {
    const grid = createGrid(4);
    grid[0][0] = true;
    grid[3][3] = true;
    grid[0][3] = true;
    grid[3][0] = true;
    expect(
      shouldAcceptPattern(
        grid,
        { minDensity: 0.2, maxDensity: 0.5, maxComponents: 4 },
        0,
        8,
      ),
    ).toBe(true);
  });
});
