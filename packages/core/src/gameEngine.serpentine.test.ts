import { describe, expect, it } from "vitest";
import { allOff, gridsEqual } from "./grid.js";
import { createGameEngine } from "./gameEngine.js";
import { createRng } from "./rng.js";
import { DEFAULT_SETTINGS, resolveSessionSettings } from "./settings.js";
import type { CellCoordinate } from "./types.js";

const serpentineSession = resolveSessionSettings(DEFAULT_SETTINGS, "serpentine");

function tracePath(
  engine: ReturnType<typeof createGameEngine>,
  path: CellCoordinate[],
): ReturnType<typeof engine.dispatch> {
  let events: ReturnType<typeof engine.dispatch> = [];
  if (path.length === 0) return events;
  events = engine.dispatch({ type: "POINTER_DOWN", row: path[0].row, col: path[0].col });
  for (let i = 1; i < path.length; i++) {
    events = engine.dispatch({
      type: "POINTER_ENTER",
      row: path[i].row,
      col: path[i].col,
    });
  }
  return events;
}

function findPathCoveringOnCells(grid: boolean[][]): CellCoordinate[] {
  const onCells: CellCoordinate[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col]) onCells.push({ row, col });
    }
  }
  if (onCells.length <= 1) return onCells;

  const key = (c: CellCoordinate) => `${c.row},${c.col}`;
  const onSet = new Set(onCells.map(key));
  const neighbors = (c: CellCoordinate): CellCoordinate[] => {
    const result: CellCoordinate[] = [];
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const next = { row: c.row + dr, col: c.col + dc };
      if (onSet.has(key(next))) result.push(next);
    }
    return result;
  };

  const start = onCells.find((c) => neighbors(c).length === 1) ?? onCells[0];
  const path: CellCoordinate[] = [start];
  const visited = new Set([key(start)]);
  let current = start;

  while (path.length < onCells.length) {
    const next = neighbors(current).find((c) => !visited.has(key(c)));
    if (!next) break;
    path.push(next);
    visited.add(key(next));
    current = next;
  }

  return path;
}

describe("gameEngine serpentine", () => {
  it("starts with empty interactive and no stroke path", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: serpentineSession });
    const state = engine.getState();
    expect(state.settings.mode).toBe("serpentine");
    expect(state.interactive.every((row) => row.every((cell) => !cell))).toBe(true);
    expect(state.strokePath).toEqual([]);
  });

  it("builds a path on drag", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: serpentineSession });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    engine.dispatch({ type: "POINTER_ENTER", row: 0, col: 1 });
    const state = engine.getState();
    expect(state.interactive[0][0]).toBe(true);
    expect(state.interactive[0][1]).toBe(true);
    expect(state.strokePath).toEqual([{ row: 0, col: 0 }, { row: 0, col: 1 }]);
  });

  it("backtracks one cell at a time", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: serpentineSession });
    tracePath(engine, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
    engine.dispatch({ type: "POINTER_ENTER", row: 0, col: 1 });
    const state = engine.getState();
    expect(state.interactive[0][2]).toBe(false);
    expect(state.strokePath).toEqual([{ row: 0, col: 0 }, { row: 0, col: 1 }]);
  });

  it("ignores non-adjacent enters", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: serpentineSession });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    engine.dispatch({ type: "POINTER_ENTER", row: 1, col: 1 });
    expect(engine.getState().interactive[1][1]).toBe(false);
  });

  it("ignores pointer down while stroke active", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: serpentineSession });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    engine.dispatch({ type: "POINTER_DOWN", row: 1, col: 1 });
    expect(engine.getState().interactive[1][1]).toBe(false);
    expect(engine.getState().strokePath).toEqual([{ row: 0, col: 0 }]);
  });

  it("emits STROKE_FAILED and resets on incomplete lift", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: serpentineSession });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    const events = engine.dispatch({ type: "POINTER_UP" });
    expect(events.some((event) => event.type === "STROKE_FAILED")).toBe(true);
    expect(engine.getState().interactive.every((row) => row.every((cell) => !cell))).toBe(true);
    expect(engine.getState().strokePath).toEqual([]);
  });

  it("scores when path matches reference during drag", () => {
    const engine = createGameEngine(createRng(200));
    engine.dispatch({ type: "START", settings: serpentineSession });
    const ref = engine.getState().reference;
    const path = findPathCoveringOnCells(ref);
    const events = tracePath(engine, path);
    expect(events.some((event) => event.type === "SCORED")).toBe(true);
    expect(engine.getState().score).toBe(1);
  });

  it("scores on single-cell reference with tap", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({
      type: "START",
      settings: { ...serpentineSession, gridSize: 2 },
    });

    let target: CellCoordinate | null = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      engine.dispatch({ type: "START", settings: { ...serpentineSession, gridSize: 2 } });
      const ref = engine.getState().reference;
      const onCount = ref.flat().filter(Boolean).length;
      if (onCount === 1) {
        for (let row = 0; row < ref.length; row++) {
          for (let col = 0; col < ref[row].length; col++) {
            if (ref[row][col]) target = { row, col };
          }
        }
        break;
      }
    }

    expect(target).not.toBeNull();
    if (!target) return;

    const events = engine.dispatch({ type: "POINTER_DOWN", row: target.row, col: target.col });
    expect(events.some((event) => event.type === "SCORED")).toBe(true);
  });

  it("emits STROKE_FAILED on wrong path at lift", () => {
    const engine = createGameEngine(createRng(300));
    engine.dispatch({ type: "START", settings: serpentineSession });
    const ref = engine.getState().reference;
    let offCell: CellCoordinate | null = null;
    for (let row = 0; row < ref.length; row++) {
      for (let col = 0; col < ref[row].length; col++) {
        if (!ref[row][col]) {
          offCell = { row, col };
          break;
        }
      }
      if (offCell) break;
    }
    expect(offCell).not.toBeNull();
    if (!offCell) return;

    engine.dispatch({ type: "POINTER_DOWN", row: offCell.row, col: offCell.col });
    const events = engine.dispatch({ type: "POINTER_UP" });
    const failed = events.find((event) => event.type === "STROKE_FAILED");
    expect(failed?.type).toBe("STROKE_FAILED");
    if (failed?.type === "STROKE_FAILED") {
      expect(failed.turnedOffCells).toEqual([offCell]);
    }
  });

  it("allows new stroke after failure", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: serpentineSession });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    engine.dispatch({ type: "POINTER_UP" });
    engine.dispatch({ type: "POINTER_DOWN", row: 1, col: 1 });
    expect(engine.getState().interactive[1][1]).toBe(true);
  });

  it("clears stroke path after scored round", () => {
    const engine = createGameEngine(createRng(400));
    engine.dispatch({ type: "START", settings: serpentineSession });
    const ref = engine.getState().reference;
    tracePath(engine, findPathCoveringOnCells(ref));
    expect(engine.getState().strokePath).toEqual([]);
    expect(gridsEqual(engine.getState().reference, allOff(ref.length))).toBe(false);
  });
});
