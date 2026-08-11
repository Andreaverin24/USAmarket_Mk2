# Local development

## Requirements

- Node.js compatible with the repository toolchain;
- pnpm version declared by `packageManager`;
- PostgreSQL available directly on Windows;
- Redis and S3-compatible storage for worker/media features.

Docker is not required for the web applications, API, worker, Prisma or the normal development
flow. A local PostgreSQL Windows service is the default database runtime.

## Bootstrap

```powershell
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Create the database/user referenced by `DATABASE_URL` first and ensure PostgreSQL is listening. The
default example uses `localhost:5432`. Application variables are loaded from root `.env`.

Redis and S3-compatible storage are required when processing outbox, notifications, imports or
media. They can be installed as Windows services or pointed to existing development instances.

## Optional isolated services

`infrastructure/docker/docker-compose.yml` remains available for isolated integration tests or
when Redis/MinIO is not installed locally:

```powershell
docker compose up -d postgres redis minio
```

Using this profile requires the Compose ports from that file (PostgreSQL `15432`, Redis `16379`,
MinIO `19000`) in `.env`. It is not the default local development path and does not containerize
the API, web applications or worker.

## Development

```powershell
pnpm dev
```

API, public web, portal and worker can also be started with package filters.

## Verification

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

For integration tests without Docker, set `TEST_DATABASE_URL` to a dedicated local PostgreSQL
database. The harness creates and removes a unique schema per suite:

```powershell
$env:TEST_DATABASE_URL = "postgresql://atlas:atlas@localhost:5432/atlas_test"
pnpm test:integration
```

If `TEST_DATABASE_URL` is absent, the integration harness can fall back to Testcontainers when a
container runtime is intentionally available.

Prisma:

```powershell
pnpm --filter @atlas/database exec prisma validate
pnpm --filter @atlas/database exec prisma migrate status
pnpm --filter @atlas/database exec prisma generate
```

Commands requiring `DATABASE_URL` must load the root `.env`. Never run destructive reset commands
against production.

## Current workstation check

On 2026-07-20 the implementation audit found no PostgreSQL Windows service, PostgreSQL binaries or
listener on `5432`/`15432`. Prisma schema validation and client generation work without a database;
migration, seed and DB-backed acceptance require starting or installing a local PostgreSQL
instance. Docker was not used as a substitute.
