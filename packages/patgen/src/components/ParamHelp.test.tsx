import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ParamHelp } from "./ParamHelp.js";

afterEach(() => cleanup());

describe("ParamHelp", () => {
  it("shows popup on hover", () => {
    render(<ParamHelp description="Test description">ⓘ</ParamHelp>);
    fireEvent.mouseEnter(screen.getByLabelText("Parameter info").parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Test description");
  });

  it("hides popup when hover ends", () => {
    render(<ParamHelp description="Test description">ⓘ</ParamHelp>);
    const root = screen.getByLabelText("Parameter info").parentElement!;
    fireEvent.mouseEnter(root);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.mouseLeave(root);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
