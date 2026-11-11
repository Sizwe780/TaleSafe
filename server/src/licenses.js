import { Router } from 'express';
import { z } from 'zod';

const uuid = z.uuid();

export function createLicensesRouter({ config, prisma }) {
  const router = Router();
  router.use((req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Sign in required' });
    next();
  });
  router.get('/:storyId/permissions', async (req, res) => {
    if (!uuid.safeParse(req.params.storyId).success || Object.keys(req.query).length) return res.status(400).json({ error: 'Invalid story request' });
    const story = await prisma.story.findFirst({ where: { id: req.params.storyId, OR: [{ published: true }, { ownerId: req.session.userId }, { licenses: { some: { requesterId: req.session.userId } } }] }, select: {
      id: true, title: true, aiConsent: true, commercialUse: true, culturalHeritage: true,
    } });
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json(story);
  });
  router.post('/:storyId/licenses', async (req, res) => {
    const origin = req.get('origin');
    if ((origin && origin !== config.CLIENT_ORIGIN) || (!origin && req.get('sec-fetch-site'))) return res.status(403).json({ error: 'Invalid origin' });
    if (!uuid.safeParse(req.params.storyId).success) return res.status(400).json({ error: 'Invalid story ID' });
    res.status(410).json({ error: 'Legacy mock enquiries are retired. Use the licensing workspace to prepare a structured term-sheet draft. Binding submission requires trusted verification and approved contract and signing configuration.' });
  });
  return router;
}
