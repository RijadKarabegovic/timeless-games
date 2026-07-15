import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Calculator, CheckCircle2, ChevronDown, HelpCircle, RotateCcw, Sparkles, TriangleAlert, Trophy } from 'lucide-react';
import { CyclingPhrases, useParadoxReport } from './TemporalDamage.jsx';
import { formatYear } from '../utils/gameLogic.js';
import { generateAlgebraPuzzle } from '../utils/algebraGenerator.js';
import events from '../data/events.json';

const POINTS_PER_WIN = 100;
const MAX_ROUNDS = 5;
const HIGH_SCORE_KEY = 'timeless:algebra:highScore';

const ANOMALY_LOADING_PHRASES = [
  'Carrying the temporal one…',
  'Calculating parallel algebraic constants…',
  'Dividing by zero (carefully)…',
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

/**
 * Five round dots: emerald = solved, muted zinc = missed, pulsing emerald =
 * current round, dim = upcoming.
 */
const ProgressTracker = ({ roundResults, active }) => (
  <div
    className="flex justify-center gap-2.5"
    aria-label={`Round ${Math.min(roundResults.length + 1, MAX_ROUNDS)} of ${MAX_ROUNDS}`}
  >
    {Array.from({ length: MAX_ROUNDS }, (_, i) => {
      const result = roundResults[i];
      const isCurrent = active && i === roundResults.length;
      return (
        <span
          key={i}
          className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
            result === true
              ? 'bg-emerald-500'
              : result === false
                ? 'bg-zinc-700'
                : isCurrent
                  ? 'animate-pulse bg-emerald-400/70 ring-2 ring-emerald-500/30'
                  : 'bg-zinc-800'
          }`}
        />
      );
    })}
  </div>
);

// Signed display for equation math, so BCE years read as negatives: -2560.
const signedYear = (year) => year.toLocaleString('en-US', { useGrouping: false });

const CONFETTI_COLORS = ['#34d399', '#818cf8', '#facc15', '#e879f9', '#a1a1aa'];

const ConfettiBurst = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        angle: (i / 18) * Math.PI * 2 + Math.random() * 0.5,
        distance: 70 + Math.random() * 90,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 5 + Math.random() * 7,
        delay: Math.random() * 0.12,
        spin: Math.random() * 360 - 180,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance - 30,
            opacity: 0,
            scale: 0.3,
            rotate: p.spin,
          }}
          transition={{ duration: 1, delay: p.delay, ease: 'easeOut' }}
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
          className="absolute rounded-sm"
        />
      ))}
    </div>
  );
};

/**
 * The equation dashboard. Monospace digits with a micro-glow on the known
 * values; the mystery slot pulses until the confirmed card's year "flies"
 * up into it.
 */
const EquationBoard = ({ puzzle, phase, selectedChoice }) => {
  const inFeedback = phase === 'feedback';
  const isCorrect = inFeedback && selectedChoice.id === puzzle.correctAnswer.id;
  const computed = inFeedback
    ? puzzle.operator === '+'
      ? puzzle.eventA.year + selectedChoice.year
      : puzzle.eventA.year - selectedChoice.year
    : null;

  return (
    <section
      aria-label="Equation board"
      className="relative fr-card px-6 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
    >
      {/* Faint top glow line, like a powered-on instrument panel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/40 to-transparent"
      />

      <span className="fr-badge-emerald mb-3 capitalize">
        {puzzle.eventA.category}
      </span>
      <p className="mb-5 text-lg font-medium leading-relaxed tracking-tight text-zinc-100">
        {puzzle.eventA.event}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-3xl font-bold">
        <span className="text-emerald-400 fr-glow-emerald">
          {signedYear(puzzle.eventA.year)}
        </span>
        <span className="text-zinc-500">{puzzle.operator}</span>

        <AnimatePresence mode="wait">
          {inFeedback ? (
            <motion.span
              key="filled"
              initial={{ y: 70, scale: 0.5, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 22 }}
              className={`rounded-xl border px-3 ${
                isCorrect
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 fr-glow-emerald'
                  : 'border-zinc-700/80 bg-zinc-800/60 text-zinc-400'
              }`}
            >
              {signedYear(selectedChoice.year)}
            </motion.span>
          ) : (
            <motion.span
              key="mystery"
              exit={{ opacity: 0, scale: 0.7 }}
              animate={{
                boxShadow: [
                  '0 0 0px rgba(52, 211, 153, 0.1)',
                  '0 0 16px rgba(52, 211, 153, 0.4)',
                  '0 0 0px rgba(52, 211, 153, 0.1)',
                ],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="rounded-xl border border-dashed border-emerald-500/50 px-4 text-emerald-400"
            >
              ?
            </motion.span>
          )}
        </AnimatePresence>

        <span className="text-zinc-500">=</span>
        <span className="text-white fr-glow-white">
          {signedYear(puzzle.targetValue)}
        </span>
      </div>

      {/* Verdict line under the formula once the math is filled in */}
      <AnimatePresence>
        {inFeedback && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className={`mt-3 font-mono text-sm font-medium ${
              isCorrect ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          >
            {isCorrect
              ? `${signedYear(puzzle.eventA.year)} ${puzzle.operator} ${signedYear(selectedChoice.year)} = ${signedYear(puzzle.targetValue)} ✓`
              : `${signedYear(puzzle.eventA.year)} ${puzzle.operator} ${signedYear(selectedChoice.year)} = ${signedYear(computed)} … not ${signedYear(puzzle.targetValue)}`}
          </motion.p>
        )}
      </AnimatePresence>

      {isCorrect && <ConfettiBurst />}
    </section>
  );
};

/**
 * Expandable "TEMPORAL ANOMALY DETECTED" card shown on the round review after
 * a wrong answer. Collapsed by default; the AI report loads in the background
 * either way, and any API failure degrades to a themed one-liner — the round
 * flow never depends on this card.
 */
const AnomalyCard = ({ state }) => {
  const [expanded, setExpanded] = useState(false);

  if (state.status === 'idle') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full overflow-hidden fr-panel-ai"
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 transition-all duration-200 hover:bg-indigo-500/10"
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400">
          <motion.span
            aria-hidden="true"
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <TriangleAlert className="h-4 w-4" />
          </motion.span>
          Temporal Anomaly Detected
        </span>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-indigo-400" aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="px-4 pb-4 text-left">
              {state.status === 'loading' && (
                <div aria-live="polite" className="flex flex-col gap-2.5">
                  <CyclingPhrases
                    phrases={ANOMALY_LOADING_PHRASES}
                    className="text-indigo-400"
                  />
                  <div className="h-3 w-full animate-pulse rounded bg-indigo-500/20" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-indigo-500/20" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-indigo-500/20" />
                </div>
              )}

              {state.status === 'ready' && (
                <p className="text-sm italic leading-relaxed text-zinc-200">
                  “{state.report}”
                </p>
              )}

              {state.status === 'error' && (
                <p className="text-sm leading-relaxed text-zinc-500">
                  The professor's chalk snapped mid-calculation. The anomaly
                  remains unquantified — proceed to the next equation.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ChoiceCard = ({ choice, phase, isSelected, isConfirmedPick, isCorrectCard, onSelect }) => {
  const inFeedback = phase === 'feedback';
  const revealYear = inFeedback && (isConfirmedPick || isCorrectCard);

  const stateClasses = inFeedback
    ? isCorrectCard
      ? 'border-emerald-500/40 bg-emerald-500/10'
      : isConfirmedPick
        ? 'border-zinc-700/80 bg-zinc-800/60'
        : 'border-zinc-800/80 bg-zinc-900 opacity-50'
    : isSelected
      ? 'border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/30'
      : 'border-zinc-800/60 bg-zinc-900 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20';

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(choice)}
      disabled={inFeedback}
      whileHover={inFeedback ? undefined : { scale: 1.03 }}
      whileTap={inFeedback ? undefined : { scale: 0.96 }}
      animate={
        isSelected && !inFeedback
          ? { scale: [1, 1.06, 1] }
          : inFeedback && isConfirmedPick && !isCorrectCard
            ? { x: [0, -8, 8, -5, 5, 0] }
            : {}
      }
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className={`relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-center transition-all duration-200 disabled:cursor-default ${stateClasses}`}
    >
      {/* +100 badge on the winning confirmed pick */}
      <AnimatePresence>
        {inFeedback && isConfirmedPick && isCorrectCard && (
          <motion.span
            initial={{ scale: 0, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.25 }}
            className="absolute -top-3 right-3 rounded-full bg-emerald-500 px-3 py-0.5 font-mono text-xs font-bold text-zinc-950 shadow-lg shadow-emerald-500/20"
          >
            +{POINTS_PER_WIN} Points
          </motion.span>
        )}
      </AnimatePresence>

      <span className="fr-badge-emerald capitalize">
        {choice.category}
      </span>

      <span className="text-sm font-medium leading-snug tracking-tight text-zinc-100">
        {choice.event}
      </span>

      <span className="flex h-6 items-center">
        <AnimatePresence mode="wait">
          {revealYear ? (
            <motion.span
              key="year"
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className={`font-mono text-base font-bold ${
                isCorrectCard ? 'text-emerald-400' : 'text-zinc-500'
              }`}
            >
              {formatYear(choice.year)}
            </motion.span>
          ) : (
            <motion.span key="hidden" exit={{ opacity: 0 }}>
              <HelpCircle
                className={`h-5 w-5 ${isSelected ? 'text-emerald-400' : 'text-zinc-600'}`}
                aria-label="Year hidden"
              />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
};

export default function TimelineAlgebraGame() {
  const [puzzle, setPuzzle] = useState(() => generateAlgebraPuzzle(events));
  const [phase, setPhase] = useState('answering'); // 'answering' | 'feedback' | 'results'
  const [selectedId, setSelectedId] = useState(null);
  // One boolean per completed round; length doubles as the round counter.
  const [roundResults, setRoundResults] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const { state: anomaly, request: requestAnomaly, reset: resetAnomaly } = useParadoxReport();

  useEffect(() => {
    setHighScore(readHighScore());
  }, []);

  const selectedChoice = puzzle.choices.find((c) => c.id === selectedId) ?? null;
  const answeredCorrectly =
    phase === 'feedback' && selectedId === puzzle.correctAnswer.id;
  const solvedCount = roundResults.filter(Boolean).length;
  const isFinalRound = roundResults.length >= MAX_ROUNDS;

  const handleSelect = (choice) => {
    if (phase !== 'answering') return;
    setSelectedId(choice.id);
  };

  const handleConfirm = () => {
    if (phase !== 'answering' || !selectedChoice) return;
    const correct = selectedChoice.id === puzzle.correctAnswer.id;

    setPhase('feedback');
    setRoundResults((prev) => [...prev, correct]);

    if (correct) {
      setScore((s) => s + POINTS_PER_WIN);
    } else {
      // Fire-and-forget: the round review works the same whether or not the
      // professor's report ever arrives.
      const mathResult =
        puzzle.operator === '+'
          ? puzzle.eventA.year + selectedChoice.year
          : puzzle.eventA.year - selectedChoice.year;
      requestAnomaly({
        gameMode: 'algebra',
        eventA: `${puzzle.eventA.event} (${signedYear(puzzle.eventA.year)})`,
        operator: puzzle.operator,
        targetValue: puzzle.targetValue,
        incorrectEvent: `${selectedChoice.event} (${signedYear(selectedChoice.year)})`,
        mathResult,
      });
    }
  };

  const scrollToTopOnMobile = () => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    resetAnomaly();
    if (isFinalRound) {
      if (solvedCount > highScore) {
        writeHighScore(solvedCount);
        setHighScore(solvedCount);
        setIsNewRecord(true);
      }
      setPhase('results');
      scrollToTopOnMobile();
      return;
    }
    setPuzzle(generateAlgebraPuzzle(events));
    setSelectedId(null);
    setPhase('answering');
    scrollToTopOnMobile();
  };

  const handleRestart = () => {
    resetAnomaly();
    setPuzzle(generateAlgebraPuzzle(events));
    setSelectedId(null);
    setRoundResults([]);
    setScore(0);
    setIsNewRecord(false);
    setPhase('answering');
    scrollToTopOnMobile();
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-1 border-b border-zinc-800/60 pb-5 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Timeline <span className="text-emerald-400">Algebra</span>
        </h2>
        <p className="text-sm text-zinc-500">
          Solve for the mystery year — BCE years are negative
        </p>
      </header>

      <div className="flex items-center justify-center gap-7">
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <Sparkles className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          Score <span className="font-mono text-xl text-white">{score}</span>
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
          <Trophy className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          Best{' '}
          <span className="font-mono text-xl text-white">
            {highScore}/{MAX_ROUNDS}
          </span>
        </p>
      </div>

      <ProgressTracker roundResults={roundResults} active={phase !== 'results'} />

      {phase === 'results' ? (
        <motion.section
          role="status"
          aria-label="Session results"
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          className={`flex flex-col items-center gap-4 rounded-2xl border px-6 py-8 text-center ${
            solvedCount >= 3 ? 'fr-panel-success' : 'fr-panel-muted'
          }`}
        >
          <p className="text-xl font-bold tracking-tight text-white">Session complete!</p>

          {isNewRecord && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 15, delay: 0.3 }}
              className="rounded-full bg-emerald-500 px-4 py-1 text-sm font-bold text-zinc-950 shadow-lg shadow-emerald-500/20"
            >
              New High Score! 🏆
            </motion.span>
          )}

          <p className="text-zinc-400">
            Equations balanced:{' '}
            <span className="font-mono text-3xl font-bold text-white">
              {solvedCount}/{MAX_ROUNDS}
            </span>
          </p>

          <dl className="flex justify-center gap-10">
            <div>
              <dd className="font-mono text-2xl font-bold text-white">{score}</dd>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Points
              </dt>
            </div>
            <div>
              <dd className="font-mono text-2xl font-bold text-white">
                {highScore}/{MAX_ROUNDS}
              </dd>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                High Score
              </dt>
            </div>
          </dl>

          <button
            type="button"
            onClick={handleRestart}
            className="fr-btn-primary mt-1 flex items-center gap-2 py-3"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Play Again
          </button>
        </motion.section>
      ) : (
        <>
          <EquationBoard puzzle={puzzle} phase={phase} selectedChoice={selectedChoice} />

          <p className="flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.2em] text-zinc-600 text-[11px]">
            <Calculator className="h-4 w-4" aria-hidden="true" />
            Pick the event whose year completes the formula
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {puzzle.choices.map((choice) => (
              <ChoiceCard
                key={choice.id}
                choice={choice}
                phase={phase}
                isSelected={choice.id === selectedId}
                isConfirmedPick={phase === 'feedback' && choice.id === selectedId}
                isCorrectCard={choice.id === puzzle.correctAnswer.id}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {phase === 'answering' ? (
            <motion.button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedChoice}
              whileTap={selectedChoice ? { scale: 0.97 } : undefined}
              className="flex items-center justify-center gap-2 fr-btn-primary py-4 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {selectedChoice ? 'Lock It In' : 'Select a card first'}
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-3"
            >
              <p
                role="status"
                className={`text-sm font-semibold ${
                  answeredCorrectly ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                {answeredCorrectly
                  ? 'Equation balanced! 🎯'
                  : `Not quite — the answer was "${puzzle.correctAnswer.event}" (${formatYear(puzzle.correctAnswer.year)}).`}
              </p>

              {!answeredCorrectly && <AnomalyCard state={anomaly} />}

              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 fr-btn-primary py-3"
              >
                {isFinalRound ? 'See Results' : 'Next Equation'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </>
      )}

      <footer className="text-center text-xs text-zinc-600">
        {MAX_ROUNDS} equations per session · solve for the mystery year
      </footer>
    </div>
  );
}
