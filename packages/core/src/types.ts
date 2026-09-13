export type PatternStyle = "cohesive" | "chaos" | "serpentine";
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

export type GameModeId = "copy" | "imposter" | "serpentine";

export type GameplaySettings = {
  timeLimitSec: number;
  gridSize: number;
  patternStyle: PatternStyle;
};

export type GlobalSettings = {
  theme: ThemeId;
  colorMode: ColorMode;
  vibration: boolean;
  animations: AnimationSettings;
};

export type Settings = {
  selectedMode: GameModeId;
  global: GlobalSettings;
  modes: Record<GameModeId, GameplaySettings>;
};

export type SessionSettings = GlobalSettings &
  GameplaySettings & {
    mode: GameModeId;
  };

export type Grid = boolean[][];

export type GamePhase = "playing" | "paused" | "gameover";

export type GameRound = {
  reference: Grid;
  interactive: Grid;
};

export type CellCoordinate = { row: number; col: number };

export type GameState = {
  phase: GamePhase;
  settings: SessionSettings;
  reference: Grid;
  interactive: Grid;
  score: number;
  timeRemainingMs: number;
  strokePath: CellCoordinate[];
};

export type GameOverReason = "timeout" | "quit";

export type GameEvent =
  | { type: "SCORED"; score: number; matchedReference: Grid; matchedInteractive: Grid }
  | {
      type: "STROKE_FAILED";
      path: CellCoordinate[];
      turnedOffCells: CellCoordinate[];
    }
  | {
      type: "GAME_OVER";
      score: number;
      reason: GameOverReason;
      sessionSettings: SessionSettings;
    }
  | {
      type: "GENERATION_FAILED";
      stage: "start" | "round-advance";
      message: string;
      score: number;
      sessionSettings: SessionSettings;
    };

export type HighScoreStore = Record<string, number>;
