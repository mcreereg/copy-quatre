import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./settings.js";
import {
  getHighScore,
  listHighScores,
  makeHighScoreKey,
  parseHighScoreKey,
  updateHighScore,
} from "./highScore.js";

describe("highScore", () => {
  it("makes and parses key", () => {
    const key = makeHighScoreKey(DEFAULT_SETTINGS);
    expect(key).toBe("cohesive:4:90");
    expect(parseHighScoreKey(key)).toEqual({
      patternStyle: "cohesive",
      gridSize: 4,
      timeLimitSec: 90,
    });
  });

  it("parse returns null for invalid key", () => {
    expect(parseHighScoreKey("bad")).toBeNull();
    expect(parseHighScoreKey("a:b:c")).toBeNull();
  });

  it("returns 0 for missing score", () => {
    expect(getHighScore({}, DEFAULT_SETTINGS)).toBe(0);
  });

  it("updates only when higher", () => {
    const { store, isHighScore } = updateHighScore({}, DEFAULT_SETTINGS, 5);
    expect(isHighScore).toBe(true);
    expect(store[makeHighScoreKey(DEFAULT_SETTINGS)]).toBe(5);

    const second = updateHighScore(store, DEFAULT_SETTINGS, 3);
    expect(second.isHighScore).toBe(false);
    expect(second.store[makeHighScoreKey(DEFAULT_SETTINGS)]).toBe(5);

    const third = updateHighScore(store, DEFAULT_SETTINGS, 10);
    expect(third.isHighScore).toBe(true);
    expect(third.store[makeHighScoreKey(DEFAULT_SETTINGS)]).toBe(10);
  });

  it("lists scores sorted", () => {
    const store = {
      "cohesive:4:90": 5,
      "chaos:6:60": 12,
    };
    const list = listHighScores(store);
    expect(list[0].score).toBe(12);
    expect(list).toHaveLength(2);
  });
});
