import type { Grid as GridType } from "@copy-quatre/core";
import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type MutableRefObject,
  type Ref,
} from "react";
import { cellIgniteKey, useCellToggleAnims } from "./cellIgnite.js";
import { SHAKE_DURATION_MS, type CellShakeSpec } from "./gridShake.js";

type GridProps = {
  grid: GridType;
  interactive?: boolean;
  label?: string;
  gridRef?: Ref<HTMLDivElement>;
  shakeSpecs?: ReadonlyMap<string, CellShakeSpec>;
  cellOnBlink?: boolean;
  cellOffBlink?: boolean;
  longExtinguishKeys?: ReadonlySet<string>;
  onCancelExtinguishRef?: MutableRefObject<(key: string) => void>;
  onCellInteract?: (row: number, col: number) => void;
  onPointerDown?: (row: number, col: number) => void;
  onPointerEnter?: (row: number, col: number) => void;
  onPointerUp?: () => void;
};

function cellFromCoordinates(
  clientX: number,
  clientY: number,
  gridEl: HTMLElement | null,
  size: number,
) {
  if (!gridEl) return null;

  const rect = gridEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const x = Math.min(rect.right, Math.max(rect.left, clientX));
  const y = Math.min(rect.bottom, Math.max(rect.top, clientY));
  const col = Math.min(size - 1, Math.max(0, Math.floor(((x - rect.left) / rect.width) * size)));
  const row = Math.min(size - 1, Math.max(0, Math.floor(((y - rect.top) / rect.height) * size)));
  return { row, col };
}

function cellFromPoint(
  clientX: number,
  clientY: number,
  gridEl: HTMLElement | null,
  size: number,
) {
  const target = document.elementFromPoint?.(clientX, clientY);
  const cell = target?.closest("[data-cell]") as HTMLElement | null;
  if (cell && gridEl?.contains(cell)) {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (Number.isInteger(row) && Number.isInteger(col)) return { row, col };
  }

  return cellFromCoordinates(clientX, clientY, gridEl, size);
}

function cellClassName(
  on: boolean,
  key: string,
  igniteKeys: ReadonlySet<string>,
  extinguishKeys: ReadonlySet<string>,
  slowExtinguishKeys: ReadonlySet<string>,
  shaking: boolean,
): string {
  const ignite = on && igniteKeys.has(key);
  const extinguish = !on && extinguishKeys.has(key);
  const slowExtinguish = extinguish && slowExtinguishKeys.has(key);
  return `cell ${on ? "cell-on" : "cell-off"}${ignite ? " cell-ignite" : ""}${extinguish ? " cell-extinguish" : ""}${slowExtinguish ? " cell-extinguish-slow" : ""}${shaking ? " cell-shake" : ""}`;
}

function cellShakeStyle(spec: CellShakeSpec | undefined): CSSProperties | undefined {
  if (!spec) return undefined;
  return {
    "--shake-x": `${spec.dx}px`,
    "--shake-y": `${spec.dy}px`,
    "--shake-rot": `${spec.rotDeg}deg`,
    "--shake-delay": `${spec.delayMs}ms`,
    "--shake-duration": `${SHAKE_DURATION_MS}ms`,
  } as CSSProperties;
}

export function Grid({
  grid,
  interactive = false,
  label,
  gridRef: externalGridRef,
  shakeSpecs,
  cellOnBlink = true,
  cellOffBlink = true,
  longExtinguishKeys,
  onCancelExtinguishRef,
  onCellInteract,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
}: GridProps) {
  const size = grid.length;
  const gridRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const { igniteKeys, extinguishKeys, slowExtinguishKeys, cancelExtinguish } = useCellToggleAnims(
    grid,
    {
      ignite: interactive && cellOnBlink,
      extinguish: interactive && cellOffBlink,
      longExtinguishKeys,
    },
  );

  useEffect(() => {
    if (onCancelExtinguishRef) {
      onCancelExtinguishRef.current = cancelExtinguish;
    }
  }, [cancelExtinguish, onCancelExtinguishRef]);

  const handleCellInteract = useCallback(
    (row: number, col: number) => {
      onCellInteract?.(row, col);
    },
    [onCellInteract],
  );

  const setGridRef = useCallback(
    (node: HTMLDivElement | null) => {
      gridRef.current = node;
      if (typeof externalGridRef === "function") {
        externalGridRef(node);
      } else if (externalGridRef) {
        externalGridRef.current = node;
      }
    },
    [externalGridRef],
  );
  const pendingOutsideCell = useRef<{ row: number; col: number } | null>(null);

  const endStroke = useCallback(() => {
    if (!interactive || !dragging.current) return;
    dragging.current = false;
    pendingOutsideCell.current = null;
    onPointerUp?.();
  }, [interactive, onPointerUp]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!interactive || !dragging.current) return;
      const cell = cellFromCoordinates(event.clientX, event.clientY, gridRef.current, size);
      if (!cell) return;

      const pending = pendingOutsideCell.current;
      if (pending) {
        if (cell.row === pending.row && cell.col === pending.col) {
          pendingOutsideCell.current = null;
          handleCellInteract(cell.row, cell.col);
          onPointerDown?.(cell.row, cell.col);
        }
        return;
      }

      handleCellInteract(cell.row, cell.col);
      onPointerEnter?.(cell.row, cell.col);
    },
    [handleCellInteract, interactive, onPointerDown, onPointerEnter, size],
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
        ref={setGridRef}
        className={`grid ${interactive ? "grid-interactive" : "grid-readonly"}`}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        onPointerDown={(e) => {
          if (!interactive) return;
          e.preventDefault();
          dragging.current = true;

          const hitCell = (e.target as HTMLElement).closest("[data-cell]") as HTMLElement | null;
          if (hitCell) {
            pendingOutsideCell.current = null;
            const row = Number(hitCell.dataset.row);
            const col = Number(hitCell.dataset.col);
            handleCellInteract(row, col);
            onPointerDown?.(row, col);
            return;
          }

          const cell = cellFromPoint(e.clientX, e.clientY, gridRef.current, size);
          if (!cell) {
            dragging.current = false;
            return;
          }
          pendingOutsideCell.current = cell;
        }}
      >
        {grid.map((row, r) =>
          row.map((on, c) => {
            const key = cellIgniteKey(r, c);
            const shake = shakeSpecs?.get(key);
            return (
              <div
                key={key}
                data-cell
                data-row={r}
                data-col={c}
                className={cellClassName(
                  on,
                  key,
                  igniteKeys,
                  extinguishKeys,
                  slowExtinguishKeys,
                  shake !== undefined,
                )}
                style={cellShakeStyle(shake)}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
