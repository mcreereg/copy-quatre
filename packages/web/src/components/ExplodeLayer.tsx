import type { FlyingCell, MidlineBlast } from "../hooks/explodeAnimation.js";

type ExplodeLayerProps = {
  cells: FlyingCell[];
  midlines: MidlineBlast[];
};

export function ExplodeLayer({ cells, midlines }: ExplodeLayerProps) {
  if (cells.length === 0 && midlines.length === 0) return null;

  return (
    <div className="explode-layer" aria-hidden="true">
      {midlines.map((line) => (
        <div
          key={line.id}
          className={`explode-midline explode-midline-${line.splitAxis}`}
          style={{
            left: line.x,
            top: line.y,
            width: line.width,
            height: line.height,
          }}
        />
      ))}
      {cells.map((cell) => (
        <div
          key={cell.id}
          className="flying-cell cell-on"
          style={{
            width: cell.width,
            height: cell.height,
            opacity: cell.opacity,
            transform: `translate3d(${cell.x}px, ${cell.y}px, 0) rotate(${cell.rotation}deg) scale(${cell.scale})`,
          }}
        />
      ))}
    </div>
  );
}
