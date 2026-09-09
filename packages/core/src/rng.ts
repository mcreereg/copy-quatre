export type Rng = {
  next: () => number;
  nextInt: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: T[]) => T[];
};

/** Mulberry32 seeded PRNG — deterministic for tests. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const nextInt = (min: number, max: number): number => {
    if (min > max) {
      throw new RangeError(`min (${min}) must be <= max (${max})`);
    }
    return Math.floor(next() * (max - min + 1)) + min;
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new RangeError("Cannot pick from empty array");
    }
    return items[nextInt(0, items.length - 1)];
  };

  const shuffle = <T>(items: T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = nextInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  return { next, nextInt, pick, shuffle };
}
