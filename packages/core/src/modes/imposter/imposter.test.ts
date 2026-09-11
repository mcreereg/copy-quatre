import { describe, expect, it, vi } from "vitest";
import { cloneGrid, countOn, gridsEqual, toggleCell } from "../../grid.js";
import { createRng } from "../../rng.js";
import { resolveSessionSettings, DEFAULT_SETTINGS } from "../../settings.js";
import {
  getImposterToggleBounds,
  sampleImposterShiftCount,
  sampleImposterToggleCount,
} from "./budget.js";
import {
  coordinateKey,
  isImposterToggleEligible,
  listImposterToggleCandidates,
} from "./boundary.js";
import { generateImposterRound } from "./generate.js";
import { validateImposterGrid } from "./validation.js";
import * as shiftModule from "./shift.js";
import {
  applyChunkShift,
  getMaxChunkEdge,
  isValidChunkShift,
  listValidChunkShifts,
  sampleAndApplyChunkShift,
} from "./shift.js";

const TOGGLE_BOUNDS: Record<number, { min: number; max: number }> = {
  2: { min: 1, max: 1 },
  3: { min: 1, max: 2 },
  4: { min: 1, max: 4 },
  5: { min: 2, max: 5 },
  6: { min: 2, max: 7 },
  7: { min: 2, max: 9 },
  8: { min: 3, max: 10 },
  9: { min: 3, max: 12 },
  10: { min: 3, max: 13 },
};

function asciiToGrid(rows: string[]): boolean[][] {
  return rows.map((row) => [...row].map((ch) => ch === "o"));
}

describe("imposter toggle bounds", () => {
  for (const [size, bounds] of Object.entries(TOGGLE_BOUNDS)) {
    it(`size ${size} has bounds ${bounds.min}-${bounds.max}`, () => {
      expect(getImposterToggleBounds(Number(size))).toEqual(bounds);
    });
  }

  it("rejects invalid sizes", () => {
    expect(() => getImposterToggleBounds(1)).toThrow(RangeError);
    expect(() => getImposterToggleBounds(11)).toThrow(RangeError);
  });

  it("samples endpoints with controlled rng", () => {
    const rngMin = createRng(1);
    rngMin.nextInt = () => 1;
    expect(sampleImposterToggleCount(4, rngMin)).toBe(1);

    const rngMax = createRng(1);
    rngMax.nextInt = () => 4;
    expect(sampleImposterToggleCount(4, rngMax)).toBe(4);
  });
});

describe("imposter shift count sampling", () => {
  it("size 2 always zero", () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(sampleImposterShiftCount(2, createRng(seed))).toBe(0);
    }
  });

  it("size 3 maps 1-75 to zero and 76-100 to one", () => {
    const rng0 = createRng(1);
    rng0.nextInt = () => 75;
    expect(sampleImposterShiftCount(3, rng0)).toBe(0);
    const rng1 = createRng(1);
    rng1.nextInt = () => 76;
    expect(sampleImposterShiftCount(3, rng1)).toBe(1);
  });

  it("size 4 maps 1-50 to zero and 51-100 to one", () => {
    const rng0 = createRng(1);
    rng0.nextInt = () => 50;
    expect(sampleImposterShiftCount(4, rng0)).toBe(0);
    const rng1 = createRng(1);
    rng1.nextInt = () => 51;
    expect(sampleImposterShiftCount(4, rng1)).toBe(1);
  });

  it("size 8+ uses equal 25% buckets", () => {
    const cases: [number, 0 | 1 | 2 | 3][] = [
      [25, 0],
      [26, 1],
      [50, 1],
      [51, 2],
      [75, 2],
      [76, 3],
    ];
    for (const [roll, expected] of cases) {
      const rng = createRng(1);
      rng.nextInt = () => roll;
      expect(sampleImposterShiftCount(8, rng)).toBe(expected);
    }
  });
});

describe("imposter toggle eligibility", () => {
  const mixed: boolean[][] = [
    [true, true, false],
    [true, false, false],
    [false, false, false],
  ];

  it("center with mixed neighbors is eligible", () => {
    expect(isImposterToggleEligible(mixed, 0, 1)).toBe(true);
  });

  it("all same neighbors is ineligible", () => {
    const grid = [
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ];
    expect(isImposterToggleEligible(grid, 1, 1)).toBe(false);
  });

  it("diagonal differences alone do not qualify", () => {
    const grid = [
      [true, false, false],
      [false, false, false],
      [false, false, true],
    ];
    expect(isImposterToggleEligible(grid, 1, 1)).toBe(false);
  });

  it("lists candidates in row-major order", () => {
    const candidates = listImposterToggleCandidates(mixed);
    expect(candidates.length).toBeGreaterThan(0);
    for (let i = 1; i < candidates.length; i++) {
      const prev = candidates[i - 1];
      const curr = candidates[i];
      expect(prev.row < curr.row || (prev.row === curr.row && prev.col < curr.col)).toBe(true);
    }
  });

  it("excludes used coordinates", () => {
    const excluded = new Set([coordinateKey(0, 1)]);
    const candidates = listImposterToggleCandidates(mixed, excluded);
    expect(candidates.some((c) => c.row === 0 && c.col === 1)).toBe(false);
  });
});

