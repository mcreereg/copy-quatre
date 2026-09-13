import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GridGlow } from "./GridGlow.js";

describe("GridGlow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restarts animation loop when animationKey changes", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    const { rerender } = render(<GridGlow active animationKey={0} />);

    rerender(<GridGlow active animationKey={1} />);

    expect(cancelSpy).toHaveBeenCalled();
  });
});
