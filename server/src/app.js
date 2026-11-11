import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { createStoriesRouter } from './stories.js';
import { createLicensesRouter } from './licenses.js';
import { createActivityRouter } from './activity.js';
import { createCatalogRouter, createLicensingWorkspaceRouter } from './licensing-workspace.js';

const scopes = ['openid', 'profile', 'email'];
const saveSession = req => new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
const regenerateSession = req => new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));

export function createApp({ config, prisma, identity, sessionStore, storage, logger = console }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '16kb' }));
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(session({
    name: 'talesafe.sid',
    secret: config.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 },
  }));

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'connected' });
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'disconnected' });
    }
  });

  app.get('/auth/login', async (req, res) => {
    res.locals.failureStage = 'authorization_url';
    const verifier = randomBytes(32).toString('base64url');
    const state = randomBytes(32).toString('hex');
    const nonce = randomBytes(32).toString('hex');
    req.session.auth = { verifier, state, nonce, createdAt: Date.now() };
    const url = await identity.getAuthCodeUrl({
      scopes, redirectUri: config.ENTRA_REDIRECT_URI, responseMode: 'query',
      state, nonce, codeChallenge: createHash('sha256').update(verifier).digest('base64url'), codeChallengeMethod: 'S256',
    });
    res.locals.failureStage = 'login_session_save';
    await saveSession(req);
    res.redirect(url);
  });

  app.get('/auth/callback', async (req, res) => {
    res.locals.failureStage = 'callback_session_save';
    const query = z.object({ code: z.string().min(1), state: z.string().min(1) }).safeParse(req.query);
    const attempt = req.session.auth;
    delete req.session.auth;
    await saveSession(req);
    if (!query.success || !attempt || query.data.state !== attempt.state || Date.now() - attempt.createdAt > 10 * 60 * 1000) {
      return res.status(400).json({ error: 'Invalid or expired sign-in. Please start again.' });
    }
    res.locals.failureStage = 'token_exchange';
    const result = await identity.acquireTokenByCode({
      code: query.data.code, scopes, redirectUri: config.ENTRA_REDIRECT_URI, codeVerifier: attempt.verifier,
      nonce: attempt.nonce,
    });
    const claims = result?.idTokenClaims;
    if (!claims?.oid || claims.tid !== config.ENTRA_TENANT_ID || claims.nonce !== attempt.nonce) {
      return res.status(401).json({ error: 'Identity verification failed' });
    }
    res.locals.failureStage = 'user_upsert';
    const user = await prisma.user.upsert({
      where: { entraId: claims.oid },
      create: { entraId: claims.oid, displayName: claims.name || 'Creator', email: claims.email || null },
      update: { displayName: claims.name || 'Creator', email: claims.email || null },
    });
    res.locals.failureStage = 'session_rotation';
    await regenerateSession(req);
    req.session.userId = user.id;
    res.locals.failureStage = 'authenticated_session_save';
    await saveSession(req);
    res.redirect(config.CLIENT_ORIGIN);
  });

  app.get('/api/me', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Sign in required' });
    const user = await prisma.user.findUnique({ where: { id: req.session.userId }, select: { id: true, displayName: true, email: true } });
    if (!user) return res.status(401).json({ error: 'Sign in required' });
    res.json(user);
  });

  app.post('/auth/logout', (req, res, next) => {
    if (req.get('origin') !== config.CLIENT_ORIGIN) return res.status(403).json({ error: 'Invalid origin' });
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie('talesafe.sid', { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax' });
      res.status(204).end();
    });
  });
  app.use('/api/stories', createStoriesRouter({ config, prisma, storage, logger }));
  app.use('/api/stories', createLicensesRouter({ config, prisma }));
  app.use('/api/activity', createActivityRouter({ prisma }));
  app.use('/api/catalog', createCatalogRouter({ prisma }));
  app.use('/api', createLicensingWorkspaceRouter({ config, prisma }));
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((error, _req, res, _next) => {
    if (error.name === 'MulterError') {
      return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Story files must be 10 MiB or smaller.' : 'Invalid multipart upload. Provide one file and the four metadata fields.' });
    }
    // Do not expose tokens, credentials, SQL, or upstream error descriptions.
    // Only fixed stage names and numeric Entra/Prisma codes enter diagnostics.
    const aadsts = String(error.message || '').match(/AADSTS(\d{5,10})\b/);
    const prismaCode = /^P\d{4}$/.test(error.code || '') ? error.code : undefined;
    const identityCode = /^[a-z][a-z0-9_]{0,79}$/.test(error.errorCode || '') ? error.errorCode : undefined;
    logger.error({ event: 'request_failed', stage: res.locals.failureStage || 'request', identityCode, aadsts: aadsts?.[1], prismaCode });
    const status = error.status === 400 ? 400 : 500;
    res.status(status).json({ error: status === 400 ? 'Invalid request' : 'Request failed. Please try again.' });
  });
  return app;
}
