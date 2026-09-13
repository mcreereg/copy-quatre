import { useRef } from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GridHintArrow } from "./GridHintArrow";

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

const containerRect: DOMRect = {
  left: 0,
  top: 0,
  width: 300,
  height: 100,
  right: 300,
  bottom: 100,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

function ArrowHarness() {
  const referenceRef = useRef<HTMLDivElement>(null);
  const interactiveRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="grids-container">
      <div ref={referenceRef} className="grid grid-readonly" />
      <div ref={interactiveRef} className="grid grid-interactive" />
      <GridHintArrow
        referenceRef={referenceRef}
        interactiveRef={interactiveRef}
        gridSize={4}
        containerRef={containerRef}
      />
    </div>
  );
}

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe("GridHintArrow", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const el = this;
      if (el.classList.contains("grids-container")) return containerRect;
      if (el.classList.contains("grid-readonly")) {
        return { ...gridRect, left: 0, right: 100 };
      }
      return { ...gridRect, left: 200, right: 300 };
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders non-interactive arrow overlay", () => {
    const { container } = render(<ArrowHarness />);

    const arrow = container.querySelector(".grid-hint-arrow");
    expect(arrow).not.toBeNull();
    expect(container.querySelector(".grid-hint-arrow-shape")).not.toBeNull();
  });
});
