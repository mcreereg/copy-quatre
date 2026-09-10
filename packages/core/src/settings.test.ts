import { describe, expect, it } from "vitest";
import type { AnimationId, AnimationSettings } from "./types.js";
import {
  clampGridSize,
  clampTimeLimitSec,
  cyclePatternStyle,
  cycleTheme,
  DEFAULT_ANIMATION_SETTINGS,
  DEFAULT_SETTINGS,
  formatTimeLimit,
  isAnimationActive,
  stepGridSize,
  stepTimeLimitSec,
  toggleColorMode,
  validateAnimationSettings,
  validateSettings,
} from "./settings.js";

const ANIMATION_IDS: AnimationId[] = [
  "lineFlash",
  "flyingTiles",
  "rattlingTiles",
  "cellOnBlink",
  "cellOffBlink",
];

function allAnimationSettingsCombinations(): AnimationSettings[] {
  const combos: AnimationSettings[] = [];
  for (const enabled of [false, true]) {
    for (const lineFlash of [false, true]) {
      for (const flyingTiles of [false, true]) {
        for (const rattlingTiles of [false, true]) {
          for (const cellOnBlink of [false, true]) {
            for (const cellOffBlink of [false, true]) {
              combos.push({
                enabled,
                lineFlash,
                flyingTiles,
                rattlingTiles,
                cellOnBlink,
                cellOffBlink,
              });
            }
          }
        }
      }
    }
  }
  return combos;
}

function formatAnimationSettingsLabel(animations: AnimationSettings): string {
  return `enabled=${animations.enabled},lineFlash=${animations.lineFlash},flyingTiles=${animations.flyingTiles},rattlingTiles=${animations.rattlingTiles},cellOnBlink=${animations.cellOnBlink},cellOffBlink=${animations.cellOffBlink}`;
}

describe("settings", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_SETTINGS.timeLimitSec).toBe(90);
    expect(DEFAULT_SETTINGS.gridSize).toBe(4);
    expect(DEFAULT_SETTINGS.colorMode).toBe("dark");
    expect(DEFAULT_SETTINGS.animations).toEqual(DEFAULT_ANIMATION_SETTINGS);
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

  it("validates animation settings", () => {
    expect(validateAnimationSettings(undefined)).toEqual(DEFAULT_ANIMATION_SETTINGS);
    expect(
      validateAnimationSettings({
        enabled: false,
        lineFlash: false,
        flyingTiles: "yes",
      }),
    ).toEqual({
      ...DEFAULT_ANIMATION_SETTINGS,
      enabled: false,
      lineFlash: false,
    });
  });

  it.each(
    allAnimationSettingsCombinations().map((animations) => ({
      animations,
      label: formatAnimationSettingsLabel(animations),
    })),
  )("isAnimationActive for all combinations ($label)", ({ animations }) => {
    const settings = { ...DEFAULT_SETTINGS, animations };
    for (const id of ANIMATION_IDS) {
      expect(isAnimationActive(settings, id)).toBe(animations.enabled && animations[id]);
    }
  });
});
