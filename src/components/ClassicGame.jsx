import { useEffect, useMemo, useState } from 'react';
import GuessGrid, { MAX_GUESSES } from './GuessGrid.jsx';
import InputForm from './InputForm.jsx';
import StatsModal from './Modals/StatsModal.jsx';
import { evaluateGuess } from '../utils/gameLogic.js';
import { getDailyEvent } from '../utils/dateHelpers.js';
import events from '../data/events.json';

const GAME_STORAGE_KEY = 'timeless:gameState';
const STATS_STORAGE_KEY = 'timeless:stats';

const DEFAULT_STATS = {
  gamesPlayed: 0,
  winStreak: 0,
  maxStreak: 0,
  guessesDistribution: [0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const formatYear = (year) => `${Math.abs(year)} ${year < 0 ? 'BCE' : 'CE'}`;

// Local calendar date key, e.g. "2026-07-14". Using local time keeps the
// rollover aligned with the player's midnight, matching getDailyEvent.
const getTodayKey = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// localStorage can throw (private browsing, disabled storage); the game
// should still be playable without persistence in that case.
const readJSON = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJSON = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence unavailable; ignore.
  }
};

const loadStats = () => {
  const saved = readJSON(STATS_STORAGE_KEY);
  if (!saved) return { ...DEFAULT_STATS };
  // Pad older 6-bucket distributions so wins on guesses 7–9 still track.
  const dist = [...(saved.guessesDistribution ?? [])];
  while (dist.length < MAX_GUESSES) dist.push(0);
  return {
    ...DEFAULT_STATS,
    ...saved,
    guessesDistribution: dist.slice(0, MAX_GUESSES),
  };
};

