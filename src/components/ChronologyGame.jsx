import { useRef, useState } from 'react';
import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion';
import { ChevronDown, ChevronUp, GripVertical, Hourglass, RotateCcw, X } from 'lucide-react';
import TemporalDamageBox, { useParadoxReport } from './TemporalDamage.jsx';
import { formatYear } from '../utils/gameLogic.js';
import { getDayOfYear } from '../utils/dateHelpers.js';
import events from '../data/events.json';

const MAX_ATTEMPTS = 3;
const CARD_COUNT = 4;
const REVEAL_STAGGER_MS = 300;
const REVEAL_FLIP_MS = 450;
// Extra time the red/green feedback stays visible before a retry re-hides it.
const FEEDBACK_HOLD_MS = 1300;

const DAMAGE_LOADING_PHRASES = [
  'Untangling the timeline threads…',
  'Re-shelving history textbooks…',
  'Auditing broken causality…',
];

// Deterministic PRNG (mulberry32) so every player gets the same daily puzzle.
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const seededShuffle = (array, rand) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const isChronological = (list) =>
  list.every((e, i) => i === 0 || list[i - 1].year <= e.year);

/**
 * Build a puzzle: 4 picked events, presented in a shuffle that is guaranteed
 * not to already be the solved order. The first puzzle of a session is the
 * seeded daily one; replays draw fresh random quads.
 */
const createPuzzle = (rand) => {
  const quad = seededShuffle(events, rand).slice(0, CARD_COUNT);
  let presented = seededShuffle(quad, rand);
  if (isChronological(presented)) {
    presented = [...presented.slice(1), presented[0]];
  }
  return presented;
};

const createDailyPuzzle = () => {
  const seed = new Date().getFullYear() * 1000 + getDayOfYear();
  return createPuzzle(mulberry32(seed));
};

const createRandomPuzzle = () => createPuzzle(Math.random);

