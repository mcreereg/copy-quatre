import { describe, expect, it } from "vitest";
import { density, gridHash, hasAnyOn } from "../grid.js";
import { createRng } from "../rng.js";
import { countComponents } from "./shared/components.js";
import { generateCohesivePattern, generateCohesivePatternUnique } from "./cohesive.js";

describe("cohesive pattern", () => {
  it("generates valid pattern", () => {
    const rng = createRng(456);
    const grid = generateCohesivePattern(4, rng);
    expect(hasAnyOn(grid)).toBe(true);
    expect(density(grid)).toBeGreaterThanOrEqual(0.25);
    expect(density(grid)).toBeLessThanOrEqual(0.75);
  });

  it("avoids immediate repeat when possible", () => {
    const rng = createRng(789);
    const first = generateCohesivePattern(4, rng);
    const hash = gridHash(first);
    const second = generateCohesivePatternUnique(4, rng, hash);
    expect(gridHash(second)).not.toBe(hash);
  });

  it("works for small grids", () => {
    for (let seed = 0; seed < 50; seed++) {
      const grid = generateCohesivePattern(2, createRng(seed));
      expect(hasAnyOn(grid)).toBe(true);
      expect(density(grid)).toBeGreaterThanOrEqual(0.25);
      expect(density(grid)).toBeLessThanOrEqual(0.75);
    }
  });

  it("works for large grids", () => {
    const grid = generateCohesivePattern(10, createRng(2));
    expect(hasAnyOn(grid)).toBe(true);
  });

  it("respects worm-walk component limits for many seeds", () => {
    for (let seed = 0; seed < 200; seed++) {
      const grid = generateCohesivePattern(10, createRng(seed));
      expect(countComponents(grid)).toBeLessThanOrEqual(4);
      expect(density(grid)).toBeGreaterThanOrEqual(0.25);
      expect(density(grid)).toBeLessThanOrEqual(0.75);
    }
  });
});
