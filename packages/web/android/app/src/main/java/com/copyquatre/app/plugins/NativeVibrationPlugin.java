package com.copyquatre.app.plugins;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;

@CapacitorPlugin(name = "NativeVibration")
public class NativeVibrationPlugin extends Plugin {

    @PluginMethod
    public void vibrateWaveform(PluginCall call) {
        JSArray timingsArray = call.getArray("timings");
        JSArray amplitudesArray = call.getArray("amplitudes");

        if (timingsArray == null || amplitudesArray == null) {
            call.reject("timings and amplitudes are required");
            return;
        }

        if (timingsArray.length() != amplitudesArray.length()) {
            call.reject("timings and amplitudes must have the same length");
            return;
        }

        try {
            int len = timingsArray.length();
            long[] timings = new long[len];
            int[] amplitudes = new int[len];

            for (int i = 0; i < len; i++) {
                timings[i] = timingsArray.getLong(i);
                amplitudes[i] = amplitudesArray.getInt(i);
            }

            Vibrator vibrator = getVibrator();
            if (vibrator == null || !vibrator.hasVibrator()) {
                call.resolve();
                return;
            }

            vibrator.cancel();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (vibrator.hasAmplitudeControl()) {
                    vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1));
                } else {
                    long totalMs = 0;
                    for (long timing : timings) {
                        totalMs += timing;
                    }
                    vibrator.vibrate(
                        VibrationEffect.createOneShot(totalMs, VibrationEffect.DEFAULT_AMPLITUDE)
                    );
                }
            } else {
                long totalMs = 0;
                for (long timing : timings) {
                    totalMs += timing;
                }
                vibrator.vibrate(totalMs);
            }

            call.resolve();
        } catch (JSONException e) {
            call.reject(e.getMessage());
        }
    }

    private Vibrator getVibrator() {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return manager != null ? manager.getDefaultVibrator() : null;
        }
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }
}
