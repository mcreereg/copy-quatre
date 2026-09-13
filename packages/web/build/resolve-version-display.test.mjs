import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveAppVersionDisplay } from "./resolve-version-display.mjs";

const version = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8"),
).version;

describe("resolveAppVersionDisplay", () => {
  it("returns semver-only label by default", () => {
    expect(resolveAppVersionDisplay({})).toBe(`v${version}`);
  });

  it("appends beta suffix when beta build env is set", () => {
    expect(
      resolveAppVersionDisplay({
        VITE_BETA_BUILD: "true",
        VITE_GIT_SHA: "38e1f82abc1234",
      }),
    ).toBe(`v${version}-beta-38e1f82`);
  });
});
