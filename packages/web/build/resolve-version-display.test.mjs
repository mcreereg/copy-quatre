import { describe, expect, it } from "vitest";
import { resolveAppVersionDisplay } from "./resolve-version-display.mjs";

describe("resolveAppVersionDisplay", () => {
  it("returns semver-only label by default", () => {
    expect(resolveAppVersionDisplay({})).toBe("v2.1.22");
  });

  it("appends beta suffix when beta build env is set", () => {
    expect(
      resolveAppVersionDisplay({
        VITE_BETA_BUILD: "true",
        VITE_GIT_SHA: "38e1f82abc1234",
      }),
    ).toBe("v2.1.22-beta-38e1f82");
  });
});
