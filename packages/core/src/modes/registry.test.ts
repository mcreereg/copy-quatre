import { describe, expect, it } from "vitest";
import {
  cycleGameMode,
  GAME_MODE_IDS,
  GAME_MODES,
  getGameMode,
  isGameModeId,
} from "./registry.js";

describe("mode registry", () => {
  it("lists registered modes in order", () => {
    expect(GAME_MODE_IDS).toEqual(["copy", "imposter", "serpentine"]);
    expect(GAME_MODES.map((mode) => mode.id)).toEqual(["copy", "imposter", "serpentine"]);
  });

  it("gets mode by id", () => {
    expect(getGameMode("copy").name).toBe("Copy");
    expect(getGameMode("imposter").referenceLabel).toBe("Target");
  });

  it("throws for unknown mode", () => {
    expect(() => getGameMode("unknown" as "copy")).toThrow("Unknown game mode");
  });

  it("validates mode ids", () => {
    expect(isGameModeId("copy")).toBe(true);
    expect(isGameModeId("nope")).toBe(false);
  });

  it("cycles modes in registry order", () => {
    expect(cycleGameMode("copy", 1)).toBe("imposter");
    expect(cycleGameMode("imposter", 1)).toBe("serpentine");
    expect(cycleGameMode("serpentine", 1)).toBe("copy");
    expect(cycleGameMode("copy", -1)).toBe("serpentine");
  });
});
