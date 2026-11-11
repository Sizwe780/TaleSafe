import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { readConfig } from '../src/config.js';

const storyId = z.uuid().safeParse(process.argv[2]);
if (!storyId.success) { console.error('Provide the acceptance story ID.'); process.exit(1); }
const config = readConfig();
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.DATABASE_URL, connectionTimeoutMillis: 30000 }) });
try {
  const draft = await db.licenseDraft.findFirst({ where: { storyId: storyId.data }, orderBy: { createdAt: 'desc' }, select: { id: true, terms: true } });
  if (!draft || draft.terms.scope !== 'EDUCATIONAL_MATERIAL' || draft.terms.durationMonths !== 12 || draft.terms.countryCode !== 'ZA' || draft.terms.flatFeeCents !== 500000) throw new Error();
  console.log(JSON.stringify({ verified: true, draftId: draft.id, structuredTermsPersisted: true, bindingExecution: false }));
} catch {
  console.error('Licensing foundation verification failed. Save the specified acceptance draft through the UI first.');
  process.exitCode = 1;
} finally { await db.$disconnect(); }
