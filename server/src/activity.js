import { Router } from 'express';
import { z } from 'zod';

export function createActivityRouter({ prisma }) {
  const router = Router();
  router.get('/', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Sign in required' });
    const query = z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) }).strict().safeParse(req.query);
    if (!query.success) return res.status(400).json({ error: 'Invalid activity limit' });
    const limit = query.data.limit;
    res.locals.failureStage = 'activity_read';
    const [stories, licenses] = await Promise.all([
      prisma.story.findMany({ where: { ownerId: req.session.userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1,
        select: { id: true, title: true, createdAt: true } }),
      prisma.license.findMany({ where: { OR: [{ story: { ownerId: req.session.userId } }, { requesterId: req.session.userId }] },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1,
        select: { id: true, storyId: true, tier: true, status: true, createdAt: true, story: { select: { title: true } } } }),
    ]);
    const events = [
      ...stories.map(story => ({ id: `registration:${story.id}`, type: 'STORY_REGISTERED', storyId: story.id, storyTitle: story.title, occurredAt: story.createdAt })),
      ...licenses.map(license => ({ id: `license:${license.id}`, type: 'LICENSE_REQUESTED', storyId: license.storyId, storyTitle: license.story.title,
        occurredAt: license.createdAt, tier: license.tier, status: license.status })),
    ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime() || b.id.localeCompare(a.id));
    res.json({ events: events.slice(0, limit), hasMore: events.length > limit });
  });
  return router;
}
