import { describe, expect, it } from "vitest";
import { density, hasAnyOn } from "../grid.js";
import {
  PATTERN_ALGORITHMS,
  RANDOM_PATGEN_SEED,
  getAlgorithm,
  resolvePatgenSeed,
  runPatgenBatch,
} from "./patgen.js";
import { countComponents } from "./shared/components.js";

describe("patgen registry", () => {
  it("has unique algorithm ids", () => {
    const ids = PATTERN_ALGORITHMS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("looks up algorithms by id", () => {
    expect(getAlgorithm("legacy-cohesive")?.name).toMatch(/legacy/i);
    expect(getAlgorithm("missing")).toBeUndefined();
  });

  it("generates reproducible batches", () => {
    const a = runPatgenBatch({
      algorithmId: "morphology-mix",
      gridSize: 6,
      count: 4,
      seed: 99,
    });
    const b = runPatgenBatch({
      algorithmId: "morphology-mix",
      gridSize: 6,
      count: 4,
      seed: 99,
    });
    expect(a.grids).toEqual(b.grids);
    expect(a.seed).toBe(99);
  });

  it("resolves random seed sentinel", () => {
    expect(resolvePatgenSeed(42)).toBe(42);
    const random = resolvePatgenSeed(RANDOM_PATGEN_SEED);
    expect(random).toBeGreaterThanOrEqual(0);
    expect(random).toBeLessThan(999_999_999);
  });

  it("uses a resolved seed for random batches", () => {
    const result = runPatgenBatch({
      algorithmId: "morphology-mix",
      gridSize: 6,
      count: 2,
      seed: RANDOM_PATGEN_SEED,
    });
    expect(result.seed).toBeGreaterThanOrEqual(0);
    expect(result.grids).toHaveLength(2);
  });
});

describe("patgen algorithms", () => {
  for (const algo of PATTERN_ALGORITHMS) {
    it(`${algo.id} produces valid patterns`, () => {
      const { grids } = runPatgenBatch({
        algorithmId: algo.id,
        gridSize: 8,
        count: 5,
        seed: 7,
      });
      expect(grids).toHaveLength(5);
      for (const grid of grids) {
        expect(hasAnyOn(grid)).toBe(true);
        expect(density(grid)).toBeGreaterThan(0);
        expect(countComponents(grid)).toBeGreaterThan(0);
      }
    });
  }
});
