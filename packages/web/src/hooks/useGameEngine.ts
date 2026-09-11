import {
  createGameEngine,
  createRng,
  type GameAction,
  type GameEngine,
  type GameEvent,
  type GameState,
} from "@copy-quatre/core";
import { useCallback, useEffect, useRef, useState } from "react";

export function useGameEngine(onEvent?: (event: GameEvent) => void) {
  const engineRef = useRef<GameEngine | null>(null);
  const onEventRef = useRef(onEvent);
  const [state, setState] = useState<GameState | null>(null);

  onEventRef.current = onEvent;

  if (!engineRef.current) {
    engineRef.current = createGameEngine(createRng(Date.now()));
  }

  const dispatch = useCallback(
    (action: GameAction) => {
      const engine = engineRef.current!;
      const events = engine.dispatch(action);
      setState(engine.getState());
      events.forEach((e) => onEventRef.current?.(e));
      return events;
    },
    [],
  );

  useEffect(() => {
    let last = performance.now();
    let raf = 0;

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (dt > 0) {
        const engine = engineRef.current!;
        const events = engine.dispatch({ type: "TICK", dtMs: dt });
        setState(engine.getState());
        events.forEach((e) => onEventRef.current?.(e));
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { state, dispatch };
}
