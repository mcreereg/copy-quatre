import { allOff, gridHash, gridsEqual, setCell, toggleCell } from "./grid.js";
import { generatePattern } from "./pattern/index.js";
import type { Rng } from "./rng.js";
import { DEFAULT_SETTINGS } from "./settings.js";
import type { GameEvent, GameState, Grid, Settings } from "./types.js";

export type GameAction =
  | { type: "START"; settings: Settings }
  | { type: "TICK"; dtMs: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "QUIT" }
  | { type: "POINTER_DOWN"; row: number; col: number }
  | { type: "POINTER_ENTER"; row: number; col: number }
  | { type: "POINTER_UP" };

type StrokeState = {
  active: boolean;
  paintMode: boolean;
  visited: Set<string>;
};

export type GameEngine = {
  getState: () => GameState;
  dispatch: (action: GameAction) => GameEvent[];
};

function createInitialState(): GameState {
  return {
    phase: "gameover",
    settings: DEFAULT_SETTINGS,
    reference: allOff(4),
    interactive: allOff(4),
    score: 0,
    timeRemainingMs: 0,
  };
}

function createStroke(): StrokeState {
  return { active: false, paintMode: false, visited: new Set() };
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function pregenerateNextReference(settings: Settings, current: Grid, rng: Rng): Grid {
  return generatePattern(
    settings.patternStyle,
    settings.gridSize,
    rng,
    gridHash(current),
  );
}

function startGame(settings: Settings, rng: Rng): { state: GameState; nextReference: Grid } {
  const reference = generatePattern(settings.patternStyle, settings.gridSize, rng);
  return {
    state: {
      phase: "playing",
      settings,
      reference,
      interactive: allOff(settings.gridSize),
      score: 0,
      timeRemainingMs: settings.timeLimitSec * 1000,
    },
    nextReference: pregenerateNextReference(settings, reference, rng),
  };
}

export function createGameEngine(rng: Rng): GameEngine {
  let state: GameState = createInitialState();
  let stroke: StrokeState = createStroke();
  let nextReference: Grid | null = null;

  function getState(): GameState {
    return state;
  }

  function dispatch(action: GameAction): GameEvent[] {
    const events: GameEvent[] = [];

    switch (action.type) {
      case "START": {
        const started = startGame(action.settings, rng);
        state = started.state;
        nextReference = started.nextReference;
        stroke = createStroke();
        break;
      }

      case "TICK":
        events.push(...tick(action.dtMs));
        break;

      case "PAUSE":
        if (state.phase === "playing") {
          state = { ...state, phase: "paused" };
        }
        break;

      case "RESUME":
        if (state.phase === "paused") {
          state = { ...state, phase: "playing" };
        }
        break;

      case "QUIT":
        if (state.phase === "playing" || state.phase === "paused") {
          state = { ...state, phase: "gameover" };
          events.push({
            type: "GAME_OVER",
            score: state.score,
            isHighScore: false,
            reason: "quit",
          });
        }
        break;

      case "POINTER_DOWN":
        if (state.phase === "playing") {
          stroke = handlePointerDown(action.row, action.col, events);
        }
        break;

      case "POINTER_ENTER":
        if (state.phase === "playing" && stroke.active) {
          handlePointerEnter(action.row, action.col, events);
        }
        break;

      case "POINTER_UP":
        stroke = createStroke();
        break;
    }

    return events;
  }

  function tick(dtMs: number): GameEvent[] {
    const events: GameEvent[] = [];

    if (state.phase === "playing") {
      const remaining = state.timeRemainingMs - dtMs;
      if (remaining <= 0) {
        state = { ...state, phase: "gameover", timeRemainingMs: 0 };
        events.push({
          type: "GAME_OVER",
          score: state.score,
          isHighScore: false,
          reason: "timeout",
        });
      } else {
        state = { ...state, timeRemainingMs: remaining };
      }
    }

    return events;
  }

  function handlePointerDown(row: number, col: number, events: GameEvent[]): StrokeState {
    const key = cellKey(row, col);
    const scoreBefore = state.score;
    const toggled = toggleCell(state.interactive, row, col);
    const paintMode = toggled[row][col];
    state = { ...state, interactive: toggled };
    checkMatch(events);
    if (state.score > scoreBefore) {
      return createStroke();
    }
    return { active: true, paintMode, visited: new Set([key]) };
  }

  function handlePointerEnter(row: number, col: number, events: GameEvent[]): void {
    const key = cellKey(row, col);
    if (stroke.visited.has(key)) return;
    stroke.visited.add(key);
    state = {
      ...state,
      interactive: setCell(state.interactive, row, col, stroke.paintMode),
    };
    checkMatch(events);
  }

  function checkMatch(events: GameEvent[]): void {
    if (!gridsEqual(state.reference, state.interactive)) return;

    const matchedReference = state.reference;
    const matchedInteractive = state.interactive;
    const newScore = state.score + 1;
    const reference =
      nextReference ??
      pregenerateNextReference(state.settings, state.reference, rng);
    nextReference = pregenerateNextReference(state.settings, reference, rng);

    state = {
      ...state,
      score: newScore,
      reference,
      interactive: allOff(state.settings.gridSize),
    };
    stroke = createStroke();

    events.push({
      type: "SCORED",
      score: newScore,
      matchedReference,
      matchedInteractive,
    });
  }

  return { getState, dispatch };
}
