import {
  formatTimeLimit,
  listHighScoresForDisplay,
  resolveSessionSettings,
  type GameModeId,
  type HighScoreStore,
  type Settings,
} from "@copy-quatre/core";
import { useState } from "react";
import { Button } from "../components/Button";
import { ModeSelector } from "../components/ModeSelector";

type HighScoresScreenProps = {
  store: HighScoreStore;
  settings: Settings;
  onBack: () => void;
};

export function HighScoresScreen({ store, settings, onBack }: HighScoresScreenProps) {
  const [filterMode, setFilterMode] = useState<GameModeId>(settings.selectedMode);
  const session = resolveSessionSettings(settings, filterMode);
  const scores = listHighScoresForDisplay(store, session);

  return (
    <div className="screen high-scores-screen">
      <h2>High Scores</h2>
      <ModeSelector selectedMode={filterMode} onChange={setFilterMode} />
      <ul className="score-list score-list-scroll">
        {scores.map((entry) => (
          <li key={entry.key} className="score-item">
            <span className="score-value">{entry.score}</span>
            <span className="score-detail">
              {entry.patternStyle} · {entry.gridSize}×{entry.gridSize} ·{" "}
              {formatTimeLimit(entry.timeLimitSec)}
            </span>
          </li>
        ))}
      </ul>
      <div className="high-scores-footer">
        <Button onClick={onBack}>Back</Button>
      </div>
    </div>
  );
}
