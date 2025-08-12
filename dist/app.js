import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { router as wrapRouter, attachRedirect } from './routes/wrap.js';
import { router as ledgerRouter } from './routes/ledger.js';
export function createApp() {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/public', express.static(path.join(process.cwd(), 'public')));
    app.get('/health', (_req, res) => res.json({ ok: true }));
    app.use('/api/wrap', wrapRouter);
    app.use('/api/ledger', ledgerRouter);
    attachRedirect(app);
    return app;
}
//# sourceMappingURL=app.js.map