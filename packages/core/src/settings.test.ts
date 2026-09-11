import { describe, expect, it } from "vitest";
import type { AnimationId, AnimationSettings } from "./types.js";
import {
  clampGridSize,
  clampTimeLimitSec,
  cyclePatternStyle,
  cycleTheme,
  DEFAULT_ANIMATION_SETTINGS,
  DEFAULT_GAMEPLAY_SETTINGS,
  DEFAULT_SETTINGS,
  formatTimeLimit,
  isAnimationActive,
  resolveSessionSettings,
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
    expect(DEFAULT_SETTINGS.selectedMode).toBe("copy");
    expect(DEFAULT_SETTINGS.modes.copy).toEqual(DEFAULT_GAMEPLAY_SETTINGS);
    expect(DEFAULT_SETTINGS.modes.imposter).toEqual(DEFAULT_GAMEPLAY_SETTINGS);
    expect(DEFAULT_SETTINGS.global.colorMode).toBe("dark");
    expect(DEFAULT_SETTINGS.global.vibration).toBe(true);
    expect(DEFAULT_SETTINGS.global.animations).toEqual(DEFAULT_ANIMATION_SETTINGS);
  });

  it("keeps default mode profiles as independent objects", () => {
    const settings = validateSettings(undefined);
    settings.modes.copy.gridSize = 99;
    expect(settings.modes.imposter.gridSize).toBe(4);
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

  it("validates settings from unknown input", () => {
    const s = validateSettings({
      selectedMode: "imposter",
      global: { ...DEFAULT_SETTINGS.global, colorMode: "light" },
      modes: {
        copy: { timeLimitSec: 47, gridSize: 99, patternStyle: "cohesive" },
        imposter: { timeLimitSec: 120, gridSize: 5, patternStyle: "chaos" },
      },
    });
    expect(s.selectedMode).toBe("imposter");
    expect(s.modes.copy.timeLimitSec).toBe(60);
    expect(s.modes.copy.gridSize).toBe(10);
    expect(s.modes.imposter.timeLimitSec).toBe(120);
    expect(s.global.colorMode).toBe("light");
  });

  it("falls back on invalid root", () => {
    expect(validateSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(validateSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it("falls back invalid selected mode to copy", () => {
    expect(validateSettings({ selectedMode: "invalid" }).selectedMode).toBe("copy");
  });

  it("falls back missing mode profile to defaults", () => {
    const s = validateSettings({ selectedMode: "copy", global: DEFAULT_SETTINGS.global });
    expect(s.modes.copy).toEqual(DEFAULT_GAMEPLAY_SETTINGS);
    expect(s.modes.imposter).toEqual(DEFAULT_GAMEPLAY_SETTINGS);
  });

  it("validates each profile field independently", () => {
    const s = validateSettings({
      selectedMode: "copy",
      global: DEFAULT_SETTINGS.global,
      modes: {
        copy: { timeLimitSec: 90, gridSize: 4, patternStyle: "invalid" },
        imposter: { timeLimitSec: "bad", gridSize: 4, patternStyle: "chaos" },
      },
    });
    expect(s.modes.copy.patternStyle).toBe("cohesive");
    expect(s.modes.imposter.timeLimitSec).toBe(90);
    expect(s.modes.imposter.patternStyle).toBe("chaos");
  });

  it("returns defaults for old flat shape", () => {
    const s = validateSettings({
      timeLimitSec: 120,
      gridSize: 6,
      patternStyle: "chaos",
      theme: "cyan",
      colorMode: "light",
      vibration: false,
      animations: DEFAULT_ANIMATION_SETTINGS,
    });
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it("resolveSessionSettings flattens selected profile and globals", () => {
    const settings = validateSettings({
      selectedMode: "imposter",
      global: { ...DEFAULT_SETTINGS.global, theme: "cyan" },
      modes: {
        copy: DEFAULT_GAMEPLAY_SETTINGS,
        imposter: { timeLimitSec: 120, gridSize: 5, patternStyle: "chaos" },
      },
    });
    const session = resolveSessionSettings(settings);
    expect(session.mode).toBe("imposter");
    expect(session.timeLimitSec).toBe(120);
    expect(session.gridSize).toBe(5);
    expect(session.patternStyle).toBe("chaos");
    expect(session.theme).toBe("cyan");
  });

  it("resolveSessionSettings accepts explicit mode", () => {
    const session = resolveSessionSettings(DEFAULT_SETTINGS, "imposter");
    expect(session.mode).toBe("imposter");
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
    for (const id of ANIMATION_IDS) {
      expect(isAnimationActive(animations, id)).toBe(animations.enabled && animations[id]);
    }
  });
});