describe("chunk shift", () => {
  it("computes max edge", () => {
    expect(getMaxChunkEdge(2)).toBe(1);
    expect(getMaxChunkEdge(4)).toBe(2);
    expect(getMaxChunkEdge(5)).toBe(3);
    expect(getMaxChunkEdge(10)).toBe(5);
  });

  it("rejects oversized chunk on 4x4", () => {
    const grid = asciiToGrid(["oooo", "..oo", "..o.", "...."]);
    expect(() => listValidChunkShifts(grid, 2, 3)).toThrow(RangeError);
  });

  it("applies approved 5x5 west shift fixture", () => {
    const target = asciiToGrid([
      "ooooo",
      "..ooo",
      "..oo.",
      ".....",
      ".....",
    ]);
    const expectedInteractive = asciiToGrid([
      "ooooo",
      ".ooo.",
      ".oo..",
      ".....",
      ".....",
    ]);
    const shift = {
      sourceRow: 1,
      sourceCol: 2,
      height: 2,
      width: 3,
      direction: "west" as const,
    };
    expect(isValidChunkShift(target, shift)).toBe(true);
    const result = applyChunkShift(target, shift);
    expect(result).toEqual(expectedInteractive);
  });

  it("throws InvalidChunkShiftError for invalid move", () => {
    const grid = asciiToGrid([
      "oo..",
      "....",
      "....",
      "....",
    ]);
    const shift = {
      sourceRow: 0,
      sourceCol: 0,
      height: 1,
      width: 1,
      direction: "east" as const,
    };
    expect(() => applyChunkShift(grid, shift)).toThrow(shiftModule.InvalidChunkShiftError);
  });

  it("preserves on count and does not mutate input", () => {
    const grid = asciiToGrid(["oooo", "..oo", "..o.", "...."]);
    const before = cloneGrid(grid);
    const shift = listValidChunkShifts(grid, 1, 1)[0];
    const result = applyChunkShift(grid, shift);
    expect(countOn(result)).toBe(countOn(grid));
    expect(grid).toEqual(before);
  });

  it("samples dimension before placement", () => {
    const grid = asciiToGrid([
      "ooooo",
      "o...o",
      "o...o",
      "o...o",
      "ooooo",
    ]);
    const heights: number[] = [];
    for (let seed = 0; seed < 50; seed++) {
      const rng = createRng(seed);
      const result = sampleAndApplyChunkShift(grid, rng);
      expect(result).not.toBeNull();
      heights.push(result!.shift.height);
    }
    expect(new Set(heights).size).toBeGreaterThan(1);
  });
});

describe("imposter validation", () => {
  it("rejects malformed grids", () => {
    expect(() => validateImposterGrid([])).toThrow(RangeError);
    expect(() => validateImposterGrid([[true], [true, false]])).toThrow(RangeError);
    expect(() => validateImposterGrid([[1 as unknown as boolean]])).toThrow(TypeError);
  });
});

describe("generateImposterRound", () => {
  const session = resolveSessionSettings(DEFAULT_SETTINGS, "imposter");

  it("returns unequal grids with metadata matching requested counts", () => {
    const round = generateImposterRound({ settings: session, rng: createRng(42) });
    expect(gridsEqual(round.reference, round.interactive)).toBe(false);
    expect(round.metadata.toggledCells).toHaveLength(round.metadata.toggleCount);
    expect(round.metadata.shifts).toHaveLength(round.metadata.shiftCount);
  });

  it("is deterministic for same seed", () => {
    const a = generateImposterRound({ settings: session, rng: createRng(99) });
    const b = generateImposterRound({ settings: session, rng: createRng(99) });
    expect(a).toEqual(b);
  });

  it("is solvable by symmetric difference toggles", () => {
    const round = generateImposterRound({ settings: session, rng: createRng(123) });
    let interactive = cloneGrid(round.interactive);
    for (let r = 0; r < round.reference.length; r++) {
      for (let c = 0; c < round.reference[r].length; c++) {
        if (round.reference[r][c] !== interactive[r][c]) {
          interactive = toggleCell(interactive, r, c);
        }
      }
    }
    expect(gridsEqual(interactive, round.reference)).toBe(true);
  });

  it("uses deterministic fallback when random shifts fail", () => {
    vi.spyOn(shiftModule, "sampleAndApplyChunkShift").mockReturnValue(null);
    const round = generateImposterRound({ settings: session, rng: createRng(42) });
    expect(gridsEqual(round.reference, round.interactive)).toBe(false);
    vi.restoreAllMocks();
  });

  it("property corpus never returns identity and preserves invariants", () => {
    for (const gridSize of [2, 3, 4, 5, 6]) {
      for (const patternStyle of ["cohesive", "chaos"] as const) {
        for (let seed = 0; seed < 50; seed++) {
          const settings = resolveSessionSettings({
            ...DEFAULT_SETTINGS,
            modes: {
              copy: { timeLimitSec: 90, gridSize, patternStyle },
              imposter: { timeLimitSec: 90, gridSize, patternStyle },
            },
          });
          const round = generateImposterRound({ settings, rng: createRng(seed) });
          expect(gridsEqual(round.reference, round.interactive)).toBe(false);
          expect(round.metadata.toggledCells).toHaveLength(round.metadata.toggleCount);
          expect(round.metadata.shifts).toHaveLength(round.metadata.shiftCount);
        }
      }
    }
  });
});
