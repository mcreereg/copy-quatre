import { allOff, gridHash, gridsEqual, setCell, toggleCell } from "./grid.js";
import { getGameMode } from "./modes/registry.js";
import type { GameRound } from "./types.js";
import type { Rng } from "./rng.js";
import { DEFAULT_SETTINGS, resolveSessionSettings } from "./settings.js";
import type { CellCoordinate, GameEvent, GameState, SessionSettings } from "./types.js";

export type GameAction =
  | { type: "START"; settings: SessionSettings }
  | { type: "TICK"; dtMs: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "QUIT" }
  | { type: "POINTER_DOWN"; row: number; col: number }
  | { type: "POINTER_ENTER"; row: number; col: number }
  | { type: "POINTER_UP" };

type CopyStrokeState = {
  active: boolean;
  paintMode: boolean;
  visited: Set<string>;
};

type SerpentineStrokeState = {
  active: boolean;
  path: CellCoordinate[];
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
    strokePath: [],
  };
}

function createCopyStroke(): CopyStrokeState {
  return { active: false, paintMode: false, visited: new Set() };
}

function createSerpentineStroke(): SerpentineStrokeState {
  return { active: false, path: [] };
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function isAdjacent(a: CellCoordinate, b: CellCoordinate): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function coordsEqual(a: CellCoordinate, b: CellCoordinate): boolean {
  return a.row === b.row && a.col === b.col;
}

function listOnCells(grid: GameState["interactive"]): CellCoordinate[] {
  const cells: CellCoordinate[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col]) cells.push({ row, col });
    }
  }
  return cells;
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
      strokePath: [],
    },
    events: [],
    nextRound,
  };
}

export function createGameEngine(rng: Rng): GameEngine {
  let state: GameState = createInitialState();
  let copyStroke: CopyStrokeState = createCopyStroke();
  let serpentineStroke: SerpentineStrokeState = createSerpentineStroke();
  let nextRound: GameRound | null = null;

  function getState(): GameState {
    return state;
  }

  function isSerpentineMode(): boolean {
    return state.settings.mode === "serpentine";
  }

  function syncSerpentinePath(): void {
    state = {
      ...state,
      strokePath: serpentineStroke.active ? [...serpentineStroke.path] : [],
    };
  }

  function dispatch(action: GameAction): GameEvent[] {
    const events: GameEvent[] = [];

    switch (action.type) {
      case "START": {
        const started = startGame(action.settings, rng);
        state = started.state;
        nextRound = started.nextRound;
        copyStroke = createCopyStroke();
        serpentineStroke = createSerpentineStroke();
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
          if (isSerpentineMode()) {
            handleSerpentinePointerDown(action.row, action.col, events);
          } else {
            copyStroke = handleCopyPointerDown(action.row, action.col, events);
          }
        }
        break;

      case "POINTER_ENTER":
        if (state.phase === "playing") {
          if (isSerpentineMode()) {
            if (serpentineStroke.active) {
              handleSerpentinePointerEnter(action.row, action.col, events);
            }
          } else if (copyStroke.active) {
            handleCopyPointerEnter(action.row, action.col, events);
          }
        }
        break;

      case "POINTER_UP":
        if (state.phase === "playing" && isSerpentineMode()) {
          handleSerpentinePointerUp(events);
        } else {
          copyStroke = createCopyStroke();
        }
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

  function handleCopyPointerDown(row: number, col: number, events: GameEvent[]): CopyStrokeState {
    const key = cellKey(row, col);
    const scoreBefore = state.score;
    const toggled = toggleCell(state.interactive, row, col);
    const paintMode = toggled[row][col];
    state = { ...state, interactive: toggled };
    checkMatch(events);
    if (state.score > scoreBefore) {
      return createCopyStroke();
    }
    return { active: true, paintMode, visited: new Set([key]) };
  }

  function handleCopyPointerEnter(row: number, col: number, events: GameEvent[]): void {
    const key = cellKey(row, col);
    if (copyStroke.visited.has(key)) return;
    copyStroke.visited.add(key);
    state = {
      ...state,
      interactive: setCell(state.interactive, row, col, copyStroke.paintMode),
    };
    checkMatch(events);
  }

  function handleSerpentinePointerDown(row: number, col: number, events: GameEvent[]): void {
    if (serpentineStroke.active) return;

    const scoreBefore = state.score;
    serpentineStroke = {
      active: true,
      path: [{ row, col }],
    };
    state = {
      ...state,
      interactive: setCell(state.interactive, row, col, true),
    };
    syncSerpentinePath();
    checkMatch(events);
    if (state.score > scoreBefore) {
      serpentineStroke = createSerpentineStroke();
      syncSerpentinePath();
    }
  }

  function handleSerpentinePointerEnter(row: number, col: number, events: GameEvent[]): void {
    const path = serpentineStroke.path;
    const len = path.length;
    if (len === 0) return;

    const current = { row, col };

    if (len >= 2 && coordsEqual(current, path[len - 2])) {
      const removed = path[len - 1];
      serpentineStroke = {
        active: true,
        path: path.slice(0, -1),
      };
      state = {
        ...state,
        interactive: setCell(state.interactive, removed.row, removed.col, false),
      };
      syncSerpentinePath();
      checkMatch(events);
      return;
    }

    if (coordsEqual(current, path[len - 1])) {
      return;
    }

    if (path.some((cell) => coordsEqual(cell, current))) {
      return;
    }

    const tail = path[len - 1];
    if (!isAdjacent(tail, current)) {
      return;
    }

    serpentineStroke = {
      active: true,
      path: [...path, current],
    };
    state = {
      ...state,
      interactive: setCell(state.interactive, row, col, true),
    };
    syncSerpentinePath();
    checkMatch(events);
  }

  function handleSerpentinePointerUp(events: GameEvent[]): void {
    if (!serpentineStroke.active) return;

    const failedPath = [...serpentineStroke.path];

    if (!gridsEqual(state.reference, state.interactive)) {
      const turnedOffCells = listOnCells(state.interactive);
      const size = state.interactive.length;
      state = {
        ...state,
        interactive: allOff(size),
        strokePath: [],
      };
      serpentineStroke = createSerpentineStroke();
      events.push({
        type: "STROKE_FAILED",
        path: failedPath,
        turnedOffCells,
      });
      return;
    }

    serpentineStroke = createSerpentineStroke();
    syncSerpentinePath();
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
          strokePath: [],
        };
        copyStroke = createCopyStroke();
        serpentineStroke = createSerpentineStroke();
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
      strokePath: [],
    };
    copyStroke = createCopyStroke();
    serpentineStroke = createSerpentineStroke();
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
