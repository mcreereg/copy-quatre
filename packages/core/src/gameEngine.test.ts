import { describe, expect, it, vi } from "vitest";
import { allOff, gridsEqual } from "./grid.js";
import { createGameEngine } from "./gameEngine.js";
import * as registry from "./modes/registry.js";
import { createRng } from "./rng.js";
import { DEFAULT_SETTINGS, resolveSessionSettings } from "./settings.js";

const copySession = resolveSessionSettings(DEFAULT_SETTINGS, "copy");
const imposterSession = resolveSessionSettings(DEFAULT_SETTINGS, "imposter");

function matchCopyRound(engine: ReturnType<typeof createGameEngine>) {
  const ref = engine.getState().reference;
  for (let r = 0; r < ref.length; r++) {
    for (let c = 0; c < ref[r].length; c++) {
      if (ref[r][c]) {
        engine.dispatch({ type: "POINTER_DOWN", row: r, col: c });
      }
    }
  }
}

function matchImposterRound(engine: ReturnType<typeof createGameEngine>) {
  const { reference, interactive } = engine.getState();
  for (let r = 0; r < reference.length; r++) {
    for (let c = 0; c < reference[r].length; c++) {
      if (reference[r][c] !== interactive[r][c]) {
        engine.dispatch({ type: "POINTER_DOWN", row: r, col: c });
      }
    }
  }
}

