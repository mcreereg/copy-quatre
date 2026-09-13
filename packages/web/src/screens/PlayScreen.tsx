import {
  isAnimationActive,
  type CellCoordinate,
  type GameAction,
  type GameEvent,
  type GameState,
} from "@copy-quatre/core";
import { useCallback, useRef, useState } from "react";
import { Button } from "../components/Button";
import { cellIgniteKey } from "../components/cellIgnite";
import { ExplodeLayer } from "../components/ExplodeLayer";
import { Grid } from "../components/Grid";
import { GridHintArrow } from "../components/GridHintArrow";
import { HINT_TOTAL_MS } from "../components/gridHintGeometry";
import { PATH_FADE_MS, PathOverlay } from "../components/PathOverlay";
import { useExplodeAnimation } from "../hooks/useExplodeAnimation";
import { useGridLayout } from "../hooks/useGridLayout";
import { vibrateInvalidSolve, vibrateMatch } from "../platform/vibration";

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

function handlePlayEvents(
  events: GameEvent[],
  options: {
    spawn: (matchedReference: GameState["reference"], matchedInteractive: GameState["interactive"]) => void;
    vibrationEnabled: boolean;
    onStrokeFailed: (path: CellCoordinate[], turnedOffCells: CellCoordinate[]) => void;
  },
) {
  for (const event of events) {
    if (event.type === "SCORED") {
      options.spawn(event.matchedReference, event.matchedInteractive);
      if (options.vibrationEnabled) vibrateMatch();
    }
    if (event.type === "STROKE_FAILED") {
      options.onStrokeFailed(event.path, event.turnedOffCells);
      if (options.vibrationEnabled) vibrateInvalidSolve();
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
  const isSerpentine = state.settings.mode === "serpentine";
  const playScreenRef = useRef<HTMLDivElement>(null);
  const gridsContainerRef = useRef<HTMLDivElement>(null);
  const referenceGridRef = useRef<HTMLDivElement>(null);
  const interactiveGridRef = useRef<HTMLDivElement>(null);
  const [hintActive, setHintActive] = useState(false);
  const [hintKey, setHintKey] = useState(0);
  const cancelExtinguishRef = useRef<(key: string) => void>(() => {});
  const [fadingPath, setFadingPath] = useState<CellCoordinate[] | null>(null);
  const [failExtinguishKeys, setFailExtinguishKeys] = useState<Set<string>>(() => new Set());
  const sideBySide = useGridLayout(playScreenRef, !paused);
  const { cells, midlines, shakes, spawn } = useExplodeAnimation(
    referenceGridRef,
    interactiveGridRef,
    state.settings.animations,
    sideBySide,
  );
  const cellOnBlink = isAnimationActive(state.settings.animations, "cellOnBlink");
  const cellOffBlink = isAnimationActive(state.settings.animations, "cellOffBlink");

  const handleStrokeFailed = useCallback(
    (path: CellCoordinate[], turnedOffCells: CellCoordinate[]) => {
      setFadingPath(path);
      setFailExtinguishKeys(
        new Set(turnedOffCells.map((cell) => cellIgniteKey(cell.row, cell.col))),
      );
      window.setTimeout(() => {
        setFadingPath(null);
      }, PATH_FADE_MS);
    },
    [],
  );

  const dispatchWithEvents = useCallback(
    (action: GameAction) => {
      const events = dispatch(action);
      handlePlayEvents(events, {
        spawn,
        vibrationEnabled: state.settings.vibration,
        onStrokeFailed: handleStrokeFailed,
      });
      return events;
    },
    [dispatch, handleStrokeFailed, spawn, state.settings.vibration],
  );

  const handleCellInteract = useCallback((row: number, col: number) => {
    const key = cellIgniteKey(row, col);
    if (!failExtinguishKeys.has(key)) return;
    setFailExtinguishKeys((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    cancelExtinguishRef.current(key);
  }, [failExtinguishKeys]);

  const handlePointerDown = useCallback(
    (row: number, col: number) => {
      dispatchWithEvents({ type: "POINTER_DOWN", row, col });
    },
    [dispatchWithEvents],
  );

  const handlePointerEnter = useCallback(
    (row: number, col: number) => {
      dispatchWithEvents({ type: "POINTER_ENTER", row, col });
    },
    [dispatchWithEvents],
  );

  const handlePointerUp = useCallback(() => {
    dispatchWithEvents({ type: "POINTER_UP" });
  }, [dispatchWithEvents]);

  const handleReferenceTap = useCallback(() => {
    setHintKey((key) => key + 1);
    setHintActive(true);
    window.setTimeout(() => setHintActive(false), HINT_TOTAL_MS);
  }, []);

  const activePath = (state.strokePath?.length ?? 0) >= 2 ? state.strokePath : [];

  return (
    <div className="screen play-screen" ref={playScreenRef}>
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
        <div
          ref={gridsContainerRef}
          className={`grids-container${sideBySide ? " grids-side-by-side" : ""}`}
        >
          <Grid
            grid={state.reference}
            gridRef={referenceGridRef}
            shakeSpecs={shakes?.ref}
            onReferenceTap={handleReferenceTap}
          />
          <Grid
            grid={state.interactive}
            interactive
            gridRef={interactiveGridRef}
            hintGlowActive={hintActive}
            hintGlowKey={hintKey}
            shakeSpecs={shakes?.int}
            cellOnBlink={cellOnBlink}
            cellOffBlink={cellOffBlink}
            longExtinguishKeys={failExtinguishKeys}
            onCancelExtinguishRef={cancelExtinguishRef}
            onCellInteract={handleCellInteract}
            onPointerDown={handlePointerDown}
            onPointerEnter={handlePointerEnter}
            onPointerUp={handlePointerUp}
            overlay={
              isSerpentine ? (
                <>
                  {fadingPath && fadingPath.length >= 2 && (
                    <PathOverlay path={fadingPath} gridRef={interactiveGridRef} fading />
                  )}
                  {activePath.length >= 2 && (
                    <PathOverlay path={activePath} gridRef={interactiveGridRef} />
                  )}
                </>
              ) : undefined
            }
          />
          {hintActive && (
            <GridHintArrow
              key={hintKey}
              referenceRef={referenceGridRef}
              interactiveRef={interactiveGridRef}
              gridSize={state.settings.gridSize}
              containerRef={gridsContainerRef}
            />
          )}
        </div>
      )}
    </div>
  );
}
