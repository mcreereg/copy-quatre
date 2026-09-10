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
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [highScores, setHighScores] = useState<HighScoreStore>({});
  const [finalScore, setFinalScore] = useState(0);
  const [isHighScore, setIsHighScore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSettings(DEFAULT_SETTINGS), loadHighScores()]).then(
      ([loadedSettings, loadedScores]) => {
        if (cancelled) return;
        setSettings(validateSettings(loadedSettings));
        setHighScores(loadedScores);
        setReady(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEvent = useCallback(
    (event: GameEvent) => {
      if (event.type === "GAME_OVER") {
        const { store, isHighScore: newRecord } = updateHighScore(
          highScores,
          settings,
          event.score,
        );
        setHighScores(store);
        setFinalScore(event.score);
        setIsHighScore(newRecord);
        setScreen("gameover");
        void saveHighScores(store);
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
    void saveSettings(validated);
  };

  const handleStart = () => {
    dispatch({ type: "START", settings });
    setScreen("playing");
  };

  const currentHighScore = getHighScore(highScores, settings);

  if (!ready) {
    return (
      <div className="app">
        <div className="screen loading-screen">Loading…</div>
      </div>
    );
  }

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
        <HighScoresScreen store={highScores} settings={settings} onBack={() => setScreen("title")} />
      )}
      {screen === "playing" && state && (
        <PlayScreen
          state={state}
          dispatch={dispatch}
          onPause={() => dispatch({ type: "PAUSE" })}
          onResume={() => dispatch({ type: "RESUME" })}
          onQuit={() => dispatch({ type: "QUIT" })}
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
