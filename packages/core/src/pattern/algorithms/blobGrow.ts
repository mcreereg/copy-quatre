import { createGrid, isInBounds } from "../../grid.js";
import type { Rng } from "../../rng.js";
import type { Grid } from "../../types.js";
import { countOnGrid, removeIsolated } from "../shared/components.js";
import {
  DEFAULT_SYMMETRY_WEIGHTS,
  mirrorPositions,
  pickSymmetry,
  setSymmetric,
  type Symmetry,
} from "../shared/symmetry.js";
import { shouldAcceptPattern } from "../shared/validation.js";
import {
  COMPONENT_PARAMS,
  DENSITY_PARAMS,
  paramNumber,
  resolveParams,
  desc,
  type AlgorithmDefinition,
  type AlgorithmParams,
} from "./types.js";

const MAX_ATTEMPTS = 8;

function growBlob(
  size: number,
  sym: Symmetry,
  rng: Rng,
  fillChance: number,
  minDensity: number,
  maxDensity: number,
): Grid {
  const grid = createGrid(size);
  const used = new Set<string>();

  const r = rng.nextInt(0, Math.floor(size / 2));
  const c = rng.nextInt(0, Math.floor(size / 2));
  setSymmetric(grid, r, c, sym, true);
  for (const pos of mirrorPositions(size, r, c, sym)) {
    used.add(`${pos.r},${pos.c}`);
  }

  const queue: Array<{ r: number; c: number }> = [];
  for (const key of used) {
    const [qr, qc] = key.split(",").map(Number);
    queue.push({ r: qr, c: qc });
  }

  const targetOn = Math.round(size * size * (minDensity + rng.next() * (maxDensity - minDensity)));
  let attempts = 0;
  const maxGrowAttempts = size * size * 4;

  while (countOnGrid(grid) < targetOn && attempts < maxGrowAttempts) {
    attempts++;
    if (queue.length === 0) break;
    const idx = rng.nextInt(0, queue.length - 1);
    const { r: cr, c: cc } = queue[idx];

    const dirs = rng.shuffle([
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ]);

    for (const { dr, dc } of dirs) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (!isInBounds(grid, nr, nc)) continue;
      if (rng.next() < fillChance) {
        setSymmetric(grid, nr, nc, sym, true);
        for (const pos of mirrorPositions(size, nr, nc, sym)) {
          const k = `${pos.r},${pos.c}`;
          if (!used.has(k)) {
            used.add(k);
            queue.push(pos);
          }
        }
      }
    }
  }

  removeIsolated(grid);
  return grid;
}

function makeFallback(size: number): Grid {
  const grid = createGrid(size);
  const mid = Math.floor(size / 2);
  grid[mid][mid] = true;
  if (size > 1) grid[mid][Math.min(mid + 1, size - 1)] = true;
  return grid;
}

export function generateBlobGrow(size: number, rng: Rng, params: AlgorithmParams = {}): Grid {
  const p = resolveParams(blobGrowAlgorithm.params, params);
  const fillChance = paramNumber(p, "fillChance");
  const minDensity = paramNumber(p, "minDensity");
  const maxDensity = paramNumber(p, "maxDensity");
  const maxComponents = paramNumber(p, "maxComponents");
  const preferredMaxComponents = paramNumber(p, "preferredMaxComponents");
  const validation = { minDensity, maxDensity, maxComponents };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const sym = pickSymmetry(rng, DEFAULT_SYMMETRY_WEIGHTS);
    const grid = growBlob(size, sym, rng, fillChance, minDensity, maxDensity);
    if (shouldAcceptPattern(grid, validation, attempt, MAX_ATTEMPTS, preferredMaxComponents)) {
      return grid;
    }
  }

  return makeFallback(size);
}

export const blobGrowAlgorithm: AlgorithmDefinition = {
  id: "blob-grow",
  name: "Blob grow",
  description: "Symmetric frontier expansion producing compact blob shapes.",
  params: [
    {
      key: "fillChance",
      label: "Fill chance",
      type: "number",
      default: 0.7,
      min: 0.1,
      max: 1,
      step: 0.05,
      description: desc(
        "Probability of turning on each neighbor during frontier expansion. Higher values produce denser blobs.",
        "0.55–0.80",
      ),
    },
    ...DENSITY_PARAMS,
    ...COMPONENT_PARAMS,
  ],
  generate: generateBlobGrow,
};
