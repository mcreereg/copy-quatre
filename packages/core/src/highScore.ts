import type { HighScoreStore, Settings } from "./types.js";

export function makeHighScoreKey(settings: Settings): string {
  return `${settings.patternStyle}:${settings.gridSize}:${settings.timeLimitSec}`;
}

export function parseHighScoreKey(key: string): {
  patternStyle: string;
  gridSize: number;
  timeLimitSec: number;
} | null {
  const parts = key.split(":");
  if (parts.length !== 3) return null;
  const gridSize = Number(parts[1]);
  const timeLimitSec = Number(parts[2]);
  if (!Number.isInteger(gridSize) || !Number.isInteger(timeLimitSec)) return null;
  return { patternStyle: parts[0], gridSize, timeLimitSec };
}

export function getHighScore(store: HighScoreStore, settings: Settings): number {
  const key = makeHighScoreKey(settings);
  return store[key] ?? 0;
}

export function updateHighScore(
  store: HighScoreStore,
  settings: Settings,
  score: number,
): { store: HighScoreStore; isHighScore: boolean } {
  const key = makeHighScoreKey(settings);
  const current = store[key] ?? 0;
  if (score <= current) {
    return { store, isHighScore: false };
  }
  return {
    store: { ...store, [key]: score },
    isHighScore: true,
  };
}

export function listHighScores(store: HighScoreStore): Array<{
  key: string;
  score: number;
  patternStyle: string;
  gridSize: number;
  timeLimitSec: number;
}> {
  return Object.entries(store)
    .map(([key, score]) => {
      const parsed = parseHighScoreKey(key);
      if (!parsed) return null;
      return { key, score, ...parsed };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => b.score - a.score);
}
