const MATCH_VIBRATION_PATTERN = [55, 12, 38, 12, 24, 12, 14, 12, 8];

export function vibrateMatch(): void {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate(MATCH_VIBRATION_PATTERN);
}

export { MATCH_VIBRATION_PATTERN };
