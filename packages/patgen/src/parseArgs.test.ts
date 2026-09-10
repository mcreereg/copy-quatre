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

  it("parses random seed sentinel", () => {
    const opts = parseCliArgs(["--seed", "-1"]);
    expect(opts.seed).toBe(-1);
  });

  it("parses worm-walk params", () => {
    const opts = parseCliArgs([
      "--algorithm",
      "worm-walk",
      "--stringy-momentum",
      "0.85",
      "--min-density",
      "0.3",
    ]);
    expect(opts.params.stringyMomentum).toBe(0.85);
    expect(opts.params.minDensity).toBe(0.3);
  });
});
