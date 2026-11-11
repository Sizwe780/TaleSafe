import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import session from 'express-session';
import { createApp } from '../src/app.js';
import { termSheetSchema } from '../src/licensing-workspace.js';

const storyId = '22222222-2222-4222-8222-222222222222';
const draftId = '33333333-3333-4333-8333-333333333333';
const terms = { scope: 'EDUCATIONAL_MATERIAL', durationKind: 'FIXED', durationMonths: 12, territory: 'COUNTRY', countryCode: 'ZA', exclusivity: 'NON_EXCLUSIVE', commercialUse: false, financialKind: 'FLAT_FEE', currency: 'ZAR', flatFeeCents: 500000 };

async function fixture({ verified = false, heritage = false, missing = false, aiConsent = 'COMPENSATION_REQUIRED', communityVerified = false } = {}) {
  let authorization;
  const calls = [];
  const config = { NODE_ENV: 'test', SESSION_SECRET: 'test-secret-with-at-least-32-characters', CLIENT_ORIGIN: 'http://localhost:3000', ENTRA_REDIRECT_URI: 'http://localhost:3001/auth/callback', ENTRA_TENANT_ID: '11111111-1111-4111-8111-111111111111' };
  const story = { id: storyId, title: 'Protected story', commercialUse: false, aiConsent, culturalHeritage: heritage,
    communityEntity: communityVerified ? { verificationState: 'VERIFIED', entityVerified: true, mandateApproved: true } : null };
  const profile = { kind: 'INDIVIDUAL', verificationState: verified ? 'VERIFIED' : 'UNVERIFIED', identityVerified: verified, educationNgoVerified: false };
  const prisma = {
    user: { upsert: async () => ({ id: 'requester' }) },
    story: {
      findFirst: async query => { calls.push({ model: 'story', action: 'findFirst', ...query }); return missing ? null : story; },
      findMany: async query => { calls.push({ model: 'catalog', ...query }); return [{ id: storyId, title: story.title, aiConsent, commercialUse: false, culturalHeritage: heritage }]; },
      count: async () => 1,
      updateMany: async query => { calls.push({ model: 'publication', ...query }); return { count: missing ? 0 : 1 }; },
    },
    licenseeProfile: {
      findUnique: async () => profile,
      upsert: async query => { calls.push({ model: 'profile', ...query }); return { ...query.update }; },
    },
    licenseDraft: {
      findMany: async query => { calls.push({ model: 'draft-list', ...query }); return []; },
      findFirst: async query => { calls.push({ model: 'draft-read', ...query }); return missing ? null : { id: draftId, storyId, terms, story }; },
      create: async query => { calls.push({ model: 'draft-create', ...query }); return { id: draftId, ...query.data }; },
    },
    communityEntity: {
      findMany: async () => [],
      create: async query => { calls.push({ model: 'community', ...query }); return { id: 'entity', ...query.data, verificationState: 'UNVERIFIED', mandateApproved: false }; },
    },
  };
  const identity = { getAuthCodeUrl: async params => { authorization = params; return 'https://login.microsoftonline.com/authorize'; }, acquireTokenByCode: async () => ({ idTokenClaims: { oid: 'identity', tid: config.ENTRA_TENANT_ID, nonce: authorization.nonce } }) };
  const app = createApp({ config, prisma, identity, sessionStore: new session.MemoryStore(), logger: { error() {} } });
  const agent = request.agent(app);
  await agent.get('/auth/login').expect(302);
  await agent.get('/auth/callback').query({ code: 'code', state: authorization.state }).expect(302);
  return { app, agent, calls, config };
}

test('public catalog selects only creator-published metadata and validates pagination', async () => {
  const f = await fixture();
  await request(f.app).get('/api/catalog?limit=51').expect(400);
  const response = await request(f.app).get('/api/catalog?limit=10').expect(200);
  const query = f.calls.find(call => call.model === 'catalog');
  assert.deepEqual(query.where, { published: true });
  assert.deepEqual(Object.keys(query.select).sort(), ['aiConsent', 'commercialUse', 'culturalHeritage', 'id', 'title']);
  assert.equal(response.body.stories[0].originalName, undefined);
  assert.equal(response.body.stories[0].blobName, undefined);
});

test('catalog visibility changes require ownership and cannot inject extra metadata', async () => {
  const f = await fixture();
  await request(f.app).patch(`/api/stories/${storyId}/publication`).send({ published: true }).expect(401);
  await f.agent.patch(`/api/stories/${storyId}/publication`).send({ published: true, ownerId: 'other' }).expect(400);
  await f.agent.patch(`/api/stories/${storyId}/publication`).send({ published: true }).expect(200);
  assert.deepEqual(f.calls.find(call => call.model === 'publication').where, { id: storyId, ownerId: 'requester' });
  const missing = await fixture({ missing: true });
  await missing.agent.patch(`/api/stories/${storyId}/publication`).send({ published: false }).expect(404);
});

