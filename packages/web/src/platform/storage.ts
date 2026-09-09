import { Preferences } from "@capacitor/preferences";
import type { HighScoreStore, Settings } from "@copy-quatre/core";

const SETTINGS_KEY = "copy-quatre:settings";
const HIGH_SCORES_KEY = "copy-quatre:high-scores";

async function readItem(key: string): Promise<string | null> {
  const { value } = await Preferences.get({ key });
  return value;
}

async function writeItem(key: string, value: string): Promise<boolean> {
  try {
    await Preferences.set({ key, value });
    return true;
  } catch {
    return false;
  }
}

export async function loadSettings(fallback: Settings): Promise<Settings> {
  try {
    const raw = await readItem(SETTINGS_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export async function saveSettings(settings: Settings): Promise<boolean> {
  return writeItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadHighScores(): Promise<HighScoreStore> {
  try {
    const raw = await readItem(HIGH_SCORES_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveHighScores(store: HighScoreStore): Promise<boolean> {
  return writeItem(HIGH_SCORES_KEY, JSON.stringify(store));
}
