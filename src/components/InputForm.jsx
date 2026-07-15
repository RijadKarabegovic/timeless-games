import { useEffect } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';

const ERAS = ['BCE', 'CE'];

// Quick decaying horizontal shake for rejected submissions.
const SHAKE_KEYFRAMES = {
  x: [0, -10, 10, -7, 7, -4, 4, 0],
  transition: { duration: 0.4, ease: 'easeInOut' },
};

export default function InputForm({
  value,
  era,
  onValueChange,
  onEraChange,
  onSubmit,
  disabled,
  error,
  shakeSignal = 0,
}) {
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();

  // `shakeSignal` is a counter incremented by the parent on each rejected
  // submit; animation controls let the shake replay on every increment.
  useEffect(() => {
    if (shakeSignal > 0 && !reduceMotion) {
      controls.start(SHAKE_KEYFRAMES);
    }
  }, [shakeSignal, reduceMotion, controls]);

  const handleChange = (e) => {
    // Digits only; strips signs, letters, and paste artifacts.
    onValueChange(e.target.value.replace(/\D/g, ''));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 md:gap-2.5">
      <motion.div animate={controls} className="flex items-stretch gap-2.5">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Enter a year…"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-label="Year guess"
          className="min-w-0 flex-1 rounded-xl border border-zinc-800/60 bg-zinc-900 px-5 py-3 font-mono text-lg font-medium text-white outline-none transition-all duration-200 placeholder:font-sans placeholder:text-zinc-600 focus:border-zinc-600 disabled:opacity-40"
        />

        <div
          role="group"
          aria-label="Era"
          className="flex overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900"
        >
          {ERAS.map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onEraChange(option)}
              aria-pressed={era === option}
              className={`px-4 font-mono text-sm font-semibold transition-all duration-200 disabled:opacity-40 ${
                era === option
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={disabled || value === ''}
          className="rounded-xl bg-emerald-500 px-6 text-sm font-semibold tracking-tight text-zinc-950 transition-all duration-200 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
        >
          Guess
        </button>
      </motion.div>

      {error && (
        <p role="alert" className="px-1 text-sm text-zinc-500">
          {error}
        </p>
      )}
    </form>
  );
}
