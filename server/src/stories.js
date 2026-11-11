import { Router } from 'express';
import multer from 'multer';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { z } from 'zod';

export const MAX_STORY_BYTES = 10 * 1024 * 1024;
const booleanField = z.enum(['true', 'false']).transform(value => value === 'true');
const metadataSchema = z.object({
  title: z.string().trim().min(1).max(200),
  aiConsent: z.enum(['NOT_ALLOWED', 'ALLOWED', 'COMPENSATION_REQUIRED']),
  commercialUse: booleanField,
  culturalHeritage: booleanField,
}).strict();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_STORY_BYTES, files: 1, fields: 4, parts: 5, fieldSize: 2048 },
}).single('file');

function inspectFile(file) {
  const extension = extname(file.originalname).toLowerCase();
  if (extension === '.pdf' && file.buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return { extension, contentType: 'application/pdf' };
  }
  if (extension === '.txt') {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
      if (!text.includes('\0')) return { extension, contentType: 'text/plain; charset=utf-8' };
    } catch { /* Reject binary or invalid UTF-8 files disguised as text. */ }
  }
  return null;
}

export function createStoriesRouter({ config, prisma, storage, logger = console }) {
  const router = Router();
  let activeUploads = 0;
  router.get('/', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Sign in required' });
    const query = z.object({
      limit: z.coerce.number().int().min(1).max(50).default(20),
      offset: z.coerce.number().int().min(0).max(1000000).default(0),
    }).strict().safeParse(req.query);
    if (!query.success) return res.status(400).json({ error: 'Invalid story pagination' });
    const { limit, offset } = query.data;
    const where = { ownerId: req.session.userId };
    const [stories, total] = await Promise.all([
      prisma.story.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: offset, take: limit,
        select: { id: true, title: true, originalName: true, contentType: true, byteSize: true, sha256: true, aiConsent: true, commercialUse: true, culturalHeritage: true, createdAt: true, published: true, communityEntityId: true,
          licenses: { take: 1, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, tier: true, status: true, createdAt: true } } } }),
      prisma.story.count({ where }),
    ]);
    res.json({ stories, total, hasMore: offset + stories.length < total });
  });
  router.post('/', (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Sign in required' });
    const origin = req.get('origin');
    if ((origin && origin !== config.CLIENT_ORIGIN) || (!origin && req.get('sec-fetch-site'))) {
      return res.status(403).json({ error: 'Invalid origin' });
    }
    if (!storage) return res.status(503).json({ error: 'Story storage is not configured' });
    if (activeUploads >= 4) return res.status(429).json({ error: 'Uploads are busy. Please try again shortly.' });
    activeUploads++;
    let released = false;
    const release = () => { if (!released) { released = true; activeUploads--; } };
    res.once('finish', release);
    res.once('close', release);
    next();
  }, upload, async (req, res) => {
    const metadata = metadataSchema.safeParse(req.body);
    if (!metadata.success) return res.status(400).json({ error: 'Provide a title, AI consent, commercial-use and cultural-heritage selections.' });
    if (!req.file?.size) return res.status(400).json({ error: 'Provide one nonempty story file in the file field.' });
    const type = inspectFile(req.file);
    if (!type) return res.status(415).json({ error: 'Only UTF-8 .txt files and PDF documents are supported.' });
    const id = randomUUID();
    const blobName = `${req.session.userId}/${id}${type.extension}`;
    // Fingerprint the exact bytes before they leave the API for Azure.
    const sha256 = createHash('sha256').update(req.file.buffer).digest('hex');
    res.locals.failureStage = 'blob_upload';
    await storage.upload({ blobName, bytes: req.file.buffer, contentType: type.contentType, sha256 });
    let story;
    try {
      res.locals.failureStage = 'story_create';
      story = await prisma.story.create({ data: {
        id, ownerId: req.session.userId, ...metadata.data,
        originalName: req.file.originalname.replace(/[\x00-\x1f\x7f]/g, ''),
        contentType: type.contentType, byteSize: req.file.size, sha256, blobName,
      } });
    } catch (error) {
      try { await storage.remove(blobName); }
      catch { logger.error({ event: 'blob_cleanup_failed', storyId: id }); }
      throw error;
    }
    res.status(201).json(story);
  });
  return router;
}
