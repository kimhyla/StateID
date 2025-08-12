import { Router } from 'express';
import Database from 'better-sqlite3';
const router = Router();
const db = new Database(process.cwd() + '/db/stateid.db');
db.exec(`
CREATE TABLE IF NOT EXISTS attendee_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  attendee_slot_hash TEXT,
  status TEXT NOT NULL,
  state TEXT,
  self_declared_state TEXT,
  method TEXT,
  within_scope TEXT,
  override_reason TEXT,
  override_timestamp_utc TEXT,
  note_text TEXT,
  timestamp_utc TEXT DEFAULT (datetime('now'))
);
`);
router.get('/', (req, res) => {
    const rows = db.prepare('SELECT * FROM attendee_events ORDER BY timestamp_utc DESC LIMIT 200').all();
    res.json({ rows });
});
router.post('/record', (req, res) => {
    const { id, sessionId, attendeeSlotHash, status, state, selfDeclaredState, method, withinScope, overrideReason, overrideTimestampUtc, noteText, } = req.body || {};
    if (!sessionId || !status)
        return res.status(400).json({ error: 'sessionId and status required' });
    const rowId = id || cryptoRandom();
    db.prepare(`INSERT INTO attendee_events (
    id, session_id, attendee_slot_hash, status, state, self_declared_state, method, within_scope, override_reason, override_timestamp_utc, note_text
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(rowId, sessionId, attendeeSlotHash || null, status, state || null, selfDeclaredState || null, method || null, withinScope || 'unknown', overrideReason || null, overrideTimestampUtc || null, noteText || null);
    res.json({ ok: true, id: rowId });
});
function cryptoRandom() {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}
export { router };
//# sourceMappingURL=ledger.js.map