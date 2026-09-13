import { useEffect, useRef, useState } from "react";
import { glowOpacityAtElapsed, HINT_TOTAL_MS } from "./gridHintGeometry.js";

type GridGlowProps = {
  active: boolean;
  animationKey: number;
};

export function GridGlow({ active, animationKey }: GridGlowProps) {
  const [opacity, setOpacity] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setOpacity(0);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      setOpacity(glowOpacityAtElapsed(elapsed));
      if (elapsed < HINT_TOTAL_MS) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    setOpacity(0);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, animationKey]);

  if (!active && opacity <= 0) return null;

  return <div className="grid-glow" style={{ opacity }} aria-hidden="true" />;
}
