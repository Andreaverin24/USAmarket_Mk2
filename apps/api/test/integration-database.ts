import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { PrismaClient } from '@atlas/database';

export type IntegrationDatabase = {
  url: string;
  container?: StartedPostgreSqlContainer;
  schema?: string;
};

export async function setupIntegrationDatabase(): Promise<IntegrationDatabase> {
  const localUrl = process.env.TEST_DATABASE_URL;
  let database: IntegrationDatabase;

  if (localUrl) {
    const url = new URL(localUrl);
    const schema = `atlas_test_${randomUUID().replaceAll('-', '')}`;
    url.searchParams.set('schema', schema);
    database = { url: url.toString(), schema };
  } else {
    const container = await new PostgreSqlContainer('postgres:17-alpine').start();
    database = { url: container.getConnectionUri(), container };
  }

  process.env.DATABASE_URL = database.url;
  execFileSync('pnpm', ['--filter', '@atlas/database', 'exec', 'prisma', 'migrate', 'deploy'], {
    cwd: resolve(import.meta.dirname, '../../..'),
    env: process.env,
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });
  return database;
}

export async function teardownIntegrationDatabase(
  database: IntegrationDatabase | undefined,
  db: PrismaClient | undefined,
) {
  if (database?.schema && db) {
    await db.$executeRawUnsafe(`DROP SCHEMA "${database.schema}" CASCADE`);
  }
  await db?.$disconnect();
  await database?.container?.stop();
}