test('profile updates cannot self-verify and invalidate old authority flags', async () => {
  const f = await fixture({ verified: true });
  const data = { kind: 'INDIVIDUAL', legalName: 'Test Person', contactName: 'Test Person', contactEmail: 'test@example.org' };
  await f.agent.put('/api/licensee-profile').send({ ...data, identityVerified: true }).expect(400);
  await f.agent.put('/api/licensee-profile').send(data).expect(200);
  const saved = f.calls.find(call => call.model === 'profile').update;
  assert.equal(saved.verificationState, 'UNVERIFIED');
  for (const key of ['identityVerified', 'businessVerified', 'directorMatchVerified', 'educationNgoVerified']) assert.equal(saved[key], false);
  assert.equal(saved.providerReference, null);
  await f.agent.put('/api/licensee-profile').send({ ...data, kind: 'ORGANIZATION', businessDomain: 'different.org', registrationNumber: '2020/123456/07' }).expect(400);
});

test('structured term sheets require applicable fields and reject ambiguous financial proposals', () => {
  assert.equal(termSheetSchema.safeParse(terms).success, true);
  for (const invalid of [
    { ...terms, durationMonths: undefined }, { ...terms, countryCode: undefined },
    { ...terms, scope: 'anything' }, { ...terms, flatFeeCents: -1 },
    { ...terms, financialKind: 'ROYALTY' }, { ...terms, durationKind: 'PERPETUAL' },
    { ...terms, exclusivity: undefined }, { ...terms, commercialUse: undefined },
  ]) assert.equal(termSheetSchema.safeParse(invalid).success, false);
});

test('drafts persist as requester-owned proposals without status or signature injection', async () => {
  const f = await fixture();
  await f.agent.post('/api/license-drafts').send({ storyId, terms, status: 'APPROVED' }).expect(400);
  const response = await f.agent.post('/api/license-drafts').send({ storyId, terms }).expect(201);
  assert.equal(response.body.nonBinding, true);
  const saved = f.calls.find(call => call.model === 'draft-create').data;
  assert.equal(saved.requesterId, 'requester');
  assert.equal(saved.terms.flatFeeCents, 500000);
  assert.equal(saved.status, undefined);
  assert.deepEqual(f.calls.find(call => call.model === 'story').where, { id: storyId, OR: [{ published: true }, { ownerId: 'requester' }] });
  await f.agent.get('/api/license-drafts').expect(200);
  assert.deepEqual(f.calls.find(call => call.model === 'draft-list').where, { requesterId: 'requester' });
});

test('draft requests enforce existing commercial and AI consent before persistence', async () => {
  const f = await fixture({ aiConsent: 'NOT_ALLOWED' });
  await f.agent.post('/api/license-drafts').send({ storyId, terms: { ...terms, commercialUse: true } }).expect(409);
  await f.agent.post('/api/license-drafts').send({ storyId, terms: { ...terms, scope: 'AI_MODEL_TRAINING' } }).expect(409);
  const compensated = await fixture();
  await compensated.agent.post('/api/license-drafts').send({ storyId, terms: { ...terms, scope: 'AI_RAG_INDEXING', financialKind: 'FREE', flatFeeCents: undefined } }).expect(409);
  assert.equal(f.calls.some(call => call.model === 'draft-create'), false);
});

test('binding submission fails closed for unverified identities, community authority and missing contracts', async () => {
  const unverified = await fixture();
  await unverified.agent.post(`/api/license-drafts/${draftId}/submit`).send({}).expect(403);
  const heritage = await fixture({ verified: true, heritage: true });
  await heritage.agent.post(`/api/license-drafts/${draftId}/submit`).send({}).expect(403);
  const readyIdentity = await fixture({ verified: true, heritage: true, communityVerified: true });
  await readyIdentity.agent.post(`/api/license-drafts/${draftId}/submit`).send({}).expect(503);
  for (const f of [unverified, heritage, readyIdentity]) assert.equal(f.calls.some(call => call.model === 'draft-create'), false);
});

test('signing preview is unsigned, owner-scoped, incapable of fulfillment and unavailable in production', async () => {
  const f = await fixture();
  const response = await f.agent.post(`/api/license-drafts/${draftId}/signing-preview`).send({}).expect(200);
  assert.equal(response.body.status, 'NOT_SIGNED');
  assert.equal(response.body.nonBinding, true);
  assert.equal(response.body.rightsGranted, false);
  assert.equal(response.body.assetUnlocked, false);
  assert.match(response.body.documentText, /NON-BINDING LICENSE PREVIEW/);
  assert.deepEqual(f.calls.find(call => call.model === 'draft-read').where, { id: draftId, requesterId: 'requester' });
  assert.equal(f.calls.some(call => call.model === 'draft-create'), false);
  f.config.NODE_ENV = 'production';
  await f.agent.post(`/api/license-drafts/${draftId}/signing-preview`).send({}).expect(404);
});

test('community application never activates the entity or self-appoints verified administrators', async () => {
  const f = await fixture();
  const application = { name: 'Example Community', kind: 'NPO', registrationNumber: '123-456 NPO' };
  await f.agent.post('/api/community-applications').send({ ...application, mandateApproved: true }).expect(400);
  const response = await f.agent.post('/api/community-applications').send(application).expect(201);
  assert.equal(response.body.application.verificationState, 'UNVERIFIED');
  assert.equal(response.body.application.mandateApproved, false);
  assert.deepEqual(f.calls.find(call => call.model === 'community').data.admins, { create: { userId: 'requester', verificationState: 'UNVERIFIED' } });
});
