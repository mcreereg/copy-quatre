import { describe, expect, it } from "vitest";
import {
  clampGridSize,
  clampTimeLimitSec,
  cyclePatternStyle,
  cycleTheme,
  DEFAULT_SETTINGS,
  formatTimeLimit,
  stepGridSize,
  stepTimeLimitSec,
  toggleColorMode,
  validateSettings,
} from "./settings.js";

describe("settings", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_SETTINGS.timeLimitSec).toBe(90);
    expect(DEFAULT_SETTINGS.gridSize).toBe(4);
    expect(DEFAULT_SETTINGS.colorMode).toBe("dark");
  });

  it("clamps time limit to step", () => {
    expect(clampTimeLimitSec(45)).toBe(60);
    expect(clampTimeLimitSec(20)).toBe(30);
    expect(clampTimeLimitSec(700)).toBe(600);
  });

  it("steps time limit", () => {
    expect(stepTimeLimitSec(90, 1)).toBe(120);
    expect(stepTimeLimitSec(90, -1)).toBe(60);
  });

  it("clamps grid size", () => {
    expect(clampGridSize(1)).toBe(2);
    expect(clampGridSize(15)).toBe(10);
  });

  it("steps grid size", () => {
    expect(stepGridSize(4, 1)).toBe(5);
    expect(stepGridSize(2, -1)).toBe(2);
  });

  it("cycles pattern style and theme", () => {
    expect(cyclePatternStyle("cohesive")).toBe("chaos");
    expect(cyclePatternStyle("chaos")).toBe("cohesive");
    expect(cycleTheme("yellow")).toBe("cyan");
  });

  it("toggles color mode", () => {
    expect(toggleColorMode("dark")).toBe("light");
    expect(toggleColorMode("light")).toBe("dark");
  });

  it("validates settings", () => {
    const s = validateSettings({ ...DEFAULT_SETTINGS, timeLimitSec: 47, gridSize: 99 });
    expect(s.timeLimitSec).toBe(60);
    expect(s.gridSize).toBe(10);
  });

  it("falls back on invalid enum fields", () => {
    const s = validateSettings({
      ...DEFAULT_SETTINGS,
      patternStyle: "invalid" as typeof DEFAULT_SETTINGS.patternStyle,
      theme: "invalid" as typeof DEFAULT_SETTINGS.theme,
      colorMode: "invalid" as typeof DEFAULT_SETTINGS.colorMode,
    });
    expect(s.patternStyle).toBe("cohesive");
    expect(s.theme).toBe("yellow");
    expect(s.colorMode).toBe("dark");
  });

  it("formats time", () => {
    expect(formatTimeLimit(90)).toBe("1:30");
    expect(formatTimeLimit(30)).toBe("0:30");
  });
});
