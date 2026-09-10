import { describe, expect, it } from "vitest";
import { hasAnyOn } from "../../grid.js";
import { createRng } from "../../rng.js";
import { generateWormWalk } from "./wormWalk.js";

describe("worm walk", () => {
  it("falls back when density constraints cannot be met", () => {
    const large = generateWormWalk(5, createRng(1), {
      minDensity: 2,
      maxDensity: 2,
    });
    expect(hasAnyOn(large)).toBe(true);

    const tiny = generateWormWalk(2, createRng(1), {
      minDensity: 2,
      maxDensity: 2,
    });
    expect(hasAnyOn(tiny)).toBe(true);
  });
});
