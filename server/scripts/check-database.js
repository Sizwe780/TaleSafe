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
  await Promise.all([prisma.user.count(), prisma.story.count(), prisma.license.count()]);
  await prisma.$queryRaw`SELECT COUNT(*) FROM "session"`;
  console.log('PostgreSQL connection successful; User, Story, License and session tables verified.');
} catch {
  console.error('Database verification failed. Check DATABASE_URL and apply migrations.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
