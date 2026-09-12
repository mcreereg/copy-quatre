import type { CellCoordinate } from "@copy-quatre/core";
import { useLayoutEffect, useState, type RefObject } from "react";

export const PATH_FADE_MS = 1000;

type PathOverlayProps = {
  path: CellCoordinate[];
  gridRef: RefObject<HTMLDivElement | null>;
  fading?: boolean;
};

type Point = { x: number; y: number };

function cellCentersFromGrid(gridEl: HTMLElement, size: number): Point[] {
  const rect = gridEl.getBoundingClientRect();
  const cellW = rect.width / size;
  const cellH = rect.height / size;
  const centers: Point[] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      centers.push({
        x: (col + 0.5) * cellW,
        y: (row + 0.5) * cellH,
      });
    }
  }

  return centers;
}

function pointsForPath(path: CellCoordinate[], size: number, centers: Point[]): Point[] {
  return path.map(({ row, col }) => centers[row * size + col]);
}

function polylinePoints(points: Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function PathOverlay({ path, gridRef, fading = false }: PathOverlayProps) {
  const [layout, setLayout] = useState<{ width: number; height: number; points: Point[] } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (path.length < 2) {
      setLayout(null);
      return;
    }

    const gridEl = gridRef.current;
    if (!gridEl) {
      setLayout(null);
      return;
    }

    const update = () => {
      const rect = gridEl.getBoundingClientRect();
      const size = Math.round(Math.sqrt(gridEl.querySelectorAll("[data-cell]").length));
      if (!size) {
        setLayout(null);
        return;
      }
      const centers = cellCentersFromGrid(gridEl, size);
      setLayout({
        width: rect.width,
        height: rect.height,
        points: pointsForPath(path, size, centers),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(gridEl);
    return () => observer.disconnect();
  }, [path, gridRef]);

  if (!layout || path.length < 2) return null;

  return (
    <svg
      className={`path-overlay${fading ? " path-overlay-fading" : ""}`}
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
    >
      <polyline
        className="path-overlay-line"
        points={polylinePoints(layout.points)}
        fill="none"
      />
    </svg>
  );
}
