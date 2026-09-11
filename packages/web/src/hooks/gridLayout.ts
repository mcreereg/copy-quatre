export type GridAreaMetrics = {
  width: number;
  height: number;
  gapPx: number;
  labelAllowancePx: number;
};

/** Matches `.play-screen .grid { calc(100cqh - 1.25rem) }`. */
export const GRID_LABEL_ALLOWANCE_REM = 1.25;
/** Matches `.play-screen .grids-container.grids-side-by-side { gap: max(25px, 0.75rem) }`. */
export const GRIDS_SIDE_BY_SIDE_MIN_GAP_PX = 25;
export const GRIDS_STACKED_GAP_REM = 0.75;

export function stackedGapPx(rootFontSize?: number): number {
  return GRIDS_STACKED_GAP_REM * remPx(rootFontSize);
}

export function sideBySideGapPx(rootFontSize?: number): number {
  return Math.max(GRIDS_SIDE_BY_SIDE_MIN_GAP_PX, stackedGapPx(rootFontSize));
}

export function remPx(rootFontSize = 16): number {
  if (typeof document === "undefined") return rootFontSize;
  const parsed = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : rootFontSize;
}

export function parseGap(style: CSSStyleDeclaration): number {
  for (const value of [style.gap, style.rowGap, style.columnGap]) {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return 0;
}

type GridAreaDimensions = {
  width: number;
  height: number;
  labelAllowancePx: number;
};

/** Largest square grid size for a given layout inside the play area. */
export function maxSquareGridSize(
  { width, height, labelAllowancePx }: GridAreaDimensions,
  sideBySide: boolean,
  gapPx = sideBySide ? sideBySideGapPx() : stackedGapPx(),
): number {
  if (width <= 0 || height <= 0) return 0;

  if (sideBySide) {
    const wrapperWidth = (width - gapPx) / 2;
    return Math.max(0, Math.min(wrapperWidth, height - labelAllowancePx));
  }

  const wrapperHeight = (height - gapPx) / 2;
  return Math.max(0, Math.min(width, wrapperHeight - labelAllowancePx));
}

/** Pick side-by-side when it yields a strictly larger square grid. */
export function preferSideBySideLayout(metrics: GridAreaMetrics): boolean {
  const dimensions = {
    width: metrics.width,
    height: metrics.height,
    labelAllowancePx: metrics.labelAllowancePx,
  };
  const stacked = maxSquareGridSize(dimensions, false, stackedGapPx());
  const beside = maxSquareGridSize(dimensions, true, sideBySideGapPx());
  return beside > stacked;
}

export function measureGridArea(playScreen: HTMLElement): GridAreaMetrics | null {
  const container = playScreen.querySelector(".grids-container");
  if (container) {
    const rect = container.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      gapPx: parseGap(getComputedStyle(container)),
      labelAllowancePx: GRID_LABEL_ALLOWANCE_REM * remPx(),
    };
  }

  const rect = playScreen.getBoundingClientRect();
  const style = getComputedStyle(playScreen);
  const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const hud = playScreen.querySelector(".hud");
  const hudHeight = hud?.getBoundingClientRect().height ?? 0;
  const playGap = parseGap(style);
  const width = rect.width - paddingX;
  const height = rect.height - paddingY - hudHeight - playGap;

  if (width <= 0 || height <= 0) return null;

  return {
    width,
    height,
    gapPx: 0.75 * remPx(),
    labelAllowancePx: GRID_LABEL_ALLOWANCE_REM * remPx(),
  };
}
