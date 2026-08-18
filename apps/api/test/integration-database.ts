import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { PrismaClient } from '@atlas/database';

export type IntegrationDatabase = {
  url: string;
  container?: StartedPostgreSqlContainer;
  schema?: string;
  temporaryDatabase?: { adminUrl: string; name: string };
};

export async function setupIntegrationDatabase(): Promise<IntegrationDatabase> {
  const localUrl = process.env.TEST_DATABASE_URL;
  let database: IntegrationDatabase;

  if (localUrl) {
    const url = new URL(localUrl);
    if (process.env.TEST_DATABASE_ISOLATION === 'database') {
      url.searchParams.delete('schema');
      const name = `atlas_test_${randomUUID().replaceAll('-', '')}`;
      const adminUrl = url.toString();
      const admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });
      try {
        await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
      } finally {
        await admin.$disconnect();
      }
      url.pathname = `/${name}`;
      database = { url: url.toString(), temporaryDatabase: { adminUrl, name } };
    } else {
      const schema = `atlas_test_${randomUUID().replaceAll('-', '')}`;
      url.searchParams.set('schema', schema);
      database = { url: url.toString(), schema };
    }
  } else {
    const container = await new PostgreSqlContainer('postgres:17-alpine').start();
    database = { url: container.getConnectionUri(), container };
  }

  process.env.DATABASE_URL = database.url;
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    cwd: resolve(import.meta.dirname, '../../../packages/database'),
    env: process.env,
    stdio: 'pipe',
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
  if (database?.temporaryDatabase) {
    const admin = new PrismaClient({
      datasources: { db: { url: database.temporaryDatabase.adminUrl } },
    });
    try {
      await admin.$executeRawUnsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${database.temporaryDatabase.name}' AND pid <> pg_backend_pid()`,
      );
      await admin.$executeRawUnsafe(`DROP DATABASE "${database.temporaryDatabase.name}"`);
    } finally {
      await admin.$disconnect();
    }
  }
  await database?.container?.stop();
}
