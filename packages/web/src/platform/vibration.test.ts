import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MATCH_VIBRATION_AMPLITUDES,
  MATCH_VIBRATION_PATTERN,
  INVALID_SOLVE_VIBRATION_AMPLITUDES,
  INVALID_SOLVE_VIBRATION_PATTERN,
  INVALID_SOLVE_VIBRATION_TIMINGS,
  MATCH_VIBRATION_TIMINGS,
  TIME_EXPIRED_VIBRATION_PATTERN,
  TOGGLE_ON_VIBRATION_MS,
  vibrateInvalidSolve,
  vibrateMatch,
  vibrateTimeExpired,
  vibrateToggleOn,
} from "./vibration";

const { getPlatformMock, vibrateWaveformMock } = vi.hoisted(() => ({
  getPlatformMock: vi.fn(() => "web"),
  vibrateWaveformMock: vi.fn(() => Promise.resolve()),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: getPlatformMock,
  },
}));

vi.mock("./nativeVibration", () => ({
  NativeVibration: {
    vibrateWaveform: vibrateWaveformMock,
  },
}));

describe("vibrateMatch", () => {
  beforeEach(() => {
    getPlatformMock.mockReturnValue("web");
    vibrateWaveformMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls navigator.vibrate with decreasing pulse pattern on web", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });

    vibrateMatch();

    expect(vibrate).toHaveBeenCalledOnce();
    expect(vibrate).toHaveBeenCalledWith(MATCH_VIBRATION_PATTERN);
    expect(vibrateWaveformMock).not.toHaveBeenCalled();
  });

  it("calls native waveform on android", () => {
    getPlatformMock.mockReturnValue("android");

    vibrateMatch();

    expect(vibrateWaveformMock).toHaveBeenCalledOnce();
    expect(vibrateWaveformMock).toHaveBeenCalledWith({
      timings: MATCH_VIBRATION_TIMINGS,
      amplitudes: MATCH_VIBRATION_AMPLITUDES,
    });
  });

  it("falls back to web pattern when native waveform fails on android", async () => {
    getPlatformMock.mockReturnValue("android");
    vibrateWaveformMock.mockRejectedValueOnce(new Error("native unavailable"));
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });

    vibrateMatch();
    await Promise.resolve();

    expect(vibrateWaveformMock).toHaveBeenCalledOnce();
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

describe("vibrateInvalidSolve", () => {
  beforeEach(() => {
    getPlatformMock.mockReturnValue("web");
    vibrateWaveformMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls navigator.vibrate with double-pulse pattern on web", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });

    vibrateInvalidSolve();

    expect(vibrate).toHaveBeenCalledOnce();
    expect(vibrate).toHaveBeenCalledWith(INVALID_SOLVE_VIBRATION_PATTERN);
    expect(vibrateWaveformMock).not.toHaveBeenCalled();
  });

  it("calls native waveform on android", () => {
    getPlatformMock.mockReturnValue("android");

    vibrateInvalidSolve();

    expect(vibrateWaveformMock).toHaveBeenCalledOnce();
    expect(vibrateWaveformMock).toHaveBeenCalledWith({
      timings: INVALID_SOLVE_VIBRATION_TIMINGS,
      amplitudes: INVALID_SOLVE_VIBRATION_AMPLITUDES,
    });
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
