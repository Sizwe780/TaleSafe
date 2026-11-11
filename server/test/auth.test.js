import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import session from 'express-session';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';

const config = {
  NODE_ENV: 'test', SESSION_SECRET: 'test-secret-with-at-least-32-characters',
  CLIENT_ORIGIN: 'http://localhost:3000', ENTRA_REDIRECT_URI: 'http://localhost:3001/auth/callback',
  ENTRA_TENANT_ID: '11111111-1111-4111-8111-111111111111',
};

function fixture({ badNonce = false, databaseDown = false, tokenError } = {}) {
  let authorization;
  let writes = 0;
  const diagnostics = [];
  const user = { id: 'creator-1', displayName: 'Ama', email: 'ama@example.test' };
  const prisma = {
    $queryRaw: async () => { if (databaseDown) throw new Error('private database details'); return [{ '?column?': 1 }]; },
    user: {
      upsert: async () => { writes++; return user; },
      findUnique: async () => user,
    },
  };
  const identity = {
    getAuthCodeUrl: async params => {
      authorization = params;
      return `https://login.microsoftonline.com/authorize?state=${params.state}`;
    },
    acquireTokenByCode: async params => {
      assert.ok(params.codeVerifier);
      // MSAL 7 rejects an ID token nonce unless the original expected nonce
      // is passed into the exchange, before our own claims checks can run.
      assert.equal(params.nonce, authorization.nonce);
      if (tokenError) throw tokenError;
      return { idTokenClaims: { oid: 'object-id', tid: config.ENTRA_TENANT_ID, name: 'Ama', nonce: badNonce ? 'wrong' : authorization.nonce } };
    },
  };
  const app = createApp({ config, prisma, identity, sessionStore: new session.MemoryStore(), logger: { error: diagnostic => diagnostics.push(diagnostic) } });
  return { app, diagnostics, get authorization() { return authorization; }, get writes() { return writes; } };
}

test('anonymous callers cannot read a profile', async () => {
  await request(fixture().app).get('/api/me').expect(401);
});

test('health verifies the database and redacts connection errors', async () => {
  await request(fixture().app).get('/health').expect(200, { status: 'ok', database: 'connected' });
  await request(fixture({ databaseDown: true }).app).get('/health').expect(503, { status: 'unavailable', database: 'disconnected' });
});

test('callback rejects unsolicited or mismatched state without writing a user', async () => {
  const f = fixture();
  const agent = request.agent(f.app);
  await agent.get('/auth/callback?code=x&state=unknown').expect(400);
  await agent.get('/auth/login').expect(302);
  assert.equal(f.authorization.codeChallengeMethod, 'S256');
  await agent.get('/auth/callback?code=x&state=wrong').expect(400);
  assert.equal(f.writes, 0);
});

test('nonce mismatch rejects identity before database write', async () => {
  const f = fixture({ badNonce: true });
  const agent = request.agent(f.app);
  await agent.get('/auth/login').expect(302);
  await agent.get('/auth/callback').query({ code: 'code', state: f.authorization.state }).expect(401);
  assert.equal(f.writes, 0);
});

test('verified callback rotates session, authenticates user, rejects replay and logs out', async () => {
  const f = fixture();
  const agent = request.agent(f.app);
  const login = await agent.get('/auth/login').expect(302);
  const state = f.authorization.state;
  const callback = await agent.get('/auth/callback').query({ code: 'code', state }).expect(302);
  assert.equal(callback.headers.location, config.CLIENT_ORIGIN);
  assert.notEqual(callback.headers['set-cookie'][0].split(';')[0], login.headers['set-cookie'][0].split(';')[0]);
  await agent.get('/api/me').expect(200).expect(response => assert.equal(response.body.id, 'creator-1'));
  await agent.get('/auth/callback').query({ code: 'code', state }).expect(400);
  assert.equal(f.writes, 1);
  await agent.post('/auth/logout').set('Origin', 'https://untrusted.example').expect(403);
  await agent.post('/auth/logout').set('Origin', config.CLIENT_ORIGIN).expect(204);
  await agent.get('/api/me').expect(401);
});

test('configuration fails closed without leaking secrets', () => {
  assert.throws(() => readConfig({ ENTRA_CLIENT_SECRET: 'very-private' }), error => {
    assert.match(error.message, /DATABASE_URL/);
    assert.ok(!error.message.includes('very-private'));
    return true;
  });
});

test('token exchange diagnostics identify the stage without leaking upstream data', async () => {
  const error = Object.assign(new Error('AADSTS7000215 secret-value access-token private user details'), { errorCode: 'invalid_client' });
  const f = fixture({ tokenError: error });
  const agent = request.agent(f.app);
  await agent.get('/auth/login').expect(302);
  const response = await agent.get('/auth/callback').query({ code: 'private-auth-code', state: f.authorization.state }).expect(500);
  assert.deepEqual(response.body, { error: 'Request failed. Please try again.' });
  assert.deepEqual(f.diagnostics, [{ event: 'request_failed', stage: 'token_exchange', identityCode: 'invalid_client', aadsts: '7000215', prismaCode: undefined }]);
  const logged = JSON.stringify(f.diagnostics);
  for (const sensitive of ['secret-value', 'access-token', 'private-auth-code', 'private user details']) assert.ok(!logged.includes(sensitive));
  assert.equal(f.writes, 0);
});
