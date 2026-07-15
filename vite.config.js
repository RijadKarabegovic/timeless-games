import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { generateParadox, validatePayload } from './api/_lib/generateParadox.js';

// Serves POST /api/paradox on the dev server with the exact same logic as
// the deployed edge function (api/paradox.js). The API key stays inside the
// Node process; it is never injected into the client bundle.
const paradoxDevApi = (apiKey) => ({
  name: 'paradox-dev-api',
  configureServer(server) {
    server.middlewares.use('/api/paradox', async (req, res) => {
      const send = (status, body) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(body));
      };

      if (req.method !== 'POST') {
        send(405, { error: 'Method not allowed' });
        return;
      }

      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const payload = validatePayload(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        if (!payload) {
          send(400, { error: 'Invalid payload for the requested gameMode' });
          return;
        }
        send(200, await generateParadox(payload, apiKey));
      } catch {
        send(502, { error: 'Paradox generation failed' });
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ ones) for server-side use only.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss(), paradoxDevApi(env.OPENAI_API_KEY)],
  };
});
