import type { Rng } from "../rng.js";
import type { CellCoordinate, GameModeId, GameRound, SessionSettings } from "../types.js";

export type ShiftDirection = "north" | "east" | "south" | "west";

export type ChunkShift = {
  sourceRow: number;
  sourceCol: number;
  height: number;
  width: number;
  direction: ShiftDirection;
};

export type { CellCoordinate };

export type ImposterRoundMetadata = {
  toggleCount: number;
  toggledCells: CellCoordinate[];
  shiftCount: number;
  shifts: ChunkShift[];
  hammingDistance: number;
};

export type ImposterRound = GameRound & {
  metadata: ImposterRoundMetadata;
};

export type RoundGenerationContext = {
  settings: SessionSettings;
  rng: Rng;
  avoidReferenceHash?: string;
};

export type GameModeDefinition = {
  id: GameModeId;
  name: string;
  description: string;
  createRound(context: RoundGenerationContext): GameRound;
};
