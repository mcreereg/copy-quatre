import {
  type GameAction,
  type GameEvent,
  type GameState,
} from "@copy-quatre/core";
import { useCallback, useRef } from "react";
import { Button } from "../components/Button";
import { ExplodeLayer } from "../components/ExplodeLayer";
import { Grid } from "../components/Grid";
import { useExplodeAnimation } from "../hooks/useExplodeAnimation";

type PlayScreenProps = {
  state: GameState;
  dispatch: (action: GameAction) => GameEvent[];
  onPause: () => void;
  onResume: () => void;
  onQuit: () => void;
};

function formatTimer(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function handleScoredEvents(
  events: GameEvent[],
  spawn: (matchedReference: GameState["reference"], matchedInteractive: GameState["interactive"]) => void,
) {
  for (const event of events) {
    if (event.type === "SCORED") {
      spawn(event.matchedReference, event.matchedInteractive);
    }
  }
}

export function PlayScreen({
  state,
  dispatch,
  onPause,
  onResume,
  onQuit,
}: PlayScreenProps) {
  const paused = state.phase === "paused";
  const referenceGridRef = useRef<HTMLDivElement>(null);
  const interactiveGridRef = useRef<HTMLDivElement>(null);
  const { cells, midlines, shakes, spawn } = useExplodeAnimation(
    referenceGridRef,
    interactiveGridRef,
  );

  const handlePointerDown = useCallback(
    (row: number, col: number) => {
      const events = dispatch({ type: "POINTER_DOWN", row, col });
      handleScoredEvents(events, spawn);
    },
    [dispatch, spawn],
  );

  const handlePointerEnter = useCallback(
    (row: number, col: number) => {
      const events = dispatch({ type: "POINTER_ENTER", row, col });
      handleScoredEvents(events, spawn);
    },
    [dispatch, spawn],
  );

  const handlePointerUp = useCallback(() => {
    dispatch({ type: "POINTER_UP" });
  }, [dispatch]);

  return (
    <div className="screen play-screen">
      <ExplodeLayer cells={cells} midlines={midlines} />

      <div className="hud">
        <Button variant="secondary" onClick={onQuit}>
          Quit
        </Button>
        <span className="timer">{formatTimer(state.timeRemainingMs)}</span>
        <span className="score-display">Score: {state.score}</span>
        {paused ? (
          <Button variant="secondary" onClick={onResume}>
            Resume
          </Button>
        ) : (
          <Button variant="secondary" onClick={onPause}>
            Pause
          </Button>
        )}
      </div>

      {paused && (
        <div className="pause-overlay">
          <p>Paused</p>
          <Button onClick={onResume}>Resume</Button>
        </div>
      )}

      {!paused && (
        <div className="grids-container">
          <Grid
            grid={state.reference}
            label="Copy this"
            gridRef={referenceGridRef}
            shakeSpecs={shakes?.ref}
          />
          <Grid
            grid={state.interactive}
            interactive
            label="Your grid"
            gridRef={interactiveGridRef}
            shakeSpecs={shakes?.int}
            onPointerDown={handlePointerDown}
            onPointerEnter={handlePointerEnter}
            onPointerUp={handlePointerUp}
          />
        </div>
      )}
    </div>
  );
}
