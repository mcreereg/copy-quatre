import { describe, expect, it } from "vitest";
import { allOff, gridsEqual } from "./grid.js";
import { createGameEngine } from "./gameEngine.js";
import { createRng } from "./rng.js";
import { DEFAULT_SETTINGS } from "./settings.js";

describe("gameEngine", () => {
  it("starts game with playing phase", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    const state = engine.getState();
    expect(state.phase).toBe("playing");
    expect(state.score).toBe(0);
    expect(state.timeRemainingMs).toBe(90000);
    expect(state.interactive.every((row) => row.every((c) => !c))).toBe(true);
  });

  it("ticks down timer and ends game", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: { ...DEFAULT_SETTINGS, timeLimitSec: 30 } });
    const events = engine.dispatch({ type: "TICK", dtMs: 30000 });
    expect(engine.getState().phase).toBe("gameover");
    expect(events.some((e) => e.type === "GAME_OVER")).toBe(true);
  });

  it("ignores pause and resume when not applicable", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "PAUSE" });
    expect(engine.getState().phase).toBe("gameover");
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    engine.dispatch({ type: "RESUME" });
    expect(engine.getState().phase).toBe("playing");
  });

  it("pauses and resumes", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    engine.dispatch({ type: "PAUSE" });
    expect(engine.getState().phase).toBe("paused");
    engine.dispatch({ type: "TICK", dtMs: 5000 });
    expect(engine.getState().timeRemainingMs).toBe(90000);
    engine.dispatch({ type: "RESUME" });
    expect(engine.getState().phase).toBe("playing");
  });

  it("quit ends game with current score", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    const ref = engine.getState().reference;
    for (let r = 0; r < ref.length; r++) {
      for (let c = 0; c < ref[r].length; c++) {
        if (ref[r][c]) {
          engine.dispatch({ type: "POINTER_DOWN", row: r, col: c });
        }
      }
    }
    expect(engine.getState().score).toBe(1);

    const events = engine.dispatch({ type: "QUIT" });
    expect(engine.getState().phase).toBe("gameover");
    expect(engine.getState().score).toBe(1);
    expect(events).toEqual([{ type: "GAME_OVER", score: 1, isHighScore: false }]);
  });

  it("quit from pause records current score", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    engine.dispatch({ type: "PAUSE" });
    const events = engine.dispatch({ type: "QUIT" });
    expect(engine.getState().phase).toBe("gameover");
    expect(events).toEqual([{ type: "GAME_OVER", score: 0, isHighScore: false }]);
  });

  it("ignores quit when not in a session", () => {
    const engine = createGameEngine(createRng(1));
    const events = engine.dispatch({ type: "QUIT" });
    expect(engine.getState().phase).toBe("gameover");
    expect(events).toEqual([]);
  });

  it("toggles cell on pointer down", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    expect(engine.getState().interactive[0][0]).toBe(true);
  });

  it("paints on drag", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    engine.dispatch({ type: "POINTER_ENTER", row: 0, col: 1 });
    expect(engine.getState().interactive[0][0]).toBe(true);
    expect(engine.getState().interactive[0][1]).toBe(true);
  });

  it("does not re-visit cell in same stroke", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    engine.dispatch({ type: "POINTER_ENTER", row: 0, col: 1 });
    engine.dispatch({ type: "POINTER_ENTER", row: 0, col: 0 });
    expect(engine.getState().interactive[0][0]).toBe(true);
  });

  it("emits SCORED event on match", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
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

  it("scores on match and resets interactive", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    const ref = engine.getState().reference;
    for (let r = 0; r < ref.length; r++) {
      for (let c = 0; c < ref[r].length; c++) {
        if (ref[r][c]) {
          engine.dispatch({ type: "POINTER_DOWN", row: r, col: c });
        }
      }
    }
    const state = engine.getState();
    expect(state.score).toBe(1);
    expect(state.interactive.every((row) => row.every((cell) => !cell))).toBe(true);
  });

  it("does not score on partial match", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    expect(engine.getState().score).toBe(0);
  });

  it("ignores input when paused", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    engine.dispatch({ type: "PAUSE" });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    expect(engine.getState().interactive[0][0]).toBe(false);
  });

  it("pointer up ends stroke", () => {
    const engine = createGameEngine(createRng(1));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    engine.dispatch({ type: "POINTER_UP" });
    engine.dispatch({ type: "POINTER_ENTER", row: 0, col: 1 });
    expect(engine.getState().interactive[0][1]).toBe(false);
  });

  it("clears stroke on match", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    const ref = engine.getState().reference;
    for (let r = 0; r < ref.length; r++) {
      for (let c = 0; c < ref[r].length; c++) {
        if (ref[r][c]) {
          engine.dispatch({ type: "POINTER_DOWN", row: r, col: c });
        }
      }
    }
    engine.dispatch({ type: "POINTER_ENTER", row: 0, col: 1 });
    expect(engine.getState().interactive[0][1]).toBe(false);
  });

  it("game continues after score", () => {
    const engine = createGameEngine(createRng(100));
    engine.dispatch({ type: "START", settings: DEFAULT_SETTINGS });
    const ref = engine.getState().reference;
    for (let r = 0; r < ref.length; r++) {
      for (let c = 0; c < ref[r].length; c++) {
        if (ref[r][c]) {
          engine.dispatch({ type: "POINTER_DOWN", row: r, col: c });
        }
      }
    }
    engine.dispatch({ type: "POINTER_DOWN", row: 0, col: 0 });
    expect(engine.getState().interactive[0][0]).toBe(true);
    expect(engine.getState().phase).toBe("playing");
  });
});
