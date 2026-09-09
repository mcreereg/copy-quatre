import { Button } from "../components/Button";

type GameOverScreenProps = {
  score: number;
  highScore: number;
  isHighScore: boolean;
  onNice: () => void;
};

export function GameOverScreen({ score, highScore, isHighScore, onNice }: GameOverScreenProps) {
  return (
    <div className="screen gameover-screen">
      <h2>Time&apos;s Up!</h2>
      <div className="final-scores">
        <p className="final-score">Score: {score}</p>
        <p className="high-score">
          High Score: {highScore}
          {isHighScore && <span className="new-record"> New record!</span>}
        </p>
      </div>
      <Button onClick={onNice}>Nice</Button>
    </div>
  );
}
