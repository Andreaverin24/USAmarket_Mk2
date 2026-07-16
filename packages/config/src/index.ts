import { z } from 'zod';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(8),
  SESSION_COOKIE_NAME: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .default('atlas_session'),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  APP_ORIGINS: z.string().transform((value) => value.split(',').map((origin) => origin.trim())),
  PLATFORM_DOMAIN: z.string().min(1).default('atlas.localhost'),
});

export type AppConfig = z.infer<typeof schema>;
export const parseConfig = (input: NodeJS.ProcessEnv): AppConfig => schema.parse(input);

export function loadConfig(): AppConfig {
  const path = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')].find(
    existsSync,
  );
  if (path) {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && process.env[match[1]!] === undefined) process.env[match[1]!] = match[2]!;
    }
  }
  return parseConfig(process.env);
}
