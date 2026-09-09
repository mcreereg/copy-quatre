import { allOff, type GameState } from "@copy-quatre/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlayScreen } from "./PlayScreen";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "playing",
    settings: {
      timeLimitSec: 90,
      gridSize: 4,
      patternStyle: "cohesive",
      theme: "yellow",
      colorMode: "dark",
    },
    reference: allOff(4),
    interactive: allOff(4),
    score: 0,
    timeRemainingMs: 90000,
    flashPhase: "none",
    flashElapsedMs: 0,
    ...overrides,
  };
}

describe("PlayScreen", () => {
  it("shows Resume inside pause overlay", async () => {
    const user = userEvent.setup();
    const onResume = vi.fn();

    render(
      <PlayScreen
        state={makeState({ phase: "paused" })}
        onPointerDown={vi.fn()}
        onPointerEnter={vi.fn()}
        onPointerUp={vi.fn()}
        onPause={vi.fn()}
        onResume={onResume}
      />,
    );

    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it("does not nest flash overlay over grids", () => {
    const { container } = render(
      <PlayScreen
        state={makeState({ flashPhase: "on" })}
        onPointerDown={vi.fn()}
        onPointerEnter={vi.fn()}
        onPointerUp={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
      />,
    );

    const overlay = container.querySelector(".flash-overlay");
    const grids = container.querySelectorAll(".grid");

    expect(overlay).not.toBeNull();
    expect(grids).toHaveLength(2);
    for (const grid of grids) {
      expect(overlay?.contains(grid)).toBe(false);
    }
  });
});
