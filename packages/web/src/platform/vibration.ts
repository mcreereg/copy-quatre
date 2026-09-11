const MATCH_VIBRATION_PATTERN = [55, 12, 38, 12, 24, 12, 14, 12, 8];
const TIME_EXPIRED_VIBRATION_PATTERN = [75, 75, 75, 75, 75];
const TOGGLE_ON_VIBRATION_MS = 50;

export function vibrateMatch(): void {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate(MATCH_VIBRATION_PATTERN);
}

export function vibrateToggleOn(): void {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate(TOGGLE_ON_VIBRATION_MS);
}

export function vibrateTimeExpired(): void {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate(TIME_EXPIRED_VIBRATION_PATTERN);
}

export { MATCH_VIBRATION_PATTERN, TIME_EXPIRED_VIBRATION_PATTERN, TOGGLE_ON_VIBRATION_MS };
