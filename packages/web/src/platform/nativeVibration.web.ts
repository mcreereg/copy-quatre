import type { NativeVibrationPlugin } from "./nativeVibration";

export class NativeVibrationWeb implements NativeVibrationPlugin {
  async vibrateWaveform(): Promise<void> {
    // Web uses navigator.vibrate fallback in vibration.ts.
  }
}
