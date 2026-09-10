import {
  DEFAULT_ALGORITHM_ID,
  PATGEN_GLOBAL_PARAMS,
  PATTERN_ALGORITHMS,
  runPatgenBatch,
  type AlgorithmParams,
  type Grid,
} from "@copy-quatre/core";
import { useMemo, useState } from "react";
import { MiniGrid } from "./components/MiniGrid.js";
import { ParamInput, defaultParamsFromDefs } from "./components/ParamInput.js";
import { ParamHelp } from "./components/ParamHelp.js";

export function App() {
  const [algorithmId, setAlgorithmId] = useState(DEFAULT_ALGORITHM_ID);
  const [gridSize, setGridSize] = useState(10);
  const [count, setCount] = useState(16);
  const [seed, setSeed] = useState(1);
  const [params, setParams] = useState<AlgorithmParams>({});
  const [patterns, setPatterns] = useState<Grid[]>([]);

  const algorithm = useMemo(
    () => PATTERN_ALGORITHMS.find((a) => a.id === algorithmId) ?? PATTERN_ALGORITHMS[0],
    [algorithmId],
  );

  const effectiveParams = useMemo(
    () => ({ ...defaultParamsFromDefs(algorithm.params), ...params }),
    [algorithm, params],
  );

  const onAlgorithmChange = (id: string) => {
    setAlgorithmId(id);
    const next = PATTERN_ALGORITHMS.find((a) => a.id === id);
    setParams(next ? defaultParamsFromDefs(next.params) : {});
    setPatterns([]);
  };

  const onParamChange = (key: string, value: number | boolean | string | number[]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const generate = () => {
    setPatterns(
      runPatgenBatch({
        algorithmId,
        gridSize,
        count,
        seed,
        params: effectiveParams,
      }),
    );
  };

  return (
    <div className="app">
      <header className="header">
        <h1>patgen</h1>
        <p className="subtitle">Local pattern generator dev tool (PC only)</p>
      </header>

      <section className="controls">
        <label className="param-field">
          <span className="param-label">
            Algorithm
            <ParamHelp description={algorithm.description}>ⓘ</ParamHelp>
          </span>
          <select value={algorithmId} onChange={(e) => onAlgorithmChange(e.target.value)}>
            {PATTERN_ALGORITHMS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        {PATGEN_GLOBAL_PARAMS.map((def) => {
          const value =
            def.key === "gridSize" ? gridSize : def.key === "count" ? count : seed;
          const setValue =
            def.key === "gridSize"
              ? setGridSize
              : def.key === "count"
                ? setCount
                : setSeed;

          return (
            <label key={def.key} className="param-field" htmlFor={`global-${def.key}`}>
              <span className="param-label">
                {def.label}
                <ParamHelp description={def.description}>ⓘ</ParamHelp>
              </span>
              <input
                id={`global-${def.key}`}
                type="number"
                value={value}
                min={def.min}
                max={def.max}
                step={def.step}
                onChange={(e) => setValue(Number(e.target.value))}
              />
            </label>
          );
        })}

        {algorithm.params.map((def) => (
          <ParamInput
            key={def.key}
            def={def}
            value={effectiveParams[def.key] ?? def.default}
            onChange={onParamChange}
          />
        ))}

        <button type="button" className="generate-btn" onClick={generate}>
          Generate
        </button>
      </section>

      <section className="results">
        {patterns.length === 0 ? (
          <p className="empty">Click Generate to preview patterns.</p>
        ) : (
          <div className="pattern-grid">
            {patterns.map((grid, i) => (
              <MiniGrid key={i} grid={grid} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