const YearFlip = ({ face, year, delaySeconds }) => (
  <div className="flex h-8 w-24 shrink-0 items-center justify-center perspective-[600px]">
    <AnimatePresence mode="wait">
      <motion.span
        key={face}
        initial={{ rotateX: -90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        exit={{ rotateX: 90, opacity: 0 }}
        transition={{
          type: 'spring',
          stiffness: 420,
          damping: 30,
          delay: delaySeconds,
        }}
        className={`font-mono text-lg font-bold ${
          face === 'year'
            ? 'text-white'
            : face === 'wrong'
              ? 'text-zinc-500'
              : 'tracking-widest text-zinc-600'
        }`}
      >
        {face === 'year' ? (
          formatYear(year)
        ) : face === 'wrong' ? (
          <X className="h-6 w-6" aria-label="Wrong position" />
        ) : (
          '????'
        )}
      </motion.span>
    </AnimatePresence>
  </div>
);

/**
 * Drag only from the grip handle so the rest of the card (and page) still
 * scrolls normally on mobile.
 */
const ChronologyCard = ({
  event,
  arranging,
  face,
  borderClass,
  revealDelay,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={event}
      dragListener={false}
      dragControls={dragControls}
      drag={arranging}
      layout
      style={{ touchAction: 'pan-y' }}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-4 transition-all duration-200 ${borderClass}`}
    >
      <button
        type="button"
        aria-label={`Drag to reorder ${event.event}`}
        disabled={!arranging}
        onPointerDown={(e) => {
          if (!arranging) return;
          // Prevent the page from scrolling while starting a drag.
          e.preventDefault();
          dragControls.start(e);
        }}
        className={`flex shrink-0 touch-none items-center justify-center rounded-md p-1 ${
          arranging
            ? 'cursor-grab text-zinc-500 active:cursor-grabbing'
            : 'cursor-default text-zinc-800'
        }`}
      >
        <GripVertical className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <span className="fr-badge-emerald mt-1 capitalize">{event.category}</span>
        <p className="mt-1 text-sm font-medium leading-snug tracking-tight text-zinc-100">
          {event.event}
        </p>
      </div>

      <YearFlip face={face} year={event.year} delaySeconds={revealDelay} />

      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!arranging || isFirst}
          aria-label={`Move "${event.event}" up`}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800/60 text-zinc-400 transition-all duration-200 hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!arranging || isLast}
          aria-label={`Move "${event.event}" down`}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800/60 text-zinc-400 transition-all duration-200 hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </Reorder.Item>
  );
};

export default function ChronologyGame() {
  const [order, setOrder] = useState(createDailyPuzzle);
  const [phase, setPhase] = useState('arranging'); // 'arranging' | 'revealing' | 'won' | 'lost'
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  // Map of event id -> boolean (in the right slot?) for the last submission.
  const [evaluation, setEvaluation] = useState(null);
  const timersRef = useRef([]);
  const { state: damageReport, request: requestDamage, reset: resetDamage } = useParadoxReport();

  const arranging = phase === 'arranging';

  const move = (index, delta) => {
    if (!arranging) return;
    setOrder((prev) => {
      const j = index + delta;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const handleSubmit = () => {
    if (!arranging) return;

    const sorted = [...order].sort((a, b) => a.year - b.year);
    const evalMap = Object.fromEntries(
      order.map((e, i) => [e.id, e.id === sorted[i].id]),
    );
    const allCorrect = order.every((e, i) => e.id === sorted[i].id);

    setEvaluation(evalMap);
    setPhase('revealing');

    const revealDone = (CARD_COUNT - 1) * REVEAL_STAGGER_MS + REVEAL_FLIP_MS;
    timersRef.current.push(
      setTimeout(() => {
        if (allCorrect) {
          setPhase('won');
          return;
        }
        const remaining = attemptsLeft - 1;
        setAttemptsLeft(remaining);
        if (remaining === 0) {
          setPhase('lost');
          // `order` here is still the player's failed arrangement (closure
          // from submit time) — capture it before showing the true order.
          requestDamage({
            gameMode: 'chronology',
            userOrder: order.map((e) => e.event).join(' → '),
            correctOrder: sorted.map((e) => e.event).join(' → '),
          });
          // Slide the cards into the true chronological order as the answer.
          setOrder(sorted);
        } else {
          timersRef.current.push(
            setTimeout(() => {
              setEvaluation(null);
              setPhase('arranging');
            }, FEEDBACK_HOLD_MS),
          );
        }
      }, revealDone),
    );
  };

  // Deal a fresh random quad and reset all round state for infinite replay.
  const handlePlayAgain = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setOrder(createRandomPuzzle());
    setPhase('arranging');
    setAttemptsLeft(MAX_ATTEMPTS);
    setEvaluation(null);
    resetDamage();
  };

  // What each card's year slot shows in the current phase.
  const faceFor = (event) => {
    if (phase === 'won' || phase === 'lost') return 'year';
    if (phase === 'revealing' || evaluation) {
      // Correct slots earn their year; wrong slots only get flagged, so a
      // failed attempt doesn't hand the player the full solution.
      return evaluation[event.id] ? 'year' : 'wrong';
    }
    return 'hidden';
  };

  const borderFor = (event) => {
    if (phase === 'won') return 'border-emerald-500/40 bg-emerald-500/10';
    if (evaluation) {
      return evaluation[event.id]
        ? 'border-emerald-500/40 bg-emerald-500/10'
        : 'border-zinc-700/80 bg-zinc-800/40';
    }
    return 'border-zinc-800/60 bg-zinc-900 hover:border-zinc-700';
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-1 border-b border-zinc-800/60 pb-5 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Chrono<span className="text-emerald-400">logy</span>
        </h2>
        <p className="text-sm text-zinc-500">
          Sort the four events from oldest (top) to newest (bottom)
        </p>
      </header>

      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-zinc-500">
        <Hourglass className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        Attempts
        <span className="flex gap-1.5" aria-label={`${attemptsLeft} of ${MAX_ATTEMPTS} attempts left`}>
          {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                i < attemptsLeft ? 'bg-emerald-500' : 'bg-zinc-800'
              }`}
            />
          ))}
        </span>
      </div>

      <Reorder.Group
        axis="y"
        values={order}
        onReorder={setOrder}
        className="flex flex-col gap-3"
      >
        {order.map((event, index) => (
          <ChronologyCard
            key={event.id}
            event={event}
            arranging={arranging}
            face={faceFor(event)}
            borderClass={borderFor(event)}
            revealDelay={phase === 'revealing' ? (index * REVEAL_STAGGER_MS) / 1000 : 0}
            onMoveUp={() => move(index, -1)}
            onMoveDown={() => move(index, 1)}
            isFirst={index === 0}
            isLast={index === order.length - 1}
          />
        ))}
      </Reorder.Group>

      {phase === 'won' && (
        <motion.div
          role="status"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="fr-panel-success px-6 py-5 text-center"
        >
          <p className="text-xl font-bold tracking-tight text-emerald-400">Timeline restored! 🎉</p>
          <p className="mt-1 text-zinc-400">
            Perfect chronology with{' '}
            <span className="font-semibold text-white">
              {attemptsLeft === MAX_ATTEMPTS
                ? 'your first attempt'
                : `${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} to spare`}
            </span>
            .
          </p>

          <button
            type="button"
            onClick={handlePlayAgain}
            className="fr-btn-primary mx-auto mt-4 flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Play Again
          </button>
        </motion.div>
      )}

      {phase === 'lost' && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fr-panel-muted px-6 py-5 text-center"
        >
          <p className="text-xl font-bold tracking-tight text-zinc-200">History disagrees</p>
          <p className="mt-1 text-zinc-400">
            Out of attempts — the cards above have slid into the true order.
          </p>

          <div className="mt-4">
            <TemporalDamageBox
              state={damageReport}
              loadingPhrases={DAMAGE_LOADING_PHRASES}
            />
          </div>

          <button
            type="button"
            onClick={handlePlayAgain}
            className="fr-btn-primary mx-auto mt-4 flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Play Again
          </button>
        </motion.div>
      )}

      {(phase === 'arranging' || phase === 'revealing') && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!arranging}
          className="rounded-2xl fr-btn-primary py-4 text-sm font-semibold tracking-tight disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
        >
          Submit Order
        </button>
      )}

      <footer className="text-center text-xs text-zinc-600">
        Drag cards or use the arrows · fresh events every round
      </footer>
    </div>
  );
}
