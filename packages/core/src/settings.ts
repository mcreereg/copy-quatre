import { GAME_MODE_IDS, isGameModeId } from "./modes/registry.js";
import type {
  AnimationId,
  AnimationSettings,
  ColorMode,
  GameModeId,
  GameplaySettings,
  GlobalSettings,
  PatternStyle,
  SessionSettings,
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

export const DEFAULT_GAMEPLAY_SETTINGS: GameplaySettings = {
  timeLimitSec: 90,
  gridSize: 4,
  patternStyle: "cohesive",
};

function createDefaultModeProfiles(): Record<GameModeId, GameplaySettings> {
  return {
    copy: { ...DEFAULT_GAMEPLAY_SETTINGS },
    imposter: { ...DEFAULT_GAMEPLAY_SETTINGS },
    serpentine: { ...DEFAULT_GAMEPLAY_SETTINGS },
  };
}

export function modeShowsPatternStyle(modeId: GameModeId): boolean {
  return modeId !== "serpentine";
}

export const DEFAULT_SETTINGS: Settings = {
  selectedMode: "copy",
  global: {
    theme: "yellow",
    colorMode: "dark",
    vibration: true,
    animations: { ...DEFAULT_ANIMATION_SETTINGS },
  },
  modes: createDefaultModeProfiles(),
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

export function isAnimationActive(animations: AnimationSettings, id: AnimationId): boolean {
  return animations.enabled && animations[id];
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function validateGameplaySettings(raw: unknown, fallback: GameplaySettings): GameplaySettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...fallback };
  }
  const o = raw as Record<string, unknown>;
  return {
    timeLimitSec: clampTimeLimitSec(
      typeof o.timeLimitSec === "number" ? o.timeLimitSec : fallback.timeLimitSec,
    ),
    gridSize: clampGridSize(typeof o.gridSize === "number" ? o.gridSize : fallback.gridSize),
    patternStyle: pickEnum(o.patternStyle, PATTERN_STYLES, fallback.patternStyle),
  };
}

function validateGlobalSettings(raw: unknown): GlobalSettings {
  const defaults = DEFAULT_SETTINGS.global;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      theme: defaults.theme,
      colorMode: defaults.colorMode,
      vibration: defaults.vibration,
      animations: { ...defaults.animations },
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    theme: pickEnum(o.theme, THEME_IDS, defaults.theme),
    colorMode: pickEnum(o.colorMode, COLOR_MODES, defaults.colorMode),
    vibration: pickBool(o.vibration, defaults.vibration),
    animations: validateAnimationSettings(o.animations),
  };
}

export function validateSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      selectedMode: DEFAULT_SETTINGS.selectedMode,
      global: { ...DEFAULT_SETTINGS.global, animations: { ...DEFAULT_ANIMATION_SETTINGS } },
      modes: createDefaultModeProfiles(),
    };
  }

  const o = raw as Record<string, unknown>;
  const selectedMode = isGameModeId(o.selectedMode) ? o.selectedMode : DEFAULT_SETTINGS.selectedMode;
  const global = validateGlobalSettings(o.global);
  const modesRaw = o.modes;
  const modes = createDefaultModeProfiles();

  if (modesRaw && typeof modesRaw === "object" && !Array.isArray(modesRaw)) {
    const modeObj = modesRaw as Record<string, unknown>;
    for (const modeId of GAME_MODE_IDS) {
      modes[modeId] = validateGameplaySettings(modeObj[modeId], modes[modeId]);
    }
  }

  return { selectedMode, global, modes };
}

export function resolveSessionSettings(settings: Settings, mode?: GameModeId): SessionSettings {
  const activeMode = mode ?? settings.selectedMode;
  const profile = settings.modes[activeMode];
  return {
    mode: activeMode,
    ...profile,
    ...settings.global,
  };
}

export function formatTimeLimit(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
