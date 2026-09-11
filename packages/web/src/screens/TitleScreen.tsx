import heroImage from "@graphics/four-cats-4x4-grid-v4.png";
import { Button } from "../components/Button";

type TitleScreenProps = {
  onStart: () => void;
  onSettings: () => void;
  onHighScores: () => void;
};

export function TitleScreen({ onStart, onSettings, onHighScores }: TitleScreenProps) {
  return (
    <div className="screen title-screen">
      <img
        src={heroImage}
        alt="Four cats on a 4×4 grid"
        className="title-hero"
      />
      <h1 className="title">Copy Quatre</h1>
      <p className="subtitle">Copy the pattern before time runs out</p>
      <div className="button-stack">
        <Button onClick={onStart}>Start</Button>
        <Button variant="secondary" onClick={onSettings}>Settings</Button>
        <Button variant="secondary" onClick={onHighScores}>High Scores</Button>
      </div>
    </div>
  );
}
