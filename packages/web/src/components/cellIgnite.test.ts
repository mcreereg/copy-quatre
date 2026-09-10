import { allOff } from "@copy-quatre/core";
import { describe, expect, it } from "vitest";
import {
  CELL_EXTINGUISH_MS,
  CELL_IGNITE_BRIGHT_MS,
  CELL_IGNITE_FADE_DELAY_MS,
  CELL_IGNITE_FADE_MS,
  cellIgniteKey,
  nextExtinguishKeys,
  nextIgniteKeys,
} from "./cellIgnite.js";

function gridWithOn(size: number, cells: Array<[number, number]>) {
  const grid = allOff(size);
  for (const [r, c] of cells) {
    grid[r][c] = true;
  }
  return grid;
}

describe("nextIgniteKeys", () => {
  it("starts theme fade when bright is halfway to edge", () => {
    expect(CELL_IGNITE_BRIGHT_MS).toBe(100);
    expect(CELL_IGNITE_FADE_MS).toBe(100);
    expect(CELL_IGNITE_FADE_DELAY_MS).toBe(50);
  });

  it("adds keys for cells that turn on", () => {
    const keys = nextIgniteKeys(allOff(2), gridWithOn(2, [[0, 1], [1, 0]]), new Set());
    expect(keys).toEqual(new Set(["0-1", "1-0"]));
  });

  it("keeps ignite keys while cells stay on", () => {
    const prev = gridWithOn(2, [[0, 0]]);
    const next = gridWithOn(2, [[0, 0], [0, 1]]);
    const keys = nextIgniteKeys(prev, next, new Set(["0-0"]));
    expect(keys).toEqual(new Set(["0-0", "0-1"]));
  });

  it("drops keys when cells turn off", () => {
    const keys = nextIgniteKeys(
      gridWithOn(2, [[0, 0], [1, 1]]),
      gridWithOn(2, [[1, 1]]),
      new Set(["0-0", "1-1"]),
    );
    expect(keys).toEqual(new Set(["1-1"]));
  });

  it("ignores already-on cells when previous keys are empty", () => {
    const on = gridWithOn(2, [[0, 0]]);
    const keys = nextIgniteKeys(on, on, new Set());
    expect(keys.size).toBe(0);
  });

  it("builds cell keys as row-col", () => {
    expect(cellIgniteKey(3, 4)).toBe("3-4");
  });
});

describe("nextExtinguishKeys", () => {
  it("shrinks theme over 100ms", () => {
    expect(CELL_EXTINGUISH_MS).toBe(100);
  });

  it("adds keys for cells that turn off", () => {
    const keys = nextExtinguishKeys(
      gridWithOn(2, [[0, 1], [1, 0]]),
      allOff(2),
      new Set(),
    );
    expect(keys).toEqual(new Set(["0-1", "1-0"]));
  });

  it("keeps extinguish keys while cells stay off", () => {
    const keys = nextExtinguishKeys(
      allOff(2),
      gridWithOn(2, [[0, 1]]),
      new Set(["0-0"]),
    );
    expect(keys).toEqual(new Set(["0-0"]));
  });

  it("drops keys when cells turn back on", () => {
    const keys = nextExtinguishKeys(
      allOff(2),
      gridWithOn(2, [[0, 0]]),
      new Set(["0-0"]),
    );
    expect(keys.size).toBe(0);
  });

  it("ignores already-off cells when previous keys are empty", () => {
    const keys = nextExtinguishKeys(allOff(2), allOff(2), new Set());
    expect(keys.size).toBe(0);
  });
});
