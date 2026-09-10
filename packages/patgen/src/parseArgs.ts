import {
  DEFAULT_ALGORITHM_ID,
  getAlgorithm,
  PATGEN_GLOBAL_PARAMS,
  PATTERN_ALGORITHMS,
  type AlgorithmParams,
  type ParamDef,
} from "@copy-quatre/core";

export type CliOptions = {
  algorithmId: string;
  gridSize: number;
  count: number;
  seed: number;
  params: AlgorithmParams;
  help: boolean;
  list: boolean;
};

function camelToKebab(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function kebabToCamel(key: string): string {
  return key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function parseValue(def: ParamDef, raw: string): number | boolean | string | number[] {
  switch (def.type) {
    case "number":
      return Number(raw);
    case "boolean":
      return raw === "true" || raw === "1";
    case "enum":
      return raw;
    case "numberArray":
      return raw.split(",").map((s) => Number(s.trim()));
    default:
      return raw;
  }
}

function formatHelp(algorithmId?: string): string {
  const lines: string[] = ["patgen — local pattern generator dev tool", ""];

  if (!algorithmId) {
    lines.push("Usage: patgen [options]", "");
    lines.push("Global options:");
    for (const p of PATGEN_GLOBAL_PARAMS) {
      lines.push(`  --${camelToKebab(p.key)} <n>  ${p.label} (default ${p.default})`);
      lines.push(`      ${p.description}`);
    }
    lines.push(`  --algorithm <id>     Algorithm (default ${DEFAULT_ALGORITHM_ID})`);
    lines.push("  --list               List algorithms");
    lines.push("  --help               Show help");
    lines.push("");
    lines.push("Algorithms:");
    for (const algo of PATTERN_ALGORITHMS) {
      lines.push(`  ${algo.id}  ${algo.name}`);
    }
    lines.push("");
    lines.push("Run with --help --algorithm <id> for algorithm-specific flags.");
    return lines.join("\n");
  }

  const algo = getAlgorithm(algorithmId);
  if (!algo) {
    return `Unknown algorithm: ${algorithmId}`;
  }

  lines.push(`Algorithm: ${algo.id} — ${algo.name}`);
  lines.push(algo.description, "");
  lines.push("Options:");
  for (const p of PATGEN_GLOBAL_PARAMS) {
    lines.push(`  --${camelToKebab(p.key)}  ${p.description} (default ${p.default})`);
  }
  for (const p of algo.params) {
    lines.push(`  --${camelToKebab(p.key)}  ${p.description} (default ${JSON.stringify(p.default)})`);
  }
  return lines.join("\n");
}

export function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    algorithmId: DEFAULT_ALGORITHM_ID,
    gridSize: 10,
    count: 16,
    seed: 1,
    params: {},
    help: false,
    list: false,
  };

  const globalKeys = new Set(PATGEN_GLOBAL_PARAMS.map((p) => p.key));
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "--") {
      i++;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      i++;
      continue;
    }
    if (arg === "--list") {
      options.list = true;
      i++;
      continue;
    }
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = kebabToCamel(arg.slice(2));
    if (key === "algorithm") {
      options.algorithmId = argv[++i] ?? DEFAULT_ALGORITHM_ID;
      i++;
      continue;
    }

    const globalDef = PATGEN_GLOBAL_PARAMS.find((p) => p.key === key);
    if (globalDef) {
      const raw = argv[++i];
      if (raw === undefined) throw new Error(`Missing value for ${arg}`);
      (options as Record<string, unknown>)[key] = Number(raw);
      i++;
      continue;
    }

    const algo = getAlgorithm(options.algorithmId);
    if (!algo) {
      throw new Error(`Unknown algorithm: ${options.algorithmId}`);
    }
    const paramDef = algo.params.find((p) => p.key === key);
    if (!paramDef) {
      throw new Error(`Unknown flag ${arg} for algorithm ${options.algorithmId}`);
    }
    const raw = argv[++i];
    if (raw === undefined) throw new Error(`Missing value for ${arg}`);
    options.params[key] = parseValue(paramDef, raw);
    i++;
  }

  if (options.help) {
    return options;
  }

  for (const def of getAlgorithm(options.algorithmId)?.params ?? []) {
    if (!(def.key in options.params) && !globalKeys.has(def.key)) {
      options.params[def.key] = def.default;
    }
  }

  return options;
}

export { formatHelp, camelToKebab };
