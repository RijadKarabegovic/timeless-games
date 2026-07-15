import GuessRow from './GuessRow.jsx';

const MAX_GUESSES = 9;

export default function GuessGrid({ guesses }) {
  return (
    <section aria-label="Guesses" className="flex flex-col gap-2 md:gap-2.5">
      <div className="grid grid-cols-3 gap-2.5 px-2 text-center text-[11px] font-medium uppercase tracking-widest text-zinc-600">
        <span>Guessed Year</span>
        <span>Proximity</span>
        <span>Direction</span>
      </div>
      {Array.from({ length: MAX_GUESSES }, (_, i) => (
        <GuessRow key={i} guess={guesses[i]} />
      ))}
    </section>
  );
}

export { MAX_GUESSES };
