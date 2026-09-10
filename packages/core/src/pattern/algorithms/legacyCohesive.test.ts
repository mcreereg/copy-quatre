import { describe, expect, it } from "vitest";
import { density, hasAnyOn } from "../../grid.js";
import { createRng } from "../../rng.js";
import { isConnected } from "../shared/components.js";
import { generateLegacyCohesivePattern } from "./legacyCohesive.js";

describe("legacy cohesive pattern", () => {
  it("generates valid pattern", () => {
    const grid = generateLegacyCohesivePattern(4, createRng(456));
    expect(hasAnyOn(grid)).toBe(true);
    expect(density(grid)).toBeGreaterThanOrEqual(0.25);
    expect(density(grid)).toBeLessThanOrEqual(0.65);
    expect(isConnected(grid)).toBe(true);
  });

  it("works for small grids", () => {
    for (let seed = 0; seed < 50; seed++) {
      const grid = generateLegacyCohesivePattern(2, createRng(seed));
      expect(hasAnyOn(grid)).toBe(true);
      expect(density(grid)).toBeGreaterThanOrEqual(0.25);
      expect(density(grid)).toBeLessThanOrEqual(0.65);
    }
  });

  it("stays connected for many seeds", () => {
    for (let seed = 0; seed < 200; seed++) {
      const grid = generateLegacyCohesivePattern(10, createRng(seed));
      expect(isConnected(grid)).toBe(true);
      expect(density(grid)).toBeGreaterThanOrEqual(0.25);
      expect(density(grid)).toBeLessThanOrEqual(0.65);
    }
  });
});
