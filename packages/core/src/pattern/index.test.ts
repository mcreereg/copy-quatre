import { describe, expect, it, vi } from "vitest";
import { allOff, gridHash, hasAnyOn } from "../grid.js";
import { createRng } from "../rng.js";
import * as chaos from "./chaos.js";
import * as cohesive from "./cohesive.js";
import { generatePattern } from "./index.js";

describe("generatePattern", () => {
  it("generates chaos pattern", () => {
    const grid = generatePattern("chaos", 4, createRng(1));
    expect(hasAnyOn(grid)).toBe(true);
  });

  it("generates cohesive pattern", () => {
    const grid = generatePattern("cohesive", 4, createRng(2));
    expect(hasAnyOn(grid)).toBe(true);
  });

  it("avoids repeat hash", () => {
    const rng = createRng(33);
    const first = generatePattern("chaos", 4, rng);
    const second = generatePattern("chaos", 4, rng, gridHash(first));
    expect(gridHash(second)).not.toBe(gridHash(first));
  });

  it("returns last attempt when avoidHash retries exhaust", () => {
    const fixed = allOff(4);
    fixed[0][0] = true;
    const hash = gridHash(fixed);
    vi.spyOn(chaos, "generateChaosPattern").mockReturnValue(fixed);
    const grid = generatePattern("chaos", 4, createRng(1), hash);
    expect(grid).toEqual(fixed);
    vi.restoreAllMocks();
  });

  it("uses cohesive generator for cohesive style", () => {
    vi.spyOn(cohesive, "generateCohesivePatternUnique").mockReturnValue(allOff(3));
    const grid = generatePattern("cohesive", 3, createRng(1));
    expect(grid).toHaveLength(3);
    vi.restoreAllMocks();
  });

  it("returns last cohesive attempt when avoidHash retries exhaust", () => {
    const fixed = allOff(4);
    fixed[0][0] = true;
    const hash = gridHash(fixed);
    vi.spyOn(cohesive, "generateCohesivePatternUnique").mockReturnValue(fixed);
    const grid = generatePattern("cohesive", 4, createRng(1), hash);
    expect(grid).toEqual(fixed);
    vi.restoreAllMocks();
  });
});
