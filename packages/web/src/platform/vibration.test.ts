import { afterEach, describe, expect, it, vi } from "vitest";
import { MATCH_VIBRATION_PATTERN, vibrateMatch } from "./vibration";

describe("vibrateMatch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls navigator.vibrate with decreasing pulse pattern", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });

    vibrateMatch();

    expect(vibrate).toHaveBeenCalledOnce();
    expect(vibrate).toHaveBeenCalledWith(MATCH_VIBRATION_PATTERN);
  });

  it("no-ops when vibrate is unavailable", () => {
    vi.stubGlobal("navigator", {});

    expect(() => vibrateMatch()).not.toThrow();
  });
});
