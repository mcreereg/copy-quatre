import { Preferences } from "@capacitor/preferences";
import {
  validateHighScoreStore,
  validateSettings,
  type HighScoreStore,
  type Settings,
} from "@copy-quatre/core";

const SETTINGS_KEY = "copy-quatre:settings";
const HIGH_SCORES_KEY = "copy-quatre:high-scores";
const DATA_GENERATION_KEY = "copy-quatre:data-generation";
const CURRENT_DATA_GENERATION = "2";

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

async function removeItem(key: string): Promise<void> {
  await Preferences.remove({ key });
}

export async function initializeDataGeneration(): Promise<void> {
  const marker = await readItem(DATA_GENERATION_KEY);
  if (marker === CURRENT_DATA_GENERATION) {
    return;
  }

  try {
    await removeItem(SETTINGS_KEY);
    await removeItem(HIGH_SCORES_KEY);
    await writeItem(DATA_GENERATION_KEY, CURRENT_DATA_GENERATION);
  } catch {
    throw new Error("Couldn't initialize game data.");
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await readItem(SETTINGS_KEY);
    if (!raw) {
      return validateSettings(undefined);
    }
    return validateSettings(JSON.parse(raw));
  } catch {
    return validateSettings(undefined);
  }
}

export async function saveSettings(settings: Settings): Promise<boolean> {
  return writeItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadHighScores(): Promise<HighScoreStore> {
  try {
    const raw = await readItem(HIGH_SCORES_KEY);
    if (!raw) return {};
    return validateHighScoreStore(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function saveHighScores(store: HighScoreStore): Promise<boolean> {
  return writeItem(HIGH_SCORES_KEY, JSON.stringify(store));
}

export {
  CURRENT_DATA_GENERATION,
  DATA_GENERATION_KEY,
  HIGH_SCORES_KEY,
  SETTINGS_KEY,
};