export default function ClassicGame() {
  const dailyEvent = useMemo(() => getDailyEvent(events), []);

  // The event currently in play. Starts as today's daily event; "Play Again"
  // swaps in a random one so the game can be replayed infinitely.
  const [currentEvent, setCurrentEvent] = useState(dailyEvent);

  const [guesses, setGuesses] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing' | 'won' | 'lost'
  const [inputValue, setInputValue] = useState('');
  const [era, setEra] = useState('CE');
  const [error, setError] = useState('');
  const [stats, setStats] = useState(DEFAULT_STATS);

  // Incremented on each rejected submission to replay the input shake.
  const [shakeSignal, setShakeSignal] = useState(0);

  const [statsOpen, setStatsOpen] = useState(false);

  // Persisted alongside the game state so a refresh after the game ends
  // cannot re-trigger the stats update.
  const [statsRecorded, setStatsRecorded] = useState(false);

  // Flips to true only on the client after the saved state has been applied.
  const [hydrated, setHydrated] = useState(false);

  // 1) On mount: restore today's game, or discard a stale one (stats survive).
  useEffect(() => {
    const saved = readJSON(GAME_STORAGE_KEY);

    if (saved && saved.date === getTodayKey() && Array.isArray(saved.guesses)) {
      // Replay rounds use random events, so the save records which event the
      // guesses belong to; fall back to the daily event for older saves.
      const savedEvent = events.find((e) => e.id === saved.eventId);
      setCurrentEvent(savedEvent ?? dailyEvent);
      setGuesses(saved.guesses);
      setGameStatus(saved.gameStatus ?? 'playing');
      setStatsRecorded(Boolean(saved.statsRecorded));
    } else if (saved) {
      try {
        window.localStorage.removeItem(GAME_STORAGE_KEY);
      } catch {
        // Ignore.
      }
    }

    setStats(loadStats());
    setHydrated(true);
  }, [dailyEvent]);

  // 2) Persist the active game whenever it changes (only after hydration,
  //    so the initial empty state never overwrites a valid save).
  useEffect(() => {
    if (!hydrated) return;
    writeJSON(GAME_STORAGE_KEY, {
      date: getTodayKey(),
      eventId: currentEvent.id,
      guesses,
      gameStatus,
      statsRecorded,
    });
  }, [hydrated, currentEvent, guesses, gameStatus, statsRecorded]);

  // 3) Record stats exactly once when the game transitions to won/lost.
  //    `statsRecorded` is persisted, so resuming a finished game is a no-op.
  useEffect(() => {
    if (!hydrated || gameStatus === 'playing' || statsRecorded) return;

    setStats((prev) => {
      const next = {
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        guessesDistribution: [...prev.guessesDistribution],
      };

      if (gameStatus === 'won') {
        next.winStreak = prev.winStreak + 1;
        next.maxStreak = Math.max(prev.maxStreak, next.winStreak);
        next.guessesDistribution[guesses.length - 1] += 1;
      } else {
        next.winStreak = 0;
      }

      writeJSON(STATS_STORAGE_KEY, next);
      return next;
    });
    setStatsRecorded(true);
  }, [hydrated, gameStatus, statsRecorded, guesses.length]);

  // 4) Auto-open the stats modal when the game ends, delayed so the final
  //    row's flip (and win bounce) finish before the overlay appears.
  useEffect(() => {
    if (!hydrated || gameStatus === 'playing') return undefined;
    const timer = setTimeout(() => setStatsOpen(true), 1400);
    return () => clearTimeout(timer);
  }, [hydrated, gameStatus]);

  const handleValueChange = (value) => {
    setInputValue(value);
    setError('');
  };

  const rejectSubmit = (message) => {
    setError(message);
    setShakeSignal((n) => n + 1);
  };

  const handleSubmit = () => {
    if (gameStatus !== 'playing') return;

    if (inputValue === '') {
      rejectSubmit('Enter a year first.');
      return;
    }

    const magnitude = parseInt(inputValue, 10);
    const year = era === 'BCE' ? -magnitude : magnitude;

    if (guesses.some((g) => g.year === year)) {
      rejectSubmit(`You already guessed ${formatYear(year)}.`);
      return;
    }

    const result = evaluateGuess(year, currentEvent.year);
    const nextGuesses = [...guesses, { year, ...result }];
    setGuesses(nextGuesses);
    setInputValue('');
    setError('');

    if (result.distance === 0) {
      setGameStatus('won');
    } else if (nextGuesses.length >= MAX_GUESSES) {
      setGameStatus('lost');
    }
  };

  // Reset everything with a fresh random event for infinite replay.
  const handlePlayAgain = () => {
    const pool = events.filter((e) => e.id !== currentEvent.id);
    const nextEvent = pool[Math.floor(Math.random() * pool.length)] ?? currentEvent;
    setCurrentEvent(nextEvent);
    setGuesses([]);
    setGameStatus('playing');
    setStatsRecorded(false);
    setInputValue('');
    setEra('CE');
    setError('');
    setStatsOpen(false);
  };

  if (!hydrated) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-1 border-b border-zinc-800/60 pb-5 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Classic <span className="text-emerald-400">Mode</span>
        </h2>
        <p className="text-sm text-zinc-500">
          Guess the year of the historical event
        </p>
      </header>

      <section
        aria-label="Current event"
        className="fr-card-interactive px-6 py-5 text-center"
      >
        <span className="fr-badge-emerald mb-3 capitalize">
          {currentEvent.category}
        </span>
        <p className="text-lg font-medium leading-relaxed tracking-tight text-zinc-100">
          {currentEvent.event}
        </p>
      </section>

      <GuessGrid guesses={guesses} />

      {gameStatus === 'playing' ? (
        <InputForm
          value={inputValue}
          era={era}
          onValueChange={handleValueChange}
          onEraChange={setEra}
          onSubmit={handleSubmit}
          disabled={gameStatus !== 'playing'}
          error={error}
          shakeSignal={shakeSignal}
        />
      ) : (
        <div
          role="status"
          className={gameStatus === 'won' ? 'fr-panel-success px-6 py-5 text-center' : 'fr-panel-muted px-6 py-5 text-center'}
        >
          <p
            className={`text-xl font-bold tracking-tight ${
              gameStatus === 'won' ? 'text-emerald-400' : 'text-zinc-300'
            }`}
          >
            {gameStatus === 'won' ? 'Brilliant! 🏆' : 'Out of guesses'}
          </p>
          <p className="mt-1 text-zinc-400">
            {gameStatus === 'won'
              ? `You pinpointed it in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}.`
              : 'The timeline slipped away.'}{' '}
            The answer was{' '}
            <span className="font-mono font-semibold text-white">
              {formatYear(currentEvent.year)}
            </span>
            .
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handlePlayAgain}
              className="fr-btn-primary"
            >
              Play Again
            </button>
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              className="fr-btn-secondary"
            >
              View Statistics
            </button>
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-zinc-600">
        {MAX_GUESSES} attempts per event · play as long as you like
      </footer>

      <StatsModal
        key={currentEvent.id}
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        stats={stats}
        guesses={guesses}
        gameStatus={gameStatus}
        dailyEvent={currentEvent}
        onPlayAgain={handlePlayAgain}
      />
    </div>
  );
}
