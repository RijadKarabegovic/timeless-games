/**
 * Puzzle generator for the "Timeline Algebra" game mode.
 *
 * A puzzle is an equation of the form:
 *   EventA.year (+|-) MysteryEvent.year = targetValue
 * The player must pick which historical event's year completes the equation.
 *
 * Years are signed integers (negative = BCE), so ordinary arithmetic handles
 * cross-era math correctly: -2560 + 1989 = -571.
 */

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const shuffle = (arr) => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Generate a random Timeline Algebra puzzle.
 *
 * @param {Array<{id: number, event: string, year: number}>} eventsList
 *   Needs at least 5 events (A, the answer, and 3 decoys).
 * @returns {{
 *   eventA: object,
 *   operator: '+' | '-',
 *   targetValue: number,
 *   correctAnswer: object,
 *   choices: object[],
 * } | null} The puzzle, with `choices` shuffled (correct answer + 3 decoys),
 *   or null if the dataset is too small.
 */
export const generateAlgebraPuzzle = (eventsList) => {
  if (!eventsList || eventsList.length < 5) return null;

  const eventA = randomItem(eventsList);
  const correctAnswer = randomItem(eventsList.filter((e) => e.id !== eventA.id));

  const operator = Math.random() < 0.5 ? '+' : '-';
  const targetValue =
    operator === '+'
      ? eventA.year + correctAnswer.year
      : eventA.year - correctAnswer.year;

  // Decoys must not be Event A or the answer, and must not share the answer's
  // year — the dataset contains same-year events, which would otherwise make
  // a puzzle ambiguous (two choices both solving the equation).
  const decoys = shuffle(
    eventsList.filter(
      (e) =>
        e.id !== eventA.id &&
        e.id !== correctAnswer.id &&
        e.year !== correctAnswer.year,
    ),
  ).slice(0, 3);

  return {
    eventA,
    operator,
    targetValue,
    correctAnswer,
    choices: shuffle([correctAnswer, ...decoys]),
  };
};

/*
 * Unit test examples:
 *
 * const puzzle = generateAlgebraPuzzle(events);
 *
 * // The equation always balances, including across eras:
 * // e.g. eventA.year = -2560 (2560 BCE), correctAnswer.year = 1989,
 * //      operator '+' -> targetValue === -571
 * const solved = puzzle.operator === '+'
 *   ? puzzle.eventA.year + puzzle.correctAnswer.year
 *   : puzzle.eventA.year - puzzle.correctAnswer.year;
 * // => solved === puzzle.targetValue
 *
 * // The correct answer is always among the 4 choices
 * // => puzzle.choices.some((c) => c.id === puzzle.correctAnswer.id) === true
 *
 * // Choices are 4 unique events, none of them Event A
 * // => new Set(puzzle.choices.map((c) => c.id)).size === 4
 * // => puzzle.choices.every((c) => c.id !== puzzle.eventA.id) === true
 *
 * // No decoy shares the answer's year (no ambiguous puzzles)
 * // => puzzle.choices.filter((c) => c.year === puzzle.correctAnswer.year).length === 1
 *
 * // Too-small datasets are rejected
 * generateAlgebraPuzzle([])          // => null
 * generateAlgebraPuzzle(events.slice(0, 4)) // => null
 */
