import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../dist/app.js';

const app = createApp();

describe('StateID prototype', () => {
  it('health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('generates a wrapped link and redirects to original', async () => {
    const gen = await request(app)
      .post('/api/wrap/generate')
      .set('content-type', 'application/json')
      .send({ originalUrl: 'https://zoom.us/j/123456789?pwd=abc', meetingRef: 'cal:1', clinicianId: 'u1', platform: 'zoom' });
    expect(gen.status).toBe(200);
    expect(gen.body.wrappedUrl).toBeTruthy();

    const url = new URL(gen.body.wrappedUrl);
    const redir = await request(app).get(url.pathname);
    expect(redir.status).toBe(302);
    expect(redir.headers.location).toMatch(/^https:\/\/zoom\.us\/j\/123456789\?pwd=abc/);
  });

  it('records a ledger entry and lists it', async () => {
    const gen = await request(app)
      .post('/api/wrap/generate')
      .set('content-type', 'application/json')
      .send({ originalUrl: 'https://zoom.us/j/222333444?pwd=xyz' });
    const sessionId = gen.body.sessionId as string;

    const rec = await request(app)
      .post('/api/ledger/record')
      .set('content-type', 'application/json')
      .send({ sessionId, status: 'verified', state: 'CT', method: 'self_declared', withinScope: 'true' });
    expect(rec.status).toBe(200);
    expect(rec.body.ok).toBe(true);

    const list = await request(app).get('/api/ledger');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.rows)).toBe(true);
    expect(list.body.rows.length).toBeGreaterThan(0);
  });
});
