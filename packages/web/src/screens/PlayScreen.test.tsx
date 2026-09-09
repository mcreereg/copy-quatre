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
        onQuit={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(screen.getByRole("button", { name: "Quit" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it("Quit sits left of HUD and aborts", async () => {
    const user = userEvent.setup();
    const onQuit = vi.fn();

    const { container } = render(
      <PlayScreen
        state={makeState()}
        onPointerDown={vi.fn()}
        onPointerEnter={vi.fn()}
        onPointerUp={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onQuit={onQuit}
      />,
    );

    const hud = container.querySelector(".hud");
    expect(hud?.children[0]).toHaveTextContent("Quit");
    expect(hud?.children[1]).toHaveClass("timer");
    expect(hud?.children[2]).toHaveClass("score-display");
    expect(hud?.children[3]).toHaveTextContent("Pause");

    await user.click(hud!.children[0] as HTMLElement);
    expect(onQuit).toHaveBeenCalledOnce();
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
        onQuit={vi.fn()}
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
