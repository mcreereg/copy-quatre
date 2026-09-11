import { allOff, gridHash, gridsEqual, setCell, toggleCell } from "./grid.js";
import { getGameMode } from "./modes/registry.js";
import type { GameRound } from "./types.js";
import type { Rng } from "./rng.js";
import { DEFAULT_SETTINGS, resolveSessionSettings } from "./settings.js";
import type { GameEvent, GameState, SessionSettings } from "./types.js";

export type GameAction =
  | { type: "START"; settings: SessionSettings }
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
  const session = resolveSessionSettings(DEFAULT_SETTINGS);
  return {
    phase: "gameover",
    settings: session,
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

function createRound(
  settings: SessionSettings,
  rng: Rng,
  avoidReferenceHash?: string,
): GameRound {
  const mode = getGameMode(settings.mode);
  return mode.createRound({ settings, rng, avoidReferenceHash });
}

function tryPregenerateNextRound(
  settings: SessionSettings,
  currentReference: GameRound["reference"],
  rng: Rng,
): GameRound | null {
  try {
    return createRound(settings, rng, gridHash(currentReference));
  } catch {
    return null;
  }
}

function startGame(
  settings: SessionSettings,
  rng: Rng,
): { state: GameState; events: GameEvent[]; nextRound: GameRound | null } {
  let round: GameRound;
  try {
    round = createRound(settings, rng);
  } catch (error) {
    return {
      state: createInitialState(),
      events: [
        {
          type: "GENERATION_FAILED",
          stage: "start",
          message: error instanceof Error ? error.message : "Generation failed",
          score: 0,
          sessionSettings: settings,
        },
      ],
      nextRound: null,
    };
  }

  const nextRound = tryPregenerateNextRound(settings, round.reference, rng);

  return {
    state: {
      phase: "playing",
      settings,
      reference: round.reference,
      interactive: round.interactive,
      score: 0,
      timeRemainingMs: settings.timeLimitSec * 1000,
    },
    events: [],
    nextRound,
  };
}

export function createGameEngine(rng: Rng): GameEngine {
  let state: GameState = createInitialState();
  let stroke: StrokeState = createStroke();
  let nextRound: GameRound | null = null;

  function getState(): GameState {
    return state;
  }

  function dispatch(action: GameAction): GameEvent[] {
    const events: GameEvent[] = [];

    switch (action.type) {
      case "START": {
        const started = startGame(action.settings, rng);
        state = started.state;
        nextRound = started.nextRound;
        stroke = createStroke();
        events.push(...started.events);
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
            reason: "quit",
            sessionSettings: state.settings,
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
          reason: "timeout",
          sessionSettings: state.settings,
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

    let round = nextRound;
    if (!round) {
      try {
        round = createRound(state.settings, rng, gridHash(state.reference));
      } catch (error) {
        state = {
          ...state,
          score: newScore,
          phase: "gameover",
        };
        stroke = createStroke();
        events.push({
          type: "SCORED",
          score: newScore,
          matchedReference,
          matchedInteractive,
        });
        events.push({
          type: "GENERATION_FAILED",
          stage: "round-advance",
          message: error instanceof Error ? error.message : "Generation failed",
          score: newScore,
          sessionSettings: state.settings,
        });
        nextRound = null;
        return;
      }
    }

    state = {
      ...state,
      score: newScore,
      reference: round.reference,
      interactive: round.interactive,
    };
    stroke = createStroke();
    nextRound = tryPregenerateNextRound(state.settings, round.reference, rng);

    events.push({
      type: "SCORED",
      score: newScore,
      matchedReference,
      matchedInteractive,
    });
  }

  return { getState, dispatch };
}
