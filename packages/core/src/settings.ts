import type {
  AnimationId,
  AnimationSettings,
  ColorMode,
  PatternStyle,
  Settings,
  ThemeId,
} from "./types.js";

export const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  enabled: true,
  lineFlash: true,
  flyingTiles: true,
  rattlingTiles: true,
  cellOnBlink: true,
  cellOffBlink: true,
};

export const DEFAULT_SETTINGS: Settings = {
  timeLimitSec: 90,
  gridSize: 4,
  patternStyle: "cohesive",
  theme: "yellow",
  colorMode: "dark",
  vibration: true,
  animations: DEFAULT_ANIMATION_SETTINGS,
};

export const TIME_LIMIT_MIN = 30;
export const TIME_LIMIT_MAX = 600;
export const TIME_LIMIT_STEP = 30;

export const GRID_SIZE_MIN = 2;
export const GRID_SIZE_MAX = 10;

export const PATTERN_STYLES: PatternStyle[] = ["cohesive", "chaos"];
export const THEME_IDS: ThemeId[] = ["yellow", "cyan", "magenta", "green", "orange"];
export const COLOR_MODES: ColorMode[] = ["light", "dark"];

export function clampTimeLimitSec(value: number): number {
  const stepped =
    Math.round((value - TIME_LIMIT_MIN) / TIME_LIMIT_STEP) * TIME_LIMIT_STEP +
    TIME_LIMIT_MIN;
  return Math.max(TIME_LIMIT_MIN, Math.min(TIME_LIMIT_MAX, stepped));
}

export function clampGridSize(value: number): number {
  const rounded = Math.round(value);
  return Math.max(GRID_SIZE_MIN, Math.min(GRID_SIZE_MAX, rounded));
}

export function stepTimeLimitSec(current: number, delta: number): number {
  return clampTimeLimitSec(current + delta * TIME_LIMIT_STEP);
}

export function stepGridSize(current: number, delta: number): number {
  return clampGridSize(current + delta);
}

export function cyclePatternStyle(current: PatternStyle): PatternStyle {
  const idx = PATTERN_STYLES.indexOf(current);
  return PATTERN_STYLES[(idx + 1) % PATTERN_STYLES.length];
}

export function cycleTheme(current: ThemeId): ThemeId {
  const idx = THEME_IDS.indexOf(current);
  return THEME_IDS[(idx + 1) % THEME_IDS.length];
}

export function toggleColorMode(current: ColorMode): ColorMode {
  return current === "dark" ? "light" : "dark";
}

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function validateAnimationSettings(raw: unknown): AnimationSettings {
  const defaults = DEFAULT_ANIMATION_SETTINGS;
  if (!raw || typeof raw !== "object") return { ...defaults };
  const o = raw as Record<string, unknown>;
  return {
    enabled: pickBool(o.enabled, defaults.enabled),
    lineFlash: pickBool(o.lineFlash, defaults.lineFlash),
    flyingTiles: pickBool(o.flyingTiles, defaults.flyingTiles),
    rattlingTiles: pickBool(o.rattlingTiles, defaults.rattlingTiles),
    cellOnBlink: pickBool(o.cellOnBlink, defaults.cellOnBlink),
    cellOffBlink: pickBool(o.cellOffBlink, defaults.cellOffBlink),
  };
}

export function isAnimationActive(settings: Settings, id: AnimationId): boolean {
  return settings.animations.enabled && settings.animations[id];
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function validateSettings(settings: Settings): Settings {
  return {
    timeLimitSec: clampTimeLimitSec(settings.timeLimitSec),
    gridSize: clampGridSize(settings.gridSize),
    patternStyle: pickEnum(settings.patternStyle, PATTERN_STYLES, DEFAULT_SETTINGS.patternStyle),
    theme: pickEnum(settings.theme, THEME_IDS, DEFAULT_SETTINGS.theme),
    colorMode: pickEnum(settings.colorMode, COLOR_MODES, DEFAULT_SETTINGS.colorMode),
    vibration: pickBool(settings.vibration, DEFAULT_SETTINGS.vibration),
    animations: validateAnimationSettings(settings.animations),
  };
}

export function formatTimeLimit(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
