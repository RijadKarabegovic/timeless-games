import { motion, useReducedMotion } from 'framer-motion';
import { PROXIMITY_LABELS } from '../utils/gameLogic.js';

// Tailwind needs complete class strings at build time, so each proximity
// color maps to a full set of classes rather than interpolated names.
const COLOR_STYLES = {
  green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  yellow: 'border-yellow-500/25 bg-yellow-500/10 text-yellow-400',
  orange: 'border-orange-500/25 bg-orange-500/10 text-orange-400',
  red: 'border-red-800/50 bg-red-950/40 text-red-500',
  rose: 'border-rose-950/60 bg-rose-950/30 text-rose-700',
  gray: 'border-zinc-800/80 bg-zinc-900 text-zinc-500',
};

const DOT_STYLES = {
  green: 'bg-emerald-400',
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-400',
  red: 'bg-red-700',
  rose: 'bg-rose-800',
  gray: 'bg-zinc-600',
};

// Snappy spring for the card flip; high stiffness keeps it from feeling mushy.
const FLIP_SPRING = { type: 'spring', stiffness: 520, damping: 34 };
const CELL_STAGGER_S = 0.1;
// Bounce starts once the last cell's flip has mostly settled.
const WIN_BOUNCE_DELAY_S = 0.55;

const formatYear = (year) => `${Math.abs(year)} ${year < 0 ? 'BCE' : 'CE'}`;

const DirectionHint = ({ direction }) => {
  if (direction === 'correct') {
    return <span className="text-lg" role="img" aria-label="Correct">🎯</span>;
  }
  // "later" = the target is later than the guess, so aim higher (⬆️);
  // "earlier" = the target is earlier, so aim lower (⬇️).
  const isLater = direction === 'later';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-lg" role="img" aria-label={isLater ? 'Guess later' : 'Guess earlier'}>
        {isLater ? '⬆️' : '⬇️'}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-widest opacity-70">
        {isLater ? 'Later' : 'Earlier'}
      </span>
    </span>
  );
};

/**
 * One cell of a submitted row. Flips in around the X axis with a per-cell
 * delay so the three columns reveal one after another. Opacity is never
 * animated, so if transforms are unavailable (reduced motion, animation
 * failure) the cell simply renders in its final, fully readable state.
 */
const FlipCell = ({ index, color, children }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { rotateX: -90 }}
      animate={{ rotateX: 0 }}
      transition={{ ...FLIP_SPRING, delay: index * CELL_STAGGER_S }}
      style={{ transformPerspective: 600 }}
      className={`flex h-[54px] items-center justify-center rounded-xl border px-3 transition-all duration-200 ${COLOR_STYLES[color]}`}
    >
      {children}
    </motion.div>
  );
};

const EmptyCell = () => (
  <div className="flex h-[54px] items-center justify-center rounded-xl border border-dashed border-zinc-800/80">
    <span className="h-2 w-2 rounded-full bg-zinc-800" />
  </div>
);

/**
 * A single attempt row. Renders dashed placeholders when no guess exists yet;
 * otherwise reveals Year / Proximity / Direction with a staggered 3D flip.
 * A winning row gets a celebratory bounce once the flips have settled.
 */
export default function GuessRow({ guess }) {
  const reduceMotion = useReducedMotion();

  if (!guess) {
    return (
      <div className="grid grid-cols-3 gap-2.5">
        <EmptyCell />
        <EmptyCell />
        <EmptyCell />
      </div>
    );
  }

  const isWin = guess.direction === 'correct';

  return (
    <motion.div
      className="grid grid-cols-3 gap-2.5"
      animate={
        isWin && !reduceMotion
          ? { y: [0, -12, 0, -5, 0], scale: [1, 1.04, 1, 1.02, 1] }
          : undefined
      }
      transition={{
        delay: WIN_BOUNCE_DELAY_S,
        duration: 0.7,
        times: [0, 0.3, 0.55, 0.8, 1],
        ease: 'easeInOut',
      }}
    >
      <FlipCell index={0} color={guess.color}>
        <span className="flex items-center gap-2.5">
          <span className={`h-2 w-2 rounded-full ${DOT_STYLES[guess.color]}`} />
          <span className="font-mono text-sm font-semibold text-white">{formatYear(guess.year)}</span>
        </span>
      </FlipCell>

      <FlipCell index={1} color={guess.color}>
        <span className="text-xs font-semibold uppercase tracking-wide">
          {/* Fallback via color covers guesses saved before proximity existed. */}
          {guess.proximity ?? PROXIMITY_LABELS[guess.color]}
        </span>
      </FlipCell>

      <FlipCell index={2} color={guess.color}>
        <DirectionHint direction={guess.direction} />
      </FlipCell>
    </motion.div>
  );
}
