import {
  DEFAULT_SETTINGS,
  getHighScore,
  getThemeTokens,
  updateHighScore,
  validateSettings,
  type GameEvent,
  type HighScoreStore,
  type Settings,
} from "@copy-quatre/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameEngine } from "./hooks/useGameEngine";
import { loadHighScores, loadSettings, saveHighScores, saveSettings } from "./platform/storage";
import { GameOverScreen } from "./screens/GameOverScreen";
import { HighScoresScreen } from "./screens/HighScoresScreen";
import { PlayScreen } from "./screens/PlayScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TitleScreen } from "./screens/TitleScreen";
import "./styles.css";

type Screen = "title" | "settings" | "highscores" | "playing" | "gameover";

export function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [settings, setSettings] = useState<Settings>(() =>
    validateSettings(loadSettings(DEFAULT_SETTINGS)),
  );
  const [highScores, setHighScores] = useState<HighScoreStore>(() => loadHighScores());
  const [finalScore, setFinalScore] = useState(0);
  const [isHighScore, setIsHighScore] = useState(false);

  const handleEvent = useCallback(
    (event: GameEvent) => {
      if (event.type === "GAME_OVER") {
        const { store, isHighScore: newRecord } = updateHighScore(
          highScores,
          settings,
          event.score,
        );
        setHighScores(store);
        saveHighScores(store);
        setFinalScore(event.score);
        setIsHighScore(newRecord);
        setScreen("gameover");
      }
    },
    [highScores, settings],
  );

  const { state, dispatch } = useGameEngine(handleEvent);

  const themeTokens = useMemo(
    () => getThemeTokens(settings.theme, settings.colorMode),
    [settings.theme, settings.colorMode],
  );

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(themeTokens)) {
      root.style.setProperty(`--${key}`, value);
    }
  }, [themeTokens]);

  const handleSettingsChange = (next: Settings) => {
    const validated = validateSettings(next);
    setSettings(validated);
    saveSettings(validated);
  };

  const handleStart = () => {
    dispatch({ type: "START", settings });
    setScreen("playing");
  };

  const currentHighScore = getHighScore(highScores, settings);

  return (
    <div className="app">
      {screen === "title" && (
        <TitleScreen
          onStart={handleStart}
          onSettings={() => setScreen("settings")}
          onHighScores={() => setScreen("highscores")}
        />
      )}
      {screen === "settings" && (
        <SettingsScreen
          settings={settings}
          onChange={handleSettingsChange}
          onBack={() => setScreen("title")}
        />
      )}
      {screen === "highscores" && (
        <HighScoresScreen store={highScores} onBack={() => setScreen("title")} />
      )}
      {screen === "playing" && state && (
        <PlayScreen
          state={state}
          onPointerDown={(r, c) => dispatch({ type: "POINTER_DOWN", row: r, col: c })}
          onPointerEnter={(r, c) => dispatch({ type: "POINTER_ENTER", row: r, col: c })}
          onPointerUp={() => dispatch({ type: "POINTER_UP" })}
          onPause={() => dispatch({ type: "PAUSE" })}
          onResume={() => dispatch({ type: "RESUME" })}
        />
      )}
      {screen === "gameover" && (
        <GameOverScreen
          score={finalScore}
          highScore={Math.max(currentHighScore, finalScore)}
          isHighScore={isHighScore}
          onNice={() => setScreen("title")}
        />
      )}
    </div>
  );
}
