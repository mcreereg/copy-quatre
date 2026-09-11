import {
  DEFAULT_SETTINGS,
  getHighScore,
  getThemeTokens,
  resolveSessionSettings,
  updateHighScore,
  validateSettings,
  type GameEvent,
  type HighScoreStore,
  type SessionSettings,
  type Settings,
} from "@copy-quatre/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameEngine } from "./hooks/useGameEngine";
import {
  initializeDataGeneration,
  loadHighScores,
  loadSettings,
  saveHighScores,
  saveSettings,
} from "./platform/storage";
import { vibrateTimeExpired } from "./platform/vibration";
import { GameErrorScreen } from "./screens/GameErrorScreen";
import { GameOverScreen } from "./screens/GameOverScreen";
import { HighScoresScreen } from "./screens/HighScoresScreen";
import { PlayScreen } from "./screens/PlayScreen";
import { AnimationSettingsScreen } from "./screens/AnimationSettingsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AiDisclosureScreen } from "./screens/AiDisclosureScreen";
import { TitleScreen } from "./screens/TitleScreen";
import "./styles.css";

type Screen =
  | "title"
  | "settings"
  | "animations"
  | "highscores"
  | "aidisclosure"
  | "playing"
  | "gameover"
  | "gameerror";

export function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [ready, setReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [highScores, setHighScores] = useState<HighScoreStore>({});
  const [finalScore, setFinalScore] = useState(0);
  const [finalHighScore, setFinalHighScore] = useState(0);
  const [isHighScore, setIsHighScore] = useState(false);
  const [gameError, setGameError] = useState<{ message: string; score?: number; session?: SessionSettings } | null>(null);
  const [retrySession, setRetrySession] = useState<SessionSettings | null>(null);
  const settingsRef = useRef(settings);
  const highScoresRef = useRef(highScores);

  settingsRef.current = settings;
  highScoresRef.current = highScores;

  const loadAppData = useCallback(async () => {
    setBootstrapError(null);
    try {
      await initializeDataGeneration();
      const [loadedSettings, loadedScores] = await Promise.all([
        loadSettings(),
        loadHighScores(),
      ]);
      setSettings(validateSettings(loadedSettings));
      setHighScores(loadedScores);
      setReady(true);
    } catch (error) {
      setReady(false);
      setBootstrapError(
        error instanceof Error ? error.message : "Couldn't initialize game data.",
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadAppData().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [loadAppData]);

  const handleEvent = useCallback((event: GameEvent) => {
    if (event.type === "GAME_OVER") {
      const session = event.sessionSettings;
      if (event.reason === "timeout" && session.vibration) {
        vibrateTimeExpired();
      }
      const { store, isHighScore: newRecord } = updateHighScore(
        highScoresRef.current,
        session,
        event.score,
      );
      setHighScores(store);
      setFinalScore(event.score);
      setFinalHighScore(Math.max(getHighScore(store, session), event.score));
      setIsHighScore(newRecord);
      setScreen("gameover");
      void saveHighScores(store);
      return;
    }

    if (event.type === "GENERATION_FAILED") {
      if (event.stage === "round-advance") {
        const { store } = updateHighScore(
          highScoresRef.current,
          event.sessionSettings,
          event.score,
        );
        setHighScores(store);
        void saveHighScores(store);
      }

      setGameError({
        message:
          event.stage === "round-advance"
            ? "Couldn't generate the next puzzle."
            : event.message,
        score: event.stage === "round-advance" ? event.score : undefined,
        session: event.sessionSettings,
      });
      setRetrySession(event.sessionSettings);
      setScreen("gameerror");
    }
  }, []);

  const { state, dispatch } = useGameEngine(handleEvent);

  const themeTokens = useMemo(
    () => getThemeTokens(settings.global.theme, settings.global.colorMode),
    [settings.global.theme, settings.global.colorMode],
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

  const handleModeChange = (selectedMode: Settings["selectedMode"]) => {
    handleSettingsChange({ ...settings, selectedMode });
  };

  const handleStart = () => {
    const session = resolveSessionSettings(settings);
    const events = dispatch({ type: "START", settings: session });
    for (const event of events) {
      handleEvent(event);
    }
    if (events.some((event) => event.type === "GENERATION_FAILED")) {
      return;
    }
    setScreen("playing");
  };

  const handleGameErrorRetry = () => {
    if (!retrySession) return;
    if (gameError?.score !== undefined) {
      dispatch({ type: "START", settings: retrySession });
      setScreen("playing");
      setGameError(null);
      return;
    }
    handleStart();
  };

  if (bootstrapError) {
    return (
      <div className="app">
        <GameErrorScreen
          message={bootstrapError}
          onRetry={() => void loadAppData()}
          onBack={() => {
            setBootstrapError(null);
            void loadAppData();
          }}
        />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="app">
        <div className="screen loading-screen">Loading…</div>
      </div>
    );
  }

  return (
    <div
      className="app"
      data-animations={settings.global.animations.enabled ? "on" : "off"}
    >
      {screen === "title" && (
        <TitleScreen
          selectedMode={settings.selectedMode}
          onModeChange={handleModeChange}
          onStart={handleStart}
          onSettings={() => setScreen("settings")}
          onHighScores={() => setScreen("highscores")}
          onAiDisclosure={() => setScreen("aidisclosure")}
        />
      )}
      {screen === "aidisclosure" && (
        <AiDisclosureScreen onBack={() => setScreen("title")} />
      )}
      {screen === "settings" && (
        <SettingsScreen
          settings={settings}
          onChange={handleSettingsChange}
          onCustomizeAnimations={() => setScreen("animations")}
          onBack={() => setScreen("title")}
        />
      )}
      {screen === "animations" && (
        <AnimationSettingsScreen
          settings={settings}
          onChange={handleSettingsChange}
          onBack={() => setScreen("settings")}
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
          highScore={finalHighScore}
          isHighScore={isHighScore}
          onNice={() => setScreen("title")}
        />
      )}
      {screen === "gameerror" && gameError && (
        <GameErrorScreen
          message={gameError.message}
          score={gameError.score}
          onRetry={handleGameErrorRetry}
          onBack={() => {
            setGameError(null);
            setScreen("title");
          }}
        />
      )}
    </div>
  );
}
