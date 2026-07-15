/**
 * Daily-seed helpers for Timeless.
 *
 * The daily event is derived from the day of the year so every player sees
 * the same event on a given day, with no server or stored state required.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Return the 1-based day of the year (1..366) for a local date.
 *
 * @param {Date} [date=new Date()] - The date to evaluate (defaults to today).
 * @returns {number}
 */
export const getDayOfYear = (date = new Date()) => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((startOfDay - startOfYear) / MS_PER_DAY) + 1;
};

/**
 * Deterministically pick today's event from the list.
 * Index = DayOfYear % eventsList.length
 *
 * @param {Array<object>} eventsList - Array of event objects.
 * @param {Date} [date=new Date()] - Injectable date for deterministic testing.
 * @returns {object | null} The event for the day, or null if the list is empty.
 */
export const getDailyEvent = (eventsList, date = new Date()) => {
  if (!eventsList?.length) return null;
  return eventsList[getDayOfYear(date) % eventsList.length];
};

/*
 * Unit test examples (assuming a 15-item events list):
 *
 * // Jan 1 is day 1 -> index 1 % 15 = 1
 * getDayOfYear(new Date(2026, 0, 1))   // => 1
 * getDailyEvent(events, new Date(2026, 0, 1))  // => events[1]
 *
 * // Jan 20 is day 20 -> index 20 % 15 = 5
 * getDayOfYear(new Date(2026, 0, 20))  // => 20
 * getDailyEvent(events, new Date(2026, 0, 20)) // => events[5]
 *
 * // Day 15 wraps to index 0
 * getDailyEvent(events, new Date(2026, 0, 15)) // => events[15 % 15] === events[0]
 *
 * // Leap-year check: 2024 has 366 days
 * getDayOfYear(new Date(2024, 11, 31)) // => 366
 * getDayOfYear(new Date(2026, 11, 31)) // => 365
 *
 * // Empty list is handled gracefully
 * getDailyEvent([])  // => null
 */
