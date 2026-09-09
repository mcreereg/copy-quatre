import { describe, expect, it } from "vitest";
import { gridHash, hasAnyOn } from "../grid.js";
import { createRng } from "../rng.js";
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
});
