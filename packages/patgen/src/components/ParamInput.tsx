import type { AlgorithmParams, ParamDef } from "@copy-quatre/core";
import { ParamHelp } from "./ParamHelp.js";

type ParamInputProps = {
  def: ParamDef;
  value: number | boolean | string | number[];
  onChange: (key: string, value: number | boolean | string | number[]) => void;
};

function formatArrayValue(value: number[]): string {
  return value.join(",");
}

function parseArrayValue(raw: string): number[] {
  return raw.split(",").map((s) => Number(s.trim()));
}

export function ParamInput({ def, value, onChange }: ParamInputProps) {
  const id = `param-${def.key}`;

  return (
    <label className="param-field" htmlFor={id}>
      <span className="param-label">
        {def.label}
        <ParamHelp description={def.description}>ⓘ</ParamHelp>
      </span>
      {def.type === "boolean" ? (
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(def.key, e.target.checked)}
        />
      ) : def.type === "enum" && def.options ? (
        <select
          id={id}
          value={String(value)}
          onChange={(e) => onChange(def.key, e.target.value)}
        >
          {def.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : def.type === "numberArray" ? (
        <input
          id={id}
          type="text"
          value={formatArrayValue(value as number[])}
          onChange={(e) => onChange(def.key, parseArrayValue(e.target.value))}
        />
      ) : (
        <input
          id={id}
          type="number"
          value={Number(value)}
          min={def.min}
          max={def.max}
          step={def.step ?? 1}
          onChange={(e) => onChange(def.key, Number(e.target.value))}
        />
      )}
    </label>
  );
}

export function defaultParamsFromDefs(defs: ParamDef[]): AlgorithmParams {
  const params: AlgorithmParams = {};
  for (const def of defs) {
    params[def.key] = def.default;
  }
  return params;
}
