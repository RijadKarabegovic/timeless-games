import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ModalShell from './ModalShell.jsx';
import { getDayOfYear } from '../../utils/dateHelpers.js';
import { PROXIMITY_LABELS } from '../../utils/gameLogic.js';

const COLOR_EMOJI = {
  green: '🟩',
  yellow: '🟨',
  orange: '🟧',
  red: '🟥',
  rose: '🟫',
  gray: '⬜',
};

const LOADING_PHRASES = [
  'Recalibrating flux capacitor…',
  'Isolating temporal anomalies…',
  'Consulting parallel timelines…',
  'Untangling causality threads…',
];

const formatYear = (year) => `${Math.abs(year)} ${year < 0 ? 'BCE' : 'CE'}`;

const guessLine = (guess) => {
  const square = COLOR_EMOJI[guess.color] ?? '⬜';
  if (guess.direction === 'correct') return `${square} 🎉 Correct`;
  const arrow = guess.direction === 'later' ? '⬆️' : '⬇️';
  return `${square} ${arrow} ${guess.proximity ?? PROXIMITY_LABELS[guess.color]}`;
};

const buildShareText = (guesses, gameStatus) => {
  const dayId = getDayOfYear();
  const score = gameStatus === 'won' ? guesses.length : 'X';
  const lines = guesses.map(guessLine).join('\n');
  return `Timeless #${dayId} - ${score}/9\n${lines}\n\nPlay here: ${window.location.origin}`;
};

const ParadoxSkeleton = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setPhraseIndex((i) => (i + 1) % LOADING_PHRASES.length),
      1400,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div aria-live="polite" className="flex flex-col gap-2 md:gap-2.5">
      <AnimatePresence mode="wait">
        <motion.p
          key={phraseIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="text-xs font-semibold uppercase tracking-widest text-indigo-400"
        >
          {LOADING_PHRASES[phraseIndex]}
        </motion.p>
      </AnimatePresence>
      <div className="h-3 w-full animate-pulse rounded bg-indigo-500/20" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-indigo-500/20" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-indigo-500/20" />
    </div>
  );
};

const ParadoxReport = ({ gameStatus, worstGuess, state }) => {
  if (gameStatus === 'playing') return null;

  return (
    <section aria-label="Timeline paradox report" className="fr-panel-ai mt-5 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400">
        <span aria-hidden="true">🌀</span> Timeline Paradox Report
      </h3>

      {!worstGuess && (
        <p className="text-sm leading-relaxed text-zinc-400">
          A flawless first-try run — the timeline remains suspiciously intact. No
          paradoxes to report.
        </p>
      )}

      {worstGuess && (state.status === 'loading' || state.status === 'idle') && (
        <ParadoxSkeleton />
      )}

      {worstGuess && state.status === 'ready' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="text-sm italic leading-relaxed text-zinc-200">
            “{state.report}”
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Based on your wildest guess:{' '}
            <span className="font-mono text-zinc-400">{formatYear(worstGuess.year)}</span>{' '}
            ({(worstGuess.proximity ?? PROXIMITY_LABELS[worstGuess.color]).toLowerCase()})
          </p>
        </motion.div>
      )}

      {worstGuess && state.status === 'error' && (
        <p className="text-sm leading-relaxed text-zinc-500">
          The timeline resisted analysis — our quantum historians will try again on
          your next round.
        </p>
      )}
    </section>
  );
};

export default function StatsModal({
  open,
  onClose,
  stats,
  guesses,
  gameStatus,
  dailyEvent,
  onPlayAgain,
}) {
  const [copyState, setCopyState] = useState('idle');
  const [paradox, setParadox] = useState({ status: 'idle', report: '' });
  const paradoxRequestedRef = useRef(false);

  useEffect(() => {
    if (open) setCopyState('idle');
  }, [open]);

  const worstGuess = guesses.reduce(
    (worst, g) => (g.distance > 0 && (!worst || g.distance > worst.distance) ? g : worst),
    null,
  );

  useEffect(() => {
    if (gameStatus === 'playing' || !worstGuess || paradoxRequestedRef.current) return;
    paradoxRequestedRef.current = true;

    const fetchParadox = async () => {
      setParadox({ status: 'loading', report: '' });
      try {
        const response = await fetch('/api/paradox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            correctEvent: dailyEvent.event,
            correctYear: formatYear(dailyEvent.year),
            worstGuess: formatYear(worstGuess.year),
          }),
        });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        const data = await response.json();
        setParadox({ status: 'ready', report: data.report });
      } catch {
        setParadox({ status: 'error', report: '' });
      }
    };

    fetchParadox();
  }, [gameStatus, worstGuess, dailyEvent]);

  const wins = stats.guessesDistribution.reduce((sum, n) => sum + n, 0);
  const winPercent =
    stats.gamesPlayed === 0 ? 0 : Math.round((wins / stats.gamesPlayed) * 100);

  const summary = [
    { label: 'Played', value: stats.gamesPlayed },
    { label: 'Win %', value: winPercent },
    { label: 'Streak', value: stats.winStreak },
    { label: 'Max Streak', value: stats.maxStreak },
  ];

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText(guesses, gameStatus));
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  const handlePlayAgain = () => {
    onClose();
    onPlayAgain?.();
  };

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="stats-modal-title">
      <h2
        id="stats-modal-title"
        className="mb-1 text-xl font-bold tracking-tight text-white"
      >
        Statistics
      </h2>
      <p className="mb-5 text-sm text-zinc-500">
        {gameStatus === 'won'
          ? `Solved in ${guesses.length}/9 — hit Play Again for another round.`
          : gameStatus === 'lost'
            ? 'Out of guesses — jump back in with a fresh event.'
            : 'Your record so far.'}
      </p>

      <dl className="grid grid-cols-4 gap-2 text-center">
        {summary.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 px-2 py-3 transition-all duration-200 hover:border-zinc-700"
          >
            <dd className="font-mono text-2xl font-bold text-white">{value}</dd>
            <dt className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              {label}
            </dt>
          </div>
        ))}
      </dl>

      <ParadoxReport gameStatus={gameStatus} worstGuess={worstGuess} state={paradox} />

      {guesses.length > 0 && gameStatus !== 'playing' && (
        <div className="mt-5 flex flex-col gap-2 md:gap-2.5">
          {onPlayAgain && (
            <button type="button" onClick={handlePlayAgain} className="fr-btn-primary w-full py-3">
              Play Again
            </button>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="w-full rounded-xl border border-indigo-500/20 bg-indigo-500/10 py-3 text-sm font-semibold tracking-tight text-indigo-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/20"
          >
            {copyState === 'copied' ? 'Copied to clipboard ✓' : 'Share Results'}
          </button>
          <p aria-live="polite" className="min-h-4 text-center text-xs text-zinc-600">
            {copyState === 'copied' && 'Paste it anywhere to show off your run.'}
            {copyState === 'error' &&
              'Could not access the clipboard — check browser permissions.'}
          </p>
        </div>
      )}
    </ModalShell>
  );
}
