import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { BlobServiceClient } from '@azure/storage-blob';
import { readConfig } from '../src/config.js';

// Supply a private curl cookie jar or browser-copied request headers from a
// real, already-authenticated session. Never derive sessions from the database.
// No tokens, cookie values or storage credentials are accepted as CLI arguments.
const cookieJar = process.argv[2];
if (!cookieJar) {
  console.error('Usage: npm run verify:registration --workspace server -- <private-cookie-jar-path>');
  process.exit(1);
}
const config = readConfig();
if (!config.AZURE_STORAGE_CONNECTION_STRING) {
  console.error('Configure both Azure storage settings before live registration verification.');
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.DATABASE_URL, connectionTimeoutMillis: 10000 }) });
try {
  const fixturePath = fileURLToPath(new URL('../fixtures/sample-story.txt', import.meta.url));
  const bytes = readFileSync(fixturePath);
  const expectedHash = createHash('sha256').update(bytes).digest('hex');
  const cookieSource = readFileSync(cookieJar, 'utf8');
  const header = cookieSource.match(/^\s*cookie\s*:\s*(.+)$/im)
    || cookieSource.trim().match(/^(talesafe\.sid=[^\r\n]+)$/);
  let cookieArgs = ['--cookie', cookieJar];
  let curlConfig = '';
  if (header) {
    const cookie = header[1].match(/(?:^|;\s*)talesafe\.sid=([^;\s]+)/);
    if (!cookie || !/^[A-Za-z0-9%._~-]+$/.test(cookie[1])) throw new Error('Invalid TaleSafe cookie source');
    // Feed the credential through stdin, never process arguments. Forward only
    // TaleSafe's session cookie, not other browser headers or cookies.
    curlConfig = `cookie = "talesafe.sid=${cookie[1]}"\n`;
    cookieArgs = ['--config', '-'];
  } else if (!cookieSource.startsWith('# Netscape HTTP Cookie File')) {
    throw new Error('Expected a curl cookie jar or browser request Cookie header');
  }
  const output = execFileSync(process.platform === 'win32' ? 'curl.exe' : 'curl', [
    '--silent', '--show-error', '--max-time', '90',
    ...cookieArgs,
    '--form', `file=@${fixturePath};type=text/plain`,
    '--form-string', 'title=The Baobab Remembered — acceptance sample',
    '--form-string', 'aiConsent=COMPENSATION_REQUIRED',
    '--form-string', 'commercialUse=false',
    '--form-string', 'culturalHeritage=true',
    '--write-out', '\n%{http_code}',
    `http://localhost:${config.PORT}/api/stories`,
  ], { encoding: 'utf8', input: curlConfig, stdio: ['pipe', 'pipe', 'pipe'] });
  const split = output.lastIndexOf('\n');
  const status = output.slice(split + 1).trim();
  if (status !== '201') throw new Error(`Expected HTTP 201; received HTTP ${status}`);
  const record = JSON.parse(output.slice(0, split));
  const stored = await prisma.story.findUnique({ where: { id: record.id } });
  if (!stored || stored.sha256 !== expectedHash || record.sha256 !== expectedHash ||
      stored.aiConsent !== 'COMPENSATION_REQUIRED' || stored.commercialUse !== false ||
      stored.culturalHeritage !== true || stored.byteSize !== bytes.length || !record.createdAt) {
    throw new Error('Persisted registration metadata did not match the sample');
  }
  const container = BlobServiceClient.fromConnectionString(config.AZURE_STORAGE_CONNECTION_STRING)
    .getContainerClient(config.AZURE_STORAGE_CONTAINER);
  const properties = await container.getProperties();
  if (properties.blobPublicAccess) throw new Error('Container must be private');
  const blob = container.getBlockBlobClient(stored.blobName);
  const downloaded = await blob.downloadToBuffer();
  const blobProperties = await blob.getProperties();
  if (!downloaded.equals(bytes) || blobProperties.metadata?.sha256 !== expectedHash) {
    throw new Error('Azure bytes or fingerprint metadata did not match the sample');
  }
  console.log(`Live registration verified: HTTP 201; database consent/permissions persisted; Azure bytes and SHA-256 match. Story ID: ${record.id}`);
} catch (error) {
  // Upstream errors can contain signed URLs or connection details. Redact them.
  const safe = /^Expected HTTP 201; received HTTP \d{3}$/.test(error.message) ? error.message : 'Live registration verification failed; inspect safe API stage diagnostics.';
  console.error(safe);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
