import { allOff } from "../grid.js";
import { generatePattern } from "../pattern/index.js";
import type { GameRound } from "../types.js";
import type { RoundGenerationContext } from "./types.js";

export function createCopyRound(context: RoundGenerationContext): GameRound {
  const { settings, rng, avoidReferenceHash } = context;
  const reference = generatePattern(
    settings.patternStyle,
    settings.gridSize,
    rng,
    avoidReferenceHash,
  );
  return { reference, interactive: allOff(settings.gridSize) };
}
