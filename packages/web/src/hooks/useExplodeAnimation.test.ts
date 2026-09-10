import { allOff } from "@copy-quatre/core";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  allAnimationSettingsCombinations,
  expectedExplosionEffects,
  formatAnimationSettingsLabel,
} from "../test/animationMatrix.js";
import { useExplodeAnimation } from "./useExplodeAnimation.js";

function gridWithOn(size: number, cells: Array<[number, number]>) {
  const grid = allOff(size);
  for (const [r, c] of cells) {
    grid[r][c] = true;
  }
  return grid;
}

function mockGridElement(
  left: number,
  top: number,
  size: number,
  cellSize: number,
  gap = 0,
): HTMLDivElement {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    new DOMRect(left, top, size * cellSize + gap * (size - 1), size * cellSize + gap * (size - 1));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement("div");
      cell.dataset.cell = "true";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      const cellLeft = left + c * (cellSize + gap);
      const cellTop = top + r * (cellSize + gap);
      cell.getBoundingClientRect = () => new DOMRect(cellLeft, cellTop, cellSize, cellSize);
      el.appendChild(cell);
    }
  }

  return el;
}

describe("useExplodeAnimation spawn settings", () => {
  beforeEach(() => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(
    allAnimationSettingsCombinations().map((animations) => ({
      animations,
      label: formatAnimationSettingsLabel(animations),
    })),
  )("respects animation flags ($label)", ({ animations }) => {
    const referenceGridRef = { current: mockGridElement(0, 0, 2, 20) };
    const interactiveGridRef = { current: mockGridElement(120, 0, 2, 20) };
    const { result } = renderHook(() =>
      useExplodeAnimation(referenceGridRef, interactiveGridRef, animations),
    );

    const expected = expectedExplosionEffects(animations);
    const matchedReference = gridWithOn(2, [[0, 0]]);
    const matchedInteractive = gridWithOn(2, [[1, 1]]);

    act(() => {
      result.current.spawn(matchedReference, matchedInteractive);
    });

    if (expected.shake) {
      expect(result.current.shakes).not.toBeNull();
    } else {
      expect(result.current.shakes).toBeNull();
    }

    if (expected.flying) {
      expect(result.current.cells.length).toBeGreaterThan(0);
    } else {
      expect(result.current.cells).toEqual([]);
    }

    if (expected.midline) {
      expect(result.current.midlines.length).toBe(1);
    } else {
      expect(result.current.midlines).toEqual([]);
    }
  });
});
