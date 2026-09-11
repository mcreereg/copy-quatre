import { Button } from "../components/Button";

type GameErrorScreenProps = {
  message: string;
  score?: number;
  onRetry: () => void;
  onBack: () => void;
};

export function GameErrorScreen({ message, score, onRetry, onBack }: GameErrorScreenProps) {
  return (
    <div className="screen game-error-screen">
      <h2>Something went wrong</h2>
      <p>{message}</p>
      {score !== undefined && <p className="game-error-score">Score: {score}</p>}
      <div className="button-stack">
        <Button onClick={onRetry}>Retry</Button>
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
