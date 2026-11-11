import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import session from 'express-session';
import { createApp } from '../src/app.js';

const storyId = '22222222-2222-4222-8222-222222222222';
const config = { NODE_ENV: 'test', SESSION_SECRET: 'test-secret-with-at-least-32-characters', CLIENT_ORIGIN: 'http://localhost:3000', ENTRA_REDIRECT_URI: 'http://localhost:3001/auth/callback', ENTRA_TENANT_ID: '11111111-1111-4111-8111-111111111111' };

async function fixture({ commercialUse = false, aiConsent = 'COMPENSATION_REQUIRED', missing = false, existing } = {}) {
  let authorization;
  const writes = [];
  let lockSql;
  const story = { id: storyId, title: 'A protected story', commercialUse, aiConsent, culturalHeritage: true };
  const tx = {
    $queryRaw: async (strings, id) => { lockSql = strings.join('?'); assert.equal(id, storyId); return missing ? [] : [story]; },
    license: {
      findFirst: async ({ where }) => { assert.equal(where.requesterId, 'requester-id'); assert.equal(where.status, 'REQUESTED'); return existing; },
      create: async ({ data }) => { writes.push(data); return { id: 'license-id', ...data, createdAt: new Date().toISOString() }; },
    },
  };
  const prisma = {
    user: { upsert: async () => ({ id: 'requester-id' }) },
    story: { findUnique: async ({ select }) => { assert.equal(select.blobName, undefined); return missing ? null : story; } },
    $transaction: async fn => fn(tx),
  };
  const identity = {
    getAuthCodeUrl: async params => { authorization = params; return 'https://login.microsoftonline.com/authorize'; },
    acquireTokenByCode: async () => ({ idTokenClaims: { oid: 'requester-identity', tid: config.ENTRA_TENANT_ID, nonce: authorization.nonce } }),
  };
  const app = createApp({ config, prisma, identity, sessionStore: new session.MemoryStore(), logger: { error() {} } });
  const agent = request.agent(app);
  await agent.get('/auth/login').expect(302);
  await agent.get('/auth/callback').query({ code: 'code', state: authorization.state }).expect(302);
  return { app, agent, writes, get lockSql() { return lockSql; } };
}

test('license requests validate identity, origin, story ID and strict tier payloads', async () => {
  const f = await fixture();
  await request(f.app).post(`/api/stories/${storyId}/licenses`).send({ tier: 'EDUCATIONAL' }).expect(401);
  await f.agent.post(`/api/stories/${storyId}/licenses`).set('Origin', 'https://untrusted.example').send({ tier: 'EDUCATIONAL' }).expect(403);
  await f.agent.post('/api/stories/invalid/licenses').send({ tier: 'EDUCATIONAL' }).expect(400);
  for (const body of [{ tier: 'UNKNOWN' }, { tier: 'FILM', requesterId: 'spoof' }, { tier: 'AI_COMPANY', status: 'APPROVED' }]) {
    await f.agent.post(`/api/stories/${storyId}/licenses`).send(body).expect(400);
  }
  assert.equal(f.writes.length, 0);
});

test('commercial and AI refusals cannot be bypassed through the API', async () => {
  const f = await fixture({ commercialUse: false, aiConsent: 'NOT_ALLOWED' });
  await f.agent.post(`/api/stories/${storyId}/licenses`).send({ tier: 'FILM' }).expect(409);
  await f.agent.post(`/api/stories/${storyId}/licenses`).send({ tier: 'AI_COMPANY' }).expect(409);
  assert.equal(f.writes.length, 0);
});

test('permitted tiers persist pending mock requests with session ownership and a story-row lock', async () => {
  const f = await fixture({ commercialUse: true });
  for (const tier of ['EDUCATIONAL', 'FILM', 'AI_COMPANY']) {
    const response = await f.agent.post(`/api/stories/${storyId}/licenses`).send({ tier }).expect(201);
    assert.equal(response.body.status, 'REQUESTED');
    assert.equal(response.body.mock, true);
    assert.match(response.body.message, /No rights have been granted/);
  }
  assert.equal(f.writes.length, 3);
  for (const record of f.writes) {
    assert.equal(record.storyId, storyId);
    assert.equal(record.requesterId, 'requester-id');
    assert.equal(record.status, 'REQUESTED');
  }
  assert.match(f.lockSql, /FOR UPDATE/);
});

test('a repeated pending request returns the existing record without a duplicate', async () => {
  const existing = { id: 'existing', storyId, tier: 'EDUCATIONAL', status: 'REQUESTED' };
  const f = await fixture({ existing });
  const response = await f.agent.post(`/api/stories/${storyId}/licenses`).send({ tier: 'EDUCATIONAL' }).expect(200);
  assert.equal(response.body.id, 'existing');
  assert.equal(f.writes.length, 0);
});

test('permission queries require authentication and expose rights rather than storage credentials', async () => {
  const f = await fixture();
  await request(f.app).get(`/api/stories/${storyId}/permissions`).expect(401);
  const response = await f.agent.get(`/api/stories/${storyId}/permissions`).expect(200);
  assert.equal(response.body.aiConsent, 'COMPENSATION_REQUIRED');
  assert.equal(response.body.commercialUse, false);
  assert.equal(response.body.blobName, undefined);
  const absent = await fixture({ missing: true });
  await absent.agent.get(`/api/stories/${storyId}/permissions`).expect(404);
  await absent.agent.post(`/api/stories/${storyId}/licenses`).send({ tier: 'EDUCATIONAL' }).expect(404);
});
