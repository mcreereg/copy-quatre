import { registerPlugin } from "@capacitor/core";

export interface NativeVibrationPlugin {
  vibrateWaveform(options: {
    timings: number[];
    amplitudes: number[];
  }): Promise<void>;
}

export const NativeVibration = registerPlugin<NativeVibrationPlugin>("NativeVibration", {
  web: () => import("./nativeVibration.web").then((m) => new m.NativeVibrationWeb()),
});
