# Local development

1. Copy `.env.example` to `.env` and change development secrets if required.
2. Run `pnpm install`.
3. Run `docker compose up -d` and wait for PostgreSQL/Redis/MinIO.
4. Create the MinIO bucket `atlas-local` in the console at `http://localhost:19001`.
5. Run `pnpm db:migrate && pnpm db:seed`.
6. Run `pnpm dev`.

Ports: web 3000, portal 3001, driver 3002, API 4000, PostgreSQL 15432, Redis 16379, MinIO 19000/19001, Mailpit 11025/18025.

Seed credentials are documented in `.env.example` and are development-only. Stop services with `docker compose down`; add `-v` only when intentionally deleting local data.
