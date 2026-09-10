import type { FlyingCell } from "../hooks/explodeAnimation.js";

type ExplodeLayerProps = {
  cells: FlyingCell[];
};

export function ExplodeLayer({ cells }: ExplodeLayerProps) {
  if (cells.length === 0) return null;

  return (
    <div className="explode-layer" aria-hidden="true">
      {cells.map((cell) => (
        <div
          key={cell.id}
          className="flying-cell cell-on"
          style={{
            left: cell.x,
            top: cell.y,
            width: cell.width,
            height: cell.height,
          }}
        />
      ))}
    </div>
  );
}
