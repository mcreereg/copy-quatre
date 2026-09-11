import { useLayoutEffect, useState, type RefObject } from "react";
import { measureGridArea, preferSideBySideLayout } from "./gridLayout.js";

export function useGridLayout(
  playScreenRef: RefObject<HTMLElement | null>,
  active: boolean,
): boolean {
  const [sideBySide, setSideBySide] = useState(false);

  useLayoutEffect(() => {
    if (!active) return;

    const el = playScreenRef.current;
    if (!el) return;

    const update = () => {
      const metrics = measureGridArea(el);
      if (!metrics) return;
      setSideBySide(preferSideBySideLayout(metrics));
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(el);

    const container = el.querySelector(".grids-container");
    if (container) observer.observe(container);

    return () => observer.disconnect();
  }, [playScreenRef, active]);

  return sideBySide;
}
