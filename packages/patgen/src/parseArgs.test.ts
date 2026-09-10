import { describe, expect, it } from "vitest";
import { parseCliArgs } from "./parseArgs.js";

describe("parseCliArgs", () => {
  it("uses defaults", () => {
    const opts = parseCliArgs([]);
    expect(opts.algorithmId).toBe("morphology-mix");
    expect(opts.gridSize).toBe(10);
    expect(opts.count).toBe(16);
    expect(opts.seed).toBe(1);
  });

  it("parses algorithm-specific flags", () => {
    const opts = parseCliArgs([
      "--algorithm",
      "morphology-mix",
      "--blob-weight",
      "0.3",
      "--grid-size",
      "8",
      "--count",
      "2",
    ]);
    expect(opts.params.blobWeight).toBe(0.3);
    expect(opts.gridSize).toBe(8);
    expect(opts.count).toBe(2);
  });

  it("parses number arrays", () => {
    const opts = parseCliArgs([
      "--algorithm",
      "worm-walk",
      "--fragment-weights",
      "10,20,30,40",
    ]);
    expect(opts.params.fragmentWeights).toEqual([10, 20, 30, 40]);
  });
});
