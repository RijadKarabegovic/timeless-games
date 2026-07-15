import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Imperative fetch state for /api/paradox. Call `request(payload)` once at
 * game over; duplicate calls are ignored until `reset()` (used on restart).
 */
export const useParadoxReport = () => {
  const [state, setState] = useState({ status: 'idle', report: '' });
  const activeRef = useRef(false);

  const request = async (payload) => {
    if (activeRef.current) return;
    activeRef.current = true;
    setState({ status: 'loading', report: '' });

    try {
      const response = await fetch('/api/paradox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const data = await response.json();
      setState({ status: 'ready', report: data.report });
    } catch {
      setState({ status: 'error', report: '' });
    }
  };

  const reset = () => {
    activeRef.current = false;
    setState({ status: 'idle', report: '' });
  };

  return { state, request, reset };
};

export const CyclingPhrases = ({ phrases, className = 'text-indigo-400' }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % phrases.length), 1400);
    return () => clearInterval(timer);
  }, [phrases.length]);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={index}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25 }}
        className={`text-xs font-semibold uppercase tracking-widest ${className}`}
      >
        {phrases[index]}
      </motion.p>
    </AnimatePresence>
  );
};

/**
 * AI insight panel for game-over screens. Renders nothing while idle;
 * otherwise shows a skeleton with mode-specific loading phrases, the
 * generated report, or a themed error line.
 */
export default function TemporalDamageBox({ state, loadingPhrases }) {
  if (state.status === 'idle') return null;

  return (
    <motion.section
      aria-label="Temporal damage assessment"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fr-panel-ai w-full p-4 text-left"
    >
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400">
        <motion.span
          aria-hidden="true"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="h-2 w-2 rounded-full bg-indigo-400"
        />
        Temporal Damage Assessment
      </h3>

      {state.status === 'loading' && (
        <div aria-live="polite" className="flex flex-col gap-2 md:gap-2.5">
          <CyclingPhrases phrases={loadingPhrases} />
          <div className="h-3 w-full animate-pulse rounded bg-indigo-500/20" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-indigo-500/20" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-indigo-500/20" />
        </div>
      )}

      {state.status === 'ready' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="text-sm italic leading-relaxed text-zinc-200"
        >
          “{state.report}”
        </motion.p>
      )}

      {state.status === 'error' && (
        <p className="text-sm leading-relaxed text-zinc-500">
          Sensors overloaded — the damage was too severe to quantify. Assessment
          will resume after your next incident.
        </p>
      )}
    </motion.section>
  );
}
