import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const pagination = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20), offset: z.coerce.number().int().min(0).max(1000000).default(0) }).strict();
const profileSchema = z.object({
  kind: z.enum(['INDIVIDUAL', 'ORGANIZATION']), legalName: z.string().trim().min(2).max(200),
  contactName: z.string().trim().min(2).max(150), contactEmail: z.email().max(254),
  businessDomain: z.string().trim().toLowerCase().regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/).max(253).optional(),
  registrationNumber: z.string().trim().min(3).max(80).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.kind === 'ORGANIZATION' && (!value.businessDomain || !value.registrationNumber || value.contactEmail.split('@')[1].toLowerCase() !== value.businessDomain)) {
    ctx.addIssue({ code: 'custom', message: 'Organizations need a registration number and matching business email domain.' });
  }
});

export const termSheetSchema = z.object({
  scope: z.enum(['PRINT_PUBLICATION', 'DIGITAL_PUBLICATION', 'AUDIO_ADAPTATION', 'FILM_TV_ADAPTATION', 'EDUCATIONAL_MATERIAL', 'AI_MODEL_TRAINING', 'AI_RAG_INDEXING']),
  durationKind: z.enum(['FIXED', 'PERPETUAL']), durationMonths: z.number().int().min(1).max(1200).optional(),
  territory: z.enum(['WORLDWIDE', 'PAN_AFRICA', 'COUNTRY']), countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
  exclusivity: z.enum(['EXCLUSIVE', 'NON_EXCLUSIVE']), commercialUse: z.boolean(),
  financialKind: z.enum(['FLAT_FEE', 'ROYALTY', 'FREE']), currency: z.literal('ZAR'),
  flatFeeCents: z.number().int().min(1).max(2000000000).optional(),
  royaltyBasisPoints: z.number().int().min(1).max(10000).optional(),
  royaltyBasis: z.enum(['GROSS_SALES', 'NET_SALES', 'NET_RECEIPTS']).optional(),
}).strict().superRefine((value, ctx) => {
  const require = (ok, message) => { if (!ok) ctx.addIssue({ code: 'custom', message }); };
  require(value.durationKind === 'FIXED' ? !!value.durationMonths : value.durationMonths === undefined, 'Fixed terms require months; perpetual terms must omit them.');
  require(value.territory === 'COUNTRY' ? !!value.countryCode : value.countryCode === undefined, 'Country terms require a country code; other territories must omit it.');
  require(value.financialKind === 'FLAT_FEE' ? !!value.flatFeeCents : value.flatFeeCents === undefined, 'Flat fees require an amount in cents; other proposals must omit it.');
  require(value.financialKind === 'ROYALTY' ? !!value.royaltyBasisPoints && !!value.royaltyBasis : value.royaltyBasisPoints === undefined && value.royaltyBasis === undefined, 'Royalty proposals require a percentage and basis; other proposals must omit them.');
});

function originGuard(config) {
  return (req, res, next) => {
    if (['GET', 'HEAD'].includes(req.method)) return next();
    const origin = req.get('origin');
    if ((origin && origin !== config.CLIENT_ORIGIN) || (!origin && req.get('sec-fetch-site'))) return res.status(403).json({ error: 'Invalid origin' });
    next();
  };
}

function permissionError(story, terms) {
  if (terms.commercialUse && !story.commercialUse) return 'This story does not permit commercial exploitation.';
  if (['AI_MODEL_TRAINING', 'AI_RAG_INDEXING'].includes(terms.scope)) {
    if (story.aiConsent === 'NOT_ALLOWED') return 'This story does not permit AI-related use.';
    if (story.aiConsent === 'COMPENSATION_REQUIRED' && terms.financialKind === 'FREE') return 'This story requires compensation for AI-related use.';
  }
  return null;
}

export function createCatalogRouter({ prisma }) {
  const router = Router();
  router.get('/', async (req, res) => {
    const query = pagination.safeParse(req.query);
    if (!query.success) return res.status(400).json({ error: 'Invalid catalog pagination' });
    const { limit, offset } = query.data;
    const where = { published: true };
    const [stories, total] = await Promise.all([
      prisma.story.findMany({ where, take: limit, skip: offset, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true, title: true, aiConsent: true, commercialUse: true, culturalHeritage: true } }),
      prisma.story.count({ where }),
    ]);
    res.json({ stories, total, hasMore: offset + stories.length < total });
  });
  return router;
}

