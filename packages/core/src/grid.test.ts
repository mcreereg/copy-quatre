import { describe, expect, it } from "vitest";
import {
  allOff,
  cloneGrid,
  countOn,
  createGrid,
  density,
  gridHash,
  gridsEqual,
  hasAnyOn,
  isInBounds,
  setCell,
  toggleCell,
} from "./grid.js";

describe("grid", () => {
  it("creates grid with fill", () => {
    const g = createGrid(3, true);
    expect(g).toHaveLength(3);
    expect(g[0]).toEqual([true, true, true]);
  });

  it("rejects invalid size", () => {
    expect(() => createGrid(0)).toThrow(RangeError);
    expect(() => createGrid(1.5)).toThrow(RangeError);
  });

  it("allOff creates all false", () => {
    const g = allOff(2);
    expect(hasAnyOn(g)).toBe(false);
  });

  it("cloneGrid copies without sharing rows", () => {
    const original = allOff(2);
    original[0][0] = true;
    const copy = cloneGrid(original);
    copy[0][0] = false;
    expect(original[0][0]).toBe(true);
  });

  it("isInBounds", () => {
    const g = allOff(3);
    expect(isInBounds(g, 0, 0)).toBe(true);
    expect(isInBounds(g, 2, 2)).toBe(true);
    expect(isInBounds(g, 3, 0)).toBe(false);
    expect(isInBounds(g, -1, 0)).toBe(false);
  });

  it("toggleCell flips value", () => {
    const g = allOff(2);
    const t = toggleCell(g, 0, 1);
    expect(t[0][1]).toBe(true);
    expect(g[0][1]).toBe(false);
  });

  it("toggleCell throws out of bounds", () => {
    expect(() => toggleCell(allOff(2), 2, 0)).toThrow(RangeError);
  });

  it("setCell sets value", () => {
    const g = setCell(allOff(2), 1, 0, true);
    expect(g[1][0]).toBe(true);
  });

  it("setCell throws out of bounds", () => {
    expect(() => setCell(allOff(2), -1, 0, true)).toThrow(RangeError);
  });

  it("gridsEqual compares grids", () => {
    const a = allOff(2);
    const b = toggleCell(a, 0, 0);
    expect(gridsEqual(a, a)).toBe(true);
    expect(gridsEqual(a, b)).toBe(false);
    expect(gridsEqual(a, allOff(3))).toBe(false);
  });

  it("gridHash is stable", () => {
    const g = toggleCell(allOff(2), 1, 1);
    expect(gridHash(g)).toBe("00|01");
  });

  it("countOn and density", () => {
    const g = toggleCell(toggleCell(allOff(4), 0, 0), 1, 1);
    expect(countOn(g)).toBe(2);
    expect(density(g)).toBe(0.125);
  });
});
