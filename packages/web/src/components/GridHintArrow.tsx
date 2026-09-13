import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  arrowEndpointsAtProgress,
  arrowOpacityAtElapsed,
  arrowProgressAtElapsed,
  buildArrowPath,
  HINT_TOTAL_MS,
  type Rect,
} from "./gridHintGeometry.js";

type GridHintArrowProps = {
  referenceRef: RefObject<HTMLDivElement | null>;
  interactiveRef: RefObject<HTMLDivElement | null>;
  gridSize: number;
  containerRef: RefObject<HTMLElement | null>;
};

type ArrowLayout = {
  width: number;
  height: number;
  path: string;
  outlineWidth: number;
};

function elementRect(el: HTMLElement, container: DOMRect): Rect {
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left - container.left,
    top: rect.top - container.top,
    width: rect.width,
    height: rect.height,
  };
}

export function GridHintArrow({
  referenceRef,
  interactiveRef,
  gridSize,
  containerRef,
}: GridHintArrowProps) {
  const [layout, setLayout] = useState<ArrowLayout | null>(null);
  const [opacity, setOpacity] = useState(1);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  useLayoutEffect(() => {
    const referenceEl = referenceRef.current;
    const interactiveEl = interactiveRef.current;
    const containerEl =
      containerRef.current ??
      referenceEl.closest(".grids-container") ??
      interactiveEl.closest(".grids-container");
    if (!referenceEl || !interactiveEl || !containerEl) {
      setLayout(null);
      return;
    }

    const updatePath = (progress: number) => {
      const containerRect = containerEl.getBoundingClientRect();
      const referenceRect = elementRect(referenceEl, containerRect);
      const interactiveRect = elementRect(interactiveEl, containerRect);
      const { tail, head } = arrowEndpointsAtProgress(referenceRect, interactiveRect, progress);
      const cellSide = referenceRect.width / gridSize;
      const outlineWidth = cellSide * 0.1;
      const shaftWidth = cellSide * 0.45;
      const headLength = cellSide * 0.55;
      const headWidth = cellSide * 0.9;

      setLayout({
        width: containerRect.width,
        height: containerRect.height,
        path: buildArrowPath(tail, head, shaftWidth, headLength, headWidth),
        outlineWidth,
      });
    };

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      updatePath(arrowProgressAtElapsed(elapsed));
      setOpacity(arrowOpacityAtElapsed(elapsed));
      if (elapsed < HINT_TOTAL_MS) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    startRef.current = performance.now();
    updatePath(0);
    setOpacity(1);
    rafRef.current = requestAnimationFrame(tick);

    const observer = new ResizeObserver(() => {
      const elapsed = performance.now() - startRef.current;
      updatePath(arrowProgressAtElapsed(elapsed));
    });
    observer.observe(referenceEl);
    observer.observe(interactiveEl);
    observer.observe(containerEl);

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef, gridSize, interactiveRef, referenceRef]);

  if (!layout || !layout.path) return null;

  return (
    <svg
      className="grid-hint-arrow"
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <path
        className="grid-hint-arrow-shape"
        d={layout.path}
        strokeWidth={layout.outlineWidth}
      />
    </svg>
  );
}
