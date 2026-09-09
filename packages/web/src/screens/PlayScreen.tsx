import { getFlashOpacity, type GameState } from "@copy-quatre/core";
import { Button } from "../components/Button";
import { Grid } from "../components/Grid";

type PlayScreenProps = {
  state: GameState;
  onPointerDown: (row: number, col: number) => void;
  onPointerEnter: (row: number, col: number) => void;
  onPointerUp: () => void;
  onPause: () => void;
  onResume: () => void;
};

function formatTimer(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayScreen({
  state,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
  onPause,
  onResume,
}: PlayScreenProps) {
  const flashOpacity = getFlashOpacity(state);
  const paused = state.phase === "paused";

  return (
    <div className="screen play-screen">
      {flashOpacity > 0 && (
        <div
          className="flash-overlay"
          style={{ opacity: flashOpacity }}
          aria-hidden="true"
        />
      )}

      <div className="hud">
        <span className="timer">{formatTimer(state.timeRemainingMs)}</span>
        <span className="score-display">Score: {state.score}</span>
        {!paused && (
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

      <div className={`grids-container ${paused ? "grids-paused" : ""}`}>
        <Grid grid={state.reference} label="Copy this" />
        <Grid
          grid={state.interactive}
          interactive={!paused}
          label="Your grid"
          onPointerDown={onPointerDown}
          onPointerEnter={onPointerEnter}
          onPointerUp={onPointerUp}
        />
      </div>
    </div>
  );
}
