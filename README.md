# Timeless

A Wordle-style daily history game with multiple modes. Guess years, order events, build streaks, and solve year equations — with optional AI “timeline paradox” reports when you go wrong.

## Game modes

| Mode | What you do |
|------|-------------|
| **Classic** | Guess the year of a historical event (up to 9 tries). Proximity feedback guides you; BCE/CE toggle included. Stats track wins and streaks. |
| **Time Shift** | Decide whether a mystery event happened earlier or later than a reference. Keep a streak going; high score is saved locally. |
| **Chronology** | Sort four events from earliest to latest. Three attempts per round; drag handles or use arrows. |
| **Timeline Algebra** | Solve year equations over five rounds (e.g. event ± choice = target). Score and high score tracked; wrong answers can reveal a Temporal Anomaly report. |

Each mode can be played again indefinitely after the daily starting puzzle.

## Stack

- **React 19** + **Vite 8**
- **Tailwind CSS v4**
- **Framer Motion** for transitions and feedback
- **Lucide** icons
- **Vercel Edge** function at `POST /api/paradox` (OpenAI) for AI reports; the same handler is available in `vite` dev via middleware

Historical events live in `src/data/events.json` (~150+ entries spanning BCE and CE).

## Getting started

```bash
npm install
cp .env.example .env   # optional — needed for AI paradox reports
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Environment

| Variable | Where | Purpose |
|----------|--------|---------|
| `OPENAI_API_KEY` | `.env` (server only, **no** `VITE_` prefix) | Powers `/api/paradox`. Without it, games still work; AI panels fall back to short themed copy. |

Never put the API key in client code — Vite and the edge handler keep it on the server.

### Scripts

```bash
npm run dev       # local app + /api/paradox middleware
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

## Project layout

```
src/
  App.jsx                 # shell, mode routing, sidebar/header
  components/             # games, header, sidebar, modals, shared UI
  data/events.json        # event catalog
  utils/                  # guess logic, dates, algebra puzzles
api/
  paradox.js              # Vercel Edge entry
  _lib/generateParadox.js # shared generation + payload validation
```

Progress (Classic game/stats, Time Shift / Algebra high scores) is stored in `localStorage`.

## Deploy

Built as a static Vite front end with a co-located Vercel Edge API:

1. Set `OPENAI_API_KEY` in the host’s environment.
2. Deploy so `api/paradox.js` is served as `/api/paradox`.
3. Point the site at the Vite `dist/` output (default for Vercel + Vite).

AI features are optional — omit the key if you only want the core games.
