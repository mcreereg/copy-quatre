import { allOff, isAnimationActive, resolveSessionSettings } from "@copy-quatre/core";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  allAnimationSettingsCombinations,
  formatAnimationSettingsLabel,
} from "../test/animationMatrix.js";
import { PlayScreen } from "./PlayScreen";

const baseSession = resolveSessionSettings({
  selectedMode: "copy",
  global: {
    theme: "yellow",
    colorMode: "dark",
    vibration: true,
    animations: {
      enabled: true,
      lineFlash: true,
      flyingTiles: true,
      rattlingTiles: true,
      cellOnBlink: true,
      cellOffBlink: true,
    },
  },
  modes: {
    copy: { timeLimitSec: 90, gridSize: 2, patternStyle: "cohesive" },
    imposter: { timeLimitSec: 90, gridSize: 2, patternStyle: "cohesive" },
  },
});

function makeState(
  animations: (typeof baseSession)["animations"],
  interactive = allOff(2),
) {
  return {
    phase: "playing" as const,
    settings: { ...baseSession, animations },
    reference: allOff(2),
    interactive,
    score: 0,
    timeRemainingMs: 90000,
  };
}

const noopDispatch = vi.fn(() => []);

describe("PlayScreen animation settings", () => {
  it.each(
    allAnimationSettingsCombinations().map((animations) => ({
      animations,
      label: formatAnimationSettingsLabel(animations),
    })),
  )("wires cell blink flags ($label)", ({ animations }) => {
    const cellOnBlink = isAnimationActive(animations, "cellOnBlink");
    const cellOffBlink = isAnimationActive(animations, "cellOffBlink");

    const { container, rerender } = render(
      <PlayScreen
        state={makeState(animations)}
        dispatch={noopDispatch}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onQuit={vi.fn()}
      />,
    );

    const on = allOff(2);
    on[0][0] = true;
    rerender(
      <PlayScreen
        state={makeState(animations, on)}
        dispatch={noopDispatch}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onQuit={vi.fn()}
      />,
    );

    const interactiveCell = container.querySelector(
      ".grid-interactive [data-cell]",
    ) as HTMLElement;
    if (cellOnBlink) {
      expect(interactiveCell).toHaveClass("cell-ignite");
    } else {
      expect(interactiveCell).not.toHaveClass("cell-ignite");
    }

    rerender(
      <PlayScreen
        state={makeState(animations)}
        dispatch={noopDispatch}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onQuit={vi.fn()}
      />,
    );

    const extinguishingCell = container.querySelector(
      ".grid-interactive [data-cell]",
    ) as HTMLElement;
    if (cellOffBlink) {
      expect(extinguishingCell).toHaveClass("cell-extinguish");
    } else {
      expect(extinguishingCell).not.toHaveClass("cell-extinguish");
    }
  });
});
