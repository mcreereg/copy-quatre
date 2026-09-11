import { cycleGameMode, getGameMode, type GameModeId } from "@copy-quatre/core";

type ModeSelectorProps = {
  selectedMode: GameModeId;
  onChange: (mode: GameModeId) => void;
};

export function ModeSelector({ selectedMode, onChange }: ModeSelectorProps) {
  const mode = getGameMode(selectedMode);

  return (
    <div className="mode-selector">
      <div className="mode-selector-controls">
        <button
          type="button"
          className="stepper-btn"
          aria-label="Previous game mode"
          onClick={() => onChange(cycleGameMode(selectedMode, -1))}
        >
          {"<"}
        </button>
        <span className="mode-selector-name" aria-live="polite">
          {mode.name}
        </span>
        <button
          type="button"
          className="stepper-btn"
          aria-label="Next game mode"
          onClick={() => onChange(cycleGameMode(selectedMode, 1))}
        >
          {">"}
        </button>
      </div>
      <p className="mode-selector-description">{mode.description}</p>
    </div>
  );
}
