import {
  allOff,
  resolveSessionSettings,
  type GameEvent,
  type GameState,
  type SessionSettings,
} from "@copy-quatre/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HINT_TOTAL_MS } from "../components/gridHintGeometry";
import { vibrateMatch } from "../platform/vibration";
import { PlayScreen } from "./PlayScreen";

vi.mock("../platform/vibration", () => ({
  vibrateMatch: vi.fn(),
  vibrateInvalidSolve: vi.fn(),
}));

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
    copy: { timeLimitSec: 90, gridSize: 4, patternStyle: "cohesive" },
    imposter: { timeLimitSec: 90, gridSize: 4, patternStyle: "cohesive" },
    serpentine: { timeLimitSec: 90, gridSize: 4, patternStyle: "serpentine" },
  },
});

function makeState(overrides: Partial<GameState> & { settings?: SessionSettings } = {}): GameState {
  return {
    phase: "playing",
    settings: baseSession,
    reference: allOff(4),
    interactive: allOff(4),
    score: 0,
    timeRemainingMs: 90000,
    strokePath: [],
    ...overrides,
  };
}

function makeDispatch(events: GameEvent[] = []) {
  return vi.fn(() => events);
}

const gridRect: DOMRect = {
  left: 0,
  top: 0,
  width: 120,
  height: 120,
  right: 120,
  bottom: 120,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

describe("PlayScreen", () => {
  beforeEach(() => {
    vi.mocked(vibrateMatch).mockClear();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(gridRect);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("vibrates on scored when vibration enabled", async () => {
    const user = userEvent.setup();
    const reference = allOff(2);
    const interactive = allOff(2);
    interactive[0][0] = true;
    reference[0][0] = true;

    const dispatch = makeDispatch([
      {
        type: "SCORED",
        score: 1,
        matchedReference: reference,
        matchedInteractive: interactive,
      },
    ]);

    const { container } = render(
      <PlayScreen
        state={makeState({
          settings: { ...baseSession, gridSize: 2, vibration: true },
          reference,
          interactive,
        })}
        dispatch={dispatch}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onQuit={vi.fn()}
      />,
    );

    const cell = container.querySelector(".grid-interactive [data-cell]") as HTMLElement;
    await user.pointer({ keys: "[MouseLeft>]", target: cell });
    expect(vibrateMatch).toHaveBeenCalledOnce();
  });

  it("skips vibration on scored when vibration disabled", async () => {
    const user = userEvent.setup();
    const reference = allOff(2);
    const interactive = allOff(2);
    interactive[0][0] = true;
    reference[0][0] = true;

    const dispatch = makeDispatch([
      {
        type: "SCORED",
        score: 1,
        matchedReference: reference,
        matchedInteractive: interactive,
      },
    ]);

    const { container } = render(
      <PlayScreen
        state={makeState({
          settings: { ...baseSession, gridSize: 2, vibration: false },
          reference,
          interactive,
        })}
        dispatch={dispatch}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onQuit={vi.fn()}
      />,
    );

    const cell = container.querySelector(".grid-interactive [data-cell]") as HTMLElement;
    await user.pointer({ keys: "[MouseLeft>]", target: cell });
    expect(vibrateMatch).not.toHaveBeenCalled();
  });

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

  it("restarts hint animation for full duration on repeated reference tap", () => {
    vi.useFakeTimers();
    try {
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
      const { container } = render(
        <PlayScreen
          state={makeState({ settings: { ...baseSession, gridSize: 2 } })}
          dispatch={makeDispatch()}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onQuit={vi.fn()}
        />,
      );

      const referenceGrid = container.querySelector(".grid-readonly") as HTMLElement;
      fireEvent.pointerDown(referenceGrid);

      act(() => {
        vi.advanceTimersByTime(200);
      });
      fireEvent.pointerDown(referenceGrid);
      expect(clearTimeoutSpy).toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(350);
      });
      expect(container.querySelector(".grid-hint-arrow")).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(HINT_TOTAL_MS - 350);
      });
      expect(container.querySelector(".grid-hint-arrow")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows hint arrow and glow when reference grid is tapped", () => {
    const { container } = render(
      <PlayScreen
        state={makeState({ settings: { ...baseSession, gridSize: 2 } })}
        dispatch={makeDispatch()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onQuit={vi.fn()}
      />,
    );

    const referenceGrid = container.querySelector(".grid-readonly") as HTMLElement;
    fireEvent.pointerDown(referenceGrid);

    expect(container.querySelector(".grid-glow")).not.toBeNull();
    expect(container.querySelector(".grid-hint-arrow")).not.toBeNull();
  });

  it("does not render grid labels", () => {
    const { container } = render(
      <PlayScreen
        state={makeState()}
        dispatch={makeDispatch()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onQuit={vi.fn()}
      />,
    );

    expect(container.querySelector(".grid-label")).toBeNull();
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
