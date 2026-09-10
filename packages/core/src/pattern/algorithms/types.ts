import type { Rng } from "../../rng.js";
import type { Grid } from "../../types.js";

export type ParamType = "number" | "boolean" | "enum" | "numberArray";

export type ParamDef = {
  key: string;
  label: string;
  type: ParamType;
  default: number | boolean | string | number[];
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description: string;
};

export type AlgorithmParams = Record<string, number | boolean | string | number[]>;

export type AlgorithmDefinition = {
  id: string;
  name: string;
  description: string;
  params: ParamDef[];
  generate: (size: number, rng: Rng, params: AlgorithmParams) => Grid;
};

export function resolveParams(
  defs: ParamDef[],
  overrides: AlgorithmParams = {},
): AlgorithmParams {
  const resolved: AlgorithmParams = {};
  for (const def of defs) {
    resolved[def.key] = overrides[def.key] ?? def.default;
  }
  return resolved;
}

export function paramNumber(params: AlgorithmParams, key: string): number {
  const value = params[key];
  if (typeof value !== "number") {
    throw new TypeError(`Expected number param "${key}", got ${typeof value}`);
  }
  return value;
}

export function paramBoolean(params: AlgorithmParams, key: string): boolean {
  const value = params[key];
  if (typeof value !== "boolean") {
    throw new TypeError(`Expected boolean param "${key}", got ${typeof value}`);
  }
  return value;
}

/** Append a typical-value hint to a param tooltip / help string. */
export function desc(text: string, typical: string): string {
  return `${text} Typical: ${typical}.`;
}

export function paramNumberArray(params: AlgorithmParams, key: string): number[] {
  const value = params[key];
  if (!Array.isArray(value) || value.some((v) => typeof v !== "number")) {
    throw new TypeError(`Expected number[] param "${key}"`);
  }
  return value;
}

export const DENSITY_PARAMS: ParamDef[] = [
  {
    key: "minDensity",
    label: "Min density",
    type: "number",
    default: 0.25,
    min: 0.05,
    max: 0.95,
    step: 0.05,
    description: desc(
      "Lower bound on filled cells as a fraction of grid area. Patterns below this are rejected.",
      "0.20–0.35",
    ),
  },
  {
    key: "maxDensity",
    label: "Max density",
    type: "number",
    default: 0.65,
    min: 0.05,
    max: 0.95,
    step: 0.05,
    description: desc(
      "Upper bound on filled cells as a fraction of grid area. Patterns above this are rejected.",
      "0.55–0.75",
    ),
  },
];

export const COMPONENT_PARAMS: ParamDef[] = [
  {
    key: "maxComponents",
    label: "Max components",
    type: "number",
    default: 4,
    min: 1,
    max: 20,
    step: 1,
    description: desc(
      "Maximum number of disconnected ON regions allowed in a valid pattern.",
      "2–5",
    ),
  },
  {
    key: "preferredMaxComponents",
    label: "Preferred max components",
    type: "number",
    default: 3,
    min: 1,
    max: 20,
    step: 1,
    description: desc(
      "Patterns with more than this many components are only accepted on late retry attempts.",
      "1–3",
    ),
  },
];
