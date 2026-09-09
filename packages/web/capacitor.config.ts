import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.copyquatre.app",
  appName: "Copy Quatre",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
};

export default config;
