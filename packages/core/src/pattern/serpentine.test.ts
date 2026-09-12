import { describe, expect, it, vi } from "vitest";
import { density, gridHash, hasAnyOn } from "../grid.js";
import { createRng } from "../rng.js";
import * as serpentineAlgo from "./algorithms/serpentine.js";
import { isPathGraph } from "./shared/pathGraph.js";
import { generateSerpentinePatternUnique } from "./serpentine.js";

const GRID_SIZES = [2, 3, 4, 6, 8, 10];

describe("serpentine pattern", () => {
  it("generates valid path pattern", () => {
    const grid = generateSerpentinePatternUnique(4, createRng(456));
    expect(hasAnyOn(grid)).toBe(true);
    expect(density(grid)).toBeGreaterThanOrEqual(0.25);
    expect(density(grid)).toBeLessThanOrEqual(0.75);
    expect(isPathGraph(grid)).toBe(true);
  });

  it("avoids immediate repeat when possible", () => {
    const rng = createRng(789);
    const first = generateSerpentinePatternUnique(4, rng);
    const hash = gridHash(first);
    const second = generateSerpentinePatternUnique(4, rng, hash);
    expect(gridHash(second)).not.toBe(hash);
  });

  it("returns a pattern when avoidHash is omitted", () => {
    const grid = generateSerpentinePatternUnique(4, createRng(12));
    expect(hasAnyOn(grid)).toBe(true);
    expect(isPathGraph(grid)).toBe(true);
  });

  it("returns last attempt when unique retries exhaust", () => {
    const fixed = generateSerpentinePatternUnique(4, createRng(1));
    vi.spyOn(serpentineAlgo, "generateSerpentinePattern").mockReturnValue(fixed);
    const grid = generateSerpentinePatternUnique(4, createRng(1), gridHash(fixed));
    expect(grid).toEqual(fixed);
    vi.restoreAllMocks();
  });

  for (const size of GRID_SIZES) {
    it(`produces path graphs for many seeds at size ${size}`, () => {
      const seedCount = size <= 3 ? 50 : 200;
      for (let seed = 0; seed < seedCount; seed++) {
        const grid = generateSerpentinePatternUnique(size, createRng(seed));
        expect(hasAnyOn(grid)).toBe(true);
        expect(density(grid)).toBeGreaterThanOrEqual(0.25);
        expect(density(grid)).toBeLessThanOrEqual(0.75);
        expect(isPathGraph(grid)).toBe(true);
      }
    });
  }

  it("falls back when walk attempts exhaust", () => {
    const grid = serpentineAlgo.generateSerpentinePattern(4, createRng(99), {
      maxAttempts: 0,
    });
    expect(hasAnyOn(grid)).toBe(true);
    expect(isPathGraph(grid)).toBe(true);
  });
});
