import { describe, expect, it } from "vitest";
import { density, gridHash, hasAnyOn } from "../grid.js";
import { createRng } from "../rng.js";
import { generateCohesivePattern, generateCohesivePatternUnique } from "./cohesive.js";

describe("cohesive pattern", () => {
  it("generates valid pattern", () => {
    const rng = createRng(456);
    const grid = generateCohesivePattern(4, rng);
    expect(hasAnyOn(grid)).toBe(true);
    expect(density(grid)).toBeGreaterThanOrEqual(0.25);
    expect(density(grid)).toBeLessThanOrEqual(0.65);
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
      expect(density(grid)).toBeLessThanOrEqual(0.65);
    }
  });

  it("works for large grids", () => {
    const grid = generateCohesivePattern(10, createRng(2));
    expect(hasAnyOn(grid)).toBe(true);
  });

  it("stays connected for many seeds", () => {
    function components(grid: ReturnType<typeof generateCohesivePattern>): number {
      const size = grid.length;
      const seen = new Set<string>();
      let count = 0;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!grid[r][c]) continue;
          const start = `${r},${c}`;
          if (seen.has(start)) continue;
          count++;
          const queue = [{ r, c }];
          seen.add(start);
          while (queue.length) {
            const { r: cr, c: cc } = queue.pop()!;
            for (const [nr, nc] of [
              [cr - 1, cc],
              [cr + 1, cc],
              [cr, cc - 1],
              [cr, cc + 1],
            ]) {
              if (nr < 0 || nc < 0 || nr >= size || nc >= size || !grid[nr][nc]) continue;
              const key = `${nr},${nc}`;
              if (seen.has(key)) continue;
              seen.add(key);
              queue.push({ r: nr, c: nc });
            }
          }
        }
      }
      return count;
    }

    for (let seed = 0; seed < 200; seed++) {
      const grid = generateCohesivePattern(10, createRng(seed));
      expect(components(grid)).toBeLessThanOrEqual(1);
      expect(density(grid)).toBeGreaterThanOrEqual(0.25);
      expect(density(grid)).toBeLessThanOrEqual(0.65);
    }
  });
});
