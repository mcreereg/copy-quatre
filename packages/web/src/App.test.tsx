import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPreferencesMock } from "./test/mocks/preferences";

vi.mock("@capacitor/preferences", () => import("./test/mocks/preferences"));

import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    resetPreferencesMock();
  });

  it("navigates title to settings and high scores", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "High Scores" }));
    expect(screen.getByRole("heading", { name: "High Scores" })).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
