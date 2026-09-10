import { describe, expect, it } from "vitest";
import { getThemeTokens } from "./themes.js";

describe("themes", () => {
  it("returns tokens for dark yellow", () => {
    const t = getThemeTokens("yellow", "dark");
    expect(t.accent).toBe("#ffff28");
    expect(t.bg).toBe("#1a1a1e");
    expect(t.cellOn).toBe(t.accent);
    expect(t.cellOnBright).toBe("#ffffa9");
    expect(t.bgFlash).toBe("#8d8d23");
  });

  it("flash color is average of accent and background", () => {
    const light = getThemeTokens("yellow", "light");
    expect(light.bgFlash).toBe("#fafa90");
  });

  it("returns tokens for light cyan", () => {
    const t = getThemeTokens("cyan", "light");
    expect(t.bg).toBe("#f4f4f8");
    expect(t.text).toBe("#1a1a1e");
  });

  it("covers all theme ids", () => {
    for (const theme of ["yellow", "cyan", "magenta", "green", "orange"] as const) {
      const t = getThemeTokens(theme, "dark");
      expect(t.accent).toMatch(/^#/);
      expect(t.cellOnBright).toMatch(/^#/);
      expect(t.cellOnBright).not.toBe(t.cellOn);
    }
  });
});
