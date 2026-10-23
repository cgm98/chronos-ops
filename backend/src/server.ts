import { app } from './app.js';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';

export function startServer() {
  return app.listen(port, host, () => {
    console.log(`CHRONOS-OPS Backend (Express + TypeScript): http://${host}:${port}`);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer();
}
