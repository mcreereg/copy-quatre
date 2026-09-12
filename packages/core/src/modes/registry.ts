import type { GameModeId } from "../types.js";
import { createCopyRound } from "./copy.js";
import { generateImposterRound } from "./imposter/generate.js";
import { createSerpentineRound } from "./serpentine.js";
import type { GameModeDefinition } from "./types.js";

export const GAME_MODES: readonly GameModeDefinition[] = [
  {
    id: "copy",
    name: "Copy",
    description: "Recreate each target from an empty grid.",
    referenceLabel: "Copy this",
    interactiveLabel: "Your grid",
    createRound: createCopyRound,
  },
  {
    id: "imposter",
    name: "Imposter",
    description: "Find every changed cell and restore the target.",
    referenceLabel: "Target",
    interactiveLabel: "Find and fix imposters",
    createRound: generateImposterRound,
  },
  {
    id: "serpentine",
    name: "Serpentine",
    description: "Draw one unbroken path to match the target.",
    referenceLabel: "Trace this",
    interactiveLabel: "Draw one path",
    createRound: createSerpentineRound,
  },
];

export const GAME_MODE_IDS: readonly GameModeId[] = GAME_MODES.map((mode) => mode.id);

const MODE_BY_ID = new Map<GameModeId, GameModeDefinition>(
  GAME_MODES.map((mode) => [mode.id, mode]),
);

export function getGameMode(id: GameModeId): GameModeDefinition {
  const mode = MODE_BY_ID.get(id);
  if (!mode) {
    throw new Error(`Unknown game mode: ${id}`);
  }
  return mode;
}

export function isGameModeId(value: unknown): value is GameModeId {
  return typeof value === "string" && MODE_BY_ID.has(value as GameModeId);
}

export function cycleGameMode(id: GameModeId, delta: -1 | 1): GameModeId {
  const idx = GAME_MODE_IDS.indexOf(id);
  const next = (idx + delta + GAME_MODE_IDS.length) % GAME_MODE_IDS.length;
  return GAME_MODE_IDS[next];
}
