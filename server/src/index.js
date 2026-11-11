import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfidentialClientApplication } from '@azure/msal-node';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import { readConfig } from './config.js';
import { createApp } from './app.js';
import { createAzureStorage } from './storage.js';

let prisma;
let pool;
try {
  const config = readConfig();
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.DATABASE_URL, connectionTimeoutMillis: 10000 }) });
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  console.log('PostgreSQL connection successful');
  pool = new pg.Pool({ connectionString: config.DATABASE_URL, connectionTimeoutMillis: 10000 });
  // Session table is included in the versioned initial migration.
  const Store = connectPgSimple(session);
  const store = new Store({ pool, tableName: 'session', createTableIfMissing: false });
  const identity = new ConfidentialClientApplication({ auth: {
    clientId: config.ENTRA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${config.ENTRA_TENANT_ID}`,
    clientSecret: config.ENTRA_CLIENT_SECRET,
  } });
  const app = createApp({ config, prisma, identity, sessionStore: store, storage: createAzureStorage(config) });
  const server = app.listen(config.PORT, () => console.log(`TaleSafe API listening on port ${config.PORT}`));
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    server.close(async () => {
      store.close();
      await prisma.$disconnect();
      await pool.end();
    });
  }
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (error) {
  console.error(error.message.startsWith('Invalid or missing configuration:') ? error.message : 'Startup failed. Check configuration and run database migrations.');
  await prisma?.$disconnect();
  await pool?.end();
  process.exitCode = 1;
}
