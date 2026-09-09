import { describe, expect, it, vi } from "vitest";
import { density, hasAnyOn } from "../grid.js";
import { createRng } from "../rng.js";
import { generateChaosPattern } from "./chaos.js";

describe("chaos pattern", () => {
  it("generates valid pattern", () => {
    const rng = createRng(123);
    const grid = generateChaosPattern(4, rng);
    expect(grid).toHaveLength(4);
    expect(hasAnyOn(grid)).toBe(true);
    expect(density(grid)).toBeGreaterThanOrEqual(0.25);
    expect(density(grid)).toBeLessThanOrEqual(0.65);
  });

  it("is deterministic", () => {
    const a = generateChaosPattern(5, createRng(77));
    const b = generateChaosPattern(5, createRng(77));
    expect(a).toEqual(b);
  });

  it("never all off", () => {
    for (let seed = 0; seed < 20; seed++) {
      const grid = generateChaosPattern(3, createRng(seed));
      expect(hasAnyOn(grid)).toBe(true);
    }
  });

  it("uses fallback when random attempts keep failing", () => {
    const rng = createRng(1);
    vi.spyOn(rng, "next").mockReturnValue(0);
    const grid = generateChaosPattern(4, rng);
    expect(hasAnyOn(grid)).toBe(true);
    expect(density(grid)).toBeGreaterThanOrEqual(0.25);
  });
});
