import type { HighScoreStore, Settings } from "@copy-quatre/core";

const SETTINGS_KEY = "copy-quatre:settings";
const HIGH_SCORES_KEY = "copy-quatre:high-scores";

export function loadSettings(fallback: Settings): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadHighScores(): HighScoreStore {
  try {
    const raw = localStorage.getItem(HIGH_SCORES_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveHighScores(store: HighScoreStore): void {
  localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(store));
}
