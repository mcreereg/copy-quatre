import { DEFAULT_SETTINGS } from "@copy-quatre/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPreferenceOperations,
  getPreferenceOperations,
  resetPreferencesMock,
} from "../test/mocks/preferences";

vi.mock("@capacitor/preferences", () => import("../test/mocks/preferences"));

import {
  CURRENT_DATA_GENERATION,
  DATA_GENERATION_KEY,
  HIGH_SCORES_KEY,
  initializeDataGeneration,
  loadHighScores,
  loadSettings,
  saveHighScores,
  saveSettings,
  SETTINGS_KEY,
} from "./storage";

describe("storage", () => {
  beforeEach(() => {
    resetPreferencesMock();
  });

  it("loads defaults when empty", async () => {
    await initializeDataGeneration();
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    await expect(loadHighScores()).resolves.toEqual({});
  });

  it("persists settings and high scores with four-part keys", async () => {
    await initializeDataGeneration();
    const settings = {
      ...DEFAULT_SETTINGS,
      selectedMode: "imposter" as const,
    };
    await expect(saveSettings(settings)).resolves.toBe(true);
    await expect(loadSettings()).resolves.toEqual(settings);

    const scores = { "imposter:cohesive:4:90": 5 };
    await expect(saveHighScores(scores)).resolves.toBe(true);
    await expect(loadHighScores()).resolves.toEqual(scores);
  });

  it("resets stale data once and writes marker last", async () => {
    const { Preferences } = await import("../test/mocks/preferences");
    await Preferences.set({ key: SETTINGS_KEY, value: JSON.stringify({ gridSize: 6 }) });
    await Preferences.set({ key: HIGH_SCORES_KEY, value: JSON.stringify({ "cohesive:4:90": 5 }) });
    await Preferences.set({ key: DATA_GENERATION_KEY, value: "1" });
    clearPreferenceOperations();

    await initializeDataGeneration();

    expect(getPreferenceOperations()).toEqual([
      `remove:${SETTINGS_KEY}`,
      `remove:${HIGH_SCORES_KEY}`,
      `set:${DATA_GENERATION_KEY}`,
    ]);
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(await loadHighScores()).toEqual({});
  });

  it("leaves data untouched when marker is current", async () => {
    const { Preferences } = await import("../test/mocks/preferences");
    await Preferences.set({ key: DATA_GENERATION_KEY, value: CURRENT_DATA_GENERATION });
    await Preferences.set({
      key: SETTINGS_KEY,
      value: JSON.stringify({ ...DEFAULT_SETTINGS, selectedMode: "imposter" }),
    });
    clearPreferenceOperations();

    await initializeDataGeneration();
    expect(getPreferenceOperations()).toEqual([]);
    expect((await loadSettings()).selectedMode).toBe("imposter");
  });

  it("returns fallback on corrupt settings json", async () => {
    await initializeDataGeneration();
    const { Preferences } = await import("../test/mocks/preferences");
    await Preferences.set({ key: SETTINGS_KEY, value: "{bad" });
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it("drops legacy three-part high score keys on load", async () => {
    await initializeDataGeneration();
    const { Preferences } = await import("../test/mocks/preferences");
    await Preferences.set({
      key: HIGH_SCORES_KEY,
      value: JSON.stringify({ "cohesive:4:90": 5, "copy:cohesive:4:90": 7 }),
    });
    await expect(loadHighScores()).resolves.toEqual({ "copy:cohesive:4:90": 7 });
  });
});
