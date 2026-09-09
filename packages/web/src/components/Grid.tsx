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

function cellFromPoint(clientX: number, clientY: number, gridEl: HTMLElement | null) {
  if (!gridEl) return null;
  const target = document.elementFromPoint(clientX, clientY);
  const cell = target?.closest("[data-cell]") as HTMLElement | null;
  if (!cell || !gridEl.contains(cell)) return null;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return { row, col };
}

export function Grid({
  grid,
  interactive = false,
  label,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
}: GridProps) {
  const size = grid.length;
  const gridRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const endStroke = useCallback(() => {
    if (!interactive || !dragging.current) return;
    dragging.current = false;
    onPointerUp?.();
  }, [interactive, onPointerUp]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!interactive || !dragging.current) return;
      const cell = cellFromPoint(event.clientX, event.clientY, gridRef.current);
      if (cell) onPointerEnter?.(cell.row, cell.col);
    },
    [interactive, onPointerEnter],
  );

  useEffect(() => {
    if (!interactive) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", endStroke);
    window.addEventListener("pointercancel", endStroke);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endStroke);
      window.removeEventListener("pointercancel", endStroke);
    };
  }, [interactive, handlePointerMove, endStroke]);

  return (
    <div className="grid-wrapper">
      {label && <div className="grid-label">{label}</div>}
      <div
        ref={gridRef}
        className={`grid ${interactive ? "grid-interactive" : "grid-readonly"}`}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {grid.map((row, r) =>
          row.map((on, c) => (
            <div
              key={`${r}-${c}`}
              data-cell
              data-row={r}
              data-col={c}
              className={`cell ${on ? "cell-on" : "cell-off"}`}
              onPointerDown={(e) => {
                if (!interactive) return;
                e.preventDefault();
                dragging.current = true;
                onPointerDown?.(r, c);
              }}
            />
          )),
        )}
      </div>
    </div>
  );
}
