import { cycleGameMode, getGameMode, type GameModeId } from "@copy-quatre/core";
import { Button } from "./Button";

type ModeSelectorProps = {
  selectedMode: GameModeId;
  onChange: (mode: GameModeId) => void;
};

export function ModeSelector({ selectedMode, onChange }: ModeSelectorProps) {
  const mode = getGameMode(selectedMode);

  return (
    <div className="mode-selector">
      <div className="mode-selector-controls">
        <Button
          variant="secondary"
          aria-label="Previous game mode"
          onClick={() => onChange(cycleGameMode(selectedMode, -1))}
        >
          Previous
        </Button>
        <span className="mode-selector-name" aria-live="polite">
          {mode.name}
        </span>
        <Button
          variant="secondary"
          aria-label="Next game mode"
          onClick={() => onChange(cycleGameMode(selectedMode, 1))}
        >
          Next
        </Button>
      </div>
      <p className="mode-selector-description">{mode.description}</p>
    </div>
  );
}
