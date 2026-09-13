import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { resolveAppVersionDisplay } from "./build/resolve-version-display.mjs";

const appVersionDisplay = resolveAppVersionDisplay();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION_DISPLAY__: JSON.stringify(appVersionDisplay),
  },
  resolve: {
    alias: {
      "@graphics": path.resolve(__dirname, "../../graphics"),
      "@repo-root": path.resolve(__dirname, "../.."),
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
