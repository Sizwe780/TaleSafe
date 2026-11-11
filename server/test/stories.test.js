import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import request from 'supertest';
import session from 'express-session';
import { createApp } from '../src/app.js';
import { createBlobStorage } from '../src/storage.js';
import { MAX_STORY_BYTES } from '../src/stories.js';

const config = {
  NODE_ENV: 'test', SESSION_SECRET: 'test-secret-with-at-least-32-characters',
  CLIENT_ORIGIN: 'http://localhost:3000', ENTRA_REDIRECT_URI: 'http://localhost:3001/auth/callback',
  ENTRA_TENANT_ID: '11111111-1111-4111-8111-111111111111',
};
const bytes = Buffer.from('A story from the baobab.\n');
const fields = { title: 'The baobab', aiConsent: 'COMPENSATION_REQUIRED', commercialUse: 'false', culturalHeritage: 'true' };

async function fixture({ failUpload = false, failDatabase = false, noStorage = false } = {}) {
  const calls = [];
  let authorization;
  const prisma = {
    user: { upsert: async () => ({ id: 'owner-id' }) },
    story: { create: async ({ data }) => {
      calls.push({ type: 'database', data });
      if (failDatabase) throw new Error('private database error');
      return { ...data, createdAt: new Date().toISOString() };
    },
      findMany: async input => { calls.push({ type: 'list', ...input }); return [{ id: 'own-story', title: 'My story', aiConsent: 'NOT_ALLOWED', createdAt: '2026-11-11T19:00:00.000Z' }]; },
      count: async input => { calls.push({ type: 'count', ...input }); return 1; },
    },
  };
  const storage = noStorage ? undefined : {
    upload: async input => { calls.push({ type: 'upload', ...input }); if (failUpload) throw new Error('private storage error'); },
    remove: async blobName => calls.push({ type: 'cleanup', blobName }),
  };
  const identity = {
    getAuthCodeUrl: async params => { authorization = params; return 'https://login.microsoftonline.com/authorize'; },
    acquireTokenByCode: async () => ({ idTokenClaims: { oid: 'identity-id', tid: config.ENTRA_TENANT_ID, nonce: authorization.nonce } }),
  };
  const app = createApp({ config, prisma, identity, storage, sessionStore: new session.MemoryStore(), logger: { error() {} } });
  const agent = request.agent(app);
  await agent.get('/auth/login').expect(302);
  await agent.get('/auth/callback').query({ code: 'code', state: authorization.state }).expect(302);
  return { app, agent, calls };
}

function registration(agent, metadata = fields, content = bytes, filename = 'story.txt') {
  let post = agent.post('/api/stories');
  for (const [key, value] of Object.entries(metadata)) post = post.field(key, value);
  return post.attach('file', content, filename);
}

test('registration hashes exact bytes before upload and persists explicit consent and ownership', async () => {
  const f = await fixture();
  const response = await registration(f.agent).expect(201);
  assert.deepEqual(f.calls.map(call => call.type), ['upload', 'database']);
  assert.equal(f.calls[0].sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual(f.calls[0].bytes, bytes);
  assert.equal(response.body.sha256, f.calls[0].sha256);
  assert.equal(response.body.byteSize, bytes.length);
  assert.equal(response.body.ownerId, 'owner-id');
  assert.equal(response.body.aiConsent, 'COMPENSATION_REQUIRED');
  assert.equal(response.body.commercialUse, false);
  assert.equal(response.body.culturalHeritage, true);
  assert.equal(response.body.blobName, `owner-id/${response.body.id}.txt`);
  assert.ok(response.body.createdAt);
});

test('authentication, origin and storage availability gates run before file processing', async () => {
  const f = await fixture();
  await registration(request(f.app)).expect(401);
  await registration(f.agent).set('Origin', 'https://untrusted.example').expect(403);
  const unconfigured = await fixture({ noStorage: true });
  await registration(unconfigured.agent).expect(503);
  assert.equal(f.calls.length, 0);
});

test('invalid, missing or spoofed permission selections cannot be stored', async () => {
  const f = await fixture();
  for (const invalid of [
    { ...fields, title: ' ' }, { ...fields, aiConsent: 'MAYBE' },
    { ...fields, commercialUse: 'yes' }, { title: 'Missing selections' },
    { ...fields, ownerId: 'another-creator' },
  ]) await registration(f.agent, invalid).expect(400);
  assert.equal(f.calls.length, 0);
});

test('file limits, UTF-8 content and PDF signatures are enforced', async () => {
  const f = await fixture();
  await registration(f.agent, fields, Buffer.from('not a PDF'), 'story.pdf').expect(415);
  await registration(f.agent, fields, Buffer.from([0xff, 0x00]), 'story.txt').expect(415);
  await registration(f.agent, fields, bytes, 'story.exe').expect(415);
  await registration(f.agent, fields, Buffer.alloc(0), 'empty.txt').expect(400);
  await registration(f.agent, fields, Buffer.alloc(MAX_STORY_BYTES + 1, 'a')).expect(413);
  assert.equal(f.calls.length, 0);
});

test('failed upload never creates metadata; failed persistence cleans up the uploaded blob', async () => {
  const failedUpload = await fixture({ failUpload: true });
  await registration(failedUpload.agent).expect(500);
  assert.deepEqual(failedUpload.calls.map(call => call.type), ['upload']);
  const failedDatabase = await fixture({ failDatabase: true });
  await registration(failedDatabase.agent).expect(500);
  assert.deepEqual(failedDatabase.calls.map(call => call.type), ['upload', 'database', 'cleanup']);
  assert.equal(failedDatabase.calls[2].blobName, failedDatabase.calls[0].blobName);
});

test('Azure adapter refuses public containers and binds hash metadata with overwrite protection', async () => {
  let publicAccess;
  const calls = [];
  const adapter = createBlobStorage({
    getProperties: async () => ({ blobPublicAccess: publicAccess }),
    getBlockBlobClient: name => ({ uploadData: async (data, options) => calls.push({ name, data, options }), deleteIfExists: async () => {} }),
  });
  const input = { blobName: 'owner/story.txt', bytes, sha256: createHash('sha256').update(bytes).digest('hex'), contentType: 'text/plain; charset=utf-8' };
  publicAccess = 'blob';
  await assert.rejects(adapter.upload(input));
  assert.equal(calls.length, 0);
  publicAccess = undefined;
  await adapter.upload(input);
  assert.equal(calls[0].options.metadata.sha256, input.sha256);
  assert.equal(calls[0].options.conditions.ifNoneMatch, '*');
  assert.equal(calls[0].options.blobHTTPHeaders.blobContentDisposition, 'attachment');
});

test('story list is private, validates pagination and filters by the authenticated creator', async () => {
  const f = await fixture();
  await request(f.app).get('/api/stories').expect(401);
  for (const query of ['limit=0', 'limit=51', 'offset=-1', 'ownerId=other']) {
    await f.agent.get(`/api/stories?${query}`).expect(400);
  }
  const response = await f.agent.get('/api/stories?limit=10&offset=0').expect(200);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.body.total, 1);
  assert.equal(response.body.stories[0].title, 'My story');
  const list = f.calls.find(call => call.type === 'list');
  assert.deepEqual(list.where, { ownerId: 'owner-id' });
  assert.equal(list.take, 10);
  assert.equal(list.skip, 0);
  assert.equal(list.select.blobName, undefined);
  assert.equal(list.select.sha256, true);
});
