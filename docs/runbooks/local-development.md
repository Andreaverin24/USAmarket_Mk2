# Local development

1. Copy `.env.example` to `.env` and change development secrets if required.
2. Run `pnpm install`.
3. Run `pnpm exec playwright install chromium` when public web catalog extraction is needed.
4. Start PostgreSQL directly on Windows and create the database/user from `DATABASE_URL`.
5. Start local Redis and S3-compatible storage when worker/media features are needed.
6. Create the S3 bucket `atlas-local`.
7. Run `pnpm db:migrate && pnpm db:seed`.
8. Run `pnpm dev`.

Default ports: web 3000, portal 3001, driver 3002, API 4000, PostgreSQL 5432, Redis 6379,
S3-compatible storage 9000.

Seed credentials are documented in `.env.example` and are development-only.

Docker Compose is optional and intended only for isolated integration infrastructure or a missing
external service. When it is intentionally used, select the Compose ports from
`infrastructure/docker/docker-compose.yml`; application processes still run directly through
Node.js/pnpm.
