/**
 * Server-only Timeline Paradox / Failure generation. This module must never
 * be imported by client code: it receives the LLM API key as an argument,
 * and the key itself only ever lives in server environment variables
 * (OPENAI_API_KEY — no VITE_ prefix, so Vite never bundles it).
 *
 * Supports three game modes, each with its own prompt, validation, and
 * keyless fallback: "classic" (default), "timeshift", and "chronology".
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

const TIME_TRAVEL_ASSISTANT =
  'You are a witty, slightly sarcastic Quantum Time-Travel Assistant. ';

const PERSONAS = {
  classic: TIME_TRAVEL_ASSISTANT,
  timeshift: TIME_TRAVEL_ASSISTANT,
  chronology: TIME_TRAVEL_ASSISTANT,
  algebra: 'You are an eccentric, sarcastic Quantum Math Professor. ',
};

const PROMPTS = {
  classic: ({ correctEvent, correctYear, worstGuess }) =>
    `The user played a game where they incorrectly guessed that ${correctEvent} ` +
    `(which actually happened in ${correctYear}) occurred in the year ${worstGuess}. ` +
    `Write a snappy, humorous, 2-sentence 'Timeline Paradox Report' explaining how ` +
    `chaotic the world would be if their incorrect guess was actually historical fact. ` +
    `Keep it historically playful and clean.`,

  timeshift: ({ streak, targetEvent, userGuess, refEvent }) =>
    `The user was on a streak of ${streak} correct chronological guesses in an ` +
    `earlier/later game, but failed when they guessed that ${targetEvent} happened ` +
    `${userGuess} than ${refEvent}. Write a humorous, 2-sentence 'Chronological ` +
    `Whiplash Report' about how their run came to a crashing halt, teasing them ` +
    `about the specific chronological error. Keep it historically playful and clean.`,

  chronology: ({ userOrder, correctOrder }) =>
    `The user failed to order these 4 events chronologically: ${userOrder}. ` +
    `The actual order was ${correctOrder}. Write a 2-sentence 'Alternative History ` +
    `Catastrophe' explaining how chaotic the history textbook looks now that these ` +
    `events are out of order. Keep it historically playful and clean.`,

  algebra: ({ eventA, operator, targetValue, incorrectEvent, mathResult }) =>
    `The user made a mathematical history error. They solved the equation: ` +
    `'${eventA} (${operator}) ${incorrectEvent} = ${targetValue}'. ` +
    `By choosing the wrong event, they actually calculated ${mathResult} instead of ` +
    `${targetValue}. Write a funny, 2-sentence 'Temporal Arithmetic Error' explaining ` +
    `how their bad math has merged these two events into a chaotic, unified timeline ` +
    `in the year ${mathResult}. Keep it historically playful and clean.`,
};

// Keyless fallbacks let every mode demo end-to-end without an API key.
const FALLBACKS = {
  classic: ({ correctEvent, correctYear, worstGuess }) =>
    `Our quantum mainframe is offline (no API key detected), but preliminary math ` +
    `suggests that moving "${correctEvent}" from ${correctYear} to ${worstGuess} would ` +
    `have knotted the timeline like cheap headphones. Historians in that universe are ` +
    `still arguing about it — loudly, and in the wrong century.`,

  timeshift: ({ streak, targetEvent, userGuess, refEvent }) =>
    `Our quantum mainframe is offline (no API key detected), but eyewitnesses confirm ` +
    `your streak of ${streak} collapsed the instant you insisted "${targetEvent}" came ` +
    `${userGuess} than "${refEvent}". The timeline snapped back so hard it now needs ` +
    `a chiropractor and a formal apology.`,

  chronology: ({ userOrder, correctOrder }) =>
    `Our quantum mainframe is offline (no API key detected), but the textbook damage ` +
    `is visible from orbit: history did not go "${userOrder}". Somewhere a very tired ` +
    `librarian is re-shelving everything back into "${correctOrder}".`,

  algebra: ({ eventA, operator, targetValue, incorrectEvent, mathResult }) =>
    `The quantum chalkboard is offline (no API key detected), but the arithmetic ` +
    `speaks for itself: ${eventA} ${operator} ${incorrectEvent} equals ${mathResult}, ` +
    `not ${targetValue}. Both events are now contractually obligated to share the ` +
    `year ${mathResult}, and neither is happy about the seating arrangement.`,
};

const isStr = (value, max) =>
  typeof value === 'string' && value.length > 0 && value.length <= max;

// Per-mode validation plus explicit field picking, so unexpected junk in the
// request body never reaches the prompt.
const VALIDATORS = {
  classic: (b) =>
    isStr(b.correctEvent, 300) && isStr(b.correctYear, 20) && isStr(b.worstGuess, 20)
      ? {
          correctEvent: b.correctEvent,
          correctYear: b.correctYear,
          worstGuess: b.worstGuess,
        }
      : null,

  timeshift: (b) =>
    Number.isInteger(b.streak) &&
    b.streak >= 0 &&
    b.streak <= 100000 &&
    isStr(b.targetEvent, 300) &&
    isStr(b.refEvent, 300) &&
    (b.userGuess === 'earlier' || b.userGuess === 'later')
      ? {
          streak: b.streak,
          targetEvent: b.targetEvent,
          refEvent: b.refEvent,
          userGuess: b.userGuess,
        }
      : null,

  chronology: (b) =>
    isStr(b.userOrder, 800) && isStr(b.correctOrder, 800)
      ? { userOrder: b.userOrder, correctOrder: b.correctOrder }
      : null,

  algebra: (b) =>
    isStr(b.eventA, 350) &&
    isStr(b.incorrectEvent, 350) &&
    (b.operator === '+' || b.operator === '-') &&
    Number.isInteger(b.targetValue) &&
    Math.abs(b.targetValue) <= 1000000 &&
    Number.isInteger(b.mathResult) &&
    Math.abs(b.mathResult) <= 1000000
      ? {
          eventA: b.eventA,
          operator: b.operator,
          targetValue: b.targetValue,
          incorrectEvent: b.incorrectEvent,
          mathResult: b.mathResult,
        }
      : null,
};

export const validatePayload = (body) => {
  if (!body || typeof body !== 'object') return null;
  const gameMode = body.gameMode ?? 'classic';
  const fields = VALIDATORS[gameMode]?.(body);
  return fields ? { gameMode, ...fields } : null;
};

export async function generateParadox(payload, apiKey) {
  const { gameMode } = payload;

  if (!apiKey) {
    return { report: FALLBACKS[gameMode](payload), source: 'fallback' };
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: PERSONAS[gameMode] + PROMPTS[gameMode](payload) },
        { role: 'user', content: 'Generate my report.' },
      ],
      max_tokens: 160,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}`);
  }

  const data = await response.json();
  const report = data.choices?.[0]?.message?.content?.trim();
  if (!report) {
    throw new Error('LLM returned an empty response');
  }

  return { report, source: 'llm' };
}
