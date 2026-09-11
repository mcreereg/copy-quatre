import { describe, expect, it } from "vitest";
import { resolveSessionSettings } from "./settings.js";
import {
  getHighScore,
  listHighScores,
  listHighScoresForDisplay,
  makeHighScoreKey,
  parseHighScoreKey,
  updateHighScore,
  validateHighScoreStore,
} from "./highScore.js";

const copySession = resolveSessionSettings({
  selectedMode: "copy",
  global: {
    theme: "yellow",
    colorMode: "dark",
    vibration: true,
    animations: {
      enabled: true,
      lineFlash: true,
      flyingTiles: true,
      rattlingTiles: true,
      cellOnBlink: true,
      cellOffBlink: true,
    },
  },
  modes: {
    copy: { timeLimitSec: 90, gridSize: 4, patternStyle: "cohesive" },
    imposter: { timeLimitSec: 90, gridSize: 4, patternStyle: "cohesive" },
  },
});

const imposterSession = resolveSessionSettings({
  selectedMode: "imposter",
  global: {
    theme: "yellow",
    colorMode: "dark",
    vibration: true,
    animations: {
      enabled: true,
      lineFlash: true,
      flyingTiles: true,
      rattlingTiles: true,
      cellOnBlink: true,
      cellOffBlink: true,
    },
  },
  modes: {
    copy: { timeLimitSec: 90, gridSize: 4, patternStyle: "cohesive" },
    imposter: { timeLimitSec: 120, gridSize: 5, patternStyle: "chaos" },
  },
});

describe("highScore", () => {
  it("makes and parses four-part key", () => {
    const key = makeHighScoreKey(copySession);
    expect(key).toBe("copy:cohesive:4:90");
    expect(parseHighScoreKey(key)).toEqual({
      mode: "copy",
      patternStyle: "cohesive",
      gridSize: 4,
      timeLimitSec: 90,
    });
  });

  it("parse returns null for legacy three-part key", () => {
    expect(parseHighScoreKey("cohesive:4:90")).toBeNull();
    expect(parseHighScoreKey("bad")).toBeNull();
    expect(parseHighScoreKey("copy:bad:4:90")).toBeNull();
    expect(parseHighScoreKey("copy:cohesive:4:45")).toBeNull();
  });

  it("returns 0 for missing score", () => {
    expect(getHighScore({}, copySession)).toBe(0);
  });

  it("updates only when higher", () => {
    const { store, isHighScore } = updateHighScore({}, copySession, 5);
    expect(isHighScore).toBe(true);
    expect(store[makeHighScoreKey(copySession)]).toBe(5);

    const second = updateHighScore(store, copySession, 3);
    expect(second.isHighScore).toBe(false);
    expect(second.store[makeHighScoreKey(copySession)]).toBe(5);

    const third = updateHighScore(store, copySession, 10);
    expect(third.isHighScore).toBe(true);
    expect(third.store[makeHighScoreKey(copySession)]).toBe(10);
  });

  it("isolates scores by mode", () => {
    const store = {
      [makeHighScoreKey(copySession)]: 5,
      [makeHighScoreKey(imposterSession)]: 8,
    };
    expect(getHighScore(store, copySession)).toBe(5);
    expect(getHighScore(store, imposterSession)).toBe(8);
  });

  it("lists scores sorted with tie breakers", () => {
    const store = {
      "copy:cohesive:4:90": 5,
      "copy:chaos:6:60": 5,
      "copy:cohesive:5:60": 5,
      "copy:cohesive:4:120": 12,
    };
    const list = listHighScores(store);
    expect(list[0].score).toBe(12);
    expect(list[1].patternStyle).toBe("cohesive");
    expect(list[1].gridSize).toBe(4);
    expect(list[2].gridSize).toBe(5);
    expect(list[3].patternStyle).toBe("chaos");
  });

  it("filters invalid stored keys and values", () => {
    const list = listHighScores({
      bad: 9,
      "cohesive:4:90": 4,
      "copy:cohesive:4:90": 4,
      "copy:cohesive:4:45": 4,
      "copy:cohesive:4:120": -1,
    });
    expect(list).toHaveLength(1);
    expect(list[0].score).toBe(4);
  });

  it("validateHighScoreStore drops invalid entries", () => {
    expect(validateHighScoreStore(null)).toEqual({});
    expect(
      validateHighScoreStore({
        "copy:cohesive:4:90": 5,
        "cohesive:4:90": 3,
        "copy:cohesive:4:45": 1.5,
      }),
    ).toEqual({ "copy:cohesive:4:90": 5 });
  });

  it("shows current mode profile with score 0 when store empty", () => {
    const list = listHighScoresForDisplay({}, imposterSession);
    expect(list).toHaveLength(1);
    expect(list[0].score).toBe(0);
    expect(list[0].mode).toBe("imposter");
    expect(list[0].gridSize).toBe(5);
  });

  it("filters display list by mode", () => {
    const store = {
      "copy:cohesive:4:90": 5,
      "imposter:chaos:5:120": 8,
    };
    const list = listHighScoresForDisplay(store, copySession);
    expect(list).toHaveLength(1);
    expect(list[0].mode).toBe("copy");
  });
});
