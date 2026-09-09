import { formatTimeLimit, listHighScores, type HighScoreStore } from "@copy-quatre/core";
import { Button } from "../components/Button";

type HighScoresScreenProps = {
  store: HighScoreStore;
  onBack: () => void;
};

export function HighScoresScreen({ store, onBack }: HighScoresScreenProps) {
  const scores = listHighScores(store);

  return (
    <div className="screen high-scores-screen">
      <h2>High Scores</h2>
      {scores.length === 0 ? (
        <p className="empty-message">No scores yet. Play a game!</p>
      ) : (
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
      )}
      <Button onClick={onBack}>Back</Button>
    </div>
  );
}