describe("gameEngine", () => {
  it("starts Copy game with playing phase and empty interactive", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: copySession });
    const state = engine.getState();
    expect(state.phase).toBe("playing");
    expect(state.score).toBe(0);
    expect(state.timeRemainingMs).toBe(90000);
    expect(state.settings.mode).toBe("copy");
    expect(state.interactive.every((row) => row.every((c) => !c))).toBe(true);
  });

  it("starts Imposter with changed interactive", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: imposterSession });
    const state = engine.getState();
    expect(state.settings.mode).toBe("imposter");
    expect(gridsEqual(state.reference, state.interactive)).toBe(false);
    expect(state.reference.length).toBe(state.interactive.length);
  });

  it("ticks down timer and ends game with session settings", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({
      type: "START",
      settings: { ...copySession, timeLimitSec: 30 },
    });
    const events = engine.dispatch({ type: "TICK", dtMs: 30000 });
    expect(engine.getState().phase).toBe("gameover");
    expect(events).toEqual([
      {
        type: "GAME_OVER",
        score: 0,
        reason: "timeout",
        sessionSettings: { ...copySession, timeLimitSec: 30 },
      },
    ]);
  });

  it("ignores pause and resume when not applicable", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "PAUSE" });
    expect(engine.getState().phase).toBe("gameover");
    engine.dispatch({ type: "START", settings: copySession });
    engine.dispatch({ type: "RESUME" });
    expect(engine.getState().phase).toBe("playing");
  });

  it("pauses and resumes", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: copySession });
    engine.dispatch({ type: "PAUSE" });
    expect(engine.getState().phase).toBe("paused");
    engine.dispatch({ type: "TICK", dtMs: 5000 });
    expect(engine.getState().timeRemainingMs).toBe(90000);
    engine.dispatch({ type: "RESUME" });
    expect(engine.getState().phase).toBe("playing");
  });

  it("quit ends game with current score and session settings", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: copySession });
    matchCopyRound(engine);
    expect(engine.getState().score).toBe(1);

    const events = engine.dispatch({ type: "QUIT" });
    expect(engine.getState().phase).toBe("gameover");
    expect(events).toEqual([
      {
        type: "GAME_OVER",
        score: 1,
        reason: "quit",
        sessionSettings: copySession,
      },
    ]);
  });

  it("toggles cell on pointer down", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: copySession });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    expect(engine.getState().interactive[0][0]).toBe(true);
  });

  it("paints on drag", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: copySession });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    engine.dispatch({ type: "POINTER_ENTER", row: 0, col: 1 });
    expect(engine.getState().interactive[0][0]).toBe(true);
    expect(engine.getState().interactive[0][1]).toBe(true);
  });

  it("emits SCORED event on Copy match", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: copySession });
    const ref = engine.getState().reference;
    let lastEvents: ReturnType<typeof engine.dispatch> = [];
    for (let r = 0; r < ref.length; r++) {
      for (let c = 0; c < ref[r].length; c++) {
        if (ref[r][c]) {
          lastEvents = engine.dispatch({ type: "POINTER_DOWN", row: r, col: c });
        }
      }
    }
    const scored = lastEvents.find((e) => e.type === "SCORED");
    expect(scored).toBeDefined();
    if (scored?.type !== "SCORED") return;
    expect(gridsEqual(scored.matchedReference, ref)).toBe(true);
    expect(gridsEqual(scored.matchedInteractive, ref)).toBe(true);
  });

  it("scores on Copy match and resets interactive to all Off", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: copySession });
    matchCopyRound(engine);
    const state = engine.getState();
    expect(state.score).toBe(1);
    expect(state.interactive.every((row) => row.every((cell) => !cell))).toBe(true);
  });

  it("completes Imposter round via symmetric difference toggles", () => {
    const engine = createGameEngine(createRng(200));
    engine.dispatch({ type: "START", settings: imposterSession });
    matchImposterRound(engine);
    expect(engine.getState().score).toBe(1);
    expect(gridsEqual(engine.getState().reference, engine.getState().interactive)).toBe(false);
  });

  it("ignores input when paused", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: copySession });
    engine.dispatch({ type: "PAUSE" });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    expect(engine.getState().interactive[0][0]).toBe(false);
  });

  it("game continues after score", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: copySession });
    matchCopyRound(engine);
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    expect(engine.getState().interactive[0][0]).toBe(true);
    expect(engine.getState().phase).toBe("playing");
  });

  it("keeps session settings fixed during game", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: copySession });
    expect(engine.getState().settings.mode).toBe("copy");
    matchCopyRound(engine);
    expect(engine.getState().settings.mode).toBe("copy");
  });

  it("emits recoverable error when start generation fails", () => {
    vi.spyOn(registry, "getGameMode").mockReturnValue({
      ...registry.getGameMode("copy"),
      createRound: () => {
        throw new Error("start failed");
      },
    });
    const engine = createGameEngine(createRng(1));
    const events = engine.dispatch({ type: "START", settings: copySession });
    expect(engine.getState().phase).toBe("gameover");
    expect(events).toEqual([
      {
        type: "GENERATION_FAILED",
        stage: "start",
        message: "start failed",
        score: 0,
        sessionSettings: copySession,
      },
    ]);
    vi.restoreAllMocks();
  });

  it("awards point then emits round-advance failure", () => {
    let calls = 0;
    const realMode = registry.getGameMode("copy");
    vi.spyOn(registry, "getGameMode").mockReturnValue({
      ...realMode,
      createRound: (context) => {
        calls += 1;
        if (calls === 1) return realMode.createRound(context);
        if (calls === 2) throw new Error("pregen fail");
        throw new Error("advance failed");
      },
    });

    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: copySession });
    const ref = engine.getState().reference;
    let events: ReturnType<typeof engine.dispatch> = [];
    for (let r = 0; r < ref.length; r++) {
      for (let c = 0; c < ref[r].length; c++) {
        if (ref[r][c]) {
          events = engine.dispatch({ type: "POINTER_DOWN", row: r, col: c });
        }
      }
    }

    expect(events.some((event) => event.type === "SCORED")).toBe(true);
    expect(events.some((event) => event.type === "GENERATION_FAILED")).toBe(true);
    expect(engine.getState().score).toBe(1);
    expect(engine.getState().phase).toBe("gameover");
    vi.restoreAllMocks();
  });
});
