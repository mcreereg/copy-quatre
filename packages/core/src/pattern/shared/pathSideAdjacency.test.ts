import { describe, expect, it } from "vitest";
import { countExtraAdjacencyEdges, countPathSideAdjacencies } from "./pathSideAdjacency.js";
import { createGrid } from "../../grid.js";

describe("path side adjacency", () => {
  it("counts a 2x2 fold-back", () => {
    const path = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
      { row: 1, col: 0 },
    ];
    expect(countPathSideAdjacencies(path)).toBe(1);
  });

  it("counts extra adjacency for a 2x2 block", () => {
    const grid = createGrid(2);
    grid[0][0] = true;
    grid[0][1] = true;
    grid[1][0] = true;
    grid[1][1] = true;
    expect(countExtraAdjacencyEdges(grid)).toBe(1);
  });

  it("counts zero for a straight line", () => {
    const path = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ];
    expect(countPathSideAdjacencies(path)).toBe(0);
  });
});
