import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
