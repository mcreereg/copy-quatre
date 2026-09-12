import { describe, expect, it } from "vitest";
import { createGrid } from "../../grid.js";
import { isPathGraph, onDegree } from "./pathGraph.js";

function gridFromRows(rows: string[]): ReturnType<typeof createGrid> {
  const size = rows.length;
  const grid = createGrid(size);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      grid[row][col] = rows[row][col] === "1";
    }
  }
  return grid;
}

describe("pathGraph", () => {
  it("counts orthogonal ON neighbors", () => {
    const grid = gridFromRows(["11", "00"]);
    expect(onDegree(grid, 0, 0)).toBe(1);
    expect(onDegree(grid, 0, 1)).toBe(1);
  });

  it("accepts a straight line", () => {
    expect(isPathGraph(gridFromRows(["111"]))).toBe(true);
  });

  it("accepts an L shape", () => {
    expect(
      isPathGraph(
        gridFromRows([
          "100",
          "100",
          "110",
        ]),
      ),
    ).toBe(true);
  });

  it("accepts a single ON cell", () => {
    expect(isPathGraph(gridFromRows(["10", "00"]))).toBe(true);
  });

  it("rejects T junctions", () => {
    expect(
      isPathGraph(
        gridFromRows([
          "010",
          "111",
          "010",
        ]),
      ),
    ).toBe(false);
  });

  it("rejects disconnected fragments", () => {
    expect(
      isPathGraph(
        gridFromRows([
          "10",
          "01",
        ]),
      ),
    ).toBe(false);
  });

  it("rejects all-off grids", () => {
    expect(isPathGraph(gridFromRows(["00", "00"]))).toBe(false);
  });
});
