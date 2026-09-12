import type { Grid } from "@copy-quatre/core";
import { useCallback, useEffect, useRef, useState } from "react";

export const CELL_IGNITE_BRIGHT_MS = 100;
export const CELL_IGNITE_FADE_MS = 100;
export const CELL_IGNITE_FADE_DELAY_MS = CELL_IGNITE_BRIGHT_MS / 2;
export const CELL_EXTINGUISH_MS = 100;
export const CELL_SERPENTINE_FAIL_EXTINGUISH_MS = 1000;

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
  longExtinguishKeys?: ReadonlySet<string>;
};

function extinguishDurationMs(key: string, longExtinguishKeys?: ReadonlySet<string>): number {
  return longExtinguishKeys?.has(key)
    ? CELL_SERPENTINE_FAIL_EXTINGUISH_MS
    : CELL_EXTINGUISH_MS;
}

export function useCellToggleAnims(
  grid: Grid,
  flags: CellToggleAnimFlags,
): {
  igniteKeys: ReadonlySet<string>;
  extinguishKeys: ReadonlySet<string>;
  slowExtinguishKeys: ReadonlySet<string>;
  cancelExtinguish: (key: string) => void;
} {
  const { ignite: igniteEnabled, extinguish: extinguishEnabled, longExtinguishKeys } = flags;
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

  const cancelExtinguish = useCallback((key: string) => {
    const timeoutId = timeoutsRef.current.get(key);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutsRef.current.delete(key);
    }
    setAnim((current) => {
      if (!current.extinguish.has(key)) return current;
      const extinguish = new Set(current.extinguish);
      extinguish.delete(key);
      return { ...current, extinguish };
    });
  }, []);

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
      const durationMs = extinguishDurationMs(key, longExtinguishKeys);
      const id = window.setTimeout(() => {
        timeoutsRef.current.delete(key);
        setAnim((current) => {
          if (!current.extinguish.has(key)) return current;
          const extinguish = new Set(current.extinguish);
          extinguish.delete(key);
          return { ...current, extinguish };
        });
      }, durationMs);
      timeoutsRef.current.set(key, id);
    }

    for (const [key, id] of timeoutsRef.current) {
      if (extinguishKeys.has(key)) continue;
      window.clearTimeout(id);
      timeoutsRef.current.delete(key);
    }
  }, [extinguishEnabled, extinguishKeys, longExtinguishKeys]);

  const slowExtinguishKeys = new Set(
    [...extinguishKeys].filter((key) => longExtinguishKeys?.has(key)),
  );

  return { igniteKeys, extinguishKeys, slowExtinguishKeys, cancelExtinguish };
}
