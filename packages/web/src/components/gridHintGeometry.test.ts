import { describe, expect, it } from "vitest";
import {
  arrowEndpointsAtProgress,
  arrowOpacityAtElapsed,
  arrowProgressAtElapsed,
  ARROW_HEAD_LENGTH_TO_WIDTH_RATIO,
  ARROW_HEAD_WIDTH_TO_SHAFT_RATIO,
  ARROW_SHAFT_WIDTH_RATIO,
  arrowHeadDimensions,
  arrowShaftWidth,
  buildArrowPath,
  closestEdgePoint,
  glowOpacityAtElapsed,
  HINT_ARROW_ANIMATE_MS,
  HINT_GLOW_FADE_IN_MS,
  HINT_TOTAL_MS,
  rectCenter,
  type Rect,
} from "./gridHintGeometry.js";

const reference: Rect = { left: 0, top: 0, width: 100, height: 100 };
const interactive: Rect = { left: 200, top: 0, width: 100, height: 100 };

describe("gridHintGeometry", () => {
  it("finds rect center", () => {
    expect(rectCenter(reference)).toEqual({ x: 50, y: 50 });
  });

  it("finds closest edge toward another rect", () => {
    expect(closestEdgePoint(reference, rectCenter(interactive))).toEqual({ x: 100, y: 50 });
    expect(closestEdgePoint(interactive, rectCenter(reference))).toEqual({ x: 200, y: 50 });
  });

  it("animates arrow from reference center toward interactive edge", () => {
    const start = arrowEndpointsAtProgress(reference, interactive, 0);
    expect(start.tail).toEqual({ x: 50, y: 50 });
    expect(start.head).toEqual({ x: 200, y: 50 });
  });

  it("finishes arrow from reference edge to interactive center", () => {
    const end = arrowEndpointsAtProgress(reference, interactive, 1);
    expect(end.tail).toEqual({ x: 100, y: 50 });
    expect(end.head).toEqual({ x: 250, y: 50 });
  });

  it("builds a closed arrow path", () => {
    const path = buildArrowPath({ x: 0, y: 50 }, { x: 100, y: 50 }, 20, 15, 30);
    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
  });

  it("uses 20% grid edge for arrow shaft width", () => {
    expect(ARROW_SHAFT_WIDTH_RATIO).toBe(0.2);
    expect(arrowShaftWidth(200)).toBe(40);
  });

  it("sizes arrowhead like a classic arrow (3× shaft width, depth = width)", () => {
    expect(ARROW_HEAD_WIDTH_TO_SHAFT_RATIO).toBe(3);
    expect(ARROW_HEAD_LENGTH_TO_WIDTH_RATIO).toBe(1);
    expect(arrowHeadDimensions(40)).toEqual({ headWidth: 120, headLength: 120 });
  });

  it("points arrow tip at head with head base behind tip along travel", () => {
    const { headWidth, headLength } = arrowHeadDimensions(20);
    const path = buildArrowPath({ x: 0, y: 50 }, { x: 100, y: 50 }, 20, headLength, headWidth);
    expect(path).toContain("L 100 50");
    expect(path).toContain("L 40 80");
    expect(path).toContain("L 40 20");
  });

  it("syncs glow timing", () => {
    expect(glowOpacityAtElapsed(0)).toBe(0);
    expect(glowOpacityAtElapsed(HINT_GLOW_FADE_IN_MS)).toBe(1);
    expect(glowOpacityAtElapsed(HINT_TOTAL_MS)).toBe(0);
  });

  it("syncs arrow timing", () => {
    expect(arrowProgressAtElapsed(0)).toBe(0);
    expect(arrowProgressAtElapsed(HINT_ARROW_ANIMATE_MS)).toBe(1);
    expect(arrowOpacityAtElapsed(HINT_ARROW_ANIMATE_MS)).toBe(1);
    expect(arrowOpacityAtElapsed(HINT_TOTAL_MS)).toBe(0);
  });
});
