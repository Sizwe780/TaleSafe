import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
}) });

try {
  if (!process.env.DATABASE_URL) throw new Error('Missing database configuration');
  await prisma.$queryRaw`SELECT 1`;
  await Promise.all([prisma.user.count(), prisma.story.count(), prisma.license.count(),
    prisma.licenseeProfile.count(), prisma.licenseDraft.count(), prisma.communityEntity.count(), prisma.communityAdmin.count(),
    prisma.story.findFirst({ select: { published: true, communityEntityId: true } })]);
  await prisma.$queryRaw`SELECT COUNT(*) FROM "session"`;
  console.log('PostgreSQL connection successful; application, licensing foundation and session tables verified.');
} catch (error) {
  const knownModels = ['User', 'Story', 'License', 'LicenseeProfile', 'LicenseDraft', 'CommunityEntity', 'CommunityAdmin'];
  console.error({ event: 'database_check_failed', code: /^P\d{4}$/.test(error.code || '') ? error.code : undefined,
    model: knownModels.includes(error.meta?.modelName) ? error.meta.modelName : undefined });
  console.error('Database verification failed. Check DATABASE_URL and apply migrations.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
