export type Point = { x: number; y: number };

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const HINT_GLOW_FADE_IN_MS = 100;
export const HINT_GLOW_FADE_OUT_MS = 400;
export const HINT_ARROW_ANIMATE_MS = 400;
export const HINT_ARROW_FADE_MS = 100;
export const HINT_TOTAL_MS =
  HINT_GLOW_FADE_IN_MS + HINT_GLOW_FADE_OUT_MS;

/** Arrow shaft width as fraction of full grid edge length. */
export const ARROW_SHAFT_WIDTH_RATIO = 0.2;

export function arrowShaftWidth(gridEdge: number): number {
  return gridEdge * ARROW_SHAFT_WIDTH_RATIO;
}

/** Arrowhead span relative to shaft width (classic arrow ≈ 3×). */
export const ARROW_HEAD_WIDTH_TO_SHAFT_RATIO = 3;
/** Arrowhead depth relative to its width (equilateral-style ≈ 1×). */
export const ARROW_HEAD_LENGTH_TO_WIDTH_RATIO = 1;

export type ArrowHeadDimensions = {
  headWidth: number;
  headLength: number;
};

export function arrowHeadDimensions(shaftWidth: number): ArrowHeadDimensions {
  const headWidth = shaftWidth * ARROW_HEAD_WIDTH_TO_SHAFT_RATIO;
  return {
    headWidth,
    headLength: headWidth * ARROW_HEAD_LENGTH_TO_WIDTH_RATIO,
  };
}

/** Arrow outline thickness as fraction of one grid cell edge. */
export const ARROW_OUTLINE_WIDTH_RATIO = 0.1;

export function rectCenter(rect: Rect): Point {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

/** Closest point on rect perimeter toward target. */
export function closestEdgePoint(rect: Rect, toward: Point): Point {
  const center = rectCenter(rect);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;

  if (dx === 0 && dy === 0) {
    return { x: center.x, y: rect.top };
  }

  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);
  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
}

export type ArrowEndpoints = {
  tail: Point;
  head: Point;
};

/** Interpolate arrow from reference center toward interactive edge to full span. */
export function arrowEndpointsAtProgress(
  referenceRect: Rect,
  interactiveRect: Rect,
  progress: number,
): ArrowEndpoints {
  const refCenter = rectCenter(referenceRect);
  const intCenter = rectCenter(interactiveRect);
  const startHead = closestEdgePoint(interactiveRect, refCenter);
  const endTail = closestEdgePoint(referenceRect, intCenter);

  const t = clamp01(progress);
  return {
    tail: lerpPoint(refCenter, endTail, t),
    head: lerpPoint(startHead, intCenter, t),
  };
}

export function glowOpacityAtElapsed(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs < HINT_GLOW_FADE_IN_MS) {
    return elapsedMs / HINT_GLOW_FADE_IN_MS;
  }
  const fadeElapsed = elapsedMs - HINT_GLOW_FADE_IN_MS;
  if (fadeElapsed >= HINT_GLOW_FADE_OUT_MS) return 0;
  return 1 - fadeElapsed / HINT_GLOW_FADE_OUT_MS;
}

export function arrowOpacityAtElapsed(elapsedMs: number): number {
  if (elapsedMs >= HINT_TOTAL_MS) return 0;
  if (elapsedMs <= HINT_ARROW_ANIMATE_MS) return 1;
  const fadeElapsed = elapsedMs - HINT_ARROW_ANIMATE_MS;
  return 1 - fadeElapsed / HINT_ARROW_FADE_MS;
}

export function arrowProgressAtElapsed(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= HINT_ARROW_ANIMATE_MS) return 1;
  return elapsedMs / HINT_ARROW_ANIMATE_MS;
}

/** Fat rounded arrow path from tail to head in local coordinates. */
export function buildArrowPath(
  tail: Point,
  head: Point,
  shaftWidth: number,
  headLength: number,
  headWidth: number,
): string {
  const dx = head.x - tail.x;
  const dy = head.y - tail.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return "";

  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;

  const shaftEnd = Math.max(0, length - headLength);
  const shaftHalf = shaftWidth / 2;
  const headHalf = headWidth / 2;

  const tailLeft = {
    x: tail.x + px * shaftHalf,
    y: tail.y + py * shaftHalf,
  };
  const tailRight = {
    x: tail.x - px * shaftHalf,
    y: tail.y - py * shaftHalf,
  };
  const neckLeft = {
    x: tail.x + ux * shaftEnd + px * shaftHalf,
    y: tail.y + uy * shaftEnd + py * shaftHalf,
  };
  const neckRight = {
    x: tail.x + ux * shaftEnd - px * shaftHalf,
    y: tail.y + uy * shaftEnd - py * shaftHalf,
  };
  const headBase = {
    x: head.x - ux * headLength,
    y: head.y - uy * headLength,
  };
  const headLeft = {
    x: headBase.x + px * headHalf,
    y: headBase.y + py * headHalf,
  };
  const headRight = {
    x: headBase.x - px * headHalf,
    y: headBase.y - py * headHalf,
  };

  return [
    `M ${tailLeft.x} ${tailLeft.y}`,
    `L ${neckLeft.x} ${neckLeft.y}`,
    `L ${headLeft.x} ${headLeft.y}`,
    `L ${head.x} ${head.y}`,
    `L ${headRight.x} ${headRight.y}`,
    `L ${neckRight.x} ${neckRight.y}`,
    `L ${tailRight.x} ${tailRight.y}`,
    "Z",
  ].join(" ");
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
