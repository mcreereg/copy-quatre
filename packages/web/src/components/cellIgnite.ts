import type { Grid } from "@copy-quatre/core";
import { useEffect, useRef, useState } from "react";

export const CELL_IGNITE_BRIGHT_MS = 100;
export const CELL_IGNITE_FADE_MS = 100;
export const CELL_IGNITE_FADE_DELAY_MS = CELL_IGNITE_BRIGHT_MS / 2;
export const CELL_EXTINGUISH_MS = 100;

const EMPTY_KEYS: ReadonlySet<string> = new Set();

export function cellIgniteKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function parseCellKey(key: string): [number, number] {
  const sep = key.indexOf("-");
  return [Number(key.slice(0, sep)), Number(key.slice(sep + 1))];
}

export function nextIgniteKeys(
  prev: Grid,
  next: Grid,
  prevKeys: ReadonlySet<string>,
): Set<string> {
  const keys = new Set<string>();
  for (const key of prevKeys) {
    const [row, col] = parseCellKey(key);
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

export function nextExtinguishKeys(
  prev: Grid,
  next: Grid,
  prevKeys: ReadonlySet<string>,
): Set<string> {
  const keys = new Set<string>();
  for (const key of prevKeys) {
    const [row, col] = parseCellKey(key);
    if (!next[row]?.[col]) keys.add(key);
  }
  for (let row = 0; row < next.length; row++) {
    for (let col = 0; col < next[row].length; col++) {
      if (!next[row][col] && prev[row]?.[col]) {
        keys.add(cellIgniteKey(row, col));
      }
    }
  }
  return keys;
}

export type CellToggleAnimFlags = {
  ignite: boolean;
  extinguish: boolean;
};

export function useCellToggleAnims(
  grid: Grid,
  flags: CellToggleAnimFlags,
): { igniteKeys: ReadonlySet<string>; extinguishKeys: ReadonlySet<string> } {
  const { ignite: igniteEnabled, extinguish: extinguishEnabled } = flags;
  const [anim, setAnim] = useState<{
    grid: Grid;
    ignite: Set<string>;
    extinguish: Set<string>;
  }>(() => ({
    grid,
    ignite: new Set(),
    extinguish: new Set(),
  }));
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return () => {
      for (const id of timeoutsRef.current.values()) {
        window.clearTimeout(id);
      }
    };
  }, []);

  let igniteKeys: ReadonlySet<string> = EMPTY_KEYS;
  let extinguishKeys: ReadonlySet<string> = EMPTY_KEYS;

  if (igniteEnabled || extinguishEnabled) {
    if (anim.grid === grid) {
      igniteKeys = igniteEnabled ? anim.ignite : EMPTY_KEYS;
      extinguishKeys = extinguishEnabled ? anim.extinguish : EMPTY_KEYS;
    } else {
      const ignite = igniteEnabled ? nextIgniteKeys(anim.grid, grid, anim.ignite) : new Set<string>();
      const extinguish = extinguishEnabled
        ? nextExtinguishKeys(anim.grid, grid, anim.extinguish)
        : new Set<string>();
      igniteKeys = ignite;
      extinguishKeys = extinguish;
      setAnim({ grid, ignite, extinguish });
    }
  }

  useEffect(() => {
    if (!extinguishEnabled) {
      for (const id of timeoutsRef.current.values()) {
        window.clearTimeout(id);
      }
      timeoutsRef.current.clear();
      return;
    }

    for (const key of extinguishKeys) {
      if (timeoutsRef.current.has(key)) continue;
      const id = window.setTimeout(() => {
        timeoutsRef.current.delete(key);
        setAnim((current) => {
          if (!current.extinguish.has(key)) return current;
          const extinguish = new Set(current.extinguish);
          extinguish.delete(key);
          return { ...current, extinguish };
        });
      }, CELL_EXTINGUISH_MS);
      timeoutsRef.current.set(key, id);
    }

    for (const [key, id] of timeoutsRef.current) {
      if (extinguishKeys.has(key)) continue;
      window.clearTimeout(id);
      timeoutsRef.current.delete(key);
    }
  }, [extinguishEnabled, extinguishKeys]);

  return { igniteKeys, extinguishKeys };
}
