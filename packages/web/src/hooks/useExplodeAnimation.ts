import type { Grid } from "@copy-quatre/core";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  buildFlyingCells,
  GRIDS_SIDE_BY_SIDE_QUERY,
  isRectOffScreen,
  type FlyingCell,
} from "./explodeAnimation.js";

export function useExplodeAnimation(
  referenceGridRef: RefObject<HTMLDivElement | null>,
  interactiveGridRef: RefObject<HTMLDivElement | null>,
) {
  const [cells, setCells] = useState<FlyingCell[]>([]);
  const cellsRef = useRef<FlyingCell[]>([]);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const runningRef = useRef(false);

  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastFrameRef.current = 0;

    const tick = (now: number) => {
      const dt = lastFrameRef.current ? now - lastFrameRef.current : 0;
      lastFrameRef.current = now;

      if (dt > 0 && cellsRef.current.length > 0) {
        const next = cellsRef.current
          .map((cell) => ({
            ...cell,
            x: cell.x + cell.vx * dt,
            y: cell.y + cell.vy * dt,
          }))
          .filter((cell) => !isRectOffScreen(cell.x, cell.y, cell.width, cell.height));

        cellsRef.current = next;
        setCells([...next]);
      }

      if (cellsRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        runningRef.current = false;
        lastFrameRef.current = 0;
        rafRef.current = 0;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      runningRef.current = false;
    };
  }, []);

  const spawn = useCallback(
    (matchedReference: Grid, matchedInteractive: Grid) => {
      const referenceEl = referenceGridRef.current;
      const interactiveEl = interactiveGridRef.current;
      if (!referenceEl || !interactiveEl) return;

      const sideBySide = window.matchMedia(GRIDS_SIDE_BY_SIDE_QUERY).matches;
      const spawned = buildFlyingCells(
        matchedReference,
        matchedInteractive,
        referenceEl,
        interactiveEl,
        sideBySide,
      );
      if (spawned.length === 0) return;

      cellsRef.current = [...cellsRef.current, ...spawned];
      setCells([...cellsRef.current]);
      startLoop();
    },
    [interactiveGridRef, referenceGridRef, startLoop],
  );

  return { cells, spawn };
}
