import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), "../package.json");

export function resolveAppVersionDisplay(env = process.env) {
  const { version } = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const isBeta = env.VITE_BETA_BUILD === "true";
  const sha = env.VITE_GIT_SHA?.slice(0, 7);

  if (isBeta && sha) {
    return `v${version}-beta-${sha}`;
  }

  return `v${version}`;
}
