import {
  cyclePatternStyle,
  cycleTheme,
  formatTimeLimit,
  getGameMode,
  stepGridSize,
  stepTimeLimitSec,
  toggleColorMode,
  type GameModeId,
  type Settings,
} from "@copy-quatre/core";
import { Button } from "../components/Button";
import { ModeSelector } from "../components/ModeSelector";
import { SlideToggle } from "../components/SlideToggle";
import { Stepper } from "../components/Stepper";
import { vibrateToggleOn } from "../platform/vibration";

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
  const mode = getGameMode(settings.selectedMode);
  const profile = settings.modes[settings.selectedMode];

  const updateProfile = (partial: Partial<typeof profile>) => {
    onChange({
      ...settings,
      modes: {
        ...settings.modes,
        [settings.selectedMode]: { ...profile, ...partial },
      },
    });
  };

  const updateGlobal = (partial: Partial<Settings["global"]>) => {
    onChange({
      ...settings,
      global: { ...settings.global, ...partial },
    });
  };

  const handleModeChange = (selectedMode: GameModeId) => {
    onChange({ ...settings, selectedMode });
  };

  return (
    <div className="screen settings-screen">
      <h2>Settings</h2>
      <ModeSelector selectedMode={settings.selectedMode} onChange={handleModeChange} />
      <h3 className="settings-section-heading">{mode.name} game</h3>
      <div className="settings-list">
        <Stepper
          label="Time limit"
          value={formatTimeLimit(profile.timeLimitSec)}
          onDecrement={() =>
            updateProfile({ timeLimitSec: stepTimeLimitSec(profile.timeLimitSec, -1) })
          }
          onIncrement={() =>
            updateProfile({ timeLimitSec: stepTimeLimitSec(profile.timeLimitSec, 1) })
          }
        />
        <Stepper
          label="Grid size"
          value={`${profile.gridSize}×${profile.gridSize}`}
          onDecrement={() => updateProfile({ gridSize: stepGridSize(profile.gridSize, -1) })}
          onIncrement={() => updateProfile({ gridSize: stepGridSize(profile.gridSize, 1) })}
        />
        <div className="setting-row">
          <span className="stepper-label">Pattern style</span>
          <Button
            variant="secondary"
            onClick={() =>
              updateProfile({ patternStyle: cyclePatternStyle(profile.patternStyle) })
            }
          >
            {profile.patternStyle}
          </Button>
        </div>
      </div>
      <hr className="settings-divider" aria-hidden="true" />
      <h3 className="settings-section-heading">Global</h3>
      <div className="settings-list">
        <div className="setting-row">
          <span className="stepper-label">Color mode</span>
          <Button
            variant="secondary"
            onClick={() => updateGlobal({ colorMode: toggleColorMode(settings.global.colorMode) })}
          >
            {settings.global.colorMode}
          </Button>
        </div>
        <div className="setting-row">
          <span className="stepper-label">Color theme</span>
          <Button
            variant="secondary"
            onClick={() => updateGlobal({ theme: cycleTheme(settings.global.theme) })}
          >
            {settings.global.theme}
          </Button>
        </div>
        <div className="setting-row">
          <span className="stepper-label">Vibration</span>
          <SlideToggle
            checked={settings.global.vibration}
            onChange={(vibration) => {
              if (vibration) vibrateToggleOn();
              updateGlobal({ vibration });
            }}
            label="Vibration"
          />
        </div>
        <div className="setting-row">
          <span className="stepper-label">Animations</span>
          <div className="setting-row-controls">
            <SlideToggle
              checked={settings.global.animations.enabled}
              onChange={(enabled) =>
                updateGlobal({
                  animations: { ...settings.global.animations, enabled },
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
