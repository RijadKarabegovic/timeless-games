import ModalShell from './ModalShell.jsx';
import { MODES } from '../navigation/modes.js';

const COLOR_KEY = [
  { swatch: 'bg-emerald-400', label: 'Bullseye!', description: 'You nailed the exact year' },
  { swatch: 'bg-yellow-400', label: 'Very Close', description: 'Within a decade' },
  { swatch: 'bg-orange-400', label: 'Close', description: 'Within about half a century' },
  { swatch: 'bg-red-700', label: 'Far', description: 'Off by generations' },
  { swatch: 'bg-zinc-500', label: 'Centuries Off', description: 'A whole different age' },
];

const GUIDE = {
  classic: {
    title: 'Classic Mode',
    paragraphs: [
      <>
        You have <span className="font-semibold text-white">9 tries</span> to guess the
        secret historical year. Each guess tells you the{' '}
        <span className="font-semibold text-white">direction</span> (⬆️ later, ⬇️ earlier)
        and <span className="font-semibold text-white">roughly how close</span> you are —
        never the exact distance.
      </>,
      <>
        Use the <span className="font-semibold text-white">BCE/CE</span> toggle for years
        before the common era. When a round ends, hit{' '}
        <span className="font-semibold text-emerald-400">Play Again</span> for a fresh
        event.
      </>,
    ],
    extra: 'proximity',
  },
  timeshift: {
    title: 'Time Shift',
    paragraphs: [
      <>
        You are shown a <span className="font-semibold text-white">Reference</span> event
        with its year, then a <span className="font-semibold text-white">Mystery</span>{' '}
        event with the year hidden.
      </>,
      <>
        Decide if the mystery event happened{' '}
        <span className="font-semibold text-white">Earlier</span> or{' '}
        <span className="font-semibold text-white">Later</span> than the reference. A
        correct answer grows your streak — the mystery card becomes the next reference.
        One wrong call ends the run. Hit{' '}
        <span className="font-semibold text-emerald-400">Play Again</span> anytime.
      </>,
    ],
  },
  chronology: {
    title: 'Chronology',
    paragraphs: [
      <>
        You get <span className="font-semibold text-white">four events</span> shuffled out
        of order. Drag them (or use the arrows) so the timeline reads{' '}
        <span className="font-semibold text-white">oldest → newest</span> from top to bottom.
      </>,
      <>
        You have <span className="font-semibold text-white">3 attempts</span>. After you
        submit, correct positions flash emerald and reveal their years; wrong spots are
        flagged so you can regroup. Fail all three and the true order is revealed. Hit{' '}
        <span className="font-semibold text-emerald-400">Play Again</span> for a new set.
      </>,
    ],
  },
  algebra: {
    title: 'Timeline Algebra',
    paragraphs: [
      <>
        Solve <span className="font-semibold text-white">5 equations</span> per session.
        Each board shows an equation like{' '}
        <span className="font-mono text-emerald-400">1455 + ? = 2317</span>. BCE years are
        negative.
      </>,
      <>
        Pick the historical event whose year fills the{' '}
        <span className="font-semibold text-white">?</span>, then{' '}
        <span className="font-semibold text-white">Lock It In</span>. Correct answers earn
        points; wrong ones reveal the answer and may open a temporal anomaly tip. Finish
        all five, then hit{' '}
        <span className="font-semibold text-emerald-400">Play Again</span> for another
        session.
      </>,
    ],
  },
};

const ProximityKey = () => (
  <>
    <h3 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
      Proximity Key
    </h3>
    <ul className="flex flex-col gap-1.5">
      {COLOR_KEY.map(({ swatch, label, description }) => (
        <li
          key={label}
          className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-950/60 px-3 py-2 transition-all duration-200 hover:border-zinc-700"
        >
          <span className={`h-4 w-4 shrink-0 rounded ${swatch}`} aria-hidden="true" />
          <span className="w-28 shrink-0 text-sm font-semibold tracking-tight text-zinc-200">
            {label}
          </span>
          <span className="text-sm text-zinc-500">{description}</span>
        </li>
      ))}
    </ul>
  </>
);

export default function HelpModal({ open, onClose, mode = 'classic' }) {
  const guide = GUIDE[mode] ?? GUIDE.classic;
  const modeMeta = MODES.find((m) => m.id === mode);
  const Icon = modeMeta?.icon;

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="help-modal-title">
      <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {guide.title}
      </p>
      <h2
        id="help-modal-title"
        className="mb-3 text-xl font-bold tracking-tight text-white"
      >
        How to Play
      </h2>

      {guide.paragraphs.map((paragraph, i) => (
        <p
          key={i}
          className={`text-sm leading-relaxed text-zinc-400 ${i > 0 ? 'mt-3' : ''}`}
        >
          {paragraph}
        </p>
      ))}

      {guide.extra === 'proximity' && <ProximityKey />}
    </ModalShell>
  );
}
