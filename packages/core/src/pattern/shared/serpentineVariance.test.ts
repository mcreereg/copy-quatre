import { describe, expect, it } from "vitest";
import { createRng } from "../../rng.js";
import { generateSerpentinePattern } from "../algorithms/serpentine.js";
import { evaluateSerpentineVariance, fingerprintSerpentineGrid } from "./serpentineVariance.js";

describe("serpentine variance", () => {
  it("reports high style diversity on 5x5 pools", () => {
    const sampleCount = 100;
    const grids = Array.from({ length: sampleCount }, (_, seed) =>
      generateSerpentinePattern(5, createRng(seed)),
    );
    const fingerprints = grids.map((grid) => fingerprintSerpentineGrid(grid));
    const report = evaluateSerpentineVariance(fingerprints, grids);

    expect(report.uniqueHashRate).toBeGreaterThan(0.65);
    expect(report.compactnessSpread).toBeGreaterThan(0.08);
    expect(report.featureSpread).toBeGreaterThan(0.12);
    expect(report.meanNormalizedHamming).toBeGreaterThan(0.12);
  });
});
