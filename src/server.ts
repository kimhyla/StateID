import 'dotenv/config';
import pino from 'pino';
import { createApp } from './app';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = createApp();

// Root landing
app.get('/', (_req, res) => {
  res.type('text/plain').send('StateID prototype running. Endpoints: /api/wrap/*, /api/ledger/*');
});

const port = Number(process.env.STATEID_PORT || 8080);
app.listen(port, () => {
  logger.info({ port }, 'StateID prototype server listening');
});