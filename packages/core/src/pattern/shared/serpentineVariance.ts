import { countOn, gridHash } from "../../grid.js";
import type { Grid } from "../../types.js";
import { pathCompactness } from "../algorithms/serpentine.js";
import { countExtraAdjacencyEdges, countPathSideAdjacencies, type PathCell } from "./pathSideAdjacency.js";

export type SerpentineFingerprint = {
  hash: string;
  compactness: number;
  extraEdges: number;
  sideAdj: number;
  bboxAspect: number;
  centroidRow: number;
  centroidCol: number;
  onCount: number;
};

export type SerpentineVarianceReport = {
  sampleCount: number;
  uniqueHashCount: number;
  uniqueHashRate: number;
  compactnessSpread: number;
  meanNormalizedHamming: number;
  featureSpread: number;
};

function gridCentroid(grid: Grid): { row: number; col: number } {
  let sumRow = 0;
  let sumCol = 0;
  let on = 0;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (!grid[row][col]) continue;
      sumRow += row;
      sumCol += col;
      on++;
    }
  }
  if (on === 0) return { row: 0, col: 0 };
  return { row: sumRow / on, col: sumCol / on };
}

function bboxAspect(grid: Grid): number {
  let minRow = grid.length;
  let maxRow = 0;
  let minCol = grid.length;
  let maxCol = 0;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (!grid[row][col]) continue;
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }
  }
  const h = maxRow - minRow + 1;
  const w = maxCol - minCol + 1;
  if (h === 0 || w === 0) return 1;
  return h >= w ? h / w : w / h;
}

export function fingerprintSerpentineGrid(grid: Grid, path?: PathCell[]): SerpentineFingerprint {
  const centroid = gridCentroid(grid);
  return {
    hash: gridHash(grid),
    compactness: pathCompactness(grid),
    extraEdges: countExtraAdjacencyEdges(grid),
    sideAdj: path ? countPathSideAdjacencies(path) : 0,
    bboxAspect: bboxAspect(grid),
    centroidRow: centroid.row,
    centroidCol: centroid.col,
    onCount: countOn(grid),
  };
}

export function normalizedHamming(a: Grid, b: Grid): number {
  const size = a.length;
  let diff = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (a[row][col] !== b[row][col]) diff++;
    }
  }
  return diff / (size * size);
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function featureVector(fp: SerpentineFingerprint): number[] {
  const sizeHint = Math.sqrt(fp.onCount / Math.max(fp.compactness, 0.01));
  return [
    fp.compactness,
    fp.extraEdges / 8,
    fp.bboxAspect / 3,
    fp.centroidRow / Math.max(sizeHint, 1),
    fp.centroidCol / Math.max(sizeHint, 1),
    fp.onCount / 25,
  ];
}

function featureDistance(a: SerpentineFingerprint, b: SerpentineFingerprint): number {
  const va = featureVector(a);
  const vb = featureVector(b);
  let sum = 0;
  for (let i = 0; i < va.length; i++) {
    sum += (va[i] - vb[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/** Evaluate how visually distinct a batch of serpentine patterns is. */
export function evaluateSerpentineVariance(
  fingerprints: SerpentineFingerprint[],
  grids?: Grid[],
): SerpentineVarianceReport {
  const sampleCount = fingerprints.length;
  const uniqueHashCount = new Set(fingerprints.map((fp) => fp.hash)).size;
  const uniqueHashRate = sampleCount === 0 ? 0 : uniqueHashCount / sampleCount;
  const compactnessSpread = stdDev(fingerprints.map((fp) => fp.compactness));

  let meanNormalizedHamming = 0;
  if (grids && grids.length > 1) {
    let pairs = 0;
    let total = 0;
    for (let i = 0; i < grids.length; i++) {
      for (let j = i + 1; j < grids.length; j++) {
        total += normalizedHamming(grids[i], grids[j]);
        pairs++;
      }
    }
    meanNormalizedHamming = pairs === 0 ? 0 : total / pairs;
  }

  let featureTotal = 0;
  let featurePairs = 0;
  for (let i = 0; i < fingerprints.length; i++) {
    for (let j = i + 1; j < fingerprints.length; j++) {
      featureTotal += featureDistance(fingerprints[i], fingerprints[j]);
      featurePairs++;
    }
  }
  const featureSpread = featurePairs === 0 ? 0 : featureTotal / featurePairs;

  return {
    sampleCount,
    uniqueHashCount,
    uniqueHashRate,
    compactnessSpread,
    meanNormalizedHamming,
    featureSpread,
  };
}
