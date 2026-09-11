import type { AnimationId, Settings } from "@copy-quatre/core";
import { Button } from "../components/Button";
import { SlideToggle } from "../components/SlideToggle";

type AnimationSettingsScreenProps = {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onBack: () => void;
};

const ANIMATION_ROWS: { id: AnimationId; label: string }[] = [
  { id: "lineFlash", label: "Line flash" },
  { id: "flyingTiles", label: "Flying tiles" },
  { id: "rattlingTiles", label: "Rattling tiles" },
  { id: "cellOnBlink", label: "Cell blink on" },
  { id: "cellOffBlink", label: "Cell blink off" },
];

export function AnimationSettingsScreen({
  settings,
  onChange,
  onBack,
}: AnimationSettingsScreenProps) {
  const { animations } = settings;

  const setAnimation = (id: AnimationId, value: boolean) => {
    onChange({ ...settings, animations: { ...animations, [id]: value } });
  };

  return (
    <div className="screen settings-screen">
      <h2>Animation Settings</h2>
      {!animations.enabled && (
        <p className="settings-warning" role="status">
          All animations are currently disabled. Enable Animations on the main Settings screen to
          use these options.
        </p>
      )}
      <div className="settings-list">
        {ANIMATION_ROWS.map(({ id, label }) => (
          <div key={id} className="setting-row">
            <span className="stepper-label">{label}</span>
            <SlideToggle
              checked={animations[id]}
              onChange={(value) => setAnimation(id, value)}
              label={label}
            />
          </div>
        ))}
      </div>
      <Button onClick={onBack}>Back</Button>
    </div>
  );
}
