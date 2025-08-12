import { Router } from 'express';
import Database from 'better-sqlite3';
import { customAlphabet, nanoid } from 'nanoid';
const router = Router();
const db = new Database(process.cwd() + '/db/stateid.db');
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  meeting_ref TEXT,
  clinician_id TEXT,
  start_at TEXT,
  end_at TEXT,
  platform TEXT,
  original_url TEXT NOT NULL,
  wrapped_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS clicks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  ts TEXT DEFAULT (datetime('now')),
  ms_to_redirect INTEGER,
  fail_open INTEGER DEFAULT 0,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);
CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  path_shape TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`);
const id = customAlphabet('abcdefghijkmnopqrstuvwxyz23456789', 10);
// Simple URL detection for MVP (Zoom/Meet/Teams)
const matchKnownUrl = (text) => {
    const patterns = [
        /https?:\/\/(www\.)?zoom\.us\/j\/[^\s)]+/i,
        /https?:\/\/meet\.google\.com\/[a-z-]+/i,
        /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s)]+/i,
    ];
    for (const re of patterns) {
        const m = text.match(re);
        if (m)
            return m[0];
    }
    return null;
};
// POST /api/wrap/learn { exampleUrl }
router.post('/learn', (req, res) => {
    const exampleUrl = req.body?.exampleUrl;
    try {
        if (!exampleUrl)
            return res.status(400).json({ error: 'exampleUrl required' });
        const u = new URL(exampleUrl);
        if (u.protocol !== 'https:')
            return res.status(400).json({ error: 'https required' });
        const pathShape = u.pathname.replace(/[A-Za-z0-9_-]+/g, ':seg');
        const patternId = id();
        db.prepare('INSERT INTO patterns (id, domain, path_shape) VALUES (?,?,?)').run(patternId, u.hostname, pathShape);
        return res.json({ patternId, domain: u.hostname, pathShape });
    }
    catch (e) {
        return res.status(400).json({ error: 'invalid URL', details: String(e?.message || e) });
    }
});
// POST /api/wrap/generate { originalUrl, meetingRef, clinicianId, startAt, endAt, platform }
router.post('/generate', (req, res) => {
    const { originalUrl, meetingRef, clinicianId, startAt, endAt, platform } = req.body || {};
    try {
        if (!originalUrl)
            return res.status(400).json({ error: 'originalUrl required' });
        const u = new URL(originalUrl);
        if (u.protocol !== 'https:' && u.protocol !== 'http:')
            return res.status(400).json({ error: 'http/https only' });
        const sessionId = nanoid(12);
        const token = nanoid(16);
        const wrappedUrl = `${req.protocol}://${req.get('host')}/r/${sessionId}.${token}`;
        db.prepare(`INSERT INTO sessions (id, meeting_ref, clinician_id, start_at, end_at, platform, original_url, wrapped_url)
      VALUES (?,?,?,?,?,?,?,?)`).run(sessionId, meetingRef || null, clinicianId || null, startAt || null, endAt || null, platform || null, originalUrl, wrappedUrl);
        return res.json({ sessionId, wrappedUrl });
    }
    catch (e) {
        return res.status(400).json({ error: 'unable to generate', details: String(e?.message || e) });
    }
});
// Lightweight redirect: /r/:sessionToken
router.get('/../../r/:sessionToken', async (req, res) => {
    // This mounting path hack ensures app.get('/r/...') works from /api/wrap router base
    res.redirect(302, '/r/' + req.params.sessionToken);
});
// Install top-level redirect on the app via attach helper
export const attachRedirect = (app) => {
    app.get('/r/:sessionToken', async (req, res) => {
        const startedAt = Date.now();
        const [sessionId] = String(req.params.sessionToken || '').split('.');
        const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
        if (!row)
            return res.status(404).type('text/plain').send('Unknown link');
        const originalUrl = row.original_url;
        let failOpen = false;
        // Simulate geo checks in parallel with a timeout budget of 200ms
        const budgetMs = 200;
        const geoPromise = new Promise((resolve) => {
            // Simulate 50ms lookup
            setTimeout(() => resolve({ state: 'CT' }), 50);
        });
        let resolved = false;
        const timer = setTimeout(() => {
            failOpen = true;
            if (!resolved) {
                resolved = true;
                res.redirect(302, originalUrl);
                const elapsed = Date.now() - startedAt;
                db.prepare('INSERT INTO clicks (id, session_id, ms_to_redirect, fail_open) VALUES (?,?,?,?)').run(nanoid(10), row.id, elapsed, 1);
            }
        }, budgetMs);
        try {
            const geo = await geoPromise;
            if (!resolved) {
                clearTimeout(timer);
                resolved = true;
                const elapsed = Date.now() - startedAt;
                db.prepare('INSERT INTO clicks (id, session_id, ms_to_redirect, fail_open) VALUES (?,?,?,?)').run(nanoid(10), row.id, elapsed, 0);
                // In a full build, we would HMAC-sign and append metadata. For prototype, just redirect.
                res.redirect(302, originalUrl);
            }
        }
        catch (_e) {
            if (!resolved) {
                clearTimeout(timer);
                resolved = true;
                const elapsed = Date.now() - startedAt;
                db.prepare('INSERT INTO clicks (id, session_id, ms_to_redirect, fail_open) VALUES (?,?,?,?)').run(nanoid(10), row.id, elapsed, 1);
                res.redirect(302, originalUrl);
            }
        }
    });
};
export { router };
//# sourceMappingURL=wrap.js.map