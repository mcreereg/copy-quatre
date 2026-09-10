import type { ColorMode, ThemeId } from "./types.js";

export type ThemeTokens = {
  accent: string;
  accentMuted: string;
  cellOn: string;
  cellOnBright: string;
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
  yellow: { main: "#ffff28", muted: "#cccc20" },
  cyan: { main: "#22d3ee", muted: "#0891b2" },
  magenta: { main: "#e879f9", muted: "#c026d3" },
  green: { main: "#4ade80", muted: "#16a34a" },
  orange: { main: "#fb923c", muted: "#ea580c" },
};

function mixHex(a: string, b: string, t = 0.5): string {
  const channel = (hex: string, offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  const mix = (offset: number) =>
    Math.round(channel(a, offset) * (1 - t) + channel(b, offset) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(1)}${mix(3)}${mix(5)}`;
}

export function getThemeTokens(theme: ThemeId, colorMode: ColorMode): ThemeTokens {
  const accent = ACCENTS[theme];
  const isDark = colorMode === "dark";
  const bg = isDark ? "#1a1a1e" : "#f4f4f8";

  return {
    accent: accent.main,
    accentMuted: accent.muted,
    cellOn: accent.main,
    cellOnBright: mixHex(accent.main, "#ffffff", 0.6),
    cellOff: isDark ? "#2a2a2e" : "#e8e8ec",
    cellBorder: isDark ? "#3a3a40" : "#c8c8d0",
    bg,
    bgFlash: mixHex(accent.main, bg),
    text: isDark ? "#f0f0f4" : "#1a1a1e",
    textMuted: isDark ? "#a0a0a8" : "#606068",
    buttonBg: accent.main,
    buttonText: isDark ? "#1a1a1e" : "#1a1a1e",
  };
}
