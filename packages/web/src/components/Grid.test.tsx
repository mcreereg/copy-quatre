import { allOff } from "@copy-quatre/core";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Grid } from "./Grid";

describe("Grid", () => {
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

    const cells = container.querySelectorAll("[data-cell]");
    const first = cells[0] as HTMLElement;
    const second = cells[1] as HTMLElement;

    fireEvent.pointerDown(first);
    expect(onPointerDown).toHaveBeenCalledWith(0, 0);

    document.elementFromPoint = vi.fn().mockReturnValue(second) as typeof document.elementFromPoint;
    fireEvent.pointerMove(window, { clientX: 10, clientY: 10 });
    expect(onPointerEnter).toHaveBeenCalledWith(0, 1);

    fireEvent.pointerUp(window);
    expect(onPointerUp).toHaveBeenCalledOnce();
  });
});
