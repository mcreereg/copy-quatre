export type PatternStyle = "cohesive" | "chaos";
export type ColorMode = "light" | "dark";
export type ThemeId = "yellow" | "cyan" | "magenta" | "green" | "orange";

export type AnimationSettings = {
  enabled: boolean;
  lineFlash: boolean;
  flyingTiles: boolean;
  rattlingTiles: boolean;
  cellOnBlink: boolean;
  cellOffBlink: boolean;
};

export type AnimationId = keyof Omit<AnimationSettings, "enabled">;

export type Settings = {
  timeLimitSec: number;
  gridSize: number;
  patternStyle: PatternStyle;
  theme: ThemeId;
  colorMode: ColorMode;
  vibration: boolean;
  animations: AnimationSettings;
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
};

export type GameEvent =
  | { type: "SCORED"; score: number; matchedReference: Grid; matchedInteractive: Grid }
  | { type: "GAME_OVER"; score: number; isHighScore: boolean };

export type HighScoreStore = Record<string, number>;
