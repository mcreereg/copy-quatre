import { allOff, type GameEvent, type GameState } from "@copy-quatre/core";
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
    ...overrides,
  };
}

function makeDispatch(events: GameEvent[] = []) {
  return vi.fn(() => events);
}

describe("PlayScreen", () => {
  it("shows Resume inside pause overlay", async () => {
    const user = userEvent.setup();
    const onResume = vi.fn();

    const { container } = render(
      <PlayScreen
        state={makeState({ phase: "paused" })}
        dispatch={makeDispatch()}
        onPause={vi.fn()}
        onResume={onResume}
        onQuit={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(screen.getByRole("button", { name: "Quit" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Resume" })).toHaveLength(2);
    expect(container.querySelectorAll(".grid")).toHaveLength(0);
    await user.click(screen.getAllByRole("button", { name: "Resume" })[0]);
    expect(onResume).toHaveBeenCalledOnce();
  });

  it("Quit sits left of HUD and aborts", async () => {
    const user = userEvent.setup();
    const onQuit = vi.fn();

    const { container } = render(
      <PlayScreen
        state={makeState()}
        dispatch={makeDispatch()}
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

  it("mounts explode layer container when playing", () => {
    const { container } = render(
      <PlayScreen
        state={makeState()}
        dispatch={makeDispatch()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onQuit={vi.fn()}
      />,
    );

    expect(container.querySelector(".explode-layer")).toBeNull();
  });
});
