import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MATCH_VIBRATION_PATTERN,
  TIME_EXPIRED_VIBRATION_PATTERN,
  TOGGLE_ON_VIBRATION_MS,
  vibrateMatch,
  vibrateTimeExpired,
  vibrateToggleOn,
} from "./vibration";

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

describe("vibrateTimeExpired", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls navigator.vibrate with 3-pulse pattern", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });

    vibrateTimeExpired();

    expect(vibrate).toHaveBeenCalledOnce();
    expect(vibrate).toHaveBeenCalledWith(TIME_EXPIRED_VIBRATION_PATTERN);
  });

  it("no-ops when vibrate is unavailable", () => {
    vi.stubGlobal("navigator", {});

    expect(() => vibrateTimeExpired()).not.toThrow();
  });
});

describe("vibrateToggleOn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls navigator.vibrate with 50ms pulse", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });

    vibrateToggleOn();

    expect(vibrate).toHaveBeenCalledOnce();
    expect(vibrate).toHaveBeenCalledWith(TOGGLE_ON_VIBRATION_MS);
  });

  it("no-ops when vibrate is unavailable", () => {
    vi.stubGlobal("navigator", {});

    expect(() => vibrateToggleOn()).not.toThrow();
  });
});
