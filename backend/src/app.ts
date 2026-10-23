import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { apiRouter } from './http/routes/api.routes.js';
import { errorHandler } from './http/middlewares/error-handler.js';

export const app = express();

app.use(express.json({ limit: '1mb' }));

// Montar endpoints de la API
app.use('/api', apiRouter);

// 404 para rutas API no coincidentes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta API no encontrada' });
});

// Servir frontend compilado si existe
const distDir = join(dirname(fileURLToPath(import.meta.url)), '../../dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(join(distDir, 'index.html'));
    }
    next();
  });
}

// Middleware centralizado de manejo de errores
app.use(errorHandler);
