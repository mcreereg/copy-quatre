import type { ColorMode, ThemeId } from "./types.js";

export type ThemeTokens = {
  accent: string;
  accentMuted: string;
  cellOn: string;
  cellOff: string;
  cellBorder: string;
  bg: string;
  bgFlash: string;
  text: string;
  textMuted: string;
  buttonBg: string;
  buttonText: string;
};

const ACCENTS: Record<ThemeId, { main: string; muted: string }> = {
  yellow: { main: "#f5c518", muted: "#c9a012" },
  cyan: { main: "#22d3ee", muted: "#0891b2" },
  magenta: { main: "#e879f9", muted: "#c026d3" },
  green: { main: "#4ade80", muted: "#16a34a" },
  orange: { main: "#fb923c", muted: "#ea580c" },
};

export function getThemeTokens(theme: ThemeId, colorMode: ColorMode): ThemeTokens {
  const accent = ACCENTS[theme];
  const isDark = colorMode === "dark";

  return {
    accent: accent.main,
    accentMuted: accent.muted,
    cellOn: accent.main,
    cellOff: isDark ? "#2a2a2e" : "#e8e8ec",
    cellBorder: isDark ? "#3a3a40" : "#c8c8d0",
    bg: isDark ? "#1a1a1e" : "#f4f4f8",
    bgFlash: accent.main,
    text: isDark ? "#f0f0f4" : "#1a1a1e",
    textMuted: isDark ? "#a0a0a8" : "#606068",
    buttonBg: accent.main,
    buttonText: isDark ? "#1a1a1e" : "#1a1a1e",
  };
}
