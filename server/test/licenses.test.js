import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import session from 'express-session';
import { createApp } from '../src/app.js';

const storyId = '22222222-2222-4222-8222-222222222222';
async function fixture({ missing = false } = {}) {
  let authorization;
  let permissionQuery;
  const config = { NODE_ENV: 'test', SESSION_SECRET: 'test-secret-with-at-least-32-characters', CLIENT_ORIGIN: 'http://localhost:3000', ENTRA_REDIRECT_URI: 'http://localhost:3001/auth/callback', ENTRA_TENANT_ID: '11111111-1111-4111-8111-111111111111' };
  const prisma = { user: { upsert: async () => ({ id: 'requester-id' }) }, story: { findFirst: async query => { permissionQuery = query; return missing ? null : { id: storyId, title: 'A protected story', commercialUse: false, aiConsent: 'COMPENSATION_REQUIRED', culturalHeritage: true }; } } };
  const identity = { getAuthCodeUrl: async params => { authorization = params; return 'https://login.microsoftonline.com/authorize'; }, acquireTokenByCode: async () => ({ idTokenClaims: { oid: 'identity', tid: config.ENTRA_TENANT_ID, nonce: authorization.nonce } }) };
  const app = createApp({ config, prisma, identity, sessionStore: new session.MemoryStore(), logger: { error() {} } });
  const agent = request.agent(app);
  await agent.get('/auth/login').expect(302);
  await agent.get('/auth/callback').query({ code: 'code', state: authorization.state }).expect(302);
  return { app, agent, get permissionQuery() { return permissionQuery; } };
}

test('retired mock endpoint cannot create new enquiries or bypass identity/origin checks', async () => {
  const f = await fixture();
  await request(f.app).post(`/api/stories/${storyId}/licenses`).send({ tier: 'EDUCATIONAL' }).expect(401);
  await f.agent.post(`/api/stories/${storyId}/licenses`).set('Origin', 'https://untrusted.example').send({ tier: 'EDUCATIONAL' }).expect(403);
  await f.agent.post('/api/stories/invalid/licenses').send({ tier: 'EDUCATIONAL' }).expect(400);
  const response = await f.agent.post(`/api/stories/${storyId}/licenses`).send({ tier: 'EDUCATIONAL' }).expect(410);
  assert.match(response.body.error, /retired/);
});

test('permission lookup restricts private stories to owners and existing requesters', async () => {
  const f = await fixture();
  await request(f.app).get(`/api/stories/${storyId}/permissions`).expect(401);
  const response = await f.agent.get(`/api/stories/${storyId}/permissions`).expect(200);
  assert.equal(response.body.aiConsent, 'COMPENSATION_REQUIRED');
  assert.deepEqual(f.permissionQuery.where, { id: storyId, OR: [{ published: true }, { ownerId: 'requester-id' }, { licenses: { some: { requesterId: 'requester-id' } } }] });
  assert.equal(f.permissionQuery.select.blobName, undefined);
  const absent = await fixture({ missing: true });
  await absent.agent.get(`/api/stories/${storyId}/permissions`).expect(404);
});
