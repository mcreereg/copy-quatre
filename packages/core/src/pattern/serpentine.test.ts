import { describe, expect, it, vi } from "vitest";
import { createGrid, density, gridHash, hasAnyOn } from "../grid.js";
import { createRng } from "../rng.js";
import * as serpentineAlgo from "./algorithms/serpentine.js";
import { pathCompactness } from "./algorithms/serpentine.js";
import { isSerpentineReferenceGrid } from "./shared/pathGraph.js";
import { countExtraAdjacencyEdges } from "./shared/pathSideAdjacency.js";
import { gridToAscii } from "./shared/gridToAscii.js";
import { generateSerpentinePatternUnique } from "./serpentine.js";

const GRID_SIZES = [2, 3, 4, 6, 8, 10];

describe("serpentine pattern", () => {
  it("generates valid path pattern", () => {
    const grid = generateSerpentinePatternUnique(4, createRng(456));
    expect(hasAnyOn(grid)).toBe(true);
    expect(density(grid)).toBeGreaterThanOrEqual(0.25);
    expect(density(grid)).toBeLessThanOrEqual(0.75);
    expect(isSerpentineReferenceGrid(grid)).toBe(true);
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
    expect(isSerpentineReferenceGrid(grid)).toBe(true);
  });

  it("returns last attempt when unique retries exhaust", () => {
    const fixed = generateSerpentinePatternUnique(4, createRng(1));
    vi.spyOn(serpentineAlgo, "generateSerpentinePattern").mockReturnValue(fixed);
    const grid = generateSerpentinePatternUnique(4, createRng(1), gridHash(fixed));
    expect(grid).toEqual(fixed);
    vi.restoreAllMocks();
  });

  for (const size of GRID_SIZES) {
    it(
      `produces path graphs for many seeds at size ${size}`,
      () => {
        const seedCount = size <= 3 ? 50 : size >= 10 ? 50 : 200;
        for (let seed = 0; seed < seedCount; seed++) {
          const grid = generateSerpentinePatternUnique(size, createRng(seed));
          expect(hasAnyOn(grid)).toBe(true);
          expect(density(grid)).toBeGreaterThanOrEqual(0.25);
          expect(density(grid)).toBeLessThanOrEqual(0.75);
          expect(isSerpentineReferenceGrid(grid)).toBe(true);
        }
      },
      size >= 10 ? 45_000 : undefined,
    );
  }

  it("falls back when walk attempts exhaust", () => {
    const grid = serpentineAlgo.generateSerpentinePattern(4, createRng(99), {
      maxAttempts: 0,
    });
    expect(hasAnyOn(grid)).toBe(true);
    expect(isSerpentineReferenceGrid(grid)).toBe(true);
  });

  it("returns corner cell when all fallback growth fails", () => {
    const grid = serpentineAlgo.generateSerpentinePattern(1, createRng(0), {
      maxAttempts: 0,
      minDensity: 0.05,
      maxDensity: 0.95,
    });
    expect(grid).toEqual([[true]]);
  });

  it("2x2 core alone has fold-back contact", () => {
    const path = [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 2 },
      { row: 2, col: 1 },
    ];
    const grid = createGrid(5);
    for (const cell of path) grid[cell.row][cell.col] = true;
    expect(countExtraAdjacencyEdges(grid)).toBe(1);
    expect(isSerpentineReferenceGrid(grid)).toBe(true);
  });

  it("always includes at least one fold-back side contact on 5x5", () => {
    for (let seed = 0; seed < 50; seed++) {
      const grid = serpentineAlgo.generateSerpentinePattern(5, createRng(seed));
      const extra = countExtraAdjacencyEdges(grid);
      expect(extra, `seed ${seed} extra=${extra}\n${gridToAscii(grid)}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("prefers compact hooked blobs over thin snakes", () => {
    const compactnessValues: number[] = [];
    for (let seed = 0; seed < 50; seed++) {
      const grid = serpentineAlgo.generateSerpentinePattern(5, createRng(seed));
      compactnessValues.push(pathCompactness(grid));
    }
    compactnessValues.sort((a, b) => a - b);
    const median = compactnessValues[Math.floor(compactnessValues.length / 2)];
    expect(median).toBeGreaterThan(0.45);
  });
});
