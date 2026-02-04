import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initDb } from './db/index.js';
import { startScheduler } from './scheduler/index.js';
import { errorHandler } from './middleware/index.js';
import channelsRouter from './routes/channels.js';
import keysRouter from './routes/keys.js';
import proxiesRouter from './routes/proxies.js';
import tokensRouter from './routes/tokens.js';
import statsRouter from './routes/stats.js';
import openaiRouter from './routes/openai.js';

const PORT = process.env.PORT || 3456;

async function main() {
  // Initialize database
  await initDb();

  const app = express();

  // Middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Management API routes
  app.use('/api/channels', channelsRouter);
  app.use('/api/keys', keysRouter);
  app.use('/api/proxies', proxiesRouter);
  app.use('/api/tokens', tokensRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/logs', statsRouter);

  // OpenAI compatible routes
  app.use('/v1', openaiRouter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Error handler
  app.use(errorHandler);

  // Start scheduler
  startScheduler();

  app.listen(PORT, () => {
    console.log(`Key Hub server running on port ${PORT}`);
  });
}

main().catch(console.error);
