import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import session from 'express-session';
import { createApp } from '../src/app.js';

async function fixture({ empty = false, failing = false } = {}) {
  let authorization;
  const queries = [];
  const config = { NODE_ENV: 'test', SESSION_SECRET: 'test-secret-with-at-least-32-characters', CLIENT_ORIGIN: 'http://localhost:3000', ENTRA_REDIRECT_URI: 'http://localhost:3001/auth/callback', ENTRA_TENANT_ID: '11111111-1111-4111-8111-111111111111' };
  const prisma = {
    user: { upsert: async () => ({ id: 'creator-id' }) },
    story: { findMany: async query => {
      queries.push({ model: 'story', ...query });
      if (failing) throw new Error('private database details');
      return empty ? [] : [
        { id: 'story-new', title: 'Newest story', createdAt: '2026-11-11T12:00:00Z' },
        { id: 'story-old', title: 'Older story', createdAt: '2026-11-10T12:00:00Z' },
      ];
    } },
    license: { findMany: async query => { queries.push({ model: 'license', ...query }); return empty ? [] : [
      { id: 'request-new', storyId: 'story-old', story: { title: 'Older story' }, tier: 'EDUCATIONAL', status: 'REQUESTED', createdAt: '2026-11-11T13:00:00Z' },
    ]; } },
  };
  const identity = {
    getAuthCodeUrl: async params => { authorization = params; return 'https://login.microsoftonline.com/authorize'; },
    acquireTokenByCode: async () => ({ idTokenClaims: { oid: 'identity', tid: config.ENTRA_TENANT_ID, nonce: authorization.nonce } }),
  };
  const app = createApp({ config, prisma, identity, sessionStore: new session.MemoryStore(), logger: { error() {} } });
  const agent = request.agent(app);
  await agent.get('/auth/login').expect(302);
  await agent.get('/auth/callback').query({ code: 'code', state: authorization.state }).expect(302);
  return { app, agent, queries };
}

test('activity requires authentication and rejects invalid or caller-supplied ownership filters', async () => {
  const f = await fixture();
  await request(f.app).get('/api/activity').expect(401);
  for (const query of ['limit=0', 'limit=51', 'limit=1.5', 'ownerId=other', 'offset=10']) await f.agent.get(`/api/activity?${query}`).expect(400);
  assert.equal(f.queries.length, 0);
});

test('activity merges actual records chronologically, bounds results and scopes both sources', async () => {
  const f = await fixture();
  const response = await f.agent.get('/api/activity?limit=2').expect(200);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.deepEqual(response.body.events.map(event => event.id), ['license:request-new', 'registration:story-new']);
  assert.equal(response.body.hasMore, true);
  assert.equal(response.body.events[0].status, 'REQUESTED');
  assert.equal(response.body.events[0].storyTitle, 'Older story');
  assert.deepEqual(f.queries[0].where, { ownerId: 'creator-id' });
  assert.deepEqual(f.queries[1].where, { OR: [{ story: { ownerId: 'creator-id' } }, { requesterId: 'creator-id' }] });
  for (const query of f.queries) {
    assert.equal(query.take, 3);
    assert.equal(query.select.blobName, undefined);
    assert.equal(query.select.requester, undefined);
  }
});

test('empty activity is truthful and database errors never become invented events', async () => {
  const empty = await fixture({ empty: true });
  await empty.agent.get('/api/activity').expect(200, { events: [], hasMore: false });
  const failed = await fixture({ failing: true });
  const response = await failed.agent.get('/api/activity').expect(500);
  assert.deepEqual(response.body, { error: 'Request failed. Please try again.' });
  assert.equal(response.body.events, undefined);
});
