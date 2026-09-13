import { Capacitor } from "@capacitor/core";
import { NativeVibration } from "./nativeVibration";

const MATCH_VIBRATION_TIMINGS = [100, 100, 100, 100, 100];
const MATCH_VIBRATION_AMPLITUDES = [200, 160, 120, 80, 40];
const MATCH_VIBRATION_PATTERN = [55, 12, 38, 12, 24, 12, 14, 12, 8];
const TIME_EXPIRED_VIBRATION_PATTERN = [75, 75, 75, 75, 75];
const TOGGLE_ON_VIBRATION_MS = 50;
const INVALID_SOLVE_VIBRATION_PATTERN = [50, 50, 50];
const INVALID_SOLVE_VIBRATION_TIMINGS = [50, 50, 50];
const INVALID_SOLVE_VIBRATION_AMPLITUDES = [50, 0, 50];

function vibrateWebPattern(pattern: number | number[]): void {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate(pattern);
}

export function vibrateMatch(): void {
  if (Capacitor.getPlatform() === "android") {
    void NativeVibration.vibrateWaveform({
      timings: MATCH_VIBRATION_TIMINGS,
      amplitudes: MATCH_VIBRATION_AMPLITUDES,
    }).catch(() => {
      vibrateWebPattern(MATCH_VIBRATION_PATTERN);
    });
    return;
  }

  vibrateWebPattern(MATCH_VIBRATION_PATTERN);
}

export function vibrateToggleOn(): void {
  vibrateWebPattern(TOGGLE_ON_VIBRATION_MS);
}

export function vibrateTimeExpired(): void {
  vibrateWebPattern(TIME_EXPIRED_VIBRATION_PATTERN);
}

export function vibrateInvalidSolve(): void {
  if (Capacitor.getPlatform() === "android") {
    void NativeVibration.vibrateWaveform({
      timings: INVALID_SOLVE_VIBRATION_TIMINGS,
      amplitudes: INVALID_SOLVE_VIBRATION_AMPLITUDES,
    }).catch(() => {
      vibrateWebPattern(INVALID_SOLVE_VIBRATION_PATTERN);
    });
    return;
  }

  vibrateWebPattern(INVALID_SOLVE_VIBRATION_PATTERN);
}

export {
  INVALID_SOLVE_VIBRATION_AMPLITUDES,
  INVALID_SOLVE_VIBRATION_PATTERN,
  INVALID_SOLVE_VIBRATION_TIMINGS,
  MATCH_VIBRATION_AMPLITUDES,
  MATCH_VIBRATION_PATTERN,
  MATCH_VIBRATION_TIMINGS,
  TIME_EXPIRED_VIBRATION_PATTERN,
  TOGGLE_ON_VIBRATION_MS,
};
