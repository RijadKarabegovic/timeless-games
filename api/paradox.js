import { generateParadox, validatePayload } from './_lib/generateParadox.js';

// Vercel Edge Function: POST /api/paradox
// The API key is read from server env only and never reaches the client;
// the browser receives nothing but the generated report text.
export const config = { runtime: 'edge' };

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let payload;
  try {
    payload = validatePayload(await request.json());
  } catch {
    payload = null;
  }
  if (!payload) {
    return json({ error: 'Invalid payload for the requested gameMode' }, 400);
  }

  try {
    return json(await generateParadox(payload, process.env.OPENAI_API_KEY));
  } catch {
    // Never leak upstream error details (which could include key hints).
    return json({ error: 'Paradox generation failed' }, 502);
  }
}
