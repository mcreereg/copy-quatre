export type PatternStyle = "cohesive" | "chaos";
export type ColorMode = "light" | "dark";
export type ThemeId = "yellow" | "cyan" | "magenta" | "green" | "orange";

export type Settings = {
  timeLimitSec: number;
  gridSize: number;
  patternStyle: PatternStyle;
  theme: ThemeId;
  colorMode: ColorMode;
};

export type Grid = boolean[][];

export type GamePhase = "playing" | "paused" | "gameover";

export type GameState = {
  phase: GamePhase;
  settings: Settings;
  reference: Grid;
  interactive: Grid;
  score: number;
  timeRemainingMs: number;
  flashPhase: "none" | "on" | "fade";
  flashElapsedMs: number;
};

export type GameEvent =
  | { type: "SCORED"; score: number }
  | { type: "GAME_OVER"; score: number; isHighScore: boolean };

export type HighScoreStore = Record<string, number>;
