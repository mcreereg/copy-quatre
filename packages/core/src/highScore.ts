import { isGameModeId } from "./modes/registry.js";
import {
  GRID_SIZE_MAX,
  GRID_SIZE_MIN,
  PATTERN_STYLES,
  TIME_LIMIT_MAX,
  TIME_LIMIT_MIN,
  TIME_LIMIT_STEP,
} from "./settings.js";
import type { GameModeId, HighScoreStore, SessionSettings } from "./types.js";

export function makeHighScoreKey(settings: SessionSettings): string {
  return `${settings.mode}:${settings.patternStyle}:${settings.gridSize}:${settings.timeLimitSec}`;
}

export function parseHighScoreKey(key: string): {
  mode: GameModeId;
  patternStyle: string;
  gridSize: number;
  timeLimitSec: number;
} | null {
  const parts = key.split(":");
  if (parts.length !== 4) return null;
  if (!isGameModeId(parts[0])) return null;
  if (!(PATTERN_STYLES as readonly string[]).includes(parts[1])) return null;

  const gridSize = Number(parts[2]);
  const timeLimitSec = Number(parts[3]);
  if (
    !Number.isInteger(gridSize) ||
    gridSize < GRID_SIZE_MIN ||
    gridSize > GRID_SIZE_MAX ||
    !Number.isInteger(timeLimitSec) ||
    timeLimitSec < TIME_LIMIT_MIN ||
    timeLimitSec > TIME_LIMIT_MAX ||
    timeLimitSec % TIME_LIMIT_STEP !== 0
  ) {
    return null;
  }

  return {
    mode: parts[0],
    patternStyle: parts[1],
    gridSize,
    timeLimitSec,
  };
}

export function getHighScore(store: HighScoreStore, settings: SessionSettings): number {
  const key = makeHighScoreKey(settings);
  return store[key] ?? 0;
}

export function updateHighScore(
  store: HighScoreStore,
  settings: SessionSettings,
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

export type HighScoreEntry = {
  key: string;
  score: number;
  mode: GameModeId;
  patternStyle: string;
  gridSize: number;
  timeLimitSec: number;
};

const PATTERN_STYLE_ORDER = new Map(PATTERN_STYLES.map((style, index) => [style, index]));

export function listHighScores(store: HighScoreStore): HighScoreEntry[] {
  return Object.entries(store)
    .map(([key, score]) => {
      const parsed = parseHighScoreKey(key);
      if (!parsed || !Number.isFinite(score) || score < 0 || !Number.isInteger(score)) {
        return null;
      }
      return { key, score, ...parsed };
    })
    .filter((e): e is HighScoreEntry => e !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const styleA = PATTERN_STYLE_ORDER.get(a.patternStyle as (typeof PATTERN_STYLES)[number]) ?? 99;
      const styleB = PATTERN_STYLE_ORDER.get(b.patternStyle as (typeof PATTERN_STYLES)[number]) ?? 99;
      if (styleA !== styleB) return styleA - styleB;
      if (a.gridSize !== b.gridSize) return a.gridSize - b.gridSize;
      return a.timeLimitSec - b.timeLimitSec;
    });
}

export function listHighScoresForDisplay(
  store: HighScoreStore,
  sessionSettings: SessionSettings,
): HighScoreEntry[] {
  const entries = listHighScores(store).filter((entry) => entry.mode === sessionSettings.mode);
  if (entries.length > 0) return entries;

  return [
    {
      key: makeHighScoreKey(sessionSettings),
      score: 0,
      mode: sessionSettings.mode,
      patternStyle: sessionSettings.patternStyle,
      gridSize: sessionSettings.gridSize,
      timeLimitSec: sessionSettings.timeLimitSec,
    },
  ];
}

export function validateHighScoreStore(raw: unknown): HighScoreStore {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const store: HighScoreStore = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (parseHighScoreKey(key) === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      continue;
    }
    store[key] = value;
  }
  return store;
}
