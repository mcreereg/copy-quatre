import { allOff } from "../grid.js";
import { generateSerpentinePatternUnique } from "../pattern/serpentine.js";
import type { RoundGenerationContext } from "./types.js";
import type { GameRound } from "../types.js";

export function createSerpentineRound(context: RoundGenerationContext): GameRound {
  const { settings, rng, avoidReferenceHash } = context;
  const reference = generateSerpentinePatternUnique(
    settings.gridSize,
    rng,
    avoidReferenceHash,
  );
  return { reference, interactive: allOff(settings.gridSize) };
}
