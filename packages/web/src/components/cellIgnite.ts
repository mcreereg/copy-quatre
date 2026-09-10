import type { Grid } from "@copy-quatre/core";
import { useState } from "react";

export const CELL_IGNITE_BRIGHT_MS = 100;
export const CELL_IGNITE_FADE_MS = 100;
export const CELL_IGNITE_FADE_DELAY_MS = CELL_IGNITE_BRIGHT_MS / 2;

const EMPTY_KEYS: ReadonlySet<string> = new Set();

export function cellIgniteKey(row: number, col: number): string {
  return `${row}-${col}`;
}

export function nextIgniteKeys(
  prev: Grid,
  next: Grid,
  prevKeys: ReadonlySet<string>,
): Set<string> {
  const keys = new Set<string>();
  for (const key of prevKeys) {
    const sep = key.indexOf("-");
    const row = Number(key.slice(0, sep));
    const col = Number(key.slice(sep + 1));
    if (next[row]?.[col]) keys.add(key);
  }
  for (let row = 0; row < next.length; row++) {
    for (let col = 0; col < next[row].length; col++) {
      if (next[row][col] && !prev[row]?.[col]) {
        keys.add(cellIgniteKey(row, col));
      }
    }
  }
  return keys;
}

export function useIgniteKeys(grid: Grid, enabled: boolean): ReadonlySet<string> {
  const [ignite, setIgnite] = useState<{ grid: Grid; keys: Set<string> }>(() => ({
    grid,
    keys: new Set(),
  }));

  if (!enabled) return EMPTY_KEYS;

  if (ignite.grid === grid) return ignite.keys;

  const keys = nextIgniteKeys(ignite.grid, grid, ignite.keys);
  setIgnite({ grid, keys });
  return keys;
}
