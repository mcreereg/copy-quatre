import { describe, expect, it } from "vitest";
import {
  countExtraAdjacencyEdges,
  countPathSideAdjacencies,
  extractPathFromGrid,
  gridPathSideAdjacencies,
  isAdjacent,
  pathCellNeighbors,
} from "./pathSideAdjacency.js";
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

  it("returns zero extra edges for single cell or empty grid", () => {
    const single = createGrid(2);
    single[0][0] = true;
    expect(countExtraAdjacencyEdges(single)).toBe(0);
    expect(countExtraAdjacencyEdges(createGrid(2))).toBe(0);
  });

  it("extracts a simple path from grid endpoints", () => {
    const grid = createGrid(3);
    grid[0][0] = true;
    grid[0][1] = true;
    grid[0][2] = true;
    expect(extractPathFromGrid(grid)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
  });

  it("returns empty path for closed loops without endpoints", () => {
    const grid = createGrid(2);
    grid[0][0] = true;
    grid[0][1] = true;
    grid[1][0] = true;
    grid[1][1] = true;
    expect(extractPathFromGrid(grid)).toEqual([]);
  });

  it("counts side adjacency from extracted line path", () => {
    const grid = createGrid(3);
    grid[0][0] = true;
    grid[0][1] = true;
    grid[0][2] = true;
    expect(gridPathSideAdjacencies(grid)).toBe(0);
  });

  it("returns empty path when grid has no endpoints", () => {
    const grid = createGrid(2);
    expect(extractPathFromGrid(grid)).toEqual([]);
  });

  it("stops extraction when path cannot reach all ON cells", () => {
    const grid = createGrid(2);
    grid[0][0] = true;
    grid[0][1] = true;
    grid[1][1] = true;
    expect(extractPathFromGrid(grid)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
    ]);
  });

  it("checks orthogonal adjacency between path cells", () => {
    expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(false);
  });

  it("lists ON neighbors excluding skipped cells", () => {
    const grid = createGrid(3);
    grid[1][1] = true;
    grid[1][0] = true;
    grid[1][2] = true;
    grid[0][1] = true;
    const center = { row: 1, col: 1 };
    expect(pathCellNeighbors(grid, center)).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 2 },
    ]);
    expect(pathCellNeighbors(grid, center, [{ row: 1, col: 0 }])).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 2 },
    ]);
  });
});
