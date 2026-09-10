import { allOff } from "@copy-quatre/core";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Grid } from "./Grid";

function pointerDown(target: Element, clientX: number, clientY: number) {
  target.dispatchEvent(
    new MouseEvent("pointerdown", {
      clientX,
      clientY,
      bubbles: true,
      buttons: 1,
    }),
  );
}

function pointerMove(clientX: number, clientY: number) {
  window.dispatchEvent(
    new MouseEvent("pointermove", {
      clientX,
      clientY,
      bubbles: true,
      buttons: 1,
    }),
  );
}

const gridRect: DOMRect = {
  left: 0,
  top: 0,
  width: 100,
  height: 100,
  right: 100,
  bottom: 100,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

describe("Grid", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(gridRect);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("paints across cells during drag via pointer move", () => {
    const onPointerDown = vi.fn();
    const onPointerEnter = vi.fn();
    const onPointerUp = vi.fn();

    const { container } = render(
      <Grid
        grid={allOff(2)}
        interactive
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerUp={onPointerUp}
      />,
    );

    const first = container.querySelector("[data-cell]") as HTMLElement;

    fireEvent.pointerDown(first, { clientX: 25, clientY: 25, pointerId: 1, buttons: 1 });
    expect(onPointerDown).toHaveBeenCalledWith(0, 0);

    pointerMove(75, 25);
    expect(onPointerEnter).toHaveBeenCalledWith(0, 1);

    fireEvent.pointerUp(window);
    expect(onPointerUp).toHaveBeenCalledOnce();
  });

  it("defers toggle until pointer enters closest cell when drag starts outside cells", () => {
    const onPointerDown = vi.fn();
    const onPointerEnter = vi.fn();
    const onPointerUp = vi.fn();

    const { container } = render(
      <Grid
        grid={allOff(2)}
        interactive
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerUp={onPointerUp}
      />,
    );

    const grid = container.querySelector(".grid") as HTMLElement;

    pointerDown(grid, 110, 10);
    expect(onPointerDown).not.toHaveBeenCalled();

    pointerMove(25, 25);
    expect(onPointerDown).not.toHaveBeenCalled();
    expect(onPointerEnter).not.toHaveBeenCalled();

    pointerMove(75, 25);
    expect(onPointerDown).toHaveBeenCalledWith(0, 1);
    expect(onPointerEnter).not.toHaveBeenCalled();

    pointerMove(25, 25);
    expect(onPointerEnter).toHaveBeenCalledWith(0, 0);

    fireEvent.pointerUp(window);
    expect(onPointerUp).toHaveBeenCalledOnce();
  });

  it("adds cell-ignite when interactive cell turns on", () => {
    const { container, rerender } = render(<Grid grid={allOff(2)} interactive />);
    const first = container.querySelector("[data-cell]") as HTMLElement;
    expect(first).not.toHaveClass("cell-ignite");

    const next = allOff(2);
    next[0][0] = true;
    rerender(<Grid grid={next} interactive />);

    expect(first).toHaveClass("cell-on");
    expect(first).toHaveClass("cell-ignite");
  });

  it("does not ignite already-on cells on mount", () => {
    const grid = allOff(2);
    grid[0][0] = true;
    const { container } = render(<Grid grid={grid} interactive />);
    expect(container.querySelector(".cell-ignite")).toBeNull();
    expect(container.querySelector(".cell-on")).not.toBeNull();
  });

  it("does not ignite readonly cells that turn on", () => {
    const { container, rerender } = render(<Grid grid={allOff(2)} />);
    const next = allOff(2);
    next[0][0] = true;
    rerender(<Grid grid={next} />);
    expect(container.querySelector(".cell-on")).not.toBeNull();
    expect(container.querySelector(".cell-ignite")).toBeNull();
  });

  it("drops ignite when cell turns off and re-ignites when turned on again", () => {
    const { container, rerender } = render(<Grid grid={allOff(2)} interactive />);

    const on = allOff(2);
    on[0][0] = true;
    rerender(<Grid grid={on} interactive />);
    expect(container.querySelector(".cell-ignite")).not.toBeNull();

    rerender(<Grid grid={allOff(2)} interactive />);
    expect(container.querySelector(".cell-ignite")).toBeNull();

    rerender(<Grid grid={on} interactive />);
    expect(container.querySelector(".cell-ignite")).not.toBeNull();
  });

  it("adds cell-extinguish when interactive cell turns off and drops it after 100ms", () => {
    vi.useFakeTimers();
    const on = allOff(2);
    on[0][0] = true;
    const { container, rerender } = render(<Grid grid={on} interactive />);

    rerender(<Grid grid={allOff(2)} interactive />);
    const first = container.querySelector("[data-cell]") as HTMLElement;
    expect(first).toHaveClass("cell-off");
    expect(first).toHaveClass("cell-extinguish");
    expect(first).not.toHaveClass("cell-ignite");

    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(first).toHaveClass("cell-extinguish");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(first).not.toHaveClass("cell-extinguish");
    vi.useRealTimers();
  });

  it("does not extinguish already-off cells on mount", () => {
    const { container } = render(<Grid grid={allOff(2)} interactive />);
    expect(container.querySelector(".cell-extinguish")).toBeNull();
  });

  it("does not extinguish readonly cells that turn off", () => {
    const on = allOff(2);
    on[0][0] = true;
    const { container, rerender } = render(<Grid grid={on} />);
    rerender(<Grid grid={allOff(2)} />);
    expect(container.querySelector(".cell-off")).not.toBeNull();
    expect(container.querySelector(".cell-extinguish")).toBeNull();
  });

  it("applies cell-shake class and CSS vars when shake spec provided", () => {
    const grid = allOff(2);
    const shakeSpecs = new Map([
      [
        "0-0",
        { delayMs: 12, dx: 2.5, dy: -0.4, rotDeg: 1.2 },
      ],
    ]);

    const { container } = render(<Grid grid={grid} shakeSpecs={shakeSpecs} />);
    const first = container.querySelector("[data-cell]") as HTMLElement;

    expect(first).toHaveClass("cell-shake");
    expect(first.style.getPropertyValue("--shake-x")).toBe("2.5px");
    expect(first.style.getPropertyValue("--shake-y")).toBe("-0.4px");
    expect(first.style.getPropertyValue("--shake-rot")).toBe("1.2deg");
    expect(first.style.getPropertyValue("--shake-delay")).toBe("12ms");
  });

  it("cancels extinguish when cell turns back on", () => {
    vi.useFakeTimers();
    const on = allOff(2);
    on[0][0] = true;
    const { container, rerender } = render(<Grid grid={on} interactive />);

    rerender(<Grid grid={allOff(2)} interactive />);
    expect(container.querySelector(".cell-extinguish")).not.toBeNull();

    rerender(<Grid grid={on} interactive />);
    const first = container.querySelector("[data-cell]") as HTMLElement;
    expect(first).toHaveClass("cell-on");
    expect(first).toHaveClass("cell-ignite");
    expect(first).not.toHaveClass("cell-extinguish");
    vi.useRealTimers();
  });
});
