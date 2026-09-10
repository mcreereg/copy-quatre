import { countComponents, density, type Grid } from "@copy-quatre/core";

type MiniGridProps = {
  grid: Grid;
  index: number;
};

export function MiniGrid({ grid, index }: MiniGridProps) {
  const size = grid.length;
  const d = density(grid);
  const components = countComponents(grid);

  return (
    <figure className="mini-grid">
      <figcaption>
        #{index + 1} · d={d.toFixed(2)} · c={components}
      </figcaption>
      <div
        className="mini-grid-cells"
        style={{
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          aspectRatio: "1",
        }}
      >
        {grid.flatMap((row, r) =>
          row.map((on, c) => (
            <div key={`${r}-${c}`} className={`mini-cell${on ? " on" : ""}`} />
          )),
        )}
      </div>
    </figure>
  );
}