export function createLicensingWorkspaceRouter({ config, prisma }) {
  const router = Router();
  router.use((req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Sign in required' });
    next();
  });
  router.use(originGuard(config));
  router.use((req, res, next) => {
    if (Object.keys(req.query).length) return res.status(400).json({ error: 'Unexpected query parameters' });
    next();
  });
  router.get('/licensing/status', (_req, res) => res.json({
    verificationConnected: false, contractApproved: false, signingConnected: false,
    signingPreviewAvailable: config.NODE_ENV !== 'production', jurisdiction: 'ZA', currency: 'ZAR',
    bindingSubmissionAvailable: false, assetDeliveryAvailable: false,
  }));

  const profileSelect = { kind: true, legalName: true, contactName: true, contactEmail: true, businessDomain: true, registrationNumber: true,
    verificationState: true, identityVerified: true, businessVerified: true, directorMatchVerified: true, educationNgoVerified: true };
  router.get('/licensee-profile', async (req, res) => res.json({ profile: await prisma.licenseeProfile.findUnique({ where: { userId: req.session.userId }, select: profileSelect }) }));
  router.put('/licensee-profile', async (req, res) => {
    const body = profileSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'Provide legal and contact details; organizations also need a registration number and matching business domain.' });
    const data = { ...body.data, businessDomain: body.data.kind === 'ORGANIZATION' ? body.data.businessDomain : null,
      registrationNumber: body.data.kind === 'ORGANIZATION' ? body.data.registrationNumber : null,
      verificationState: 'UNVERIFIED', identityVerified: false, businessVerified: false, directorMatchVerified: false, educationNgoVerified: false, providerReference: null };
    const profile = await prisma.licenseeProfile.upsert({ where: { userId: req.session.userId }, create: { userId: req.session.userId, ...data }, update: data, select: profileSelect });
    res.json({ profile, message: 'Profile saved. This does not verify your identity, business or authority.' });
  });

  router.patch('/stories/:storyId/publication', async (req, res) => {
    const body = z.object({ published: z.boolean() }).strict().safeParse(req.body);
    if (!z.uuid().safeParse(req.params.storyId).success || !body.success) return res.status(400).json({ error: 'Provide a valid story ID and publication choice.' });
    const result = await prisma.story.updateMany({ where: { id: req.params.storyId, ownerId: req.session.userId }, data: body.data });
    if (!result.count) return res.status(404).json({ error: 'Story not found' });
    res.json({ id: req.params.storyId, published: body.data.published });
  });

  router.get('/community-applications', async (req, res) => res.json({ applications: await prisma.communityEntity.findMany({
    where: { applicantId: req.session.userId }, take: 50, orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, kind: true, registrationNumber: true, verificationState: true, entityVerified: true, mandateApproved: true },
  }) }));
  router.post('/community-applications', async (req, res) => {
    const body = z.object({ name: z.string().trim().min(2).max(200), kind: z.enum(['NPC', 'NPO', 'TRUST']), registrationNumber: z.string().trim().min(3).max(80) }).strict().safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'Provide a community entity name, type and registration number.' });
    const entity = await prisma.communityEntity.create({ data: { ...body.data, applicantId: req.session.userId,
      admins: { create: { userId: req.session.userId, verificationState: 'UNVERIFIED' } } },
      select: { id: true, name: true, kind: true, verificationState: true, mandateApproved: true } });
    res.status(201).json({ application: entity, message: 'Application saved as unverified. Entity checks, identity checks and human mandate review are required before activation.' });
  });

  router.get('/license-drafts', async (req, res) => res.json({ drafts: await prisma.licenseDraft.findMany({
    where: { requesterId: req.session.userId }, take: 50, orderBy: { updatedAt: 'desc' },
    select: { id: true, storyId: true, terms: true, createdAt: true, updatedAt: true, story: { select: { title: true } } },
  }) }));
  router.post('/license-drafts', async (req, res) => {
    const body = z.object({ storyId: z.uuid(), terms: termSheetSchema }).strict().safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'Complete the required structured term sheet with valid scope, duration, territory, exclusivity and financial terms.' });
    const story = await prisma.story.findFirst({ where: { id: body.data.storyId, OR: [{ published: true }, { ownerId: req.session.userId }] },
      select: { id: true, commercialUse: true, aiConsent: true } });
    if (!story) return res.status(404).json({ error: 'Story not found' });
    const prohibited = permissionError(story, body.data.terms);
    if (prohibited) return res.status(409).json({ error: prohibited });
    const draft = await prisma.licenseDraft.create({ data: { requesterId: req.session.userId, storyId: story.id, terms: body.data.terms },
      select: { id: true, storyId: true, terms: true, createdAt: true } });
    res.status(201).json({ draft, nonBinding: true, message: 'Term-sheet draft saved. No license has been executed or rights granted.' });
  });

  const findDraft = req => prisma.licenseDraft.findFirst({ where: { id: req.params.draftId, requesterId: req.session.userId }, include: { story: { include: { communityEntity: true } } } });
  router.post('/license-drafts/:draftId/submit', async (req, res) => {
    if (!z.uuid().safeParse(req.params.draftId).success || !z.object({}).strict().safeParse(req.body || {}).success) return res.status(400).json({ error: 'Invalid draft submission' });
    const draft = await findDraft(req);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    const profile = await prisma.licenseeProfile.findUnique({ where: { userId: req.session.userId } });
    if (!profile || profile.verificationState !== 'VERIFIED' || !profile.identityVerified ||
        (profile.kind === 'ORGANIZATION' && (!profile.businessVerified || !profile.directorMatchVerified))) return res.status(403).json({ error: 'Trusted licensee verification is required before binding submission.' });
    const terms = termSheetSchema.safeParse(draft.terms);
    if (!terms.success) return res.status(409).json({ error: 'The draft needs a complete valid term sheet.' });
    const prohibited = permissionError(draft.story, terms.data);
    if (prohibited) return res.status(409).json({ error: prohibited });
    if (terms.data.financialKind === 'FREE' && !profile.educationNgoVerified) return res.status(403).json({ error: 'Pro-bono requests require verified educational or NGO eligibility.' });
    if (draft.story.culturalHeritage && (!draft.story.communityEntity || draft.story.communityEntity.verificationState !== 'VERIFIED' || !draft.story.communityEntity.entityVerified || !draft.story.communityEntity.mandateApproved)) {
      return res.status(403).json({ error: 'Verified community authority and human mandate approval are required for this story.' });
    }
    return res.status(503).json({ error: 'Binding submission is unavailable until approved contract terms, signing, required approvals and payment conditions are configured.' });
  });

  router.post('/license-drafts/:draftId/signing-preview', async (req, res) => {
    if (config.NODE_ENV === 'production') return res.status(404).json({ error: 'Route not found' });
    if (!z.uuid().safeParse(req.params.draftId).success || !z.object({}).strict().safeParse(req.body || {}).success) return res.status(400).json({ error: 'Invalid signing preview request' });
    const draft = await findDraft(req);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    const template = await readFile(new URL('../../docs/legal/templates/standard_license_placeholder.txt', import.meta.url), 'utf8');
    const values = { storyTitle: draft.story.title, scope: draft.terms.scope, duration: draft.terms.durationKind === 'FIXED' ? `${draft.terms.durationMonths} months` : 'Perpetual',
      territory: draft.terms.territory === 'COUNTRY' ? draft.terms.countryCode : draft.terms.territory, exclusivity: draft.terms.exclusivity,
      financialTerms: JSON.stringify({ kind: draft.terms.financialKind, currency: draft.terms.currency, flatFeeCents: draft.terms.flatFeeCents, royaltyBasisPoints: draft.terms.royaltyBasisPoints, royaltyBasis: draft.terms.royaltyBasis }),
      communityAuthority: draft.story.culturalHeritage ? 'Required and not executed by this preview' : 'No community designation recorded' };
    const documentText = template.replace(/\{\{(\w+)\}\}/g, (_match, key) => String(values[key] ?? 'Not configured'));
    res.json({ mode: 'DEVELOPMENT_PREVIEW', status: 'NOT_SIGNED', nonBinding: true, rightsGranted: false, assetUnlocked: false, documentText });
  });
  return router;
}
