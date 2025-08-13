import { Router } from 'express';
import Database from 'better-sqlite3';
import { customAlphabet, nanoid } from 'nanoid';
import { loadKeySetFromEnv, sha256Hex, hmacSha256Hex, verifySignature } from '../services/crypto';

const router = Router();
const db = new Database(process.cwd() + '/db/stateid.db');

// Ensure clicks has reason column
try {
  db.exec("ALTER TABLE clicks ADD COLUMN reason TEXT");
} catch {}

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
  reason TEXT,
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

type SessionRow = {
  id: string;
  meeting_ref: string | null;
  clinician_id: string | null;
  start_at: string | null;
  end_at: string | null;
  platform: string | null;
  original_url: string;
  wrapped_url: string | null;
  created_at: string;
};

function isWithinMeetingWindow(row: SessionRow, nowUtc: Date): boolean {
  const start = row.start_at ? new Date(row.start_at) : null;
  const end = row.end_at ? new Date(row.end_at) : null;
  if (!start) return true; // if unknown, allow in dev
  const windowStart = new Date(start.getTime() - 60 * 60 * 1000);
  let windowEnd: Date;
  if (end) {
    windowEnd = new Date(end.getTime() + 12 * 60 * 60 * 1000);
  } else {
    windowEnd = new Date(start.getTime() + 12 * 60 * 60 * 1000);
  }
  return nowUtc >= windowStart && nowUtc <= windowEnd;
}

// POST /api/wrap/learn { exampleUrl }
router.post('/learn', (req, res) => {
  const exampleUrl: string | undefined = req.body?.exampleUrl;
  try {
    if (!exampleUrl) return res.status(400).json({ error: 'exampleUrl required' });
    const u = new URL(exampleUrl);
    if (u.protocol !== 'https:') return res.status(400).json({ error: 'https required' });
    const pathShape = u.pathname.replace(/[A-Za-z0-9_-]+/g, ':seg');
    const patternId = id();
    db.prepare('INSERT INTO patterns (id, domain, path_shape) VALUES (?,?,?)').run(
      patternId,
      u.hostname,
      pathShape,
    );
    return res.json({ patternId, domain: u.hostname, pathShape });
  } catch (e: any) {
    return res.status(400).json({ error: 'invalid URL', details: String(e?.message || e) });
  }
});

// POST /api/wrap/generate { originalUrl, meetingRef, clinicianId, startAt, endAt, platform }
router.post('/generate', (req, res) => {
  const { originalUrl, meetingRef, clinicianId, startAt, endAt, platform } = req.body || {};
  try {
    if (!originalUrl) return res.status(400).json({ error: 'originalUrl required' });
    const u = new URL(originalUrl);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return res.status(400).json({ error: 'http/https only' });

    const sessionId = nanoid(12);
    const keySet = loadKeySetFromEnv();
    const fpr = sha256Hex(originalUrl).slice(0, 16);
    const payload = `${sessionId}.${fpr}`;
    const sig = hmacSha256Hex(keySet.currentKey, payload);
    const token = `${keySet.currentKid}.${sig}`;
    const wrappedUrl = `${req.protocol}://${req.get('host')}/r/${sessionId}.${token}`;

    db.prepare(`INSERT INTO sessions (id, meeting_ref, clinician_id, start_at, end_at, platform, original_url, wrapped_url)
      VALUES (?,?,?,?,?,?,?,?)`).run(
      sessionId,
      meetingRef || null,
      clinicianId || null,
      startAt || null,
      endAt || null,
      platform || null,
      originalUrl,
      wrappedUrl,
    );

    return res.json({ sessionId, wrappedUrl });
  } catch (e: any) {
    return res.status(400).json({ error: 'unable to generate', details: String(e?.message || e) });
  }
});

// Lightweight redirect: /r/:sessionToken
router.get('/../../r/:sessionToken', async (req, res) => {
  res.redirect(302, '/r/' + req.params.sessionToken);
});

// Install top-level redirect on the app via attach helper
export const attachRedirect = (app: any): void => {
  app.get('/r/:sessionToken', async (req: any, res: any) => {
    const startedAt = Date.now();
    const parts = String(req.params.sessionToken || '').split('.');
    const sessionId = parts[0];
    const kid = parts[1];
    const sigHex = parts[2];

    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as SessionRow | undefined;
    if (!row) return res.status(404).type('text/plain').send('Unknown link');

    const originalUrl: string = row.original_url;
    const keySet = loadKeySetFromEnv();
    const fpr = sha256Hex(originalUrl).slice(0, 16);
    const payload = `${sessionId}.${fpr}`;

    let valid = false;
    if (kid && sigHex) {
      valid = verifySignature(keySet, kid, payload, sigHex);
    }

    const withinTtl = isWithinMeetingWindow(row, new Date());

    const finish = (failOpen: 0 | 1, reason?: string) => {
      const elapsed = Date.now() - startedAt;
      db.prepare('INSERT INTO clicks (id, session_id, ms_to_redirect, fail_open, reason) VALUES (?,?,?,?,?)').run(
        nanoid(10),
        row.id,
        elapsed,
        failOpen,
        reason || null,
      );
      res.redirect(302, originalUrl);
    };

    const budgetMs = 200;
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        finish(1, 'timeout_fail_open');
      }
    }, budgetMs);

    try {
      // Simulate geo lookup quickly
      await new Promise((r) => setTimeout(r, 30));
      if (!resolved) {
        clearTimeout(timer);
        resolved = true;
        if (!valid) return finish(1, 'bad_signature');
        if (!withinTtl) return finish(1, 'ttl_outside_window');
        return finish(0);
      }
    } catch {
      if (!resolved) {
        clearTimeout(timer);
        resolved = true;
        return finish(1, 'lookup_error');
      }
    }
  });
};

export { router };