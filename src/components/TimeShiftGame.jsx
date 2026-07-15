import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Flame, RotateCcw, Trophy } from 'lucide-react';
import TemporalDamageBox, { useParadoxReport } from './TemporalDamage.jsx';
import { formatYear, isShiftGuessCorrect } from '../utils/gameLogic.js';
import events from '../data/events.json';

const HIGH_SCORE_KEY = 'timeless:timeshift:highScore';
// How long the revealed year + feedback flash stays up before advancing.
const RESULT_DURATION_MS = 1500;

const DAMAGE_LOADING_PHRASES = [
  'Measuring butterfly effects…',
  'Rewinding the causality tape…',
  'Stabilizing the timestream…',
];

const readHighScore = () => {
  try {
    return Number(window.localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
};

const writeHighScore = (value) => {
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(value));
  } catch {
    // Persistence unavailable; ignore.
  }
};

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const createInitialRound = () => {
  const reference = randomItem(events);
  const target = randomItem(events.filter((e) => e.id !== reference.id));
  return { reference, target, usedIds: [reference.id, target.id] };
};

/** Advance: target becomes the reference; draw a fresh target from the pool. */
const nextRound = ({ target, usedIds }) => {
  let used = usedIds;
  let pool = events.filter((e) => !used.includes(e.id));
  if (pool.length === 0) {
    // Run outlasted the dataset: recycle everything except the current card.
    used = [target.id];
    pool = events.filter((e) => e.id !== target.id);
  }
  const next = randomItem(pool);
  return { reference: target, target: next, usedIds: [...used, next.id] };
};

const EventCard = ({ role, event, children, feedback }) => (
  <motion.div
    animate={
      feedback === 'wrong'
        ? { x: [0, -10, 10, -7, 7, -4, 4, 0] }
        : feedback === 'correct'
          ? {
              boxShadow: [
                '0 0 0 0px rgba(52, 211, 153, 0)',
                '0 0 0 6px rgba(52, 211, 153, 0.35)',
                '0 0 0 0px rgba(52, 211, 153, 0)',
              ],
            }
          : {}
    }
    transition={{ duration: 0.45, ease: 'easeInOut' }}
    className={`flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-8 text-center transition-all duration-200 ${
      feedback === 'correct'
        ? 'border-emerald-500/40 bg-emerald-500/10'
        : feedback === 'wrong'
          ? 'border-zinc-700/80 bg-zinc-800/60'
          : 'fr-card-interactive'
    }`}
  >
    <span className="fr-badge-emerald capitalize">
      {role} · {event.category}
    </span>
    <p className="text-lg font-medium leading-relaxed tracking-tight text-zinc-100">{event.event}</p>
    {children}
  </motion.div>
);

const YearReveal = ({ revealed, year }) => (
  <div className="h-9 perspective-[600px]">
    <AnimatePresence mode="wait">
      {revealed ? (
        <motion.p
          key="year"
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="font-mono text-2xl font-bold text-white"
        >
          {formatYear(year)}
        </motion.p>
      ) : (
        <motion.p
          key="hidden"
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="font-mono text-2xl font-bold tracking-widest text-zinc-600"
        >
          ????
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

export default function TimeShiftGame() {
  const [round, setRound] = useState(createInitialRound);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState('playing'); // 'playing' | 'result' | 'gameover'
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [isNewRecord, setIsNewRecord] = useState(false);
  const timerRef = useRef(null);
  const { state: damageReport, request: requestDamage, reset: resetDamage } = useParadoxReport();

  useEffect(() => {
    setHighScore(readHighScore());
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleGuess = (guess) => {
    if (gameState !== 'playing') return;

    const correct = isShiftGuessCorrect(round.reference.year, round.target.year, guess);
    setGameState('result');
    setFeedback(correct ? 'correct' : 'wrong');

    timerRef.current = setTimeout(() => {
      setFeedback(null);
      if (correct) {
        setStreak((s) => s + 1);
        setRound(nextRound);
        setGameState('playing');
      } else {
        setGameState('gameover');
        setHighScore((best) => {
          if (streak > best) {
            writeHighScore(streak);
            setIsNewRecord(true);
            return streak;
          }
          return best;
        });
        requestDamage({
          gameMode: 'timeshift',
          streak,
          targetEvent: round.target.event,
          refEvent: round.reference.event,
          userGuess: guess,
        });
      }
    }, RESULT_DURATION_MS);
  };

  const handleRestart = () => {
    clearTimeout(timerRef.current);
    setRound(createInitialRound());
    setStreak(0);
    setGameState('playing');
    setFeedback(null);
    setIsNewRecord(false);
    resetDamage();
  };

  const revealed = gameState !== 'playing';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-1 border-b border-zinc-800/60 pb-5 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Time <span className="text-emerald-400">Shift</span>
        </h2>
        <p className="text-sm text-zinc-500">
          Did the mystery event happen earlier or later than the reference?
        </p>
      </header>

      <div className="flex items-center justify-center gap-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <Flame className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          Streak <span className="font-mono text-xl text-white">{streak}</span>
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
          <Trophy className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          Best <span className="font-mono text-xl text-white">{highScore}</span>
        </p>
      </div>

      <EventCard role="Reference" event={round.reference}>
        <p className="font-mono text-2xl font-bold text-emerald-400">
          {formatYear(round.reference.year)}
        </p>
      </EventCard>

      <EventCard role="Mystery" event={round.target} feedback={feedback}>
        <YearReveal revealed={revealed} year={round.target.year} />
      </EventCard>

      {gameState === 'gameover' ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 fr-panel-muted px-6 py-6 text-center"
        >
          <p className="text-xl font-bold tracking-tight text-zinc-200">Timeline broken!</p>
          <p className="text-zinc-400">
            Final streak:{' '}
            <span className="font-mono text-2xl font-bold text-white">{streak}</span>
            {isNewRecord && (
              <span className="ml-2 font-semibold text-emerald-400">New record! 🏆</span>
            )}
          </p>

          <TemporalDamageBox state={damageReport} loadingPhrases={DAMAGE_LOADING_PHRASES} />

          <button
            type="button"
            onClick={handleRestart}
            className="fr-btn-primary mt-1 flex items-center gap-2 py-3"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Play Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleGuess('earlier')}
            disabled={gameState !== 'playing'}
            className="flex items-center justify-center gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900 py-6 text-lg font-semibold tracking-tight text-white transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:shadow-lg hover:shadow-black/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-6 w-6 text-emerald-400" aria-hidden="true" />
            Earlier
          </button>
          <button
            type="button"
            onClick={() => handleGuess('later')}
            disabled={gameState !== 'playing'}
            className="flex items-center justify-center gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900 py-6 text-lg font-semibold tracking-tight text-white transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:shadow-lg hover:shadow-black/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Later
            <ArrowRight className="h-6 w-6 text-emerald-400" aria-hidden="true" />
          </button>
        </div>
      )}

      <footer className="text-center text-xs text-zinc-600">
        Guess right to keep the streak alive — events never repeat within a run
      </footer>
    </div>
  );
}
