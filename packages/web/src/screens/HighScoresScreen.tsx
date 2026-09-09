import {
  formatTimeLimit,
  listHighScoresForDisplay,
  type HighScoreStore,
  type Settings,
} from "@copy-quatre/core";
import { Button } from "../components/Button";

type HighScoresScreenProps = {
  store: HighScoreStore;
  settings: Settings;
  onBack: () => void;
};

export function HighScoresScreen({ store, settings, onBack }: HighScoresScreenProps) {
  const scores = listHighScoresForDisplay(store, settings);

  return (
    <div className="screen high-scores-screen">
      <h2>High Scores</h2>
      <ul className="score-list">
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
      <Button onClick={onBack}>Back</Button>
    </div>
  );
}
