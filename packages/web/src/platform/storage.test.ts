import { DEFAULT_SETTINGS } from "@copy-quatre/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPreferencesMock } from "../test/mocks/preferences";

vi.mock("@capacitor/preferences", () => import("../test/mocks/preferences"));

import { loadHighScores, loadSettings, saveHighScores, saveSettings } from "./storage";

describe("storage", () => {
  beforeEach(() => {
    resetPreferencesMock();
  });

  it("loads defaults when empty", async () => {
    await expect(loadSettings(DEFAULT_SETTINGS)).resolves.toEqual(DEFAULT_SETTINGS);
    await expect(loadHighScores()).resolves.toEqual({});
  });

  it("persists settings and high scores", async () => {
    const settings = { ...DEFAULT_SETTINGS, gridSize: 6 };
    await expect(saveSettings(settings)).resolves.toBe(true);
    await expect(loadSettings(DEFAULT_SETTINGS)).resolves.toEqual(settings);

    const scores = { "cohesive:4:90": 5 };
    await expect(saveHighScores(scores)).resolves.toBe(true);
    await expect(loadHighScores()).resolves.toEqual(scores);
  });

  it("returns fallback on corrupt settings json", async () => {
    const { Preferences } = await import("../test/mocks/preferences");
    await Preferences.set({ key: "copy-quatre:settings", value: "{bad" });
    await expect(loadSettings(DEFAULT_SETTINGS)).resolves.toEqual(DEFAULT_SETTINGS);
  });
});
