import { z } from 'zod';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appOrigins = z.string().transform((value, context) => {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        const url = new URL(origin);
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.origin !== origin ||
          url.username ||
          url.password
        )
          throw new Error('not an HTTP(S) origin');
        return url.origin;
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'APP_ORIGINS must contain comma-separated HTTP(S) origins only',
        });
        return origin;
      }
    });
  if (!origins.length)
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'APP_ORIGINS must contain at least one origin',
    });
  return [...new Set(origins)];
});

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
  APP_ORIGINS: appOrigins,
  PLATFORM_DOMAIN: z.string().min(1).default('atlas.localhost'),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const productionSchema = schema.superRefine((config, context) => {
  if (config.NODE_ENV !== 'production') return;
  if (new URL(config.S3_ENDPOINT).protocol !== 'https:')
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['S3_ENDPOINT'],
      message: 'S3_ENDPOINT must use HTTPS in production',
    });
  for (const origin of config.APP_ORIGINS)
    if (new URL(origin).protocol !== 'https:')
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APP_ORIGINS'],
        message: 'APP_ORIGINS may contain HTTPS origins only in production',
      });
  if (/localhost/i.test(config.PLATFORM_DOMAIN))
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PLATFORM_DOMAIN'],
      message: 'PLATFORM_DOMAIN must not use localhost in production',
    });
});

export type AppConfig = z.infer<typeof productionSchema>;
export const parseConfig = (input: NodeJS.ProcessEnv): AppConfig => productionSchema.parse(input);

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
