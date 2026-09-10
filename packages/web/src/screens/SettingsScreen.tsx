import {
  cyclePatternStyle,
  cycleTheme,
  formatTimeLimit,
  stepGridSize,
  stepTimeLimitSec,
  toggleColorMode,
  type Settings,
} from "@copy-quatre/core";
import { Button } from "../components/Button";
import { SlideToggle } from "../components/SlideToggle";
import { Stepper } from "../components/Stepper";

type SettingsScreenProps = {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onCustomizeAnimations: () => void;
  onBack: () => void;
};

export function SettingsScreen({
  settings,
  onChange,
  onCustomizeAnimations,
  onBack,
}: SettingsScreenProps) {
  return (
    <div className="screen settings-screen">
      <h2>Settings</h2>
      <div className="settings-list">
        <Stepper
          label="Time limit"
          value={formatTimeLimit(settings.timeLimitSec)}
          onDecrement={() =>
            onChange({ ...settings, timeLimitSec: stepTimeLimitSec(settings.timeLimitSec, -1) })
          }
          onIncrement={() =>
            onChange({ ...settings, timeLimitSec: stepTimeLimitSec(settings.timeLimitSec, 1) })
          }
        />
        <Stepper
          label="Grid size"
          value={`${settings.gridSize}×${settings.gridSize}`}
          onDecrement={() =>
            onChange({ ...settings, gridSize: stepGridSize(settings.gridSize, -1) })
          }
          onIncrement={() =>
            onChange({ ...settings, gridSize: stepGridSize(settings.gridSize, 1) })
          }
        />
        <div className="setting-row">
          <span className="stepper-label">Pattern style</span>
          <Button
            variant="secondary"
            onClick={() => onChange({ ...settings, patternStyle: cyclePatternStyle(settings.patternStyle) })}
          >
            {settings.patternStyle}
          </Button>
        </div>
        <div className="setting-row">
          <span className="stepper-label">Color mode</span>
          <Button
            variant="secondary"
            onClick={() => onChange({ ...settings, colorMode: toggleColorMode(settings.colorMode) })}
          >
            {settings.colorMode}
          </Button>
        </div>
        <div className="setting-row">
          <span className="stepper-label">Color theme</span>
          <Button
            variant="secondary"
            onClick={() => onChange({ ...settings, theme: cycleTheme(settings.theme) })}
          >
            {settings.theme}
          </Button>
        </div>
        <div className="setting-row">
          <span className="stepper-label">Vibration</span>
          <SlideToggle
            checked={settings.vibration}
            onChange={(vibration) => onChange({ ...settings, vibration })}
            label="Vibration"
          />
        </div>
        <div className="setting-row">
          <span className="stepper-label">Animations</span>
          <div className="setting-row-controls">
            <SlideToggle
              checked={settings.animations.enabled}
              onChange={(enabled) =>
                onChange({
                  ...settings,
                  animations: { ...settings.animations, enabled },
                })
              }
              label="Animations"
            />
            <Button variant="secondary" onClick={onCustomizeAnimations}>
              Customize…
            </Button>
          </div>
        </div>
      </div>
      <Button onClick={onBack}>Back</Button>
    </div>
  );
}
