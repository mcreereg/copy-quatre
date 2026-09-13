import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolveAppVersionDisplay } from "./build/resolve-version-display.mjs";

const appVersionDisplay = resolveAppVersionDisplay();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION_DISPLAY__: JSON.stringify(appVersionDisplay),
  },
  base: "./",
  resolve: {
    alias: {
      "@graphics": path.resolve(__dirname, "../../graphics"),
      "@repo-root": path.resolve(__dirname, "../.."),
    },
  },
  server: {
    port: 5173,
  },
});
