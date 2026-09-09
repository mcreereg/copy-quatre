import type { Grid as GridType } from "@copy-quatre/core";
import { useCallback, useEffect, useRef } from "react";

type GridProps = {
  grid: GridType;
  interactive?: boolean;
  label?: string;
  onPointerDown?: (row: number, col: number) => void;
  onPointerEnter?: (row: number, col: number) => void;
  onPointerUp?: () => void;
};

export function Grid({
  grid,
  interactive = false,
  label,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
}: GridProps) {
  const size = grid.length;
  const dragging = useRef(false);

  const handlePointerDown = useCallback(
    (row: number, col: number) => {
      if (!interactive) return;
      dragging.current = true;
      onPointerDown?.(row, col);
    },
    [interactive, onPointerDown],
  );

  const handlePointerEnter = useCallback(
    (row: number, col: number) => {
      if (!interactive || !dragging.current) return;
      onPointerEnter?.(row, col);
    },
    [interactive, onPointerEnter],
  );

  const handlePointerUp = useCallback(() => {
    if (!interactive || !dragging.current) return;
    dragging.current = false;
    onPointerUp?.();
  }, [interactive, onPointerUp]);

  useEffect(() => {
    if (!interactive) return;
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [interactive, handlePointerUp]);

  return (
    <div className="grid-wrapper">
      {label && <div className="grid-label">{label}</div>}
      <div
        className={`grid ${interactive ? "grid-interactive" : "grid-readonly"}`}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {grid.map((row, r) =>
          row.map((on, c) => (
            <div
              key={`${r}-${c}`}
              className={`cell ${on ? "cell-on" : "cell-off"}`}
              onPointerDown={(e) => {
                e.preventDefault();
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                handlePointerDown(r, c);
              }}
              onPointerEnter={() => handlePointerEnter(r, c)}
            />
          )),
        )}
      </div>
    </div>
  );
}
