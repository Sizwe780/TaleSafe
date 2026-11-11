import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { readConfig } from '../src/config.js';

const storyId = z.uuid().safeParse(process.argv[2]);
if (!storyId.success) {
  console.error('Usage: npm run verify:license --workspace server -- <story-id>');
  process.exit(1);
}
const config = readConfig();
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.DATABASE_URL, connectionTimeoutMillis: 10000 }) });
try {
  const story = await db.story.findUnique({ where: { id: storyId.data }, select: {
    id: true, licenses: { select: { id: true, tier: true, status: true }, orderBy: { createdAt: 'desc' } },
  } });
  if (!story?.licenses.some(license => license.tier === 'EDUCATIONAL' && license.status === 'REQUESTED')) throw new Error();
  console.log(JSON.stringify({ verified: true, story }));
} catch {
  console.error('Persisted Educational mock license verification failed. Submit the UI request first.');
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
