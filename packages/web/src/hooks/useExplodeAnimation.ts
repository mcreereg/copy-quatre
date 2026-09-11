import type { AnimationSettings, Grid } from "@copy-quatre/core";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  buildGridShake,
  shakeClearDelayMs,
  type GridShakeMaps,
} from "../components/gridShake.js";
import {
  buildExplosion,
  MIDLINE_DURATION_MS,
  stepFlyingCell,
  type FlyingCell,
  type MidlineBlast,
} from "./explodeAnimation.js";

let nextBlastId = 0;

export function useExplodeAnimation(
  referenceGridRef: RefObject<HTMLDivElement | null>,
  interactiveGridRef: RefObject<HTMLDivElement | null>,
  animations: AnimationSettings,
  sideBySide: boolean,
) {
  const [cells, setCells] = useState<FlyingCell[]>([]);
  const [midlines, setMidlines] = useState<MidlineBlast[]>([]);
  const [shakes, setShakes] = useState<GridShakeMaps | null>(null);
  const cellsRef = useRef<FlyingCell[]>([]);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const runningRef = useRef(false);
  const timeoutsRef = useRef<number[]>([]);

  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastFrameRef.current = performance.now();

    const tick = (now: number) => {
      const dt = lastFrameRef.current ? now - lastFrameRef.current : 0;
      lastFrameRef.current = now;

      if (dt > 0 && cellsRef.current.length > 0) {
        let changed = false;
        const next: FlyingCell[] = [];
        for (const cell of cellsRef.current) {
          const stepped = stepFlyingCell(cell, now, dt);
          if (stepped !== cell) changed = true;
          if (stepped) next.push(stepped);
        }

        if (changed) {
          cellsRef.current = next;
          setCells(next);
        }
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
      for (const id of timeoutsRef.current) {
        window.clearTimeout(id);
      }
    };
  }, []);

  const spawn = useCallback(
    (matchedReference: Grid, matchedInteractive: Grid) => {
      if (!animations.enabled) return;

      const referenceEl = referenceGridRef.current;
      const interactiveEl = interactiveGridRef.current;
      if (!referenceEl || !interactiveEl) return;

      const blastId = nextBlastId++;
      const rng = Math.random;

      if (animations.rattlingTiles) {
        setShakes(buildGridShake(referenceEl, interactiveEl, sideBySide, rng));

        const shakeTimeoutId = window.setTimeout(() => {
          setShakes(null);
          timeoutsRef.current = timeoutsRef.current.filter((id) => id !== shakeTimeoutId);
        }, shakeClearDelayMs());
        timeoutsRef.current.push(shakeTimeoutId);
      }

      const wantFlying = animations.flyingTiles;
      const wantMidline = animations.lineFlash;
      if (!wantFlying && !wantMidline) return;

      const spawned = buildExplosion(
        matchedReference,
        matchedInteractive,
        referenceEl,
        interactiveEl,
        sideBySide,
        rng,
        performance.now(),
        `${blastId}-`,
      );
      if (!spawned) return;

      if (wantFlying) {
        cellsRef.current = [...cellsRef.current, ...spawned.cells];
        setCells([...cellsRef.current]);
        startLoop();
      }

      if (wantMidline) {
        setMidlines((current) => [...current, spawned.midline]);

        const midlineTimeoutId = window.setTimeout(() => {
          setMidlines((current) => current.filter((line) => line.id !== spawned.midline.id));
          timeoutsRef.current = timeoutsRef.current.filter((id) => id !== midlineTimeoutId);
        }, MIDLINE_DURATION_MS + 30);
        timeoutsRef.current.push(midlineTimeoutId);
      }
    },
    [animations, interactiveGridRef, referenceGridRef, sideBySide, startLoop],
  );

  return { cells, midlines, shakes, spawn };
}
