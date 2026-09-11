import { DEFAULT_SETTINGS } from "@copy-quatre/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  allAnimationSettingsCombinations,
  formatAnimationSettingsLabel,
} from "./test/animationMatrix.js";
import { Preferences, resetPreferencesMock } from "./test/mocks/preferences";

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
    expect(screen.getByRole("switch", { name: "Vibration" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Animations" })).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Animations" }));
    await user.click(screen.getByRole("button", { name: "Customize…" }));
    expect(screen.getByRole("heading", { name: "Animation Settings" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/All animations are currently disabled/);
    expect(screen.getByRole("switch", { name: "Line flash" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "High Scores" }));
    expect(screen.getByRole("heading", { name: "High Scores" })).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "AI Disclosure" }));
    expect(screen.getByRole("heading", { name: "AI Disclosure" })).toBeInTheDocument();
    expect(screen.getByText(/All code in this repository is AI-generated/)).toBeInTheDocument();
    expect(screen.getByText(/Most graphics are AI-generated/)).toBeInTheDocument();
  });

  it.each(
    allAnimationSettingsCombinations().map((animations) => ({
      animations,
      label: formatAnimationSettingsLabel(animations),
    })),
  )("sets data-animations from saved settings ($label)", async ({ animations }) => {
    await Preferences.set({
      key: "copy-quatre:settings",
      value: JSON.stringify({ ...DEFAULT_SETTINGS, animations }),
    });

    render(<App />);

    await waitFor(() => {
      expect(document.querySelector(".app")).toHaveAttribute(
        "data-animations",
        animations.enabled ? "on" : "off",
      );
    });
  });

  it("quit during play records score and shows game over", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Start" }));
    await user.click(screen.getByRole("button", { name: "Quit" }));

    expect(screen.getByRole("heading", { name: "Time's Up!" })).toBeInTheDocument();
    expect(screen.getByText("Score: 0")).toBeInTheDocument();
  });
});
