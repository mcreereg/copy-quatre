import type { Grid } from "../../types.js";
import { isInBounds } from "../../grid.js";
import { onDegree } from "./pathGraph.js";

export type PathCell = { row: number; col: number };

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

/** Orthogonal ON-neighbor pairs whose path indices differ by more than 1. */
export function countPathSideAdjacencies(path: PathCell[]): number {
  const index = new Map<string, number>();
  path.forEach((cell, i) => index.set(`${cell.row},${cell.col}`, i));

  let pairs = 0;
  for (let i = 0; i < path.length; i++) {
    for (const { dr, dc } of DIRECTIONS) {
      const j = index.get(`${path[i].row + dr},${path[i].col + dc}`);
      if (j !== undefined && j - i > 1) pairs++;
    }
  }
  return pairs;
}

export function extractPathFromGrid(grid: Grid): PathCell[] {
  const size = grid.length;
  const endpoints: PathCell[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] && onDegree(grid, row, col) === 1) {
        endpoints.push({ row, col });
      }
    }
  }
  if (endpoints.length === 0) return [];

  const path: PathCell[] = [endpoints[0]];
  const seen = new Set([`${path[0].row},${path[0].col}`]);

  while (path.length < grid.flat().filter(Boolean).length) {
    const tail = path[path.length - 1];
    let extended = false;
    for (const { dr, dc } of DIRECTIONS) {
      const nr = tail.row + dr;
      const nc = tail.col + dc;
      const key = `${nr},${nc}`;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size || !grid[nr][nc] || seen.has(key)) {
        continue;
      }
      path.push({ row: nr, col: nc });
      seen.add(key);
      extended = true;
      break;
    }
    if (!extended) break;
  }

  return path;
}

export function gridPathSideAdjacencies(grid: Grid): number {
  return countPathSideAdjacencies(extractPathFromGrid(grid));
}

/** ON-cell adjacency edges beyond the n-1 required by a simple path. */
export function countExtraAdjacencyEdges(grid: Grid): number {
  const size = grid.length;
  let onCount = 0;
  let edges = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!grid[row][col]) continue;
      onCount++;
      if (col + 1 < size && grid[row][col + 1]) edges++;
      if (row + 1 < size && grid[row + 1][col]) edges++;
    }
  }

  if (onCount <= 1) return 0;
  return edges - (onCount - 1);
}

export function isAdjacent(a: PathCell, b: PathCell): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function pathCellNeighbors(
  grid: Grid,
  cell: PathCell,
  exclude: PathCell[] = [],
): PathCell[] {
  const skip = new Set(exclude.map((c) => `${c.row},${c.col}`));
  const neighbors: PathCell[] = [];
  for (const { dr, dc } of DIRECTIONS) {
    const nr = cell.row + dr;
    const nc = cell.col + dc;
    if (!isInBounds(grid, nr, nc) || !grid[nr][nc] || skip.has(`${nr},${nc}`)) continue;
    neighbors.push({ row: nr, col: nc });
  }
  return neighbors;
}
