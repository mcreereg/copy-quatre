import heroImage from "@graphics/four-cats-4x4-grid-v4.png";
import type { GameModeId } from "@copy-quatre/core";
import { appVersionDisplay } from "../appVersion";
import { Button } from "../components/Button";
import { ModeSelector } from "../components/ModeSelector";

type TitleScreenProps = {
  selectedMode: GameModeId;
  onModeChange: (mode: GameModeId) => void;
  onStart: () => void;
  onSettings: () => void;
  onHighScores: () => void;
  onAiDisclosure: () => void;
};

export function TitleScreen({
  selectedMode,
  onModeChange,
  onStart,
  onSettings,
  onHighScores,
  onAiDisclosure,
}: TitleScreenProps) {
  return (
    <div className="screen title-screen">
      <img
        src={heroImage}
        alt="Four cats on a 4×4 grid"
        className="title-hero"
      />
      <div className="title-block">
        <h1 className="title">Copy Quatre</h1>
        <span className="title-version" aria-label={`Version ${appVersionDisplay}`}>
          {appVersionDisplay}
        </span>
      </div>
      <ModeSelector selectedMode={selectedMode} onChange={onModeChange} />
      <div className="button-stack">
        <Button onClick={onStart}>Start</Button>
        <Button variant="secondary" onClick={onSettings}>Settings</Button>
        <Button variant="secondary" onClick={onHighScores}>High Scores</Button>
        <Button variant="secondary" onClick={onAiDisclosure}>AI Disclosure</Button>
      </div>
    </div>
  );
}
