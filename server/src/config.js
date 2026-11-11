import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//),
  SESSION_SECRET: z.string().min(32),
  ENTRA_TENANT_ID: z.uuid(),
  ENTRA_CLIENT_ID: z.uuid(),
  ENTRA_CLIENT_SECRET: z.string().min(1),
  AZURE_STORAGE_CONNECTION_STRING: z.string().min(1).optional(),
  AZURE_STORAGE_CONTAINER: z.string().regex(/^(?!.*--)[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/).optional(),
  ENTRA_REDIRECT_URI: z.url().default('http://localhost:3001/auth/callback'),
  CLIENT_ORIGIN: z.url().default('http://localhost:3000'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export function readConfig(env = process.env) {
  const result = schema.safeParse(env);
  if (!result.success) {
    // Report field names only, never credential values.
    throw new Error(`Invalid or missing configuration: ${[...new Set(result.error.issues.map(i => i.path.join('.')))].join(', ')}`);
  }
  const config = result.data;
  if (!!config.AZURE_STORAGE_CONNECTION_STRING !== !!config.AZURE_STORAGE_CONTAINER) {
    throw new Error('Invalid or missing configuration: provide both Azure storage settings');
  }
  if (new URL(config.CLIENT_ORIGIN).origin !== config.CLIENT_ORIGIN) {
    throw new Error('CLIENT_ORIGIN must contain an origin only');
  }
  if (config.NODE_ENV === 'production' &&
      [config.CLIENT_ORIGIN, config.ENTRA_REDIRECT_URI].some(value => !value.startsWith('https://'))) {
    throw new Error('Production authentication requires HTTPS');
  }
  return config;
}
