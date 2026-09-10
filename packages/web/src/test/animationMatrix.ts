import type { AnimationSettings } from "@copy-quatre/core";

export const ANIMATION_SETTING_KEYS = [
  "enabled",
  "lineFlash",
  "flyingTiles",
  "rattlingTiles",
  "cellOnBlink",
  "cellOffBlink",
] as const satisfies readonly (keyof AnimationSettings)[];

export function allAnimationSettingsCombinations(): AnimationSettings[] {
  const combos: AnimationSettings[] = [];
  for (const enabled of [false, true]) {
    for (const lineFlash of [false, true]) {
      for (const flyingTiles of [false, true]) {
        for (const rattlingTiles of [false, true]) {
          for (const cellOnBlink of [false, true]) {
            for (const cellOffBlink of [false, true]) {
              combos.push({
                enabled,
                lineFlash,
                flyingTiles,
                rattlingTiles,
                cellOnBlink,
                cellOffBlink,
              });
            }
          }
        }
      }
    }
  }
  return combos;
}

export function formatAnimationSettingsLabel(animations: AnimationSettings): string {
  return ANIMATION_SETTING_KEYS.map((key) => `${key}=${animations[key]}`).join(",");
}

export function expectedExplosionEffects(animations: AnimationSettings) {
  return {
    shake: animations.enabled && animations.rattlingTiles,
    flying: animations.enabled && animations.flyingTiles,
    midline: animations.enabled && animations.lineFlash,
  };
}

export function expectedCellBlinkFlags(animations: AnimationSettings) {
  return {
    cellOnBlink: animations.enabled && animations.cellOnBlink,
    cellOffBlink: animations.enabled && animations.cellOffBlink,
  };
}
