/**
 * Core guess-evaluation logic for Timeless.
 *
 * Years are signed integers: negative values are BCE, positive values are CE.
 * Because both eras live on a single number line, plain arithmetic handles
 * cross-era distances correctly (e.g. 10 CE vs 10 BCE spans 20 years).
 */

// Ordered proximity thresholds: the first entry whose `max` is >= distance wins.
// The label is what players see — the exact distance is never shown in the UI,
// only this qualitative proximity state.
const COLOR_THRESHOLDS = [
  { max: 0, color: 'green', label: 'Bullseye!' },
  { max: 10, color: 'yellow', label: 'Very Close' },
  { max: 50, color: 'orange', label: 'Close' },
  { max: 200, color: 'red', label: 'Far' },
  { max: Infinity, color: 'gray', label: 'Centuries Off' },
];

// color -> player-facing proximity label, e.g. { green: 'Bullseye!', ... }
export const PROXIMITY_LABELS = Object.fromEntries(
  COLOR_THRESHOLDS.map(({ color, label }) => [color, label]),
);

const getProximityBucket = (distance) =>
  COLOR_THRESHOLDS.find(({ max }) => distance <= max);

/**
 * Evaluate a year guess against the target year.
 *
 * @param {number} guessedYear - The player's guess (negative for BCE).
 * @param {number} targetYear - The event's actual year (negative for BCE).
 * @returns {{ distance: number, direction: 'earlier' | 'later' | 'correct', color: string, proximity: string }}
 *   - distance: absolute difference in years (internal only — not shown to
 *     the player, but used for win detection and worst-guess ranking)
 *   - direction: hint for the player; "earlier" means the target is earlier
 *     than the guess (guess was too high/late), "later" means the target is
 *     later than the guess (guess was too low/early)
 *   - color: proximity color code
 *   - proximity: player-facing qualitative label for how close the guess is
 */
export const evaluateGuess = (guessedYear, targetYear) => {
  const distance = Math.abs(guessedYear - targetYear);

  let direction = 'correct';
  if (guessedYear > targetYear) {
    direction = 'earlier';
  } else if (guessedYear < targetYear) {
    direction = 'later';
  }

  const { color, label } = getProximityBucket(distance);
  return { distance, direction, color, proximity: label };
};

/** Format a signed year for display, e.g. -490 -> "490 BCE", 1969 -> "1969 CE". */
export const formatYear = (year) => `${Math.abs(year)} ${year < 0 ? 'BCE' : 'CE'}`;

/**
 * Time Shift mode: was the earlier/later call correct?
 *
 * @param {number} referenceYear - Year of the revealed reference event.
 * @param {number} targetYear - Actual year of the hidden target event.
 * @param {'earlier' | 'later'} guess - The player's call about the target.
 * @returns {boolean} True if the guess matches chronology. Equal years
 *   (possible with future datasets) count as correct either way.
 */
export const isShiftGuessCorrect = (referenceYear, targetYear, guess) =>
  guess === 'earlier' ? targetYear <= referenceYear : targetYear >= referenceYear;

/*
 * Unit test examples:
 *
 * // Time Shift: Titanic (1912) vs reference Berlin Wall falls (1989)
 * isShiftGuessCorrect(1989, 1912, 'earlier')  // => true
 * isShiftGuessCorrect(1989, 1912, 'later')    // => false
 *
 * // Time Shift across eras: target 490 BCE vs reference 79 CE
 * isShiftGuessCorrect(79, -490, 'earlier')    // => true
 *
 * // Time Shift with equal years: either call counts
 * isShiftGuessCorrect(1900, 1900, 'earlier')  // => true
 * isShiftGuessCorrect(1900, 1900, 'later')    // => true
 *
 * // formatYear
 * formatYear(-2560)  // => "2560 BCE"
 * formatYear(1969)   // => "1969 CE"
 *
 * // Exact match
 * evaluateGuess(1969, 1969)
 * // => { distance: 0, direction: 'correct', color: 'green', proximity: 'Bullseye!' }
 *
 * // BCE/CE edge case: guessing 10 CE when the target is 10 BCE (-10)
 * evaluateGuess(10, -10)
 * // => { distance: 20, direction: 'earlier', color: 'orange', proximity: 'Close' }
 *
 * // BCE vs BCE: guessing 500 BCE when the target is 490 BCE
 * evaluateGuess(-500, -490)
 * // => { distance: 10, direction: 'later', color: 'yellow', proximity: 'Very Close' }
 *
 * // Bucket boundaries
 * evaluateGuess(1500, 1490)  // => distance 10  -> 'yellow' / 'Very Close'
 * evaluateGuess(1501, 1490)  // => distance 11  -> 'orange' / 'Close'
 * evaluateGuess(1540, 1490)  // => distance 50  -> 'orange' / 'Close'
 * evaluateGuess(1541, 1490)  // => distance 51  -> 'red'    / 'Far'
 * evaluateGuess(1690, 1490)  // => distance 200 -> 'red'    / 'Far'
 * evaluateGuess(1691, 1490)  // => distance 201 -> 'gray'   / 'Centuries Off'
 *
 * // Direction across eras: guessing 44 BCE when the target is 79 CE
 * evaluateGuess(-44, 79)
 * // => { distance: 123, direction: 'later', color: 'red', proximity: 'Far' }
 */
