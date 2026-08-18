// This preflight deliberately reports only variable names and policy errors.
// It never reads .env files, prints values, reaches external services, or
// deploys anything. Run it with the intended production environment injected
// by the deployment system.
const required = [
  'DATABASE_URL',
  'REDIS_URL',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'SESSION_COOKIE_NAME',
  'SESSION_TTL_SECONDS',
  'TRUST_PROXY',
  'APP_ORIGINS',
  'NEXT_PUBLIC_SITE_URL',
  'PLATFORM_DOMAIN',
];

const errors = required
  .filter((name) => !process.env[name]?.trim())
  .map((name) => `Missing ${name}`);

function parseUrl(name, protocols) {
  const value = process.env[name];
  if (!value) return;
  try {
    const url = new URL(value);
    if (!protocols.includes(url.protocol))
      errors.push(`${name} must use ${protocols.join(' or ')}`);
  } catch {
    errors.push(`${name} must be a valid URL`);
  }
}

if (process.env.NODE_ENV !== 'production') errors.push('NODE_ENV must equal production');
parseUrl('DATABASE_URL', ['postgresql:', 'postgres:']);
parseUrl('REDIS_URL', ['redis:', 'rediss:']);
parseUrl('S3_ENDPOINT', ['https:']);
parseUrl('NEXT_PUBLIC_SITE_URL', ['https:']);

let publicUrl;
if (process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    publicUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL);
  } catch {
    // parseUrl already records the actionable error without exposing the value.
  }
}
if (publicUrl?.hostname === 'localhost' || publicUrl?.hostname.endsWith('.localhost'))
  errors.push('NEXT_PUBLIC_SITE_URL must not use localhost');
if (process.env.PLATFORM_DOMAIN?.includes('localhost'))
  errors.push('PLATFORM_DOMAIN must not use localhost');
if (!['true', 'false'].includes(process.env.TRUST_PROXY ?? ''))
  errors.push('TRUST_PROXY must be explicitly true or false');

const origins =
  process.env.APP_ORIGINS?.split(',')
    .map((value) => value.trim())
    .filter(Boolean) ?? [];
if (!origins.length) errors.push('APP_ORIGINS must contain at least one HTTPS origin');
for (const origin of origins) {
  try {
    if (new URL(origin).protocol !== 'https:')
      errors.push('APP_ORIGINS may contain HTTPS origins only');
  } catch {
    errors.push('APP_ORIGINS contains an invalid URL');
  }
}

for (const name of [
  'SEED_ADMIN_PASSWORD',
  'SEED_SELLER_PASSWORD',
  'SEED_DRIVER_PASSWORD',
  'SEED_BUYER_PASSWORD',
])
  if (process.env[name]) errors.push(`${name} must not be present in production`);

if (errors.length) {
  console.error('Production preflight failed:');
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Production preflight passed. No deployment or external check was performed.');
}
