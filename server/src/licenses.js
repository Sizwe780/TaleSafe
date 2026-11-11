import { Router } from 'express';
import { z } from 'zod';

const requestSchema = z.object({ tier: z.enum(['EDUCATIONAL', 'FILM', 'AI_COMPANY']) }).strict();
const uuid = z.uuid();

export function createLicensesRouter({ config, prisma }) {
  const router = Router();
  router.use((req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Sign in required' });
    next();
  });
  router.get('/:storyId/permissions', async (req, res) => {
    if (!uuid.safeParse(req.params.storyId).success || Object.keys(req.query).length) return res.status(400).json({ error: 'Invalid story request' });
    const story = await prisma.story.findUnique({ where: { id: req.params.storyId }, select: {
      id: true, title: true, aiConsent: true, commercialUse: true, culturalHeritage: true,
    } });
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json(story);
  });
  router.post('/:storyId/licenses', async (req, res) => {
    const origin = req.get('origin');
    if ((origin && origin !== config.CLIENT_ORIGIN) || (!origin && req.get('sec-fetch-site'))) return res.status(403).json({ error: 'Invalid origin' });
    const body = requestSchema.safeParse(req.body);
    if (!uuid.safeParse(req.params.storyId).success || !body.success || Object.keys(req.query).length) return res.status(400).json({ error: 'Provide a valid story ID and an Educational, Film or AI company tier.' });
    // Serialize policy checks and request creation against the same story row.
    res.locals.failureStage = 'license_request';
    const result = await prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw`SELECT "id", "commercialUse", "aiConsent" FROM "Story" WHERE "id" = ${req.params.storyId} FOR UPDATE`;
      const story = rows[0];
      if (!story) return { status: 404, error: 'Story not found' };
      if (body.data.tier === 'FILM' && !story.commercialUse) return { status: 409, error: 'This story does not permit commercial film use.' };
      if (body.data.tier === 'AI_COMPANY' && story.aiConsent === 'NOT_ALLOWED') return { status: 409, error: 'This story does not permit AI training.' };
      const existing = await tx.license.findFirst({ where: { storyId: story.id, requesterId: req.session.userId, tier: body.data.tier, status: 'REQUESTED' } });
      if (existing) return { status: 200, license: existing };
      const license = await tx.license.create({ data: { storyId: story.id, requesterId: req.session.userId, tier: body.data.tier, status: 'REQUESTED' } });
      return { status: 201, license };
    }, { maxWait: 10000, timeout: 30000 });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(result.status).json({ ...result.license, mock: true, message: 'Mock request recorded. No rights have been granted and no payment has been processed.' });
  });
  return router;
}
